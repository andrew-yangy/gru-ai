import { useEffect, useMemo, useState } from 'react';
import { useDashboardStore } from '@/stores/dashboard-store';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Building2,
  Users,
  Monitor,
  FileText,
  Zap,
  AlertTriangle,
  Clock,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HudPanel = 'team' | 'sessions' | 'reports';

interface GameHeaderProps {
  onPanelRequest?: (panel: HudPanel) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatGameTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatGameDate(date: Date): string {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${dayName}, ${month} ${day}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GameHeader({ onPanelRequest }: GameHeaderProps) {
  const sessions = useDashboardStore((s) => s.sessions);
  const directiveState = useDashboardStore((s) => s.directiveState);

  // Live clock
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Derived counts
  const { activeCount, idleCount, attentionCount, errorCount } = useMemo(() => {
    let active = 0;
    let idle = 0;
    let attention = 0;
    let error = 0;
    for (const s of sessions) {
      switch (s.status) {
        case 'working':
          active++;
          break;
        case 'waiting-approval':
        case 'waiting-input':
          attention++;
          break;
        case 'error':
          error++;
          attention++;
          break;
        case 'idle':
        case 'paused':
        case 'done':
          idle++;
          break;
      }
    }
    return { activeCount: active, idleCount: idle, attentionCount: attention, errorCount: error };
  }, [sessions]);

  // Directive counts
  const pendingDirectives = useMemo(() => {
    if (!directiveState) return 0;
    return directiveState.initiatives.filter(
      (i) => i.status === 'pending' || i.status === 'in_progress',
    ).length;
  }, [directiveState]);

  const dateStr = formatGameDate(now);
  const timeStr = formatGameTime(now);

  return (
    <TooltipProvider delayDuration={300}>
      <header className="bg-gray-950 text-gray-100 px-3 sm:px-4 py-1.5 flex items-center justify-between text-sm border-b border-gray-800/80 select-none">
        {/* ── Left: HQ branding ── */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Building2
              className="h-4 w-4 text-amber-400"
              aria-hidden="true"
            />
            <span className="font-bold tracking-tight text-base text-amber-50">
              HQ
            </span>
          </div>

          {/* Connection indicator */}
          <span
            className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"
            aria-label="Connected"
          />
        </div>

        {/* ── Center: Date & Time ── */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 font-mono">
          <Clock className="h-3 w-3 text-gray-500" aria-hidden="true" />
          <span>{dateStr}</span>
          <span className="text-gray-600" aria-hidden="true">|</span>
          <span className="text-gray-300 tabular-nums">{timeStr}</span>
        </div>

        {/* Mobile: time only */}
        <span className="sm:hidden text-xs text-gray-400 font-mono tabular-nums">
          {timeStr}
        </span>

        {/* ── Right: Badges + Quick-access ── */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Status badges */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Active sessions */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  className="bg-emerald-900/60 text-emerald-300 border-emerald-700/50 hover:bg-emerald-900/80 px-1.5 py-0 text-[11px] gap-1 cursor-default"
                >
                  <Zap className="h-3 w-3" aria-hidden="true" />
                  {activeCount}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{activeCount} active session{activeCount !== 1 ? 's' : ''}</p>
              </TooltipContent>
            </Tooltip>

            {/* Idle sessions */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  className="bg-gray-800/60 text-gray-400 border-gray-700/50 hover:bg-gray-800/80 px-1.5 py-0 text-[11px] gap-1 cursor-default"
                >
                  <span
                    className="h-2 w-2 rounded-full bg-gray-500 inline-block"
                    aria-hidden="true"
                  />
                  {idleCount}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{idleCount} idle session{idleCount !== 1 ? 's' : ''}</p>
              </TooltipContent>
            </Tooltip>

            {/* Pending directives */}
            {pendingDirectives > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    className="bg-blue-900/60 text-blue-300 border-blue-700/50 hover:bg-blue-900/80 px-1.5 py-0 text-[11px] gap-1 cursor-default"
                  >
                    <FileText className="h-3 w-3" aria-hidden="true" />
                    {pendingDirectives}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{pendingDirectives} pending directive{pendingDirectives !== 1 ? 's' : ''}</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Attention / error badge */}
            {attentionCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    className={
                      'bg-red-900/60 text-red-300 border-red-700/50 hover:bg-red-900/80 px-1.5 py-0 text-[11px] gap-1 cursor-default' +
                      (errorCount > 0 ? ' animate-pulse' : '')
                    }
                  >
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                    {attentionCount}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>
                    {attentionCount} session{attentionCount !== 1 ? 's' : ''} need attention
                    {errorCount > 0 ? ` (${errorCount} error${errorCount !== 1 ? 's' : ''})` : ''}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Separator */}
          <div
            className="hidden sm:block h-4 w-px bg-gray-700/60"
            aria-hidden="true"
          />

          {/* Quick-access buttons */}
          <div className="hidden sm:flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onPanelRequest?.('team')}
                  className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                  aria-label="Team overview"
                >
                  <Users className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Team overview</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onPanelRequest?.('sessions')}
                  className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                  aria-label="Active sessions"
                >
                  <Monitor className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Active sessions</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onPanelRequest?.('reports')}
                  className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                  aria-label="Reports"
                >
                  <FileText className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Reports</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
