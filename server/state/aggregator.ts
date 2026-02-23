import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseAllTeams } from '../parsers/team-parser.js';
import { parseAllTeamTasks, parseAllTasks } from '../parsers/task-parser.js';
import { parseAllSessionLogs } from '../parsers/session-log.js';
import { scanAllSessions, type LastEntryType } from '../parsers/session-scanner.js';
import { discoverClaudePanes } from '../parsers/process-discovery.js';
import type { ClaudePaneMapping } from '../parsers/process-discovery.js';
import { getRecentEvents } from '../db.js';
import type {
  ConductorConfig,
  DashboardState,
  ProjectGroup,
  Session,
  SessionActivity,
  HookEvent,
  WsMessageType,
} from '../types.js';

const execFileAsync = promisify(execFile);

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

function deriveSessionStatus(
  ageMs: number,
  lastEntryType: LastEntryType,
  eventInfo?: { status: Session['status']; timestamp: string }
): Session['status'] {
  // Hook events override if recent (<5min)
  if (eventInfo) {
    const eventAge = Date.now() - new Date(eventInfo.timestamp).getTime();
    if (eventAge < FIVE_MINUTES_MS) {
      return eventInfo.status;
    }
  }

  // Time tiers
  if (ageMs < FIVE_MINUTES_MS) {
    // Active — derive from last JSONL entry type
    switch (lastEntryType) {
      case 'user': return 'thinking';
      case 'assistant-tool': return 'working';
      case 'assistant-question': return 'waiting-input';
      case 'assistant-text': return 'done';
      default: return 'idle';
    }
  }

  if (ageMs < ONE_HOUR_MS) {
    return 'paused';
  }

  return 'idle';
}

export class Aggregator extends EventEmitter {
  private state: DashboardState;
  private config: ConductorConfig;
  private staleTimer: ReturnType<typeof setInterval> | null = null;
  private discoveryTimer: ReturnType<typeof setInterval> | null = null;
  private paneMapping: ClaudePaneMapping = { byTasksDir: new Map(), byPid: new Map(), bySessionId: new Map(), byPaneTitle: new Map(), panePrompts: new Map(), byItermSession: new Map() };

  constructor(config: ConductorConfig) {
    super();
    this.config = config;
    this.state = {
      teams: [],
      sessions: [],
      projects: [],
      tasksByTeam: {},
      tasksBySession: {},
      events: [],
      sessionActivities: {},
      lastUpdated: new Date().toISOString(),
    };
  }

  getState(): DashboardState {
    return this.state;
  }

  /**
   * Full parse of all data on startup.
   */
  initialize(): void {
    console.log('[aggregator] Initializing state from filesystem...');

    // Parse teams from ~/.claude/teams/
    const teams = parseAllTeams(this.config.claudeHome);

    // Parse all tasks (team-named + UUID-named)
    const teamNameSet = new Set(teams.map((t) => t.name));
    const { byTeam: tasksByTeam, bySession: tasksBySession } = parseAllTasks(this.config.claudeHome, teamNameSet);

    // Load events from SQLite
    const events = getRecentEvents(200);

    // Scan filesystem for sessions and merge with hook events
    const { sessions, projects } = this.mergeSessionSources(events);

    // Cross-reference: mark sessions that are team leads
    for (const team of teams) {
      if (team.leadSessionId) {
        const session = sessions.find((s) => s.id === team.leadSessionId);
        if (session) {
          session.feature = `lead:${team.name}`;
        }
      }
    }

    this.state = {
      teams,
      sessions,
      projects,
      tasksByTeam,
      tasksBySession,
      events,
      sessionActivities: {},
      lastUpdated: new Date().toISOString(),
    };

    const totalTasks = Object.values(tasksByTeam).reduce((sum, t) => sum + t.length, 0);
    const activeSessions = sessions.filter((s) => s.status === 'working').length;
    console.log(
      `[aggregator] Initialized: ${teams.length} teams, ${totalTasks} tasks, ${events.length} events, ${sessions.length} sessions (${activeSessions} active), ${projects.length} projects`
    );

    // Parse session activities from JSONL logs
    this.refreshSessionActivities();

    // Discover claude processes → tmux pane mappings
    this.refreshProcessDiscovery();
    this.discoveryTimer = setInterval(() => this.refreshProcessDiscovery(), 30_000);

    // Start stale detection
    this.detectStaleness();
    this.staleTimer = setInterval(() => this.detectStaleness(), 60_000);
  }

