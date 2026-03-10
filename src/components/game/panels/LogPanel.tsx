// ---------------------------------------------------------------------------
// LogPanel — Reverse-chronological activity feed (management sim message log)
// ---------------------------------------------------------------------------

/** Strip agent preamble noise from prompt text for display */
function cleanPrompt(raw: string | undefined, maxLen = 80): string | undefined {
  if (!raw) return undefined;
  let t = raw;
  t = t.replace(/^You are [^.]+\.\s*/i, '');
  t = t.replace(/^Your\s+(?:job|task|goal|objective|mission)\s*(?:is\s+to)?[:\s]*/i, '');
  t = t.replace(/^The CEO\s+[^.\n]*\.\s*/i, '');
  t = t.replace(/^(?:Don't|Do not|Never|Always|Think|Remember)[^.\n]*\.\s*/i, '');
  t = t.replace(/^Socratic refinement\.\s*/i, '');
  t = t.replace(/^(?:QUESTION|CONTEXT|BACKGROUND|INSTRUCTIONS?)\s*:\s*/i, '');
  t = t.trim();
  if (!t) return undefined;
  return t.length > maxLen ? t.slice(0, maxLen - 3) + '...' : t;
}

import { useState, useMemo, useRef, useEffect } from 'react';
import React from 'react';
import {
  AlertTriangle, CheckCircle2, Play, Square, ChevronRight,
  Clock, Zap, ScrollText, ChevronDown, Users, ClipboardList,
  Wifi, WifiOff,
} from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboard-store';
import {
  SectionHeader, PIXEL_CARD, PARCHMENT, ParchmentDivider, shortenModel,
} from './panelUtils';
import type {
  HookEvent, Session, DirectiveState, SessionActivity,
} from '@/stores/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventPriority = 'high' | 'medium' | 'low';
type FilterMode = 'important' | 'activity' | 'all';

/** Key-value metadata shown in expanded view */
interface MetaItem {
  label: string;
  value: string;
}

interface FeedEvent {
  id: string;
  timestamp: string;
  icon: React.ReactNode;
  iconColor: string;
  description: string;
  detail?: string;
  priority: EventPriority;
  source: 'hook' | 'session' | 'directive' | 'pipeline' | 'activity' | 'subagent' | 'task' | 'connection';
  /** Structured metadata for expanded view */
  meta?: MetaItem[];
}

// ---------------------------------------------------------------------------
// Priority classification for hook event types
// ---------------------------------------------------------------------------

function classifyHookEvent(type: string): EventPriority {
  const lower = type.toLowerCase();
  if (lower.includes('error')) return 'high';
  if (lower.includes('complet') || lower.includes('finish') || lower.includes('done')) return 'high';
  if (lower.includes('approv') || lower.includes('reject') || lower.includes('denied')) return 'medium';
  if (lower.includes('start') || lower.includes('begin')) return 'low';
  return 'low';
}

function hookEventIcon(type: string): { icon: React.ReactNode; color: string } {
  const lower = type.toLowerCase();
  if (lower.includes('error')) return { icon: <AlertTriangle className="h-3 w-3" />, color: '#EF4444' };
  if (lower.includes('complet') || lower.includes('done')) return { icon: <CheckCircle2 className="h-3 w-3" />, color: '#22C55E' };
  if (lower.includes('approv')) return { icon: <CheckCircle2 className="h-3 w-3" />, color: '#EAB308' };
  if (lower.includes('reject') || lower.includes('denied')) return { icon: <AlertTriangle className="h-3 w-3" />, color: '#EAB308' };
  if (lower.includes('start') || lower.includes('begin')) return { icon: <Play className="h-3 w-3" />, color: '#3B82F6' };
  return { icon: <Zap className="h-3 w-3" />, color: PARCHMENT.textDim };
}

// ---------------------------------------------------------------------------
// Session metadata builder
// ---------------------------------------------------------------------------

function sessionMeta(s: Session): MetaItem[] {
  const items: MetaItem[] = [];
  const modelShort = shortenModel(s.model);
  if (modelShort) items.push({ label: 'Model', value: modelShort });
  if (s.agentRole) items.push({ label: 'Role', value: s.agentRole });
  if (s.gitBranch) items.push({ label: 'Branch', value: s.gitBranch });
  if (s.feature) items.push({ label: 'Feature', value: s.feature });
  if (s.subagentIds && s.subagentIds.length > 0) {
    items.push({ label: 'Subagents', value: String(s.subagentIds.length) });
  }
  if (s.activeSubagentNames && s.activeSubagentNames.length > 0) {
    items.push({ label: 'Active subs', value: s.activeSubagentNames.join(', ') });
  }
  if (s.cwd) {
    const shortCwd = s.cwd.split('/').slice(-2).join('/');
    items.push({ label: 'Dir', value: shortCwd });
  }
  if (s.latestPrompt) {
    const prompt = cleanPrompt(s.latestPrompt, 200) ?? s.latestPrompt.slice(0, 197) + '...';
    items.push({ label: 'Prompt', value: prompt });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Event builders — static (pure functions of store data)
// ---------------------------------------------------------------------------

function buildHookEvents(events: HookEvent[]): FeedEvent[] {
  return events.map((e) => {
    const { icon, color } = hookEventIcon(e.type);
    const meta: MetaItem[] = [];
    if (e.project) meta.push({ label: 'Project', value: e.project });
    if (e.type) meta.push({ label: 'Type', value: e.type });
    if (e.sessionId) meta.push({ label: 'Session', value: e.sessionId.slice(0, 12) });
    if (e.metadata) {
      for (const [k, v] of Object.entries(e.metadata)) {
        if (typeof v === 'string' || typeof v === 'number') {
          meta.push({ label: k, value: String(v) });
        }
      }
    }
    return {
      id: `hook-${e.id}`,
      timestamp: e.timestamp,
      icon,
      iconColor: color,
      description: e.message || `${e.type} event`,
      detail: e.project ? `Project: ${e.project}` : undefined,
      priority: classifyHookEvent(e.type),
      source: 'hook' as const,
      meta: meta.length > 0 ? meta : undefined,
    };
  });
}

function buildSessionEvents(sessions: Session[]): FeedEvent[] {
  const items: FeedEvent[] = [];

  for (const s of sessions) {
    if (s.isSubagent) continue;
    const agentLabel = s.agentName ?? s.slug ?? s.id.slice(0, 8);
    const meta = sessionMeta(s);

    // Error sessions
    if (s.status === 'error') {
      items.push({
        id: `sess-err-${s.id}`,
        timestamp: s.lastActivity,
        icon: <AlertTriangle className="h-3 w-3" />,
        iconColor: '#EF4444',
        description: `${agentLabel} encountered an error`,
        detail: s.feature ?? cleanPrompt(s.latestPrompt) ?? undefined,
        priority: 'high',
        source: 'session',
        meta,
      });
    }

    // Done sessions
    if (s.status === 'done') {
      items.push({
        id: `sess-done-${s.id}`,
        timestamp: s.lastActivity,
        icon: <CheckCircle2 className="h-3 w-3" />,
        iconColor: '#22C55E',
        description: `${agentLabel} finished work`,
        detail: s.feature ?? undefined,
        priority: 'high',
        source: 'session',
        meta,
      });
    }

    // Waiting sessions — elevated priority (CEO needs to act)
    if (s.status === 'waiting-approval' || s.status === 'waiting-input') {
      items.push({
        id: `sess-wait-${s.id}`,
        timestamp: s.lastActivity,
        icon: <Clock className="h-3 w-3" />,
        iconColor: '#EAB308',
        description: `${agentLabel} waiting for ${s.status === 'waiting-approval' ? 'approval' : 'input'}`,
        detail: s.feature ?? undefined,
        priority: 'high',
        source: 'session',
        meta,
      });
    }

    // Working sessions
    if (s.status === 'working') {
      items.push({
        id: `sess-work-${s.id}`,
        timestamp: s.lastActivity,
        icon: <Play className="h-3 w-3" />,
        iconColor: '#3B82F6',
        description: `${agentLabel} is working`,
        detail: s.feature ?? undefined,
        priority: 'low',
        source: 'session',
        meta,
      });
    }

    // Idle/paused
    if (s.status === 'idle' || s.status === 'paused') {
      items.push({
        id: `sess-idle-${s.id}`,
        timestamp: s.lastActivity,
        icon: <Square className="h-3 w-3" />,
        iconColor: '#9CA3AF',
        description: `${agentLabel} went idle`,
        priority: 'low',
        source: 'session',
        meta: meta.length > 0 ? meta : undefined,
      });
    }
  }

  return items;
}

function buildDirectiveEvents(
  activeDirectives: DirectiveState[],
  directiveHistory: DirectiveState[],
): FeedEvent[] {
  const items: FeedEvent[] = [];
  const seen = new Set<string>();

  const allDirectives = [...activeDirectives, ...directiveHistory];

  for (const ds of allDirectives) {
    const name = ds.title || ds.directiveName;
    const badge = ds.weight ? `[${ds.weight}] ` : '';

    // Build meta for this directive
    const meta: MetaItem[] = [];
    if (ds.weight) meta.push({ label: 'Weight', value: ds.weight });
    if (ds.totalProjects > 0) meta.push({ label: 'Projects', value: `${ds.currentProject}/${ds.totalProjects}` });
    if (ds.currentStepId) meta.push({ label: 'Step', value: ds.currentStepId });
    if (ds.currentPhase) meta.push({ label: 'Phase', value: ds.currentPhase });
    if (ds.pipelineSteps) {
      const done = ds.pipelineSteps.filter((s) => s.status === 'completed' || s.status === 'skipped').length;
      meta.push({ label: 'Pipeline', value: `${done}/${ds.pipelineSteps.length} steps` });
    }
    if (ds.brainstormSummary) meta.push({ label: 'Brainstorm', value: ds.brainstormSummary });
    if (ds.planSummary) meta.push({ label: 'Plan', value: ds.planSummary });
    if (ds.triageRationale) meta.push({ label: 'Triage', value: ds.triageRationale });
    if (ds.projects && ds.projects.length > 0) {
      for (const p of ds.projects) {
        const taskInfo = p.totalTasks ? ` (${p.completedTasks ?? 0}/${p.totalTasks} tasks)` : '';
        meta.push({ label: 'Project', value: `${p.title} — ${p.status}${taskInfo}` });
      }
    }

    // Directive started
    if (ds.startedAt) {
      const key = `${ds.directiveName}-started`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({
          id: `dir-start-${ds.directiveName}`,
          timestamp: ds.startedAt,
          icon: <Play className="h-3 w-3" />,
          iconColor: '#8B5CF6',
          description: `${badge}Directive started: ${name}`,
          priority: 'high',
          source: 'directive',
          meta,
        });
      }
    }

    // Directive completed/failed
    if (ds.status === 'completed' || ds.status === 'failed') {
      const key = `${ds.directiveName}-${ds.status}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({
          id: `dir-end-${ds.directiveName}`,
          timestamp: ds.lastUpdated,
          icon: ds.status === 'completed'
            ? <CheckCircle2 className="h-3 w-3" />
            : <AlertTriangle className="h-3 w-3" />,
          iconColor: ds.status === 'completed' ? '#22C55E' : '#EF4444',
          description: `${badge}Directive ${ds.status}: ${name}`,
          priority: 'high',
          source: 'directive',
          meta,
        });
      }
    }

    // Awaiting completion
    if (ds.status === 'awaiting_completion') {
      const key = `${ds.directiveName}-awaiting`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({
          id: `dir-await-${ds.directiveName}`,
          timestamp: ds.lastUpdated,
          icon: <Clock className="h-3 w-3" />,
          iconColor: '#EAB308',
          description: `${badge}Awaiting completion: ${name}`,
          priority: 'medium',
          source: 'directive',
          meta,
        });
      }
    }
  }

  return items;
}

function buildPipelineEvents(directiveState: DirectiveState | null): FeedEvent[] {
  if (!directiveState?.pipelineSteps) return [];

  const items: FeedEvent[] = [];
  const dirName = directiveState.title || directiveState.directiveName;

  for (const step of directiveState.pipelineSteps) {
    if (!step.startedAt) continue;

    const statusIcon = step.status === 'completed'
      ? <CheckCircle2 className="h-3 w-3" />
      : step.status === 'failed'
        ? <AlertTriangle className="h-3 w-3" />
        : step.status === 'active'
          ? <Clock className="h-3 w-3" />
          : <ChevronRight className="h-3 w-3" />;

    const statusColor = step.status === 'completed' ? '#22C55E'
      : step.status === 'failed' ? '#EF4444'
      : step.status === 'active' ? '#EAB308'
      : PARCHMENT.textDim;

    const meta: MetaItem[] = [
      { label: 'Directive', value: dirName },
      { label: 'Step', value: step.label },
      { label: 'Status', value: step.status },
    ];
    if (step.artifacts) {
      for (const [k, v] of Object.entries(step.artifacts)) {
        meta.push({ label: k, value: v });
      }
    }

    items.push({
      id: `pipe-${step.id}`,
      timestamp: step.startedAt,
      icon: statusIcon,
      iconColor: statusColor,
      description: `Pipeline: ${step.label}`,
      detail: step.status === 'active' ? 'In progress' : step.status,
      priority: 'medium',
      source: 'pipeline',
      meta,
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Ref-diffing event builders (accumulated over time via useRef)
// ---------------------------------------------------------------------------

/** Composite key for activity dedup */
function activityKey(sessionId: string, tool?: string, detail?: string): string {
  return `${sessionId}:${tool ?? ''}:${detail ?? ''}`;
}

/** Build subagent events by diffing known subagent IDs against current sessions */
function diffSubagentEvents(
  sessions: Session[],
  knownSubagentIds: React.MutableRefObject<Set<string>>,
  prevSubagentStatuses: React.MutableRefObject<Record<string, string>>,
): FeedEvent[] {
  const items: FeedEvent[] = [];
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  for (const s of sessions) {
    if (!s.subagentIds || s.subagentIds.length === 0) continue;
    const parentLabel = s.agentName ?? s.slug ?? s.id.slice(0, 8);

    for (const childId of s.subagentIds) {
      const child = sessionMap.get(childId);
      const childLabel = child?.agentName ?? child?.slug ?? childId.slice(0, 8);

      const meta: MetaItem[] = [
        { label: 'Parent', value: parentLabel },
        { label: 'Child', value: childLabel },
      ];
      if (child) {
        const modelShort = shortenModel(child.model);
        if (modelShort) meta.push({ label: 'Model', value: modelShort });
        if (child.agentRole) meta.push({ label: 'Role', value: child.agentRole });
        if (child.feature) meta.push({ label: 'Feature', value: child.feature });
      }

      // New subagent spawn
      if (!knownSubagentIds.current.has(childId)) {
        knownSubagentIds.current.add(childId);
        items.push({
          id: `sub-spawn-${childId}-${Date.now()}`,
          timestamp: child?.lastActivity ?? new Date().toISOString(),
          icon: <Users className="h-3 w-3" />,
          iconColor: '#3B82F6',
          description: `${parentLabel} spawned subagent ${childLabel}`,
          detail: child?.feature ?? undefined,
          priority: 'medium',
          source: 'subagent',
          meta,
        });
      }

      // Status changes for known subagents
      if (child) {
        const prevStatus = prevSubagentStatuses.current[childId];
        if (prevStatus && prevStatus !== child.status) {
          if (child.status === 'done') {
            items.push({
              id: `sub-done-${childId}-${Date.now()}`,
              timestamp: child.lastActivity,
              icon: <CheckCircle2 className="h-3 w-3" />,
              iconColor: '#22C55E',
              description: `Subagent ${childLabel} completed (parent: ${parentLabel})`,
              detail: child.feature ?? undefined,
              priority: 'medium',
              source: 'subagent',
              meta,
            });
          } else if (child.status === 'error') {
            items.push({
              id: `sub-err-${childId}-${Date.now()}`,
              timestamp: child.lastActivity,
              icon: <AlertTriangle className="h-3 w-3" />,
              iconColor: '#EF4444',
              description: `Subagent ${childLabel} error (parent: ${parentLabel})`,
              detail: child.feature ?? undefined,
              priority: 'high',
              source: 'subagent',
              meta,
            });
          }
        }
        prevSubagentStatuses.current[childId] = child.status;
      }
    }
  }

  return items;
}

// ---------------------------------------------------------------------------
// Date grouping helpers
// ---------------------------------------------------------------------------

function dateLabelForTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();

  const dateStr = date.toDateString();
  const todayStr = now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';

  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ---------------------------------------------------------------------------
// Filter toggle component — 3 modes
// ---------------------------------------------------------------------------

function FilterToggle({
  mode,
  onChange,
}: {
  mode: FilterMode;
  onChange: (mode: FilterMode) => void;
}) {
  const modes: { value: FilterMode; label: string }[] = [
    { value: 'important', label: 'Key' },
    { value: 'activity', label: 'Agents' },
    { value: 'all', label: 'All' },
  ];

  return (
    <div
      className="flex font-mono text-[10px]"
      style={{
        backgroundColor: '#D4B89680',
        borderRadius: '2px',
        boxShadow: `inset 1px 1px 0 0 #A0804040, inset -1px -1px 0 0 #F5ECD740`,
        overflow: 'hidden',
      }}
      role="radiogroup"
      aria-label="Event filter"
    >
      {modes.map((m) => (
        <button
          key={m.value}
          type="button"
          role="radio"
          aria-checked={mode === m.value}
          className="px-2 py-1 font-bold uppercase tracking-wider transition-all"
          style={{
            color: mode === m.value ? PARCHMENT.bg : PARCHMENT.textDim,
            backgroundColor: mode === m.value ? '#5C3D2E' : 'transparent',
            boxShadow: mode === m.value
              ? 'inset 0 1px 0 0 #6B4C3B, inset 0 -1px 0 0 #3D2B1F'
              : 'none',
          }}
          onClick={() => onChange(m.value)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single feed entry (always expandable when meta exists)
// ---------------------------------------------------------------------------

function FeedEntry({ event }: { event: FeedEvent }) {
  const [expanded, setExpanded] = useState(false);
  const hasExpandable = (event.meta && event.meta.length > 0) || (event.detail && event.detail.length >= 50);
  const hasShortDetail = event.detail && event.detail.length > 0 && event.detail.length < 50 && !hasExpandable;

  return (
    <div
      style={PIXEL_CARD}
    >
      {/* Clickable header area */}
      {hasExpandable ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full text-left flex gap-2 px-2 py-1.5 font-mono transition-colors"
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = PARCHMENT.cardHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
          aria-expanded={expanded}
        >
          {/* Icon */}
          <span
            className="flex items-center justify-center shrink-0 mt-0.5"
            style={{ color: event.iconColor }}
            aria-hidden="true"
          >
            {event.icon}
          </span>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1">
              <p
                className="text-[11px] leading-snug flex-1"
                style={{ color: PARCHMENT.text }}
              >
                {event.description}
              </p>
              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                <span
                  className="text-[9px] tabular-nums"
                  style={{ color: PARCHMENT.textDim }}
                >
                  {formatTime(event.timestamp)}
                </span>
                <ChevronDown
                  className="h-2.5 w-2.5 transition-transform"
                  style={{
                    color: PARCHMENT.accent,
                    transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                  }}
                />
              </div>
            </div>
            {/* Inline short detail preview */}
            {event.detail && !expanded && (
              <p
                className="text-[9px] mt-0.5 leading-snug truncate"
                style={{ color: PARCHMENT.textDim }}
              >
                {event.detail}
              </p>
            )}
          </div>
        </button>
      ) : (
        <div className="flex gap-2 px-2 py-1.5 font-mono">
          <span
            className="flex items-center justify-center shrink-0 mt-0.5"
            style={{ color: event.iconColor }}
            aria-hidden="true"
          >
            {event.icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1">
              <p
                className="text-[11px] leading-snug flex-1"
                style={{ color: PARCHMENT.text }}
              >
                {event.description}
              </p>
              <span
                className="text-[9px] tabular-nums shrink-0 mt-0.5"
                style={{ color: PARCHMENT.textDim }}
              >
                {formatTime(event.timestamp)}
              </span>
            </div>
            {hasShortDetail && (
              <p
                className="text-[10px] mt-0.5 leading-snug"
                style={{ color: PARCHMENT.textDim }}
              >
                {event.detail}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div
          className="px-2 pb-2 font-mono"
          style={{ borderTop: `1px solid ${PARCHMENT.border}30` }}
        >
          {/* Full detail text */}
          {event.detail && (
            <p
              className="text-[10px] mt-1.5 leading-snug"
              style={{ color: PARCHMENT.textDim }}
            >
              {event.detail}
            </p>
          )}

          {/* Structured metadata table */}
          {event.meta && event.meta.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {event.meta.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <span
                    className="text-[9px] font-bold shrink-0 w-[60px] text-right"
                    style={{ color: PARCHMENT.accent }}
                  >
                    {item.label}
                  </span>
                  <span
                    className="text-[9px] flex-1 break-words"
                    style={{ color: PARCHMENT.textDim }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity event throttle constant
// ---------------------------------------------------------------------------

const ACTIVITY_THROTTLE_MS = 3000;
const ACTIVITY_BUFFER_MAX = 50;

// ---------------------------------------------------------------------------
// LogPanel
// ---------------------------------------------------------------------------

export default function LogPanel() {
  const events = useDashboardStore((s) => s.events);
  const sessions = useDashboardStore((s) => s.sessions);
  const directiveState = useDashboardStore((s) => s.directiveState);
  const activeDirectives = useDashboardStore((s) => s.activeDirectives);
  const directiveHistory = useDashboardStore((s) => s.directiveHistory);
  const sessionActivities = useDashboardStore((s) => s.sessionActivities);
  const connected = useDashboardStore((s) => s.connected);
  const tasksBySession = useDashboardStore((s) => s.tasksBySession);

  const [filter, setFilter] = useState<FilterMode>('important');

  // -- Ref-based accumulators for diff-driven events --

  // Activity diffing
  const prevActivitiesRef = useRef<Record<string, SessionActivity>>({});
  const activityBufferRef = useRef<FeedEvent[]>([]);
  const activityLastEmitRef = useRef<Record<string, number>>({});
  const activityDedupeRef = useRef<Set<string>>(new Set());

  // Connection tracking
  const prevConnectedRef = useRef<boolean | null>(null);
  const connectionBufferRef = useRef<FeedEvent[]>([]);

  // Subagent tracking
  const knownSubagentIdsRef = useRef<Set<string>>(new Set());
  const prevSubagentStatusesRef = useRef<Record<string, string>>({});
  const subagentBufferRef = useRef<FeedEvent[]>([]);

  // Task tracking
  const prevTaskStatusesRef = useRef<Record<string, string>>({});
  const taskBufferRef = useRef<FeedEvent[]>([]);

  // -- Effect: diff sessionActivities snapshot --
  useEffect(() => {
    const prev = prevActivitiesRef.current;
    const now = Date.now();

    for (const [sessionId, activity] of Object.entries(sessionActivities)) {
      const prevAct = prev[sessionId];

      // Check if tool, detail, or thinking changed
      const changed =
        !prevAct ||
        prevAct.tool !== activity.tool ||
        prevAct.detail !== activity.detail ||
        prevAct.thinking !== activity.thinking;

      if (!changed) continue;

      // Throttle: max 1 event per session per 3 seconds
      const lastEmit = activityLastEmitRef.current[sessionId] ?? 0;
      if (now - lastEmit < ACTIVITY_THROTTLE_MS) continue;

      // Dedup by composite key
      const key = activityKey(sessionId, activity.tool, activity.detail);
      if (activityDedupeRef.current.has(key)) continue;
      activityDedupeRef.current.add(key);

      // Find session for label
      const session = sessions.find((s) => s.id === sessionId);
      const agentLabel = session?.agentName ?? session?.slug ?? sessionId.slice(0, 8);

      let description = `${agentLabel}`;
      if (activity.thinking) {
        description += ' is thinking';
      } else if (activity.tool) {
        description += ` using ${activity.tool}`;
      } else {
        description += ' activity changed';
      }

      const meta: MetaItem[] = [];
      if (activity.tool) meta.push({ label: 'Tool', value: activity.tool });
      if (activity.detail) meta.push({ label: 'Detail', value: activity.detail });
      const modelShort = shortenModel(activity.model);
      if (modelShort) meta.push({ label: 'Model', value: modelShort });
      if (session?.feature) meta.push({ label: 'Feature', value: session.feature });

      activityBufferRef.current.push({
        id: `act-${sessionId}-${now}`,
        timestamp: activity.lastSeen || new Date().toISOString(),
        icon: <Zap className="h-3 w-3" />,
        iconColor: '#3B82F6',
        description,
        detail: activity.detail ?? undefined,
        priority: 'low',
        source: 'activity',
        meta: meta.length > 0 ? meta : undefined,
      });

      activityLastEmitRef.current[sessionId] = now;
    }

    // Cap buffer
    if (activityBufferRef.current.length > ACTIVITY_BUFFER_MAX) {
      activityBufferRef.current = activityBufferRef.current.slice(-ACTIVITY_BUFFER_MAX);
    }

    prevActivitiesRef.current = { ...sessionActivities };
  }, [sessionActivities, sessions]);

  // -- Effect: diff connection state --
  useEffect(() => {
    if (prevConnectedRef.current === null) {
      prevConnectedRef.current = connected;
      return;
    }

    if (prevConnectedRef.current !== connected) {
      connectionBufferRef.current.push({
        id: `conn-${Date.now()}`,
        timestamp: new Date().toISOString(),
        icon: connected
          ? <Wifi className="h-3 w-3" />
          : <WifiOff className="h-3 w-3" />,
        iconColor: connected ? '#22C55E' : '#EF4444',
        description: connected ? 'Connected to server' : 'Disconnected from server',
        priority: 'high',
        source: 'connection',
      });
      prevConnectedRef.current = connected;
    }
  }, [connected]);

  // -- Effect: seed known subagent IDs once data arrives (prevents initial spam) --
  const subagentSeededRef = useRef(false);
  useEffect(() => {
    if (subagentSeededRef.current) return;
    if (sessions.length === 0) return;
    subagentSeededRef.current = true;
    for (const s of sessions) {
      if (!s.subagentIds) continue;
      for (const childId of s.subagentIds) {
        knownSubagentIdsRef.current.add(childId);
        const child = sessions.find((ss) => ss.id === childId);
        if (child) prevSubagentStatusesRef.current[childId] = child.status;
      }
    }
  }, [sessions]);

  // -- Effect: diff subagent state (after seeding) --
  useEffect(() => {
    if (!subagentSeededRef.current) return;
    const newEvents = diffSubagentEvents(
      sessions,
      knownSubagentIdsRef,
      prevSubagentStatusesRef,
    );
    if (newEvents.length > 0) {
      subagentBufferRef.current.push(...newEvents);
      if (subagentBufferRef.current.length > ACTIVITY_BUFFER_MAX) {
        subagentBufferRef.current = subagentBufferRef.current.slice(-ACTIVITY_BUFFER_MAX);
      }
    }
  }, [sessions]);

  // -- Effect: seed task statuses once data arrives --
  const taskSeededRef = useRef(false);
  useEffect(() => {
    if (taskSeededRef.current) return;
    if (Object.keys(tasksBySession).length === 0) return;
    taskSeededRef.current = true;
    for (const [sessionId, tasks] of Object.entries(tasksBySession)) {
      for (const task of tasks) {
        prevTaskStatusesRef.current[`${sessionId}:${task.id}`] = task.status;
      }
    }
  }, [tasksBySession]);

  // -- Effect: diff task statuses --
  useEffect(() => {
    if (!taskSeededRef.current) return;
    const prevStatuses = prevTaskStatusesRef.current;
    const nextStatuses: Record<string, string> = {};

    for (const [sessionId, tasks] of Object.entries(tasksBySession)) {
      const session = sessions.find((s) => s.id === sessionId);
      const ownerLabel = session?.agentName ?? session?.slug ?? sessionId.slice(0, 8);

      for (const task of tasks) {
        const taskKey = `${sessionId}:${task.id}`;
        nextStatuses[taskKey] = task.status;

        const prevStatus = prevStatuses[taskKey];
        if (!prevStatus) continue;

        if (prevStatus !== task.status) {
          const meta: MetaItem[] = [
            { label: 'Task', value: task.subject },
            { label: 'Owner', value: task.owner || ownerLabel },
            { label: 'Status', value: `${prevStatus} → ${task.status}` },
          ];
          if (task.description) meta.push({ label: 'Description', value: task.description });

          if (task.status === 'in_progress') {
            taskBufferRef.current.push({
              id: `task-prog-${task.id}-${Date.now()}`,
              timestamp: new Date().toISOString(),
              icon: <ClipboardList className="h-3 w-3" />,
              iconColor: '#3B82F6',
              description: `Task started: ${task.subject}`,
              detail: `Owner: ${task.owner || ownerLabel}`,
              priority: 'medium',
              source: 'task',
              meta,
            });
          } else if (task.status === 'completed') {
            taskBufferRef.current.push({
              id: `task-done-${task.id}-${Date.now()}`,
              timestamp: new Date().toISOString(),
              icon: <CheckCircle2 className="h-3 w-3" />,
              iconColor: '#22C55E',
              description: `Task completed: ${task.subject}`,
              detail: `Owner: ${task.owner || ownerLabel}`,
              priority: 'high',
              source: 'task',
              meta,
            });
          }
        }
      }
    }

    if (taskBufferRef.current.length > ACTIVITY_BUFFER_MAX) {
      taskBufferRef.current = taskBufferRef.current.slice(-ACTIVITY_BUFFER_MAX);
    }

    prevTaskStatusesRef.current = nextStatuses;
  }, [tasksBySession, sessions]);

  // -- Build unified feed --
  const allEvents = useMemo<FeedEvent[]>(() => {
    const hook = buildHookEvents(events);
    const sess = buildSessionEvents(sessions);
    const dir = buildDirectiveEvents(activeDirectives, directiveHistory);
    const pipe = buildPipelineEvents(directiveState);

    // Accumulated ref-based events
    const activityEvts = activityBufferRef.current;
    const connEvts = connectionBufferRef.current;
    const subEvts = subagentBufferRef.current;
    const taskEvts = taskBufferRef.current;

    return [
      ...hook, ...sess, ...dir, ...pipe,
      ...activityEvts, ...connEvts, ...subEvts, ...taskEvts,
    ].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [events, sessions, directiveState, activeDirectives, directiveHistory,
      sessionActivities, connected, tasksBySession]);

  // Apply filter
  const filteredEvents = useMemo(() => {
    if (filter === 'all') return allEvents;
    if (filter === 'activity') {
      const activitySources = new Set<FeedEvent['source']>([
        'session', 'activity', 'subagent', 'task',
      ]);
      return allEvents.filter((e) => activitySources.has(e.source));
    }
    return allEvents.filter((e) => e.priority === 'high' || e.priority === 'medium');
  }, [allEvents, filter]);

  // Group by date
  const groupedEvents = useMemo(() => {
    const groups: { label: string; events: FeedEvent[] }[] = [];
    let currentLabel = '';

    for (const event of filteredEvents) {
      const label = dateLabelForTimestamp(event.timestamp);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, events: [] });
      }
      groups[groups.length - 1].events.push(event);
    }

    return groups;
  }, [filteredEvents]);

  // Empty state
  if (allEvents.length === 0) {
    return (
      <div className="text-center py-8 font-mono" style={PIXEL_CARD}>
        <ScrollText
          className="h-6 w-6 mx-auto mb-2"
          style={{ color: PARCHMENT.textDim, opacity: 0.4 }}
          aria-hidden="true"
        />
        <p className="text-xs font-bold" style={{ color: PARCHMENT.text }}>No events yet</p>
        <p className="text-[10px] mt-0.5" style={{ color: PARCHMENT.textDim }}>
          Activity will appear here as agents work
        </p>
      </div>
    );
  }

  const showFilteredEmpty = filteredEvents.length === 0 && allEvents.length > 0;

  return (
    <div className="space-y-2">
      {/* Header with filter toggle */}
      <div className="flex items-center justify-between">
        <SectionHeader
          icon={<ScrollText className="h-3 w-3" />}
          count={filteredEvents.length}
        >
          Activity
        </SectionHeader>
        <FilterToggle mode={filter} onChange={setFilter} />
      </div>

      {showFilteredEmpty && (
        <div className="text-center py-6 font-mono" style={PIXEL_CARD}>
          <p className="text-xs font-bold" style={{ color: PARCHMENT.text }}>
            {filter === 'important' ? 'No important events' : 'No agent activity'}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: PARCHMENT.textDim }}>
            Switch to &quot;All&quot; to see {allEvents.length} event{allEvents.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Date-grouped feed */}
      {groupedEvents.map((group, gi) => (
        <div key={group.label} className="space-y-1.5">
          {gi > 0 && <ParchmentDivider ornament />}
          <div
            className="text-[10px] font-bold font-mono uppercase tracking-widest text-center py-0.5"
            style={{ color: PARCHMENT.accent }}
          >
            {group.label}
          </div>

          {group.events.map((event) => (
            <FeedEntry key={event.id} event={event} />
          ))}
        </div>
      ))}
    </div>
  );
}
