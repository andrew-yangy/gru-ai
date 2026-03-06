import { useCallback, useEffect, useState } from 'react';
import { Users, Zap, Activity, GitBranch, ScrollText, Maximize2, Minimize2 } from 'lucide-react';
import { useBadgeCounts } from './hooks/useBadgeCounts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HudPanel = 'team' | 'action' | 'ops' | 'directive' | 'log';

interface GameHeaderProps {
  onPanelRequest?: (panel: HudPanel) => void;
  gameContainerRef?: React.RefObject<HTMLDivElement | null>;
  activePanel?: HudPanel | null;
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
// Wood / parchment header theme
// ---------------------------------------------------------------------------

const HEADER = {
  bg: '#5C3D2E',           // dark wood
  bgLight: '#6B4C3B',      // lighter wood for hover
  text: '#F5ECD7',          // parchment text
  textDim: '#C4A265',       // gold/muted
  border: '#3D2B1F',        // dark border
  highlight: '#C4A265',     // gold highlight
  buttonBg: '#4A2F20',      // button background
  buttonActive: '#3D2B1F',  // pressed button
  buttonBorder: 'inset -1px -1px 0 0 #2A1A10, inset 1px 1px 0 0 #7A5A42',
  buttonBorderActive: 'inset 1px 1px 0 0 #2A1A10, inset -1px -1px 0 0 #7A5A42',
} as const;

// ---------------------------------------------------------------------------
// HudButton
// ---------------------------------------------------------------------------

interface HudButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  ariaLabel: string;
  badge?: number;
}

function HudButton({ icon, label, onClick, active, ariaLabel, badge, glow }: HudButtonProps & { glow?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`flex items-center gap-1.5 px-2.5 py-1 font-mono text-[12px] select-none transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400`}
      style={{
        backgroundColor: active ? HEADER.buttonActive : HEADER.buttonBg,
        color: active ? HEADER.highlight : HEADER.text,
        imageRendering: 'pixelated',
        borderRadius: '2px',
        boxShadow: [
          active ? HEADER.buttonBorderActive : HEADER.buttonBorder,
          glow ? `0 0 8px ${HEADER.highlight}40` : '',
        ].filter(Boolean).join(', '),
        ...(active ? { textShadow: `0 0 6px ${HEADER.highlight}40` } : {}),
      }}
    >
      <span aria-hidden="true" className="flex items-center">{icon}</span>
      {label && <span>{label}</span>}
      {badge !== undefined && badge > 0 && (
        <span
          className="ml-0.5 min-w-[18px] text-center px-1 rounded text-[10px] font-bold leading-tight"
          style={{
            backgroundColor: '#B83A2A',
            color: '#fff',
            boxShadow: 'inset -1px -1px 0 0 #8A2010, inset 1px 1px 0 0 #D05040',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GameHeader({ onPanelRequest, gameContainerRef, activePanel }: GameHeaderProps) {
  const badges = useBadgeCounts();

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      const el = gameContainerRef?.current ?? document.documentElement;
      el.requestFullscreen();
    }
  }, [gameContainerRef]);

  // Live clock
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Total badge for header = Team + Action + Directive
  const totalBadge = badges.team + badges.action + badges.directive;

  const dateStr = formatGameDate(now);
  const timeStr = formatGameTime(now);

  return (
    <header
      className="px-3 sm:px-4 py-1.5 flex items-center justify-between text-sm select-none"
      style={{
        backgroundColor: HEADER.bg,
        color: HEADER.text,
        imageRendering: 'pixelated',
        borderBottom: `2px solid ${HEADER.border}`,
        boxShadow: `inset 0 1px 0 0 ${HEADER.bgLight}`,
      }}
    >
      {/* Left: Office branding */}
      <div className="flex items-center gap-2">
        <span
          className="font-mono font-bold text-base tracking-tight"
          style={{ color: HEADER.highlight, textShadow: `0 1px 2px ${HEADER.border}` }}
        >
          Office
        </span>
        <span
          className="h-2 w-2 rounded-full bg-emerald-400 inline-block"
          style={{ boxShadow: '0 0 4px #34d399' }}
          aria-label="Connected"
        />
      </div>

      {/* Center: Date & Time */}
      <div className="hidden sm:flex items-center gap-2 font-mono text-xs" style={{ color: HEADER.textDim }}>
        <span>{dateStr}</span>
        <span style={{ color: HEADER.border }} aria-hidden="true">&#x2022;</span>
        <span className="tabular-nums" style={{ color: HEADER.text }}>{timeStr}</span>
      </div>

      {/* Mobile: time only */}
      <span className="sm:hidden font-mono text-xs tabular-nums" style={{ color: HEADER.text }}>
        {timeStr}
      </span>

      {/* Right: Game-style buttons */}
      <div className="flex items-center gap-1.5">
        <HudButton
          icon={<Users className="h-3.5 w-3.5" />}
          label="Team"
          onClick={() => onPanelRequest?.('team')}
          active={activePanel === 'team'}
          ariaLabel="Team overview"
          badge={badges.team > 0 ? badges.team : undefined}
        />
        <HudButton
          icon={<Zap className="h-3.5 w-3.5" />}
          label="Action"
          onClick={() => onPanelRequest?.('action')}
          active={activePanel === 'action'}
          ariaLabel="Action items"
          badge={badges.action > 0 ? badges.action : undefined}
        />
        <HudButton
          icon={<Activity className="h-3.5 w-3.5" />}
          label="Ops"
          onClick={() => onPanelRequest?.('ops')}
          active={activePanel === 'ops'}
          ariaLabel="Operations overview"
          badge={badges.ops > 0 ? badges.ops : undefined}
        />
        <HudButton
          icon={<GitBranch className="h-3.5 w-3.5" />}
          label="Directive"
          onClick={() => onPanelRequest?.('directive')}
          active={activePanel === 'directive'}
          ariaLabel="Active directives"
          badge={badges.directive > 0 ? badges.directive : undefined}
        />
        <HudButton
          icon={<ScrollText className="h-3.5 w-3.5" />}
          label="Log"
          onClick={() => onPanelRequest?.('log')}
          active={activePanel === 'log'}
          ariaLabel="Activity log"
        />
        <HudButton
          icon={isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          label=""
          onClick={toggleFullscreen}
          ariaLabel={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        />
      </div>
    </header>
  );
}