  /**
   * Refresh all teams from ~/.claude/teams/
   */
  refreshTeams(): void {
    this.state.teams = parseAllTeams(this.config.claudeHome);
    this.state.lastUpdated = new Date().toISOString();
    this.emitChange('teams_updated');
  }

  /**
   * Re-parse tasks for a specific team, or all tasks if no name given.
   */
  refreshTasks(teamName?: string): void {
    if (teamName) {
      const tasks = parseAllTeamTasks(this.config.claudeHome, [teamName]);
      this.state.tasksByTeam[teamName] = tasks[teamName] ?? [];
    } else {
      const teamNameSet = new Set(this.state.teams.map((t) => t.name));
      const { byTeam, bySession } = parseAllTasks(this.config.claudeHome, teamNameSet);
      this.state.tasksByTeam = byTeam;
      this.state.tasksBySession = bySession;
    }
    this.state.lastUpdated = new Date().toISOString();
    this.emitChange('tasks_updated');
  }

  /**
   * Convenience: refresh everything.
   */
  refreshAll(): void {
    this.refreshTeams();
    this.refreshTasks();
    this.refreshSessions();
  }

  /**
   * Re-scan filesystem for sessions and rebuild projects.
   */
  refreshSessions(): void {
    const { sessions, projects } = this.mergeSessionSources(this.state.events);

    // Preserve team lead markers
    for (const team of this.state.teams) {
      if (team.leadSessionId) {
        const session = sessions.find((s) => s.id === team.leadSessionId);
        if (session) {
          session.feature = `lead:${team.name}`;
        }
      }
    }

    this.state.sessions = sessions;
    this.state.projects = projects;
    this.state.lastUpdated = new Date().toISOString();

    // Re-apply pane mappings from process discovery
    this.applyPaneMappings();

    this.emitChange('sessions_updated');
    this.emitChange('projects_updated');
  }

  /**
   * Re-parse all session JSONL logs and update sessionActivities.
   */
  refreshSessionActivities(): void {
    this.state.sessionActivities = parseAllSessionLogs(this.config.claudeHome);
    this.state.lastUpdated = new Date().toISOString();
    this.emitChange('session_activities_updated');
  }

  /**
   * Merge a single session activity update into state.
   */
  updateSessionActivity(sessionId: string, activity: SessionActivity): void {
    this.state.sessionActivities[sessionId] = activity;
    this.state.lastUpdated = new Date().toISOString();
    this.emitChange('session_activities_updated');
  }

  /**
   * Add a new hook event and update session state.
   */
  addEvent(event: HookEvent): void {
    // Add to front (most recent first)
    this.state.events.unshift(event);

    // Keep max 200 events in memory
    if (this.state.events.length > 200) {
      this.state.events = this.state.events.slice(0, 200);
    }

    // Update session state from this event
    this.updateSessionFromEvent(event);

    this.state.lastUpdated = new Date().toISOString();
    this.emitChange('event_added');
  }

  /**
   * Discover claude processes and map them to tmux panes via process tree walking.
   * Merges paneId into sessions that have a matching tasksId.
   */
  refreshProcessDiscovery(): void {
    discoverClaudePanes().then((mapping) => {
      this.paneMapping = mapping;
      this.applyPaneMappings();
    }).catch((err) => {
      console.error('[aggregator] Process discovery error:', err);
    });
  }

