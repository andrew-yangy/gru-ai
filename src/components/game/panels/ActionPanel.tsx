// ---------------------------------------------------------------------------
// ActionPanel — CEO decision queue with urgency tiers (replaces InboxPanel)
// ---------------------------------------------------------------------------

import { useMemo, useCallback, useState } from 'react';
import {
  AlertTriangle, XCircle, Clock, ExternalLink, Loader2,
  ChevronDown, ChevronRight, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { timeAgo } from '@/lib/utils';
import { useDashboardStore } from '@/stores/dashboard-store';
import { API_BASE } from '@/lib/api';
import QuickActions from '@/components/shared/QuickActions';
import type { Session, PipelineStep } from '@/stores/types';
import {
  SectionHeader, StatusChip, PIXEL_CARD_RAISED, PIXEL_CARD,
  ParchmentDivider, PARCHMENT,
} from './panelUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActionItem {
  id: string;
  kind: 'error-session' | 'failed-review' | 'directive-completion'
      | 'waiting-approval' | 'pipeline-action'
      | 'waiting-input';
  agentName?: string;
  summary: string;
  timestamp: string;
  /** Session ref for items that map to a session */
  session?: Session;
  /** Pipeline step ref for pipeline action items */
  pipelineStep?: PipelineStep;
}

// ---------------------------------------------------------------------------
// Tier colors
// ---------------------------------------------------------------------------

const TIER_COLORS = {
  urgent: '#EF4444',
  attention: '#EAB308',
  info: '#3B82F6',
} as const;

// ---------------------------------------------------------------------------
// Collapsible tier section
// ---------------------------------------------------------------------------

