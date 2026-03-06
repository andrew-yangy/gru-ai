// ---------------------------------------------------------------------------
// AgentPanel — detailed game-style agent view with pixel-art cards
// ---------------------------------------------------------------------------

import { useState, useCallback, useMemo } from 'react';
import {
  GitBranch, ExternalLink, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, timeAgo, sessionStatusLabel } from '@/lib/utils';
import { useDashboardStore } from '@/stores/dashboard-store';
import { API_BASE } from '@/lib/api';
import ActivityLine from '@/components/shared/ActivityLine';
import QuickActions from '@/components/shared/QuickActions';
import SendInput from '@/components/shared/SendInput';
import { OFFICE_AGENTS, type AgentStatus } from '../types';
import {
  statusPriority, shortenModel, StatusChip,
  SectionHeader, PIXEL_CARD, PIXEL_CARD_RAISED,
  ParchmentDivider, PARCHMENT,
} from './panelUtils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AgentPanelProps {
  agentName: string;
  agentStatuses: Record<string, AgentStatus>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AgentPanel({ agentName, agentStatuses }: AgentPanelProps) {
  const sessions = useDashboardStore((s) => s.sessions);
  const sessionActivities = useDashboardStore((s) => s.sessionActivities);
  const agent = OFFICE_AGENTS.find((a) => a.agentName === agentName);
  const status = agentStatuses[agentName] ?? 'offline';

  const { activeSessions, recentIdle } = useMemo(() => {
    const primary = sessions.filter((s) => s.agentName === agentName && !s.isSubagent);
    const subagent = sessions.filter((s) => s.agentName === agentName && s.isSubagent);
    const isActive = (s: typeof sessions[0]) =>
      s.status === 'working' || s.status === 'waiting-approval' ||
      s.status === 'waiting-input' || s.status === 'error';

    // Prefer primary sessions; fall back to subagent sessions if no active primaries
    let activePrimary = primary.filter(isActive);
    let active = activePrimary.length > 0
      ? activePrimary
      : subagent.filter(isActive).slice(0, 3); // cap subagent display
    active = active.sort((a, b) => statusPriority(a.status) - statusPriority(b.status));

    const idle = primary
      .filter((s) => (s.status === 'idle' || s.status === 'paused' || s.status === 'done')
        && (s.feature || s.slug || s.latestPrompt || s.initialPrompt))
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
      .slice(0, 3);
    return { activeSessions: active, recentIdle: idle };
  }, [sessions, agentName]);

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

  if (!agent) return <p className="text-sm font-mono" style={{ color: PARCHMENT.text }}>Unknown agent</p>;

  return (
    <div className="space-y-3">
      {/* Agent identity card */}
      <div
        className="relative overflow-hidden"
        style={PIXEL_CARD_RAISED}
      >
        {/* Full-width color bar */}
        <div
          className="h-2"
          style={{
            backgroundColor: agent.color,
            boxShadow: `inset 0 -1px 0 0 ${agent.color}80`,
          }}
        />

        <div className="px-3 py-2.5 space-y-1.5">
          <div className="flex items-center gap-2">
            {/* Agent color badge */}
            <span
              className="h-4 w-4 rounded-sm shrink-0"
              style={{
                backgroundColor: agent.color,
                boxShadow: [
                  `0 0 0 1px ${agent.color}`,
                  `inset 1px 1px 0 0 #ffffff40`,
                  `inset -1px -1px 0 0 #00000040`,
                ].join(', '),
              }}
            />
            <span
              className="font-bold text-sm font-mono"
              style={{ color: PARCHMENT.text }}
            >
              {agent.agentName}
            </span>
            <StatusChip status={status === 'working' ? 'working' : status === 'waiting' ? 'waiting-approval' : 'idle'} />
          </div>
          <div
            className="text-xs font-mono"
            style={{ color: PARCHMENT.textDim }}
          >
            {agent.agentRole}
          </div>
        </div>
      </div>

      {/* Active sessions */}
      {activeSessions.length > 0 ? (
        activeSessions.map((sess) => {
          const activity = sessionActivities[sess.id];
          const title = sess.feature ?? sess.slug ?? sess.id.slice(0, 8);
          const prompt = sess.latestPrompt ?? sess.initialPrompt;
          const subagents = sessions.filter(
            (s) => s.parentSessionId === sess.id && s.isSubagent,
          );
          const isWaiting = sess.status === 'waiting-approval' || sess.status === 'waiting-input';
          const model = shortenModel(sess.model);

          return (
            <div
              key={sess.id}
              className="relative overflow-hidden"
              style={{
                ...PIXEL_CARD_RAISED,
                borderLeft: `3px solid ${agent.color}`,
              }}
            >
              <div className="px-2 py-2 space-y-1.5">
                {/* Status + model row */}
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <StatusChip
                    status={sess.status}
                    animated={sess.status === 'working'}
                  />
                  <span
                    className="font-semibold truncate"
                    style={{ color: PARCHMENT.text }}
                  >
                    {title}
                  </span>
                  {model && (
                    <span
                      className="text-[9px] px-1 py-0.5 rounded-sm shrink-0 ml-auto"
                      style={{
                        backgroundColor: '#C4A26520',
                        color: PARCHMENT.textDim,
                        border: `1px solid ${PARCHMENT.border}40`,
                      }}
                    >
                      {model}
                    </span>
                  )}
                </div>

                {/* Activity line */}
                {sess.status === 'working' && <ActivityLine activity={activity} />}

                {/* Git branch */}
                {sess.gitBranch && (
                  <div className="flex items-center gap-1 text-[11px] font-mono" style={{ color: PARCHMENT.textDim }}>
                    <GitBranch className="h-3 w-3 shrink-0" />
                    <span className="truncate">{sess.gitBranch}</span>
                  </div>
                )}

                {/* Prompt */}
                {prompt && (
                  <p
                    className="text-[11px] line-clamp-2 leading-tight font-mono"
                    style={{ color: PARCHMENT.textDim }}
                  >
                    {prompt}
                  </p>
                )}

                {/* Subagents */}
                {subagents.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {subagents.slice(0, 4).map((sa) => (
                      <span
                        key={sa.id}
                        className="text-[9px] font-mono px-1 py-0.5 rounded-sm"
                        style={{
                          backgroundColor: '#5B8C3E20',
                          color: '#3D6B26',
                          border: '1px solid #5B8C3E30',
                        }}
                      >
                        {sa.agentName ?? sa.id.slice(0, 6)}
                      </span>
                    ))}
                    {subagents.length > 4 && (
                      <span className="text-[9px] font-mono" style={{ color: PARCHMENT.textDim }}>
                        +{subagents.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Quick actions */}
                {isWaiting && sess.paneId && (
                  <QuickActions
                    paneId={sess.paneId}
                    sessionStatus={sess.status}
                    terminalApp={sess.terminalApp}
                  />
                )}

                {/* Send input */}
                {sess.paneId && <SendInput paneId={sess.paneId} terminalApp={sess.terminalApp} />}

                {/* Focus button */}
                {sess.paneId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] w-full justify-start gap-1.5 font-mono"
                    style={{ color: PARCHMENT.text }}
                    onClick={() => handleFocus(sess.paneId!)}
                    disabled={focusingPane === sess.paneId}
                  >
                    {focusingPane === sess.paneId ? (
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
        })
      ) : (
        <div
          className="text-center py-4 font-mono"
          style={PIXEL_CARD}
        >
          <p className="text-xs" style={{ color: PARCHMENT.textDim }}>No active sessions</p>
        </div>
      )}

      {/* Recent idle */}
      {recentIdle.length > 0 && (
        <>
          <ParchmentDivider ornament />
          <div className="space-y-1">
            <SectionHeader>Recent</SectionHeader>
            {recentIdle.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-1.5 text-xs py-1 px-2 font-mono rounded-sm"
                style={PIXEL_CARD}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: '#9CA3AF' }}
                />
                <span className="truncate" style={{ color: PARCHMENT.textDim }}>
                  {s.feature ?? s.slug ?? s.latestPrompt?.slice(0, 40) ?? s.initialPrompt?.slice(0, 40) ?? s.id.slice(0, 8)}
                </span>
                <span
                  className="ml-auto shrink-0 text-[10px]"
                  style={{ color: PARCHMENT.textDim, opacity: 0.6 }}
                >
                  {timeAgo(s.lastActivity)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