  /**
   * Apply pane mappings to sessions. Team member paneIds take priority.
   * Matches via: tasksId from JSONL → byTasksDir, or tasksBySession keys → byTasksDir.
   */
  private applyPaneMappings(): void {
    // Build set of session IDs that already have paneId from team members
    const teamPaneSessionIds = new Set<string>();
    for (const team of this.state.teams) {
      for (const member of team.members) {
        if (member.agentId && member.tmuxPaneId) {
          teamPaneSessionIds.add(member.agentId);
        }
      }
    }

    // Build reverse lookup: session ID → tasks dir name from tasksBySession
    const sessionToTasksDir = new Map<string, string>();
    for (const [dirName] of Object.entries(this.state.tasksBySession)) {
      // tasksBySession is keyed by session-like identifiers
      sessionToTasksDir.set(dirName, dirName);
    }

    // Sort sessions by priority: active > paused > idle
    // This ensures actively running sessions get first pick of panes
    const statusPriority: Record<string, number> = {
      'working': 0, 'thinking': 0, 'waiting-approval': 0, 'waiting-input': 0, 'error': 0,
      'done': 1, 'paused': 1,
      'idle': 2,
    };
    const sortedSessions = [...this.state.sessions].sort((a, b) => {
      const pa = statusPriority[a.status] ?? 3;
      const pb = statusPriority[b.status] ?? 3;
      if (pa !== pb) return pa - pb;
      // Within same priority, prefer more recently active
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });

    // Track assigned paneIds to prevent double-assignment
    const assignedPaneIds = new Set<string>();

    // Assign panes to sessions that likely still have a tmux pane open.
    // A session's "idle" status just means no JSONL writes in 1hr+ — the claude
    // process and pane can still be alive (user just hasn't interacted).
    // Use 30-day window: tmux panes often stay open for weeks.
    // Priority sorting ensures recent/active sessions claim panes first.
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const hasLikelyPane = (s: Session) => {
      if (s.status !== 'idle') return true;
      const age = Date.now() - new Date(s.lastActivity).getTime();
      return age < THIRTY_DAYS_MS;
    };

    // First pass: exact matching (tasks dir, session ID, lsof) for non-subagent sessions
    let changed = false;
    for (const session of sortedSessions) {
      if (teamPaneSessionIds.has(session.id)) continue;
      if (session.isSubagent) continue; // Subagents inherit parent pane in pass 4
      if (!hasLikelyPane(session)) {
        // Clear stale paneId on truly old sessions
        if (session.paneId) {
          session.paneId = undefined;
          changed = true;
        }
        continue;
      }

      // Try matching: session.tasksId → byTasksDir
      let paneId = session.tasksId
        ? this.paneMapping.byTasksDir.get(session.tasksId)
        : undefined;

      // Try matching: session ID itself as tasks dir name
      if (!paneId) {
        paneId = this.paneMapping.byTasksDir.get(session.id);
      }

      // Try matching: session ID from lsof project directory paths
      if (!paneId) {
        const baseId = session.parentSessionId ?? session.id;
        paneId = this.paneMapping.bySessionId.get(baseId);
      }

      if (paneId && !assignedPaneIds.has(paneId)) {
        assignedPaneIds.add(paneId);
        if (session.paneId !== paneId) {
          session.paneId = paneId;
          changed = true;
        }
      } else if (session.paneId) {
        session.paneId = undefined;
        changed = true;
      }
    }

    // Second pass: fuzzy title matching for remaining unmatched active sessions
    if (this.paneMapping.byPaneTitle.size > 0) {
      for (const session of sortedSessions) {
        if (session.paneId || teamPaneSessionIds.has(session.id) || session.isSubagent) continue;
        if (!hasLikelyPane(session)) continue;
        // Combine all session text signals for matching
        const textParts: string[] = [];
        if (session.initialPrompt) textParts.push(session.initialPrompt);
        if (session.latestPrompt) textParts.push(session.latestPrompt);
        if (session.slug) textParts.push(session.slug.replace(/-/g, ' '));
        if (textParts.length === 0) continue;

        const promptLower = textParts.join(' ').toLowerCase();
        const promptWords = promptLower.split(/\s+/).filter((w) => w.length > 2);
        if (promptWords.length === 0) continue;

        let bestPaneId: string | undefined;
        let bestScore = 0;

        for (const [title, titlePaneId] of this.paneMapping.byPaneTitle) {
          if (assignedPaneIds.has(titlePaneId)) continue;
          const titleWords = title.split(/\s+/).filter((w) => w.length > 2);
          if (titleWords.length === 0) continue;

          // Count word overlap (bidirectional substring matching)
          const overlap = titleWords.filter((tw) => promptWords.some((pw) => pw.includes(tw) || tw.includes(pw))).length;
          const ratio = overlap / titleWords.length;

          // Score: full title match (title is substring of prompt or vice versa)
          if (promptLower.includes(title) || title.includes(promptLower)) {
            const score = title.length + 100; // Boost for full match
            if (score > bestScore) {
              bestScore = score;
              bestPaneId = titlePaneId;
            }
          }
          // Score: word overlap — require >= 1 word AND > 50% of title words
          else if (overlap >= 1 && ratio > 0.5 && overlap > bestScore) {
            bestScore = overlap;
            bestPaneId = titlePaneId;
          }
        }

        if (bestPaneId) {
          session.paneId = bestPaneId;
          assignedPaneIds.add(bestPaneId);
          changed = true;
        }
      }
    }

    // Third pass: content-based matching using captured pane prompts
    // Uses greedy score-based assignment: collect ALL (session, pane, score) candidates,
    // sort by score descending, then assign greedily so the best matches always win.
    if (this.paneMapping.panePrompts.size > 0) {
      // Build candidate list: all eligible session × unmatched pane pairs with scores
      const candidates: Array<{ sessionId: string; paneId: string; score: number }> = [];

      for (const session of sortedSessions) {
        if (session.paneId || teamPaneSessionIds.has(session.id) || session.isSubagent) continue;
        if (!hasLikelyPane(session)) continue;

        // Strip trailing "..." from truncated prompts so substring matching works
        const sessionTexts: string[] = [];
        if (session.latestPrompt) sessionTexts.push(session.latestPrompt.replace(/\.{3}$/, '').toLowerCase());
        if (session.initialPrompt) sessionTexts.push(session.initialPrompt.replace(/\.{3}$/, '').toLowerCase());
        if (sessionTexts.length === 0) continue;

        for (const [paneId, panePromptList] of this.paneMapping.panePrompts) {
          if (assignedPaneIds.has(paneId)) continue;

          let score = 0;
          for (const panePrompt of panePromptList) {
            const paneLower = panePrompt.toLowerCase();
            for (const sessionText of sessionTexts) {
              // Exact substring match — session prompt appears in pane prompt (or vice versa)
              if (paneLower.includes(sessionText) || sessionText.includes(paneLower)) {
                const matchLen = Math.min(paneLower.length, sessionText.length);
                score = Math.max(score, matchLen + 100);
              } else {
                // Word overlap fallback
                const paneWords = paneLower.split(/\s+/).filter((w) => w.length > 2);
                const sessWords = sessionText.split(/\s+/).filter((w) => w.length > 2);
                if (paneWords.length === 0 || sessWords.length === 0) continue;
                const overlap = paneWords.filter((pw) =>
                  sessWords.some((sw) => pw.includes(sw) || sw.includes(pw))
                ).length;
                const ratio = overlap / Math.max(paneWords.length, sessWords.length);
                if (overlap >= 2 && ratio > 0.4) {
                  score = Math.max(score, overlap);
                }
              }
            }
          }

          if (score > 0) {
            candidates.push({ sessionId: session.id, paneId, score });
          }
        }
      }

      // Sort by score descending — highest-confidence matches assigned first
      candidates.sort((a, b) => b.score - a.score);

      // Greedy assignment: each session and pane can only be assigned once
      const assignedSessionIds = new Set<string>();
      for (const { sessionId, paneId } of candidates) {
        if (assignedSessionIds.has(sessionId) || assignedPaneIds.has(paneId)) continue;
        const session = this.state.sessions.find((s) => s.id === sessionId);
        if (!session) continue;

        session.paneId = paneId;
        assignedPaneIds.add(paneId);
        assignedSessionIds.add(sessionId);
        changed = true;
      }
    }

    // Pass 3.5: iTerm2 native session matching for unmatched sessions
    // For claude processes in plain iTerm2 tabs (no tmux), match by iTerm2 session name vs session prompts
    if (this.paneMapping.byItermSession.size > 0) {
      const itermEntries = [...this.paneMapping.byItermSession.entries()];
      const matchedItermPids = new Set<number>();

      // Mark iTerm PIDs that are already assigned via lsof (passes 1)
      for (const [pid, info] of itermEntries) {
        const itermPaneId = `iterm:${info.itermId}`;
        if (assignedPaneIds.has(itermPaneId)) {
          matchedItermPids.add(pid);
        }
      }

      const remainingIterm = itermEntries.filter(([pid]) => !matchedItermPids.has(pid));

      if (remainingIterm.length > 0) {
        // Content matching: compare session prompts against iTerm2 session names
        for (const session of sortedSessions) {
          if (session.paneId || teamPaneSessionIds.has(session.id) || session.isSubagent) continue;
          if (!hasLikelyPane(session)) continue;

          const textParts: string[] = [];
          if (session.initialPrompt) textParts.push(session.initialPrompt);
          if (session.latestPrompt) textParts.push(session.latestPrompt);
          if (session.slug) textParts.push(session.slug.replace(/-/g, ' '));
          if (textParts.length === 0) continue;

          const sessionText = textParts.join(' ').toLowerCase();
          const sessionWords = sessionText.split(/\s+/).filter((w) => w.length > 2);
          if (sessionWords.length === 0) continue;

          let bestPid: number | undefined;
          let bestScore = 0;

          for (const [pid, info] of remainingIterm) {
            if (matchedItermPids.has(pid)) continue;
            if (!info.name) continue;

            const nameLower = info.name.toLowerCase();
            const nameWords = nameLower.split(/\s+/).filter((w) => w.length > 2);

            // Full substring match
            if (sessionText.includes(nameLower) || nameLower.includes(sessionText)) {
              const score = nameLower.length + 100;
              if (score > bestScore) {
                bestScore = score;
                bestPid = pid;
              }
            }
            // Word overlap
            else if (nameWords.length > 0) {
              const overlap = nameWords.filter((nw) =>
                sessionWords.some((sw) => sw.includes(nw) || nw.includes(sw))
              ).length;
              const ratio = overlap / nameWords.length;
              if (overlap >= 1 && ratio > 0.5 && overlap > bestScore) {
                bestScore = overlap;
                bestPid = pid;
              }
            }
          }

          if (bestPid !== undefined) {
            const info = this.paneMapping.byItermSession.get(bestPid)!;
            const itermPaneId = `iterm:${info.itermId}`;
            session.paneId = itermPaneId;
            assignedPaneIds.add(itermPaneId);
            matchedItermPids.add(bestPid);
            changed = true;
          }
        }

        // Singleton fallback: one unmatched session + one unmatched iTerm2 session → match directly
        const unmatchedSessions = sortedSessions.filter(
          (s) => !s.paneId && !teamPaneSessionIds.has(s.id) && !s.isSubagent && hasLikelyPane(s)
        );
        const unmatchedIterm = remainingIterm.filter(([pid]) => !matchedItermPids.has(pid));

        if (unmatchedSessions.length === 1 && unmatchedIterm.length === 1) {
          const [session] = unmatchedSessions;
          const [[pid, info]] = unmatchedIterm;
          const itermPaneId = `iterm:${info.itermId}`;
          session.paneId = itermPaneId;
          assignedPaneIds.add(itermPaneId);
          matchedItermPids.add(pid);
          changed = true;
        }
      }
    }

    // Fourth pass: propagate paneId from parent sessions to their subagents
    for (const session of this.state.sessions) {
      if (!session.isSubagent || !session.parentSessionId) continue;
      const parent = this.state.sessions.find((s) => s.id === session.parentSessionId);
      if (parent?.paneId && session.paneId !== parent.paneId) {
        session.paneId = parent.paneId;
        changed = true;
      }
    }

    if (changed) {
      this.state.lastUpdated = new Date().toISOString();
      this.emitChange('sessions_updated');
    }
  }

