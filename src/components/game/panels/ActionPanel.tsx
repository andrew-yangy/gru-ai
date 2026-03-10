// ---------------------------------------------------------------------------
// ActionPanel — Tasks tab: directive pipeline view + session action items
// ---------------------------------------------------------------------------

import { useMemo, useCallback, useState, useEffect } from 'react';
import {
  AlertTriangle, XCircle, Clock, ExternalLink, Loader2,
  ChevronDown, ChevronRight, CheckCircle2, Crosshair,
  FolderKanban, SkipForward, Circle, History, Terminal,
  Check, Play, ArrowLeft, Lightbulb, Map as MapIcon,
} from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useDashboardStore } from '@/stores/dashboard-store';
import { API_BASE } from '@/lib/api';
import QuickActions from '@/components/shared/QuickActions';
import type { Session, DirectiveState, DirectiveProject, DirectiveProjectTask, PipelineStep } from '@/stores/types';
import {
  SectionHeader, StatusChip, PixelProgress, phaseColor,
  PIXEL_CARD_RAISED, PIXEL_CARD, ParchmentDivider, PARCHMENT,
  renderBriefMarkdown,
} from './panelUtils';

// ---------------------------------------------------------------------------
// Agent color map — hex colors for parchment readability
// ---------------------------------------------------------------------------

const AGENT_COLORS: Record<string, string> = {
  'CEO':     '#8B6914',  // gold/dark amber
  'Sarah':   '#7C3AED',  // violet
  'Marcus':  '#2563EB',  // blue
  'Morgan':  '#059669',  // emerald
  'Priya':   '#D97706',  // amber
  'Riley':   '#DB2777',  // pink
  'Jordan':  '#0D9488',  // teal
  'Casey':   '#0891B2',  // cyan
  'Taylor':  '#EA580C',  // orange
  'Sam':     '#65A30D',  // lime
  'Quinn':   '#E11D48',  // rose
  'Devon':   '#4F46E5',  // indigo
};

/** Get color for an agent string (may be "Sarah", "Sarah, Morgan", "Sarah + Riley") */
function agentColor(agentStr: string): string {
  // Try exact match first
  if (AGENT_COLORS[agentStr]) return AGENT_COLORS[agentStr];
  // Try first name from comma/plus separated list
  const firstName = agentStr.split(/[,+]/)[0].trim();
  return AGENT_COLORS[firstName] ?? '#2B5EA7';
}

// ---------------------------------------------------------------------------
// Weight badge helpers
// ---------------------------------------------------------------------------

function weightBg(weight: string | undefined): string {
  switch (weight) {
    case 'lightweight': return '#BBF7D0'; // green
    case 'medium':      return '#FDE68A'; // yellow
    case 'heavyweight': return '#FECACA'; // red
    case 'strategic':   return '#DDD6FE'; // purple
    case 'tactical':    return '#BFDBFE'; // blue
    default:            return '#E5E7EB';
  }
}

function weightFg(weight: string | undefined): string {
  switch (weight) {
    case 'lightweight': return '#14532D';
    case 'medium':      return '#713F12';
    case 'heavyweight': return '#7F1D1D';
    case 'strategic':   return '#4C1D95';
    case 'tactical':    return '#1E3A8A';
    default:            return '#374151';
  }
}

// ---------------------------------------------------------------------------
// Elapsed time hook
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
        setElapsed(`${hrs}h ${mins % 60}m`);
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
// Task status icon (smaller, for inline task list)
// ---------------------------------------------------------------------------

function TaskStatusIcon({ status }: { status: string }) {
  const size = 'h-2.5 w-2.5 shrink-0';
  switch (status) {
    case 'completed':
    case 'done':
      return <Check className={`${size} text-green-600`} />;
    case 'in_progress':
      return <Play className={`${size} text-yellow-600`} />;
    case 'failed':
      return <XCircle className={`${size} text-red-500`} />;
    case 'skipped':
      return <SkipForward className={size} style={{ color: PARCHMENT.textDim }} />;
    default:
      return <Circle className={size} style={{ color: PARCHMENT.textDim }} />;
  }
}

// ---------------------------------------------------------------------------
// ProjectCard — expandable inline, shows task list with DOD
// ---------------------------------------------------------------------------

