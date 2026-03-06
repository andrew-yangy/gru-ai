// ---------------------------------------------------------------------------
// useBadgeCounts — computes notification badge counts per HUD tab
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import { useDashboardStore } from '@/stores/dashboard-store';

export interface BadgeCounts {
  team: number;
  action: number;
  ops: number;
  directive: number;
  log: number;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

function isRecent(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < ONE_HOUR_MS;
}

/**
 * Reads dashboard store and computes badge counts for each HUD tab.
 *
 * Badge rules:
 * - Team: agents in waiting-approval, waiting-input, or error state
 * - Action: Tier 1+2 items (errors, waiting-approval sessions, awaiting_completion directives)
 * - Ops: blocked/failing projects
 * - Directive: 1 if pipeline step needs CEO action or directive awaiting_completion, else 0
 * - Log: never shows a badge
 */
export function useBadgeCounts(): BadgeCounts {
  const sessions = useDashboardStore((s) => s.sessions);
  const directiveState = useDashboardStore((s) => s.directiveState);
  const workState = useDashboardStore((s) => s.workState);

  return useMemo(() => {
    // -- Team badge: agents needing attention (waiting-approval, waiting-input, error) --
    let team = 0;
    for (const s of sessions) {
      if (s.isSubagent || s.status === 'done') continue;
      if (
        (s.status === 'waiting-approval' || s.status === 'waiting-input' || s.status === 'error') &&
        isRecent(s.lastActivity)
      ) {
        team++;
      }
    }

    // -- Action badge: Tier 1 (errors) + Tier 2 (waiting-approval sessions, awaiting_completion directives) --
    let action = 0;
    for (const s of sessions) {
      if (s.isSubagent || s.status === 'done') continue;
      if (s.status === 'error' && isRecent(s.lastActivity)) {
        action++; // Tier 1: errors
      } else if (s.status === 'waiting-approval' && isRecent(s.lastActivity)) {
        action++; // Tier 2: waiting for approval
      }
    }
    // Tier 2: awaiting_completion directives
    if (directiveState?.status === 'awaiting_completion') {
      action++;
    }

    // -- Ops badge: blocked or failing projects --
    let ops = 0;
    const features = workState?.features?.features;
    if (features) {
      for (const f of features) {
        if (f.status === 'blocked') {
          ops++;
        }
      }
    }
    const goals = workState?.goals?.goals;
    if (goals) {
      for (const g of goals) {
        if (g.status === 'blocked' as string) {
          ops++;
        }
      }
    }

    // -- Directive badge: 1 if pipeline step needs CEO action or directive awaiting_completion --
    let directive = 0;
    if (directiveState) {
      if (directiveState.status === 'awaiting_completion') {
        directive = 1;
      } else if (directiveState.pipelineSteps) {
        for (const step of directiveState.pipelineSteps) {
          if (step.needsAction) {
            directive = 1;
            break;
          }
        }
      }
    }

    // -- Log badge: never shows --
    const log = 0;

    return { team, action, ops, directive, log };
  }, [sessions, directiveState, workState]);
}