  /**
   * Detect stale teams: all members inactive, config.json old, no recent events,
   * and tmux panes gone.
   */
  detectStaleness(): void {
    // Get live tmux panes once for all teams
    this.getLivePaneIds().then((livePanes) => {
      let changed = false;

      for (const team of this.state.teams) {
        const allInactive = team.members.length > 0 && team.members.every((m) => !m.isActive);

        // Check config.json mtime > 2 hours
        const configPath = path.join(this.config.claudeHome, 'teams', team.name, 'config.json');
        let configStale = false;
        try {
          const stat = fs.statSync(configPath);
          configStale = Date.now() - stat.mtimeMs > 2 * 60 * 60 * 1000;
        } catch {
          configStale = true;
        }

        // Check for recent events tied to any team member session
        // Cross-reference with JSONL-discovered sessions via lead's subagentIds
        const memberSessionIds = new Set<string>();
        if (team.leadSessionId) {
          memberSessionIds.add(team.leadSessionId);
          const leadSession = this.state.sessions.find((s) => s.id === team.leadSessionId);
          if (leadSession) {
            for (const subId of leadSession.subagentIds) {
              memberSessionIds.add(subId);
            }
          }
        }

        const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
        const hasRecentEvents = this.state.events.some(
          (e) => memberSessionIds.has(e.sessionId) && new Date(e.timestamp).getTime() > twoHoursAgo
        );

        // Check if tmux panes still exist for members
        const allPanesGone = team.members.length > 0 && team.members.every(
          (m) => !m.tmuxPaneId || !livePanes.has(m.tmuxPaneId)
        );

        const stale = (allInactive || allPanesGone) && configStale && !hasRecentEvents;

        if (team.stale !== stale) {
          team.stale = stale;
          changed = true;
        }
      }

      if (changed) {
        this.emitChange('teams_updated');
      }
    }).catch((err) => {
      console.error('[aggregator] Error in stale detection:', err);
    });
  }

