// ---------------------------------------------------------------------------
// TeamPanel — game-style agent roster with pixel-art cards
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import { Swords, Coffee } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { useDashboardStore } from '@/stores/dashboard-store';
import QuickActions from '@/components/shared/QuickActions';
import { OFFICE_AGENTS, type AgentStatus } from '../types';
import {
  SectionHeader, StatusChip, PIXEL_CARD, PIXEL_CARD_RAISED,
  ParchmentDivider, PARCHMENT,
} from './panelUtils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TeamPanelProps {
  agentStatuses: Record<string, AgentStatus>;
  onSelectAgent?: (agentName: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract a meaningful task description from a session prompt */
function extractTask(prompt: string | undefined): string | undefined {
  if (!prompt) return undefined;
  // Strip "You are X, role." prefix
  const afterIntro = prompt.replace(/^You are [^.]+\.\s*/i, '');
  if (afterIntro === prompt || !afterIntro) return undefined;
  const first = afterIntro.split(/[.\n]/)[0]?.trim();
  return first ? (first.length > 80 ? first.slice(0, 77) + '...' : first) : undefined;
}

// ---------------------------------------------------------------------------
// Derived agent info — scan ALL sessions per agent
// ---------------------------------------------------------------------------

interface AgentInfo {
  agent: (typeof OFFICE_AGENTS)[0];
  status: AgentStatus;
  /** Best task description we could find */
  taskName: string | undefined;
  /** Current tool + detail from the most recent active session */
  toolName: string | undefined;
  toolDetail: string | undefined;
  /** Most recent lastActivity across all sessions */
  lastActivity: string | undefined;
  /** Session status for the most relevant session */
  sessionStatus: string | undefined;
  /** For waiting sessions: paneId and related info */
  paneId: string | undefined;
  terminalApp: string | undefined;
  /** Git branch */
  gitBranch: string | undefined;
  /** Active subagent names */
  subagentNames: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TeamPanel({ agentStatuses, onSelectAgent }: TeamPanelProps) {
  const sessions = useDashboardStore((s) => s.sessions);
  const sessionActivities = useDashboardStore((s) => s.sessionActivities);

  const agentData = useMemo(() => {
    const active: AgentInfo[] = [];
    const inactive: Array<{ agent: (typeof OFFICE_AGENTS)[0]; status: AgentStatus }> = [];

    for (const a of OFFICE_AGENTS) {
      if (a.isPlayer) continue;
      const st = agentStatuses[a.agentName] ?? 'offline';

      if (st === 'working' || st === 'waiting') {
        // Collect ALL sessions for this agent
        const allSessions = sessions.filter(
          (s) => s.agentName === a.agentName && s.status !== 'done',
        );

        // Find best task name: feature > prompt extraction, from any session
        let taskName: string | undefined;
        let bestLastActivity: string | undefined;
        let bestSessionStatus: string | undefined;
        let bestPaneId: string | undefined;
        let bestTerminalApp: string | undefined;
        let gitBranch: string | undefined;

        // Sort by activity recency
        const sorted = [...allSessions].sort(
          (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime(),
        );

        for (const s of sorted) {
          if (!taskName && s.feature) taskName = s.feature;
          if (!taskName) {
            const extracted = extractTask(s.latestPrompt ?? s.initialPrompt);
            if (extracted) taskName = extracted;
          }
          if (!bestLastActivity) bestLastActivity = s.lastActivity;
          if (!bestSessionStatus && (s.status === 'working' || s.status === 'waiting-approval' || s.status === 'waiting-input')) {
            bestSessionStatus = s.status;
            bestPaneId = s.paneId;
            bestTerminalApp = s.terminalApp;
          }
          if (!gitBranch && s.gitBranch) gitBranch = s.gitBranch;
        }

        // Find best activity: scan all sessions for the most recent tool use
        let toolName: string | undefined;
        let toolDetail: string | undefined;
        for (const s of sorted) {
          const act = sessionActivities[s.id];
          if (act?.active && act.tool) {
            toolName = act.tool;
            toolDetail = act.detail;
            break;
          }
        }
        // If no active tool, check for thinking
        if (!toolName) {
          for (const s of sorted) {
            const act = sessionActivities[s.id];
            if (act?.active && act.thinking) {
              toolName = 'thinking';
              break;
            }
          }
        }

        // Subagent names from primary session
        const primary = sorted.find((s) => !s.isSubagent);
        const subagentNames = primary?.activeSubagentNames ?? [];

        active.push({
          agent: a,
          status: st,
          taskName,
          toolName,
          toolDetail,
          lastActivity: bestLastActivity,
          sessionStatus: bestSessionStatus ?? 'working',
          paneId: bestPaneId,
          terminalApp: bestTerminalApp,
          gitBranch,
          subagentNames,
        });
      } else {
        inactive.push({ agent: a, status: st });
      }
    }
    return { active, inactive };
  }, [agentStatuses, sessions, sessionActivities]);

  return (
    <div className="space-y-3">
      {/* Active agents */}
      {agentData.active.length > 0 && (
        <div className="space-y-2">
          <SectionHeader
            icon={<Swords className="h-3 w-3" />}
            count={agentData.active.length}
            color="#5B8C3E"
          >
            Working
          </SectionHeader>

          {agentData.active.map((info) => {
            const isWaiting = info.sessionStatus === 'waiting-approval' || info.sessionStatus === 'waiting-input';

            return (
              <button
                key={info.agent.agentName}
                type="button"
                className="w-full text-left p-0 transition-all cursor-pointer group"
                style={{
                  ...PIXEL_CARD_RAISED,
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onClick={() => onSelectAgent?.(info.agent.agentName)}
                aria-label={`View ${info.agent.agentName} details`}
              >
                {/* Colored left accent bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{
                    backgroundColor: info.agent.color,
                    boxShadow: `1px 0 0 0 ${info.agent.color}40`,
                  }}
                />

                <div className="pl-3 pr-2 py-2 space-y-1">
                  {/* Row 1: Agent name + status */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'h-2.5 w-2.5 rounded-sm shrink-0',
                        info.status === 'working' && 'animate-pulse',
                      )}
                      style={{
                        backgroundColor: info.agent.color,
                        boxShadow: info.status === 'working'
                          ? `0 0 6px ${info.agent.color}80`
                          : `0 0 2px ${info.agent.color}40`,
                      }}
                    />
                    <span
                      className="text-xs font-bold font-mono truncate"
                      style={{ color: PARCHMENT.text }}
                    >
                      {info.agent.agentName}
                    </span>
                    <span className="ml-auto shrink-0 flex items-center gap-1">
                      {info.lastActivity && (
                        <span
                          className="text-[9px] font-mono tabular-nums"
                          style={{ color: PARCHMENT.textDim }}
                        >
                          {timeAgo(info.lastActivity)}
                        </span>
                      )}
                      <StatusChip
                        status={info.sessionStatus ?? 'working'}
                        animated={info.status === 'working'}
                      />
                    </span>
                  </div>

                  {/* Task description */}
                  {info.taskName && (
                    <p
                      className="text-[11px] leading-tight font-mono"
                      style={{ color: PARCHMENT.text }}
                    >
                      {info.taskName}
                    </p>
                  )}

                  {/* Current tool activity */}
                  {info.toolName && (
                    <div
                      className="flex items-center gap-1 text-[10px] font-mono"
                      style={{ color: '#5B8C3E' }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0 animate-pulse"
                        style={{ backgroundColor: '#5B8C3E' }}
                      />
                      <span className="truncate">
                        {info.toolName === 'thinking' ? 'Thinking...' : (
                          <>
                            <span className="font-semibold">{info.toolName}</span>
                            {info.toolDetail && (
                              <span style={{ color: PARCHMENT.textDim }}>
                                ({info.toolDetail})
                              </span>
                            )}
                          </>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Git branch */}
                  {info.gitBranch && (
                    <div
                      className="text-[9px] font-mono truncate"
                      style={{ color: PARCHMENT.textDim }}
                    >
                      &#x2387; {info.gitBranch}
                    </div>
                  )}

                  {/* Subagent chips */}
                  {info.subagentNames.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {info.subagentNames.slice(0, 4).map((name) => (
                        <span
                          key={name}
                          className="text-[9px] font-mono px-1 py-0.5 rounded-sm"
                          style={{
                            backgroundColor: '#5B8C3E20',
                            color: '#3D6B26',
                            border: '1px solid #5B8C3E30',
                          }}
                        >
                          {name}
                        </span>
                      ))}
                      {info.subagentNames.length > 4 && (
                        <span
                          className="text-[9px] font-mono"
                          style={{ color: PARCHMENT.textDim }}
                        >
                          +{info.subagentNames.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Quick actions for waiting */}
                  {isWaiting && info.paneId && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <QuickActions
                        paneId={info.paneId}
                        sessionStatus={info.sessionStatus!}
                        terminalApp={info.terminalApp as any}
                      />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {agentData.active.length > 0 && agentData.inactive.length > 0 && (
        <ParchmentDivider ornament />
      )}

      {/* All-idle banner when nobody is working */}
      {agentData.active.length === 0 && agentData.inactive.length > 0 && (
        <p
          className="text-[11px] font-mono text-center py-1"
          style={{ color: PARCHMENT.textDim }}
        >
          All agents idle
        </p>
      )}

      {/* Inactive agents — compact grid */}
      {agentData.inactive.length > 0 && (
        <div className="space-y-2">
          <SectionHeader
            icon={<Coffee className="h-3 w-3" />}
            count={agentData.inactive.length}
          >
            Off Duty
          </SectionHeader>

          <div className="grid grid-cols-2 gap-1.5">
            {agentData.inactive.map(({ agent, status }) => (
              <button
                key={agent.agentName}
                type="button"
                className="text-left p-0 transition-all cursor-pointer"
                style={{
                  ...PIXEL_CARD,
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onClick={() => onSelectAgent?.(agent.agentName)}
                aria-label={`View ${agent.agentName} details`}
              >
                {/* Colored left accent */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-0.5"
                  style={{
                    backgroundColor: agent.color,
                    opacity: status === 'idle' ? 0.6 : 0.25,
                  }}
                />

                <div className="pl-2.5 pr-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-sm shrink-0"
                      style={{
                        backgroundColor: agent.color,
                        opacity: status === 'idle' ? 0.6 : 0.25,
                      }}
                    />
                    <div className="min-w-0">
                      <div
                        className="text-[11px] font-semibold font-mono truncate"
                        style={{ color: PARCHMENT.text }}
                      >
                        {agent.agentName}
                      </div>
                      <div
                        className="text-[9px] font-mono truncate"
                        style={{ color: PARCHMENT.textDim }}
                      >
                        {agent.agentRole}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