function TierSection({
  label,
  icon,
  color,
  items,
  defaultOpen = true,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  items: ActionItem[];
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="w-full"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${label} section, ${items.length} item${items.length !== 1 ? 's' : ''}`}
      >
        <SectionHeader icon={icon} count={items.length} color={color}>
          <span className="flex items-center gap-1">
            {open
              ? <ChevronDown className="h-2.5 w-2.5" />
              : <ChevronRight className="h-2.5 w-2.5" />}
            {label}
          </span>
        </SectionHeader>
      </button>

      {open && children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ActionPanel() {
  const sessions = useDashboardStore((s) => s.sessions);
  const directiveState = useDashboardStore((s) => s.directiveState);

  // --- Derive action items by tier ---

  const { urgent, attention, info } = useMemo(() => {
    const urgentItems: ActionItem[] = [];
    const attentionItems: ActionItem[] = [];
    const infoItems: ActionItem[] = [];

    // Sessions (non-subagent only)
    for (const s of sessions) {
      if (s.isSubagent) continue;

      const summary = s.feature ?? s.slug ?? s.latestPrompt ?? s.initialPrompt ?? s.id.slice(0, 8);

      if (s.status === 'error') {
        urgentItems.push({
          id: `error-${s.id}`,
          kind: 'error-session',
          agentName: s.agentName,
          summary,
          timestamp: s.lastActivity,
          session: s,
        });
      } else if (s.status === 'waiting-approval') {
        attentionItems.push({
          id: `approval-${s.id}`,
          kind: 'waiting-approval',
          agentName: s.agentName,
          summary,
          timestamp: s.lastActivity,
          session: s,
        });
      } else if (s.status === 'waiting-input') {
        infoItems.push({
          id: `input-${s.id}`,
          kind: 'waiting-input',
          agentName: s.agentName,
          summary,
          timestamp: s.lastActivity,
          session: s,
        });
      }
    }

    // Directive: awaiting_completion -> Tier 1 (urgent)
    if (directiveState?.status === 'awaiting_completion') {
      urgentItems.push({
        id: `directive-completion-${directiveState.directiveName}`,
        kind: 'directive-completion',
        summary: directiveState.title ?? directiveState.directiveName,
        timestamp: directiveState.lastUpdated,
      });
    }

    // Directive: pipeline steps with needsAction -> Tier 2 (attention)
    if (directiveState?.pipelineSteps) {
      for (const step of directiveState.pipelineSteps) {
        if (step.needsAction) {
          attentionItems.push({
            id: `pipeline-${step.id}`,
            kind: 'pipeline-action',
            summary: `${step.label} -- ${directiveState.title ?? directiveState.directiveName}`,
            timestamp: step.startedAt ?? directiveState.lastUpdated,
            pipelineStep: step,
          });
        }
      }
    }

    // Sort each tier by most recent first
    const byTime = (a: ActionItem, b: ActionItem) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();

    urgentItems.sort(byTime);
    attentionItems.sort(byTime);
    infoItems.sort(byTime);

    return { urgent: urgentItems, attention: attentionItems, info: infoItems };
  }, [sessions, directiveState]);

  const totalItems = urgent.length + attention.length + info.length;

  // --- Focus terminal action ---

  const [focusingPane, setFocusingPane] = useState<string | null>(null);
  const handleFocus = useCallback(async (paneId: string) => {
    setFocusingPane(paneId);
    try {
      await fetch(`${API_BASE}/api/actions/focus-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paneId }),
      });
    } catch {
      // silent
    } finally {
      setFocusingPane(null);
    }
  }, []);

  // --- Empty state ---

  if (totalItems === 0) {
    return (
      <div
        className="text-center py-8 font-mono"
        style={PIXEL_CARD}
      >
        <div className="text-3xl mb-2" style={{ opacity: 0.25 }}>
          <CheckCircle2 className="h-8 w-8 mx-auto" style={{ color: PARCHMENT.textDim }} />
        </div>
        <p className="text-xs font-bold" style={{ color: PARCHMENT.text }}>All clear</p>
        <p className="text-[10px] mt-0.5" style={{ color: PARCHMENT.textDim }}>
          Nothing needs your attention
        </p>
      </div>
    );
  }

  // --- Card renderer ---

  function renderCard(item: ActionItem, tierColor: string) {
    const s = item.session;

    return (
      <div
        key={item.id}
        className="relative overflow-hidden"
        style={{
          ...PIXEL_CARD_RAISED,
          borderLeft: `3px solid ${tierColor}`,
        }}
      >
        <div className="px-2 py-2 space-y-1">
          {/* Header row: kind chip + agent name + time */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {s && <StatusChip status={s.status} />}
            {!s && item.kind === 'directive-completion' && (
              <span
                className="text-[9px] font-bold font-mono px-1.5 py-0.5 leading-none"
                style={{
                  backgroundColor: TIER_COLORS.urgent,
                  color: '#fff',
                  borderRadius: '2px',
                  boxShadow: `0 1px 0 0 ${TIER_COLORS.urgent}80`,
                  letterSpacing: '0.02em',
                }}
              >
                Complete
              </span>
            )}
            {!s && item.kind === 'pipeline-action' && (
              <span
                className="text-[9px] font-bold font-mono px-1.5 py-0.5 leading-none"
                style={{
                  backgroundColor: TIER_COLORS.attention,
                  color: '#422006',
                  borderRadius: '2px',
                  boxShadow: `0 1px 0 0 ${TIER_COLORS.attention}80`,
                  letterSpacing: '0.02em',
                }}
              >
                Pipeline
              </span>
            )}
            {item.agentName && (
              <span className="font-bold" style={{ color: PARCHMENT.text }}>
                {item.agentName}
              </span>
            )}
            <span className="ml-auto shrink-0 text-[10px]" style={{ color: PARCHMENT.textDim }}>
              {timeAgo(item.timestamp)}
            </span>
          </div>

          {/* Context summary */}
          <p
            className="text-[11px] line-clamp-2 leading-tight font-mono"
            style={{ color: PARCHMENT.textDim }}
          >
            {item.summary}
          </p>

          {/* Actions */}
          {s?.paneId && (s.status === 'waiting-approval' || s.status === 'waiting-input') && (
            <QuickActions paneId={s.paneId} sessionStatus={s.status} terminalApp={s.terminalApp} />
          )}
          {s?.paneId && s.status === 'error' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] w-full justify-start gap-1.5 font-mono"
              style={{ color: PARCHMENT.text }}
              onClick={() => handleFocus(s.paneId!)}
              disabled={focusingPane === s.paneId}
            >
              {focusingPane === s.paneId ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ExternalLink className="h-3 w-3" />
              )}
              Focus terminal
            </Button>
          )}
        </div>
      </div>
    );
  }

  // --- Render ---

  return (
    <div className="space-y-3">
      {/* Tier 1: Urgent */}
      <TierSection
        label="Urgent"
        icon={<XCircle className="h-3 w-3" />}
        color={TIER_COLORS.urgent}
        items={urgent}
      >
        {urgent.map((item) => renderCard(item, TIER_COLORS.urgent))}
      </TierSection>

      {/* Divider between tiers */}
      {urgent.length > 0 && attention.length > 0 && <ParchmentDivider ornament />}

      {/* Tier 2: Needs Attention */}
      <TierSection
        label="Needs Attention"
        icon={<AlertTriangle className="h-3 w-3" />}
        color={TIER_COLORS.attention}
        items={attention}
      >
        {attention.map((item) => renderCard(item, TIER_COLORS.attention))}
      </TierSection>

      {/* Divider between tiers */}
      {(urgent.length > 0 || attention.length > 0) && info.length > 0 && <ParchmentDivider ornament />}

      {/* Tier 3: Info */}
      <TierSection
        label="Info"
        icon={<Clock className="h-3 w-3" />}
        color={TIER_COLORS.info}
        items={info}
        defaultOpen={urgent.length === 0 && attention.length === 0}
      >
        {info.map((item) => renderCard(item, TIER_COLORS.info))}
      </TierSection>
    </div>
  );
}