  /**
   * Clean up timers.
   */
  destroy(): void {
    if (this.staleTimer) {
      clearInterval(this.staleTimer);
      this.staleTimer = null;
    }
    if (this.discoveryTimer) {
      clearInterval(this.discoveryTimer);
      this.discoveryTimer = null;
    }
  }

  // --- Private helpers ---

  /**
   * Merge filesystem-scanned sessions with hook event status.
   * Filesystem is the primary source; events enrich status.
   */
  private mergeSessionSources(events: HookEvent[]): { sessions: Session[]; projects: ProjectGroup[] } {
    // 1. Scan filesystem for all sessions
    const scanned = scanAllSessions(this.config.claudeHome);

    // 2. Build event status map from hook events
    const eventStatusMap = new Map<string, { status: Session['status']; timestamp: string }>();
    for (const event of events) {
      const existing = eventStatusMap.get(event.sessionId);
      if (!existing || event.timestamp > existing.timestamp) {
        eventStatusMap.set(event.sessionId, {
          status: this.statusFromEventType(event.type),
          timestamp: event.timestamp,
        });
      }
    }

    // 3. Merge: filesystem provides base, events enrich status, activities override
    const sessions: Session[] = scanned.map((s) => {
      const eventInfo = eventStatusMap.get(s.id);
      const ageMs = Date.now() - new Date(s.lastActivity).getTime();
      let status = deriveSessionStatus(ageMs, s.lastEntryType, eventInfo);

      // If session has active real-time activity, override idle/paused (not done — done means finished)
      const activity = this.state.sessionActivities[s.id];
      if (activity?.active && (status === 'idle' || status === 'paused')) {
        status = activity.thinking ? 'thinking' : 'working';
      }

      return {
        id: s.id,
        project: s.project,
        projectDir: s.projectDir,
        status,
        lastActivity: s.lastActivity,
        model: s.model,
        cwd: s.cwd,
        gitBranch: s.gitBranch,
        version: s.version,
        slug: s.slug,
        initialPrompt: s.initialPrompt,
        latestPrompt: s.latestPrompt,
        tasksId: s.tasksId,
        isSubagent: s.isSubagent,
        parentSessionId: s.parentSessionId,
        agentId: s.agentId,
        subagentIds: s.subagentIds,
        fileSize: s.fileSize,
      };
    });

    // 4. Build project groups from parent sessions
    const projectMap = new Map<string, ProjectGroup>();
    for (const session of sessions) {
      if (session.isSubagent) continue;
      let group = projectMap.get(session.projectDir);
      if (!group) {
        group = {
          name: session.project,
          dirName: session.projectDir,
          sessions: [],
        };
        projectMap.set(session.projectDir, group);
      }
      group.sessions.push(session);
    }

    const projects = Array.from(projectMap.values());

    return { sessions, projects };
  }