function ProjectCard({ project }: { project: DirectiveProject }) {
  const total = project.totalTasks ?? 0;
  const completed = project.completedTasks ?? 0;
  const isActive = project.status === 'in_progress';
  const hasTasks = project.tasks && project.tasks.length > 0;
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={isActive ? PIXEL_CARD_RAISED : PIXEL_CARD}>
      {/* Header — clickable to expand */}
      <button
        type="button"
        className="w-full text-left px-2 py-1.5 space-y-1"
        onClick={() => hasTasks && setExpanded((v) => !v)}
        aria-label={`Project: ${project.title}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <ProjectIcon status={project.status} />
          <span
            className="text-[11px] font-mono truncate flex-1"
            style={{ color: PARCHMENT.text }}
          >
            {project.title || project.id}
          </span>
          {isActive && project.phase && (
            <span
              className={cn('text-[9px] font-bold font-mono px-1.5 py-0.5 leading-none shrink-0 border', phaseColor(project.phase))}
              style={{ borderRadius: '2px' }}
            >
              {project.phase}
            </span>
          )}
          {hasTasks && (
            expanded
              ? <ChevronDown className="h-2.5 w-2.5 shrink-0" style={{ color: PARCHMENT.textDim }} />
              : <ChevronRight className="h-2.5 w-2.5 shrink-0" style={{ color: PARCHMENT.textDim }} />
          )}
        </div>

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
      </button>

      {/* Expanded task list */}
      {expanded && hasTasks && (
        <div className="px-2 pb-2 space-y-1 border-t" style={{ borderColor: '#C4A26540' }}>
          {project.tasks!.map((task, i) => (
            <TaskRow key={i} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TaskRow — single task with DOD checklist
// ---------------------------------------------------------------------------

function TaskRow({ task }: { task: DirectiveProjectTask }) {
  const isDone = task.status === 'completed' || task.status === 'done';
  const hasDod = task.dod && task.dod.length > 0;

  return (
    <div className="pt-1">
      <div className="flex items-start gap-1.5 min-w-0">
        <TaskStatusIcon status={task.status} />
        <span
          className="text-[10px] font-mono leading-tight flex-1"
          style={{ color: isDone ? '#4A7C3F' : PARCHMENT.text }}
        >
          {task.title}
        </span>
        {task.agent && (
          <span
            className="text-[8px] font-bold font-mono shrink-0"
            style={{ color: agentColor(task.agent) }}
          >
            {task.agent}
          </span>
        )}
      </div>
      {hasDod && (
        <div className="ml-4 mt-0.5 space-y-px">
          {task.dod!.map((d, j) => (
            <div
              key={j}
              className="flex items-start gap-1 text-[8px] font-mono leading-tight"
              style={{ color: d.met ? '#4A7C3F' : PARCHMENT.textDim }}
            >
              <span className="shrink-0">{d.met ? '✓' : '○'}</span>
              <span>{d.criterion}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DirectiveCard — rich card with pipeline + projects
// ---------------------------------------------------------------------------

function DirectiveCard({
  directive,
  defaultExpanded = false,
  sessions,
  onApprove,
  onFocus,
  onOpenDetail,
  approvingId,
  focusingPane,
}: {
  directive: DirectiveState;
  defaultExpanded?: boolean;
  sessions: Session[];
  onApprove: (e: React.MouseEvent, name: string) => void;
  onFocus: (paneId: string) => void;
  onOpenDetail: (type: 'brainstorm' | 'brief', directiveTitle: string, content: string) => void;
  approvingId: string | null;
  focusingPane: string | null;
}) {
  const shouldExpand = defaultExpanded || directive.status === 'awaiting_completion' || directive.status === 'in_progress';
  const [expanded, setExpanded] = useState(shouldExpand);
  const elapsed = useElapsedTime(directive.startedAt);
  const activeStep = directive.pipelineSteps?.find((s) => s.status === 'active');
  const stepElapsed = useElapsedTime(activeStep?.startedAt);

  // Find the session running this directive (match by prompt containing directive name)
  const directiveSession = useMemo(() => {
    const name = directive.directiveName;
    return sessions.find((s) =>
      s.paneId &&
      !s.isSubagent &&
      (s.initialPrompt?.includes(name) || s.feature?.includes(name))
    );
  }, [sessions, directive.directiveName]);
  const hasSteps = directive.pipelineSteps && directive.pipelineSteps.length > 0;
  const hasProjects = directive.projects.length > 0;

  const isAwaitingCompletion = directive.status === 'awaiting_completion';
  const isFailed = directive.status === 'failed';
  const isCompleted = directive.status === 'completed';
  const isInProgress = directive.status === 'in_progress';
  const borderColor = isAwaitingCompletion ? '#EAB308' : isFailed ? '#EF4444' : '#C4A265';

  return (
    <div
      className="relative overflow-hidden"
      style={{
        ...PIXEL_CARD_RAISED,
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      {/* Header — always visible, clickable to collapse */}
      <button
        type="button"
        className="w-full text-left px-2.5 py-2 space-y-1"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Name + weight + elapsed */}
        <div className="flex items-center gap-1.5 min-w-0">
          {isCompleted ? (
            <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: '#22C55E' }} />
          ) : isFailed ? (
            <XCircle className="h-3 w-3 shrink-0" style={{ color: '#EF4444' }} />
          ) : isAwaitingCompletion ? (
            <AlertTriangle className="h-3 w-3 shrink-0" style={{ color: '#EAB308' }} />
          ) : isInProgress ? (
            <Play className="h-3 w-3 shrink-0" style={{ color: '#3B82F6' }} />
          ) : (
            <Circle className="h-3 w-3 shrink-0" style={{ color: PARCHMENT.textDim }} />
          )}
          <span
            className="text-xs font-bold truncate font-mono"
            style={{ color: PARCHMENT.text }}
          >
            {directive.title || directive.directiveName}
          </span>
          {directive.weight && (
            <span
              className="text-[9px] font-bold font-mono px-1.5 py-0.5 leading-none shrink-0"
              style={{
                backgroundColor: weightBg(directive.weight),
                color: weightFg(directive.weight),
                borderRadius: '2px',
              }}
            >
              {directive.weight}
            </span>
          )}
          <span className="ml-auto flex items-center gap-1 shrink-0">
            {elapsed && (
              <span
                className="text-[9px] font-mono tabular-nums"
                style={{ color: PARCHMENT.textDim }}
              >
                {elapsed}
              </span>
            )}
            {expanded
              ? <ChevronDown className="h-2.5 w-2.5" style={{ color: PARCHMENT.textDim }} />
              : <ChevronRight className="h-2.5 w-2.5" style={{ color: PARCHMENT.textDim }} />}
          </span>
        </div>

        {/* Current step info */}
        {activeStep && !expanded && (
          <div
            className="flex items-center gap-1.5 text-[10px] font-mono"
            style={{ color: PARCHMENT.textDim }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shrink-0"
            />
            <span className="truncate">
              {activeStep.label}
            </span>
            {stepElapsed && (
              <span className="ml-auto tabular-nums shrink-0">{stepElapsed}</span>
            )}
          </div>
        )}

        {/* Status banner for awaiting completion */}
        {isAwaitingCompletion && !expanded && (
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 shrink-0" />
            <span className="font-semibold" style={{ color: '#6B2E08' }}>Awaiting CEO sign-off</span>
          </div>
        )}

        {/* Collapsed mini-stats */}
        {!expanded && (
          <div className="flex items-center gap-2 text-[10px] font-mono" style={{ color: PARCHMENT.textDim }}>
            <span>
              <span className="font-bold" style={{ color: PARCHMENT.text }}>
                {directive.projects.filter((p) => p.status === 'completed').length}/{directive.projects.length}
              </span>{' '}projects
            </span>
            {directive.projects.reduce((a, p) => a + (p.totalTasks ?? 0), 0) > 0 && (
              <span>
                <span className="font-bold" style={{ color: PARCHMENT.text }}>
                  {directive.projects.reduce((a, p) => a + (p.completedTasks ?? 0), 0)}/
                  {directive.projects.reduce((a, p) => a + (p.totalTasks ?? 0), 0)}
                </span>{' '}tasks
              </span>
            )}
            {hasSteps && (
              <span>
                <span className="font-bold" style={{ color: PARCHMENT.text }}>
                  {directive.pipelineSteps!.filter((s) => s.status === 'completed').length}/
                  {directive.pipelineSteps!.length}
                </span>{' '}steps
              </span>
            )}
          </div>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-2.5 pb-2.5 space-y-2 font-mono">
          {/* Info strip: phase + approval */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px]" style={{ color: PARCHMENT.textDim }}>
            <span>
              Phase: <span className="font-bold" style={{ color: PARCHMENT.text }}>{directive.currentPhase}</span>
            </span>
            {directive.approvalStatus && (
              <span>
                CEO: <span className="font-bold" style={{ color: directive.approvalStatus === 'approved' ? '#4A7C3F' : PARCHMENT.text }}>{directive.approvalStatus}</span>
              </span>
            )}
            {elapsed && (
              <span>
                Elapsed: <span className="font-bold tabular-nums" style={{ color: PARCHMENT.text }}>{elapsed}</span>
              </span>
            )}
          </div>

          {/* Context blocks: triage, brainstorm, plan */}
          {(directive.triageRationale || directive.brainstormSummary || directive.planSummary) && (
            <div className="space-y-1 text-[9px] leading-tight">
              {directive.triageRationale && (
                <div className="px-1.5 py-1" style={{ backgroundColor: '#E8D5B040', borderRadius: '2px' }}>
                  <span className="font-bold" style={{ color: PARCHMENT.text }}>Triage: </span>
                  <span style={{ color: PARCHMENT.textDim }}>{directive.triageRationale}</span>
                </div>
              )}
              {directive.brainstormSummary && (
                <button
                  type="button"
                  className="w-full text-left px-1.5 py-1 flex items-start gap-1"
                  style={{ backgroundColor: '#DDD6FE30', borderRadius: '2px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (directive.brainstormContent) {
                      onOpenDetail('brainstorm', directive.title || directive.directiveName, directive.brainstormContent);
                    }
                  }}
                  disabled={!directive.brainstormContent}
                >
                  <Lightbulb className="h-2.5 w-2.5 shrink-0 mt-[1px]" style={{ color: '#7C3AED' }} />
                  <span>
                    <span className="font-bold" style={{ color: '#7C3AED' }}>Brainstorm: </span>
                    <span style={{ color: PARCHMENT.textDim }}>{directive.brainstormSummary}</span>
                  </span>
                  {directive.brainstormContent && (
                    <ChevronRight className="h-2.5 w-2.5 shrink-0 mt-[1px] ml-auto" style={{ color: '#7C3AED' }} />
                  )}
                </button>
              )}
              {directive.planSummary && (
                <button
                  type="button"
                  className="w-full text-left px-1.5 py-1 flex items-start gap-1"
                  style={{ backgroundColor: '#D1FAE530', borderRadius: '2px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (directive.directiveBrief) {
                      onOpenDetail('brief', directive.title || directive.directiveName, directive.directiveBrief);
                    }
                  }}
                  disabled={!directive.directiveBrief}
                >
                  <MapIcon className="h-2.5 w-2.5 shrink-0 mt-[1px]" style={{ color: '#059669' }} />
                  <span>
                    <span className="font-bold" style={{ color: '#059669' }}>Plan: </span>
                    <span style={{ color: PARCHMENT.textDim }}>{directive.planSummary}</span>
                  </span>
                  {directive.directiveBrief && (
                    <ChevronRight className="h-2.5 w-2.5 shrink-0 mt-[1px] ml-auto" style={{ color: '#059669' }} />
                  )}
                </button>
              )}
            </div>
          )}

          {/* Current step highlight */}
          {activeStep && (
            <div
              className="flex items-center gap-1.5 text-[10px]"
              style={{ color: PARCHMENT.textDim }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
              <span className="truncate">
                Step: <span className="font-semibold" style={{ color: PARCHMENT.text }}>{activeStep.label}</span>
              </span>
              {activeStep.artifacts?.Agent && (
                <span className="font-bold" style={{ color: agentColor(activeStep.artifacts.Agent) }}>{activeStep.artifacts.Agent}</span>
              )}
              {stepElapsed && (
                <span className="ml-auto tabular-nums shrink-0">{stepElapsed}</span>
              )}
            </div>
          )}

          {/* Pipeline steps */}
          {hasSteps && (
            <div className="p-2" style={PIXEL_CARD}>
              <PipelineStepList steps={directive.pipelineSteps!} />
            </div>
          )}

          {/* Projects */}
          {hasProjects && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[10px]" style={{ color: PARCHMENT.textDim }}>
                <FolderKanban className="h-2.5 w-2.5" />
                <span className="font-bold">
                  Projects ({directive.projects.filter((p) => p.status === 'completed').length}/{directive.projects.length})
                </span>
              </div>
              {directive.projects.map((proj) => (
                <ProjectCard key={proj.id} project={proj} />
              ))}
            </div>
          )}

          {/* Action buttons — approve + focus terminal */}
          {(isAwaitingCompletion || directiveSession) && (
            <div className="flex gap-1.5">
              {isAwaitingCompletion && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-3 text-[11px] flex-1 justify-center gap-1.5 font-mono font-bold"
                  style={{
                    backgroundColor: '#22C55E',
                    color: '#fff',
                    borderRadius: '2px',
                    boxShadow: '0 1px 0 0 #16A34A',
                  }}
                  onClick={(e) => onApprove(e, directive.directiveName)}
                  disabled={approvingId === directive.directiveName}
                >
                  {approvingId === directive.directiveName ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3" />
                  )}
                  Approve
                </Button>
              )}
              {directiveSession?.paneId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-3 text-[11px] gap-1.5 font-mono font-bold shrink-0"
                  style={{
                    backgroundColor: PARCHMENT.card,
                    color: PARCHMENT.text,
                    borderRadius: '2px',
                    boxShadow: '0 0 0 1px #C4A265',
                  }}
                  onClick={() => onFocus(directiveSession.paneId!)}
                  disabled={focusingPane === directiveSession.paneId}
                >
                  {focusingPane === directiveSession.paneId ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ExternalLink className="h-3 w-3" />
                  )}
                  Focus
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PipelineStepRow — native parchment-styled step with all artifact info
// ---------------------------------------------------------------------------

function StepStatusIcon({ status }: { status: PipelineStep['status'] }) {
  const size = 'h-3 w-3 shrink-0';
  switch (status) {
    case 'completed':
      return <Check className={`${size} text-green-700`} strokeWidth={3} />;
    case 'active':
      return <Play className={`${size} text-blue-700`} />;
    case 'failed':
      return <XCircle className={`${size} text-red-600`} />;
    case 'skipped':
      return <SkipForward className={cn(size)} style={{ color: PARCHMENT.textDim, opacity: 0.5 }} />;
    default:
      return <Circle className={cn(size)} style={{ color: PARCHMENT.textDim, opacity: 0.4 }} />;
  }
}

function PipelineStepList({ steps }: { steps: PipelineStep[] }) {
  const completedCount = steps.filter((s) => s.status === 'completed').length;

  return (
    <div className="font-mono">
      {/* Progress summary */}
      <div
        className="flex items-center gap-1.5 text-[10px] mb-2"
        style={{ color: PARCHMENT.textDim }}
      >
        <PixelProgress
          value={completedCount}
          max={steps.length}
          color={completedCount === steps.length ? '#22C55E' : '#2B5EA7'}
          height={5}
        />
        <span className="tabular-nums shrink-0">
          <span className="font-bold" style={{ color: PARCHMENT.text }}>{completedCount}/{steps.length}</span>
        </span>
      </div>

      {/* Vertical pipeline */}
      <div className="relative ml-1.5">
        {steps.map((step, i) => {
          const isActive = step.status === 'active';
          const isCompleted = step.status === 'completed';
          const isSkipped = step.status === 'skipped';
          const isFailed = step.status === 'failed';
          const isLast = i === steps.length - 1;
          const hasArtifacts = step.artifacts && Object.keys(step.artifacts).length > 0;
          const showArtifacts = hasArtifacts && !isSkipped && step.status !== 'pending';

          // Connector color: green if this step completed, blue if active, gray otherwise
          const connectorColor = isCompleted ? '#22C55E' : isActive ? '#2B5EA7' : '#C4A26560';

          return (
            <div key={step.id} className="relative">
              {/* Vertical connector line (drawn behind the node) */}
              {!isLast && (
                <div
                  className="absolute left-[5px] top-[14px] w-[2px]"
                  style={{
                    backgroundColor: connectorColor,
                    bottom: 0,
                    ...(isSkipped || steps[i + 1]?.status === 'skipped'
                      ? { backgroundImage: `repeating-linear-gradient(to bottom, ${connectorColor} 0 3px, transparent 3px 6px)`, backgroundColor: 'transparent' }
                      : {}),
                  }}
                />
              )}

              {/* Step row */}
              <div
                className={cn('relative flex items-start gap-2 pb-1', isSkipped && 'opacity-40')}
                style={isActive ? {
                  backgroundColor: '#E8D5B020',
                  borderRadius: '2px',
                  margin: '0 -2px',
                  padding: '2px 4px 2px 2px',
                } : undefined}
              >
                {/* Node */}
                <div className="relative z-10 mt-[1px] shrink-0">
                  {isCompleted ? (
                    <div className="h-3 w-3 rounded-full flex items-center justify-center" style={{ backgroundColor: '#22C55E' }}>
                      <Check className="h-2 w-2 text-white" strokeWidth={3} />
                    </div>
                  ) : isActive ? (
                    <div className="h-3 w-3 rounded-full flex items-center justify-center animate-pulse" style={{ backgroundColor: '#2B5EA7' }}>
                      <Play className="h-1.5 w-1.5 text-white" />
                    </div>
                  ) : isFailed ? (
                    <div className="h-3 w-3 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EF4444' }}>
                      <XCircle className="h-2 w-2 text-white" strokeWidth={3} />
                    </div>
                  ) : isSkipped ? (
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#C4A26540', border: '1px dashed #C4A265' }} />
                  ) : (
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#E8D5B0', border: '2px solid #C4A26560' }} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={cn(
                        'text-[10px] leading-none',
                        isActive ? 'font-bold' : isCompleted ? 'font-medium' : '',
                        isSkipped && 'line-through',
                      )}
                      style={{
                        color: isActive ? '#2B5EA7' : isFailed ? '#DC2626' : PARCHMENT.text,
                      }}
                    >
                      {step.label}
                    </span>
                    {step.artifacts?.Agent && (
                      <span
                        className="text-[9px] font-bold shrink-0"
                        style={{ color: agentColor(step.artifacts.Agent) }}
                      >
                        {step.artifacts.Agent}
                      </span>
                    )}
                    {step.needsAction && (
                      <span
                        className="text-[8px] font-bold px-1 py-0.5 leading-none shrink-0"
                        style={{
                          backgroundColor: '#EAB308',
                          color: '#422006',
                          borderRadius: '2px',
                        }}
                      >
                        ACTION
                      </span>
                    )}
                  </div>

                  {/* Artifact details */}
                  {showArtifacts && (
                    <div className="mt-0.5 space-y-0.5">
                      {Object.entries(step.artifacts!).map(([key, value]) => {
                        if (key === 'Agent') return null;
                        return (
                          <div key={key} className="flex gap-1 text-[9px] leading-tight">
                            <span className="shrink-0" style={{ color: PARCHMENT.textDim }}>{key}:</span>
                            <span className="break-words" style={{ color: PARCHMENT.text }}>{value}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Session action card
// ---------------------------------------------------------------------------

function SessionCard({
  session,
  onFocus,
  focusingPane,
}: {
  session: Session;
  onFocus: (paneId: string) => void;
  focusingPane: string | null;
}) {
  const feature = session.feature;
  const rawPrompt = session.latestPrompt ?? session.initialPrompt;
  // Extract a meaningful snippet from the prompt (first ~120 chars, after any role preamble)
  const promptSnippet = rawPrompt
    ? rawPrompt
        .replace(/^You are [^.]+\.\s*/i, '')
        .replace(/^Your\s+(?:job|task|goal|objective|mission)\s*(?:is\s+to)?[:\s]*/i, '')
        .replace(/^The CEO\s+[^.\n]*\.\s*/i, '')
        .replace(/^(?:Don't|Do not|Never|Always|Think|Remember)[^.\n]*\.\s*/i, '')
        .replace(/^Socratic refinement\.\s*/i, '')
        .replace(/^(?:QUESTION|CONTEXT|BACKGROUND|INSTRUCTIONS?)\s*:\s*/i, '')
        .trim()
        .slice(0, 120).split('\n')[0]
    : null;
  const isWaiting = session.status === 'waiting-approval' || session.status === 'waiting-input';
  const isError = session.status === 'error';
  const borderColor = isError ? '#EF4444' : isWaiting ? '#EAB308' : '#3B82F6';

  return (
    <div
      className="relative overflow-hidden"
      style={{
        ...PIXEL_CARD_RAISED,
        borderLeft: `3px solid ${borderColor}`,
        ...(isError ? { backgroundColor: '#F5E0D8' } : {}),
      }}
    >
      <div className="px-2 py-2.5 space-y-1.5">
        {/* Row 1: Status + agent name + time */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <StatusChip status={session.status} />
          {session.agentName && (
            <span className="font-bold" style={{ color: PARCHMENT.text }}>
              {session.agentName}
            </span>
          )}
          {session.agentRole && (
            <span className="text-[9px] truncate" style={{ color: PARCHMENT.textDim }}>
              {session.agentRole}
            </span>
          )}
          <span className="ml-auto shrink-0 text-[10px]" style={{ color: PARCHMENT.textDim }}>
            {timeAgo(session.lastActivity)}
          </span>
        </div>

        {/* Feature / task name */}
        {feature && (
          <p
            className="text-[11px] font-bold leading-tight font-mono"
            style={{ color: PARCHMENT.text }}
          >
            {feature}
          </p>
        )}

        {/* Prompt context — what was the agent asked to do */}
        {promptSnippet && (
          <p
            className="text-[10px] line-clamp-2 leading-tight font-mono"
            style={{ color: PARCHMENT.textDim }}
          >
            {promptSnippet}
          </p>
        )}

        {/* Git branch */}
        {session.gitBranch && (
          <div
            className="text-[9px] font-mono truncate"
            style={{ color: PARCHMENT.textDim }}
          >
            &#x2387; {session.gitBranch}
          </div>
        )}

        {/* Session slug (small, for identification) */}
        {session.slug && (
          <div
            className="text-[9px] font-mono truncate"
            style={{ color: PARCHMENT.textDim }}
          >
            {session.slug}
          </div>
        )}

        {isWaiting && session.paneId && (
          <QuickActions paneId={session.paneId} sessionStatus={session.status} terminalApp={session.terminalApp} />
        )}
        {session.paneId && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] w-full justify-start gap-1.5 font-mono"
            style={{ color: PARCHMENT.text }}
            onClick={() => onFocus(session.paneId!)}
            disabled={focusingPane === session.paneId}
          >
            {focusingPane === session.paneId ? (
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

// ---------------------------------------------------------------------------
// Directive History — recent completed/failed
// ---------------------------------------------------------------------------

function DirectiveHistoryList({
  sessions,
  onApprove,
  onFocus,
  onOpenDetail,
  approvingId,
  focusingPane,
}: {
  sessions: Session[];
  onApprove: (e: React.MouseEvent, name: string) => void;
  onFocus: (paneId: string) => void;
  onOpenDetail: (type: 'brainstorm' | 'brief', directiveTitle: string, content: string) => void;
  approvingId: string | null;
  focusingPane: string | null;
}) {
  const directiveHistory = useDashboardStore((s) => s.directiveHistory);
  const activeDirectives = useDashboardStore((s) => s.activeDirectives);

  // Build set of active directive IDs to exclude from recent
  const activeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const d of activeDirectives ?? []) ids.add(d.directiveName);
    return ids;
  }, [activeDirectives]);

  const recentDirectives = useMemo(() => {
    return (directiveHistory ?? [])
      .filter((d) => !activeIds.has(d.directiveName))
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
      .slice(0, 5);
  }, [directiveHistory, activeIds]);

  if (recentDirectives.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <SectionHeader icon={<History className="h-3 w-3" />}>
        Completed
      </SectionHeader>

      {recentDirectives.map((d) => (
        <DirectiveCard
          key={d.directiveName}
          directive={d}
          defaultExpanded={false}
          sessions={sessions}
          onApprove={onApprove}
          onFocus={onFocus}
          onOpenDetail={onOpenDetail}
          approvingId={approvingId}
          focusingPane={focusingPane}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DetailPanel — full markdown view for brainstorm / directive brief
// ---------------------------------------------------------------------------

function DetailPanel({
  title,
  icon,
  iconColor,
  content,
  onBack,
}: {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  content: string;
  onBack: () => void;
}) {
  return (
    <div className="space-y-2 font-mono">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-[10px] font-bold shrink-0"
          style={{ color: PARCHMENT.textDim }}
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </button>
        <div className="h-px flex-1" style={{ backgroundColor: PARCHMENT.border }} />
      </div>

      {/* Title */}
      <div className="flex items-center gap-1.5 px-1">
        <span style={{ color: iconColor }}>{icon}</span>
        <span className="text-xs font-bold" style={{ color: PARCHMENT.text }}>
          {title}
        </span>
      </div>

      {/* Content */}
      <div
        className="px-2 py-2 space-y-0.5 overflow-y-auto"
        style={{ ...PIXEL_CARD, maxHeight: 'calc(100vh - 200px)' }}
      >
        {renderBriefMarkdown(content, 200)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ActionPanel() {
  const sessions = useDashboardStore((s) => s.sessions);
  const directiveState = useDashboardStore((s) => s.directiveState);
  const activeDirectives = useDashboardStore((s) => s.activeDirectives);

  // Build the list of directives to show
  const directives = useMemo(() => {
    if (activeDirectives && activeDirectives.length > 0) return activeDirectives;
    if (directiveState) return [directiveState];
    return [];
  }, [activeDirectives, directiveState]);

  // Sort: awaiting_completion first, then in_progress, then others
  const sortedDirectives = useMemo(() => {
    return [...directives].sort((a, b) => {
      const priority = (d: DirectiveState) =>
        d.status === 'awaiting_completion' ? 0 : d.status === 'in_progress' ? 1 : 2;
      return priority(a) - priority(b);
    });
  }, [directives]);

  // Session action items (non-subagent, non-done sessions needing attention)
  const actionSessions = useMemo(() => {
    return sessions.filter((s) =>
      !s.isSubagent &&
      (s.status === 'error' || s.status === 'waiting-approval' || s.status === 'waiting-input'),
    ).sort((a, b) => {
      const prio = (s: Session) =>
        s.status === 'error' ? 0 : s.status === 'waiting-approval' ? 1 : 2;
      return prio(a) - prio(b) || new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });
  }, [sessions]);

  // Detail panel state (brainstorm / brief)
  const [detailView, setDetailView] = useState<{
    type: 'brainstorm' | 'brief';
    directiveTitle: string;
    content: string;
  } | null>(null);

  // Focus terminal action
  const [focusingPane, setFocusingPane] = useState<string | null>(null);
  const handleFocus = useCallback(async (paneId: string) => {
    setFocusingPane(paneId);
    try {
      await fetch(`${API_BASE}/api/actions/focus-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paneId }),
      });
    } catch { /* silent */ } finally {
      setFocusingPane(null);
    }
  }, []);

  // Approve directive action
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const handleApprove = useCallback(async (e: React.MouseEvent, directiveName: string) => {
    e.stopPropagation();
    setApprovingId(directiveName);
    try {
      await fetch(`${API_BASE}/api/actions/directive-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', directiveName }),
      });
    } catch { /* silent */ } finally {
      setApprovingId(null);
    }
  }, []);

  // --- Detail panel drill-down (brainstorm / brief) ---
  if (detailView) {
    return (
      <DetailPanel
        title={detailView.type === 'brainstorm' ? 'Brainstorm' : 'Directive Brief'}
        icon={detailView.type === 'brainstorm'
          ? <Lightbulb className="h-3.5 w-3.5" />
          : <MapIcon className="h-3.5 w-3.5" />}
        iconColor={detailView.type === 'brainstorm' ? '#7C3AED' : '#059669'}
        content={detailView.content}
        onBack={() => setDetailView(null)}
      />
    );
  }

  // --- Empty state ---
  if (sortedDirectives.length === 0 && actionSessions.length === 0) {
    return (
      <div className="space-y-4">
        <div
          className="text-center py-8 font-mono"
          style={PIXEL_CARD}
        >
          <Terminal
            className="h-6 w-6 mx-auto mb-2"
            style={{ color: PARCHMENT.textDim, opacity: 0.4 }}
          />
          <p className="text-xs font-bold" style={{ color: PARCHMENT.text }}>All clear</p>
          <p className="text-[10px] mt-0.5" style={{ color: PARCHMENT.textDim }}>
            No active directives or pending actions
          </p>
        </div>
        <DirectiveHistoryList
          sessions={sessions}
          onApprove={handleApprove}
          onFocus={handleFocus}
          onOpenDetail={(type, title, content) => setDetailView({ type, directiveTitle: title, content })}
          approvingId={approvingId}
          focusingPane={focusingPane}
        />
      </div>
    );
  }

  // --- Render ---
  return (
    <div className="space-y-3">
      {/* Active directives — rich cards */}
      {sortedDirectives.length > 0 && (
        <div className="space-y-2">
          <SectionHeader
            icon={<Crosshair className="h-3 w-3" />}
            count={sortedDirectives.length}
          >
            Directives
          </SectionHeader>
          {sortedDirectives.map((d, i) => (
            <DirectiveCard
              key={d.directiveName}
              directive={d}
              defaultExpanded={i === 0}
              sessions={sessions}
              onApprove={handleApprove}
              onFocus={handleFocus}
              onOpenDetail={(type, title, content) => setDetailView({ type, directiveTitle: title, content })}
              approvingId={approvingId}
              focusingPane={focusingPane}
            />
          ))}
        </div>
      )}

      {/* Session actions */}
      {actionSessions.length > 0 && (
        <>
          {sortedDirectives.length > 0 && <ParchmentDivider ornament />}
          <div className="space-y-2">
            <SectionHeader
              icon={<AlertTriangle className="h-3 w-3" />}
              count={actionSessions.length}
              color="#EAB308"
            >
              Agent Actions
            </SectionHeader>
            {actionSessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onFocus={handleFocus}
                focusingPane={focusingPane}
              />
            ))}
          </div>
        </>
      )}

      {/* History */}
      {sortedDirectives.length > 0 && <ParchmentDivider ornament />}
      <DirectiveHistoryList
          sessions={sessions}
          onApprove={handleApprove}
          onFocus={handleFocus}
          onOpenDetail={(type, title, content) => setDetailView({ type, directiveTitle: title, content })}
          approvingId={approvingId}
          focusingPane={focusingPane}
        />
    </div>
  );
}
