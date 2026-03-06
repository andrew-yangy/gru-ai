// ---------------------------------------------------------------------------
// DirectivePanel — Pipeline hero view with directive health + project cards
// ---------------------------------------------------------------------------

import { useState, useEffect, useMemo } from 'react';
import {
  Crosshair, CheckCircle2, XCircle, SkipForward, Circle,
  Loader2, Clock, FolderKanban, History, Terminal,
} from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { useDashboardStore } from '@/stores/dashboard-store';
import PipelineStepper from '@/components/shared/PipelineStepper';
import {
  phaseColor, SectionHeader, PixelProgress, ParchmentDivider,
  PIXEL_CARD, PIXEL_CARD_RAISED, PARCHMENT,
} from './panelUtils';
import type { DirectiveProject, DirectiveState } from '@/stores/types';

// ---------------------------------------------------------------------------
// Elapsed time hook — ticks every second for a live counter
// ---------------------------------------------------------------------------

function useElapsedTime(startedAt: string | undefined): string {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    if (!startedAt) { setElapsed(''); return; }
    const update = () => {
      const ms = Date.now() - new Date(startedAt).getTime();
      if (ms < 0) { setElapsed(''); return; }
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      if (mins >= 60) {
        const hrs = Math.floor(mins / 60);
        setElapsed(`${hrs}h ${mins % 60}m ${secs}s`);
      } else if (mins > 0) {
        setElapsed(`${mins}m ${secs}s`);
      } else {
        setElapsed(`${secs}s`);
      }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return elapsed;
}

// ---------------------------------------------------------------------------
// Project status icon
// ---------------------------------------------------------------------------

function ProjectIcon({ status }: { status: DirectiveProject['status'] }) {
  const size = 'h-3 w-3 shrink-0';
  switch (status) {
    case 'completed':
      return <CheckCircle2 className={`${size} text-green-600`} />;
    case 'in_progress':
      return <Loader2 className={`${size} text-yellow-600 animate-spin`} />;
    case 'failed':
      return <XCircle className={`${size} text-red-500`} />;
    case 'skipped':
      return <SkipForward className={cn(size)} style={{ color: PARCHMENT.textDim }} />;
    default:
      return <Circle className={cn(size)} style={{ color: PARCHMENT.textDim }} />;
  }
}

// ---------------------------------------------------------------------------
// Weight badge color
// ---------------------------------------------------------------------------

function weightBg(weight: string | undefined): string {
  switch (weight) {
    case 'lightweight': return '#BBF7D0';
    case 'medium':      return '#FDE68A';
    case 'heavyweight':  return '#FECACA';
    default:            return '#E5E7EB';
  }
}

function weightFg(weight: string | undefined): string {
  switch (weight) {
    case 'lightweight': return '#14532D';
    case 'medium':      return '#713F12';
    case 'heavyweight':  return '#7F1D1D';
    default:            return '#374151';
  }
}

// ---------------------------------------------------------------------------
// Directive Health Card
// ---------------------------------------------------------------------------

function DirectiveHealthCard({ directive }: { directive: DirectiveState }) {
  const totalElapsed = useElapsedTime(directive.startedAt);

  // Find the current active step for per-step elapsed time
  const activeStep = directive.pipelineSteps?.find((s) => s.status === 'active');
  const stepElapsed = useElapsedTime(activeStep?.startedAt);

  return (
    <div className="p-2 space-y-1.5" style={PIXEL_CARD_RAISED}>
      {/* Name + weight */}
      <div className="flex items-center gap-1.5 min-w-0">
        <Crosshair className="h-3 w-3 shrink-0" style={{ color: PARCHMENT.accent }} aria-hidden="true" />
        <span
          className="text-xs font-bold truncate font-mono"
          style={{ color: PARCHMENT.text }}
        >
          {directive.title || directive.directiveName}
        </span>
        {directive.weight && (
          <span
            className="text-[9px] font-bold font-mono px-1.5 py-0.5 leading-none ml-auto shrink-0"
            style={{
              backgroundColor: weightBg(directive.weight),
              color: weightFg(directive.weight),
              borderRadius: '2px',
            }}
          >
            {directive.weight}
          </span>
        )}
      </div>

      {/* Elapsed time */}
      {totalElapsed && (
        <div
          className="flex items-center gap-1.5 text-[10px] font-mono"
          style={{ color: PARCHMENT.textDim }}
        >
          <Clock className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
          <span>Running for <span className="font-bold tabular-nums" style={{ color: PARCHMENT.text }}>{totalElapsed}</span></span>
        </div>
      )}

      {/* Current step + step elapsed */}
      {activeStep && (
        <div
          className="flex items-center gap-1.5 text-[10px] font-mono"
          style={{ color: PARCHMENT.textDim }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shrink-0"
            aria-hidden="true"
          />
          <span className="truncate">
            Step: <span className="font-semibold" style={{ color: PARCHMENT.text }}>{activeStep.label}</span>
          </span>
          {stepElapsed && (
            <span className="ml-auto tabular-nums shrink-0">{stepElapsed}</span>
          )}
        </div>
      )}

      {/* Status badge for non-in_progress states */}
      {directive.status === 'awaiting_completion' && (
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 shrink-0" aria-hidden="true" />
          <span className="font-semibold" style={{ color: '#92400E' }}>Awaiting CEO sign-off</span>
        </div>
      )}
      {directive.status === 'failed' && (
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <XCircle className="h-2.5 w-2.5 text-red-500 shrink-0" aria-hidden="true" />
          <span className="font-semibold text-red-600">Failed</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project Card — status, phase, task progress
// ---------------------------------------------------------------------------

function ProjectCard({ project }: { project: DirectiveProject }) {
  const total = project.totalTasks ?? 0;
  const completed = project.completedTasks ?? 0;
  const isActive = project.status === 'in_progress';

  return (
    <div
      className={cn('px-2 py-1.5 space-y-1', isActive ? '' : 'opacity-60')}
      style={isActive ? PIXEL_CARD_RAISED : PIXEL_CARD}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <ProjectIcon status={project.status} />
        <span
          className="text-[11px] font-mono truncate flex-1"
          style={{ color: PARCHMENT.text }}
        >
          {project.title}
        </span>
        {isActive && project.phase && (
          <span
            className={cn('text-[9px] font-bold font-mono px-1.5 py-0.5 leading-none shrink-0 border', phaseColor(project.phase))}
            style={{ borderRadius: '2px' }}
          >
            {project.phase}
          </span>
        )}
      </div>

      {/* Task progress bar */}
      {total > 0 && (
        <div className="flex items-center gap-1.5">
          <PixelProgress
            value={completed}
            max={total}
            color={project.status === 'completed' ? '#22C55E' : '#C4A265'}
            height={5}
          />
          <span
            className="text-[9px] font-mono tabular-nums shrink-0"
            style={{ color: PARCHMENT.textDim }}
          >
            {completed}/{total}
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Directive History — last 5 completed/failed directives
// ---------------------------------------------------------------------------

function DirectiveHistoryList() {
  const directives = useDashboardStore((s) => s.workState?.conductor?.directives);
  const directiveHistory = useDashboardStore((s) => s.directiveHistory);

  // Combine both sources: directiveHistory (recent closed directives from state)
  // and conductor.directives (from work-state scan)
  const recentDirectives = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      status: string;
      updatedAt: string;
      weight?: string;
    }> = [];

    // From directiveHistory (DirectiveState[])
    for (const d of directiveHistory ?? []) {
      items.push({
        id: d.directiveName,
        title: d.title || d.directiveName,
        status: d.status,
        updatedAt: d.lastUpdated,
        weight: d.weight,
      });
    }

    // From conductor.directives (DirectiveRecord[])
    for (const d of directives ?? []) {
      if (!items.find((i) => i.id === d.id)) {
        items.push({
          id: d.id,
          title: d.title,
          status: d.status,
          updatedAt: d.updatedAt,
          weight: d.weight,
        });
      }
    }

    return items
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [directiveHistory, directives]);

  if (recentDirectives.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <SectionHeader icon={<History className="h-3 w-3" />}>
        Recent Directives
      </SectionHeader>

      {recentDirectives.map((d) => (
        <div
          key={d.id}
          className="flex items-center gap-1.5 px-2 py-1.5 font-mono"
          style={PIXEL_CARD}
        >
          {d.status === 'completed' ? (
            <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
          ) : d.status === 'failed' ? (
            <XCircle className="h-3 w-3 text-red-500 shrink-0" />
          ) : (
            <Circle className="h-3 w-3 shrink-0" style={{ color: PARCHMENT.textDim }} />
          )}
          <span
            className="text-[11px] truncate flex-1"
            style={{ color: PARCHMENT.text }}
          >
            {d.title}
          </span>
          {d.weight && (
            <span
              className="text-[9px] font-bold font-mono px-1.5 py-0.5 leading-none shrink-0"
              style={{
                backgroundColor: weightBg(d.weight),
                color: weightFg(d.weight),
                borderRadius: '2px',
              }}
            >
              {d.weight}
            </span>
          )}
          <span
            className="text-[9px] shrink-0"
            style={{ color: PARCHMENT.textDim }}
          >
            {timeAgo(d.updatedAt)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State — no active directive
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="space-y-4">
      <div className="text-center py-6 font-mono" style={PIXEL_CARD}>
        <Terminal
          className="h-6 w-6 mx-auto mb-2"
          style={{ color: PARCHMENT.textDim, opacity: 0.4 }}
          aria-hidden="true"
        />
        <p className="text-xs font-bold" style={{ color: PARCHMENT.text }}>
          No active directive
        </p>
        <p className="text-[10px] mt-1" style={{ color: PARCHMENT.textDim }}>
          Start from backlog or type <span className="font-semibold">/directive</span> in terminal
        </p>
      </div>

      <DirectiveHistoryList />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DirectivePanel() {
  const directiveState = useDashboardStore((s) => s.directiveState);

  // -------------------------------------------------------------------------
  // No active directive — show empty state + history
  // -------------------------------------------------------------------------
  if (!directiveState) {
    return <EmptyState />;
  }

  // -------------------------------------------------------------------------
  // Active directive — hero pipeline + health + projects
  // -------------------------------------------------------------------------
  const hasSteps = directiveState.pipelineSteps && directiveState.pipelineSteps.length > 0;
  const hasProjects = directiveState.projects.length > 0;

  return (
    <div className="space-y-3">
      {/* Directive Health Card — headline first */}
      <DirectiveHealthCard directive={directiveState} />

      {/* Pipeline Stepper — detail below */}
      {hasSteps && (
        <div className="space-y-2">
          <SectionHeader icon={<Crosshair className="h-3 w-3" />}>
            Pipeline
          </SectionHeader>
          <div className="p-2" style={PIXEL_CARD}>
            <PipelineStepper steps={directiveState.pipelineSteps!} compact />
          </div>
        </div>
      )}

      {/* Project Cards */}
      {hasProjects && (
        <>
          <ParchmentDivider ornament />
          <div className="space-y-1.5">
            <SectionHeader
              icon={<FolderKanban className="h-3 w-3" />}
              count={directiveState.projects.length}
            >
              Projects
            </SectionHeader>
            {directiveState.projects.map((proj) => (
              <ProjectCard key={proj.id} project={proj} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