  private updateSessionFromEvent(event: HookEvent): void {
    const existing = this.state.sessions.find((s) => s.id === event.sessionId);

    if (existing) {
      existing.status = this.statusFromEventType(event.type);
      existing.lastActivity = event.timestamp;
      if (event.project) existing.project = event.project;
    } else {
      this.state.sessions.push({
        id: event.sessionId,
        project: event.project ?? 'unknown',
        projectDir: '',
        status: this.statusFromEventType(event.type),
        lastActivity: event.timestamp,
        isSubagent: false,
        subagentIds: [],
        fileSize: 0,
      });
    }

    this.emitChange('sessions_updated');
  }

  private statusFromEventType(type: string): Session['status'] {
    switch (type) {
      case 'stop':
      case 'teammate_idle':
      case 'subagent_stop':
        return 'idle';
      case 'permission_prompt':
        return 'waiting-approval';
      case 'idle_prompt':
        return 'waiting-input';
      case 'error':
        return 'error';
      default:
        return 'working';
    }
  }

  private async getLivePaneIds(): Promise<Set<string>> {
    try {
      const { stdout } = await execFileAsync('tmux', ['list-panes', '-a', '-F', '#{pane_id}']);
      return new Set(stdout.trim().split('\n').filter(Boolean));
    } catch {
      // tmux not running or not installed
      return new Set();
    }
  }

  private emitChange(type: WsMessageType): void {
    this.emit('change', type);
  }
}
