// ---------------------------------------------------------------------------
// LogPanel — Reverse-chronological activity feed (management sim message log)
// ---------------------------------------------------------------------------

import { useState, useMemo } from 'react';
import {
  AlertTriangle, CheckCircle2, Play, Square, ChevronRight,
  Clock, Zap, ScrollText, ChevronDown,
} from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboard-store';
import {
  SectionHeader, PIXEL_CARD, PARCHMENT, ParchmentDivider,
} from './panelUtils';
import type { HookEvent, Session, DirectiveState, PipelineStep } from '@/stores/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventPriority = 'high' | 'medium' | 'low';
type FilterMode = 'important' | 'all';

interface FeedEvent {
  id: string;
  timestamp: string;
  icon: React.ReactNode;
  iconColor: string;
  description: string;
  detail?: string;
  priority: EventPriority;
  source: 'hook' | 'session' | 'directive' | 'pipeline';
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
// Event builders
// ---------------------------------------------------------------------------

function buildHookEvents(events: HookEvent[]): FeedEvent[] {
  return events.map((e) => {
    const { icon, color } = hookEventIcon(e.type);
    return {
      id: `hook-${e.id}`,
      timestamp: e.timestamp,
      icon,
      iconColor: color,
      description: e.message || `${e.type} event`,
      detail: e.project ? `Project: ${e.project}` : undefined,
      priority: classifyHookEvent(e.type),
      source: 'hook' as const,
    };
  });
}

function buildSessionEvents(sessions: Session[]): FeedEvent[] {
  const items: FeedEvent[] = [];

  for (const s of sessions) {
    if (s.isSubagent) continue;
    const agentLabel = s.agentName ?? s.slug ?? s.id.slice(0, 8);

    // Error sessions
    if (s.status === 'error') {
      items.push({
        id: `sess-err-${s.id}`,
        timestamp: s.lastActivity,
        icon: <AlertTriangle className="h-3 w-3" />,
        iconColor: '#EF4444',
        description: `${agentLabel} encountered an error`,
        detail: s.feature ?? s.latestPrompt ?? undefined,
        priority: 'high',
        source: 'session',
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
        detail: s.feature ?? s.latestPrompt ?? undefined,
        priority: 'high',
        source: 'session',
      });
    }

    // Working sessions (low priority — agent started)
    if (s.status === 'working') {
      items.push({
        id: `sess-work-${s.id}`,
        timestamp: s.lastActivity,
        icon: <Play className="h-3 w-3" />,
        iconColor: '#3B82F6',
        description: `${agentLabel} is working`,
        detail: s.feature ?? s.latestPrompt ?? undefined,
        priority: 'low',
        source: 'session',
      });
    }

    // Idle/paused (low priority)
    if (s.status === 'idle' || s.status === 'paused') {
      items.push({
        id: `sess-idle-${s.id}`,
        timestamp: s.lastActivity,
        icon: <Square className="h-3 w-3" />,
        iconColor: '#9CA3AF',
        description: `${agentLabel} went idle`,
        priority: 'low',
        source: 'session',
      });
    }
  }

  return items;
}

function buildDirectiveEvents(directiveState: DirectiveState | null): FeedEvent[] {
  if (!directiveState) return [];

  const items: FeedEvent[] = [];
  const name = directiveState.title || directiveState.directiveName;

  // Directive started
  if (directiveState.startedAt) {
    items.push({
      id: `dir-start-${directiveState.directiveName}`,
      timestamp: directiveState.startedAt,
      icon: <Play className="h-3 w-3" />,
      iconColor: '#8B5CF6',
      description: `Directive started: ${name}`,
      priority: 'high',
      source: 'directive',
    });
  }

  // Directive completed/failed
  if (directiveState.status === 'completed' || directiveState.status === 'failed') {
    items.push({
      id: `dir-end-${directiveState.directiveName}`,
      timestamp: directiveState.lastUpdated,
      icon: directiveState.status === 'completed'
        ? <CheckCircle2 className="h-3 w-3" />
        : <AlertTriangle className="h-3 w-3" />,
      iconColor: directiveState.status === 'completed' ? '#22C55E' : '#EF4444',
      description: `Directive ${directiveState.status}: ${name}`,
      priority: 'high',
      source: 'directive',
    });
  }

  return items;
}

function buildPipelineEvents(directiveState: DirectiveState | null): FeedEvent[] {
  if (!directiveState?.pipelineSteps) return [];

  const items: FeedEvent[] = [];

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

    items.push({
      id: `pipe-${step.id}`,
      timestamp: step.startedAt,
      icon: statusIcon,
      iconColor: statusColor,
      description: `Pipeline: ${step.label}`,
      detail: step.status === 'active' ? 'In progress' : step.status,
      priority: 'medium',
      source: 'pipeline',
    });
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
// Filter toggle component
// ---------------------------------------------------------------------------

function FilterToggle({
  mode,
  onChange,
}: {
  mode: FilterMode;
  onChange: (mode: FilterMode) => void;
}) {
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
      {(['important', 'all'] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          className="px-2.5 py-1 font-bold uppercase tracking-wider transition-all"
          style={{
            color: mode === m ? PARCHMENT.bg : PARCHMENT.textDim,
            backgroundColor: mode === m ? '#5C3D2E' : 'transparent',
            boxShadow: mode === m
              ? 'inset 0 1px 0 0 #6B4C3B, inset 0 -1px 0 0 #3D2B1F'
              : 'none',
          }}
          onClick={() => onChange(m)}
        >
          {m === 'important' ? 'Important' : 'All'}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single feed entry
// ---------------------------------------------------------------------------

function FeedEntry({ event }: { event: FeedEvent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="flex gap-2 px-2 py-1.5 font-mono"
      style={PIXEL_CARD}
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
          <span
            className="text-[9px] tabular-nums shrink-0 mt-0.5"
            style={{ color: PARCHMENT.textDim }}
          >
            {formatTime(event.timestamp)}
          </span>
        </div>

        {/* Detail — inline for short text, expandable for long */}
        {event.detail && event.detail.length < 50 && (
          <p
            className="text-[10px] mt-0.5 leading-snug"
            style={{ color: PARCHMENT.textDim }}
          >
            {event.detail}
          </p>
        )}
        {event.detail && event.detail.length >= 50 && (
          <>
            <button
              type="button"
              className="flex items-center gap-0.5 text-[9px] mt-0.5 cursor-pointer"
              style={{ color: PARCHMENT.accent }}
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
            >
              <ChevronDown
                className="h-2.5 w-2.5 transition-transform"
                style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
              />
              <span>{expanded ? 'hide' : 'details'}</span>
            </button>
            {expanded && (
              <p
                className="text-[10px] mt-0.5 leading-snug pl-3"
                style={{ color: PARCHMENT.textDim }}
              >
                {event.detail}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LogPanel
// ---------------------------------------------------------------------------

export default function LogPanel() {
  const events = useDashboardStore((s) => s.events);
  const sessions = useDashboardStore((s) => s.sessions);
  const directiveState = useDashboardStore((s) => s.directiveState);

  const [filter, setFilter] = useState<FilterMode>('important');

  // Build unified feed
  const allEvents = useMemo<FeedEvent[]>(() => {
    const hook = buildHookEvents(events);
    const sess = buildSessionEvents(sessions);
    const dir = buildDirectiveEvents(directiveState);
    const pipe = buildPipelineEvents(directiveState);

    // Combine and sort newest-first
    return [...hook, ...sess, ...dir, ...pipe].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [events, sessions, directiveState]);

  // Apply filter
  const filteredEvents = useMemo(() => {
    if (filter === 'all') return allEvents;
    // "Important" = high + medium priority
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

  // Filtered-empty state (events exist but none pass filter)
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
          <p className="text-xs font-bold" style={{ color: PARCHMENT.text }}>No important events</p>
          <p className="text-[10px] mt-0.5" style={{ color: PARCHMENT.textDim }}>
            Switch to &quot;All&quot; to see {allEvents.length} event{allEvents.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Date-grouped feed */}
      {groupedEvents.map((group, gi) => (
        <div key={group.label} className="space-y-1.5">
          {/* Date separator */}
          {gi > 0 && <ParchmentDivider ornament />}
          <div
            className="text-[10px] font-bold font-mono uppercase tracking-widest text-center py-0.5"
            style={{ color: PARCHMENT.accent }}
          >
            {group.label}
          </div>

          {/* Events in this group */}
          {group.events.map((event) => (
            <FeedEntry key={event.id} event={event} />
          ))}
        </div>
      ))}
    </div>
  );
}
