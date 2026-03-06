import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Check,
  AlertCircle,
  XCircle,
  Filter,
  BookOpen,
  FolderSearch,
  Swords,
  Lightbulb,
  Map as MapIcon,
  SearchCheck,
  ThumbsUp,
  Sparkles,
  Settings,
  Play,
  ShieldCheck,
  PackageCheck,
  Flag,
  SkipForward,
  Copy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PipelineStep, PipelineStepStatus } from '@/stores/types';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Step Icon Map — maps pipeline step IDs to Lucide icons
// ---------------------------------------------------------------------------

const stepIconMap: Record<string, LucideIcon> = {
  triage: Filter,
  read: BookOpen,
  context: FolderSearch,
  challenge: Swords,
  brainstorm: Lightbulb,
  plan: MapIcon,
  audit: SearchCheck,
  approve: ThumbsUp,
  'project-brainstorm': Sparkles,
  setup: Settings,
  execute: Play,
  'review-gate': ShieldCheck,
  wrapup: PackageCheck,
  completion: Flag,
};

// ---------------------------------------------------------------------------
// Action banner text map — contextual messages for needsAction steps
// ---------------------------------------------------------------------------

const actionBannerText: Record<string, string> = {
  approve: 'Plan ready for review. Approve to begin execution or reject with feedback.',
  completion: 'All projects complete. Sign off to finalize this directive.',
};

interface PipelineStepperProps {
  steps: PipelineStep[];
  compact?: boolean;
  onAction?: (stepId: string, action: 'approve' | 'reject') => void;
}

// ---------------------------------------------------------------------------
// Shared logic — single source of truth
// ---------------------------------------------------------------------------

function usePipelineState(steps: PipelineStep[]) {
  const activeStep = steps.find((s) => s.status === 'active');
  const failedStep = steps.find((s) => s.status === 'failed');
  const focusStep = failedStep ?? activeStep;
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const allDone = steps.length > 0 && steps.every((s) => s.status === 'completed' || s.status === 'skipped');
  const focusIdx = focusStep ? steps.findIndex((s) => s.id === focusStep.id) : -1;
  return { activeStep, failedStep, focusStep, focusIdx, completedCount, allDone };
}

// ---------------------------------------------------------------------------
// Ticking elapsed time
// ---------------------------------------------------------------------------

function useElapsed(iso: string | undefined): string {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!iso) return;
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [iso]);
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return '';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return '<1m';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h${mins % 60}m`;
}

// ---------------------------------------------------------------------------
// Step transition flash
// ---------------------------------------------------------------------------

function useStableSteps(steps: PipelineStep[]): PipelineStep[] {
  const key = steps.map((s) => `${s.id}:${s.status}`).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => steps, [key]);
}

function useStepFlash(steps: PipelineStep[]): Set<string> {
  const stable = useStableSteps(steps);
  const prevRef = useRef<Map<string, PipelineStepStatus>>(new Map());
  const [flashing, setFlashing] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newFlash = new Set<string>();
    for (const step of stable) {
      const prev = prevRef.current.get(step.id);
      if (prev && prev !== step.status && (step.status === 'completed' || step.status === 'failed')) {
        newFlash.add(step.id);
      }
    }
    const next = new Map<string, PipelineStepStatus>();
    for (const step of stable) next.set(step.id, step.status);
    prevRef.current = next;

    if (newFlash.size > 0) {
      setFlashing(newFlash);
      const timer = setTimeout(() => setFlashing(new Set()), 800);
      return () => clearTimeout(timer);
    }
  }, [stable]);

  return flashing;
}

// ---------------------------------------------------------------------------
// Node — circle indicator for each step
// ---------------------------------------------------------------------------

const NODE_SIZE = { sm: 'h-4 w-4', md: 'h-5 w-5' } as const;
const ICON_SIZE = { sm: 'h-2.5 w-2.5', md: 'h-3 w-3' } as const;

function StepNode({
  step,
  size = 'md',
  isFocus,
  isFlashing,
}: {
  step: PipelineStep;
  size?: 'sm' | 'md';
  isFocus?: boolean;
  isFlashing?: boolean;
}) {
  const base = NODE_SIZE[size];
  const iconCn = ICON_SIZE[size];
  const smallIconCn = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5';

  if (step.status === 'completed') {
    return (
      <span className={cn(
        base, 'rounded-full bg-primary shrink-0 flex items-center justify-center',
        isFlashing && 'animate-[flash_0.4s_ease-out_2]',
      )}>
        <Check className={cn(iconCn, 'text-primary-foreground')} strokeWidth={3} />
      </span>
    );
  }

  if (step.status === 'failed') {
    return (
      <span className={cn(
        base, 'rounded-full bg-destructive shrink-0 flex items-center justify-center',
        isFocus && 'ring-2 ring-destructive/40',
        isFlashing && 'animate-[flash_0.4s_ease-out_2]',
      )}>
        <XCircle className={cn(iconCn, 'text-destructive-foreground')} strokeWidth={3} />
      </span>
    );
  }

  if (step.status === 'active') {
    if (step.needsAction) {
      const Icon = stepIconMap[step.id] ?? AlertCircle;
      return (
        <span className={cn(
          base, 'rounded-full bg-status-yellow shrink-0 flex items-center justify-center',
          isFocus && 'ring-2 ring-status-yellow/40 animate-pulse',
        )}>
          <Icon className={cn(iconCn, 'text-black')} strokeWidth={2.5} />
        </span>
      );
    }
    const Icon = stepIconMap[step.id] ?? Play;
    return (
      <span className={cn(
        base, 'rounded-full bg-primary shrink-0 flex items-center justify-center',
        isFocus && 'ring-2 ring-primary/40 animate-pulse',
      )}>
        <Icon className={cn(iconCn, 'text-primary-foreground')} strokeWidth={2.5} />
      </span>
    );
  }

  if (step.status === 'skipped') {
    return (
      <span className={cn(base, 'rounded-full bg-muted-foreground/15 shrink-0 flex items-center justify-center')}>
        <SkipForward className={cn(iconCn, 'text-muted-foreground/50')} strokeWidth={2.5} />
      </span>
    );
  }

  // pending — outlined circle with faint step icon
  const Icon = stepIconMap[step.id];
  if (Icon) {
    return (
      <span className={cn(base, 'rounded-full border-2 border-muted-foreground/25 shrink-0 flex items-center justify-center')}>
        <Icon className={cn(smallIconCn, 'text-muted-foreground/30')} strokeWidth={2} />
      </span>
    );
  }
  return <span className={cn(base, 'rounded-full border-2 border-muted-foreground/25 shrink-0')} />;
}

// ---------------------------------------------------------------------------
// Vertical connector line between nodes
// ---------------------------------------------------------------------------

function VConnector({ completed, dashed }: { completed: boolean; dashed?: boolean }) {
  if (dashed) {
    return (
      <div className="w-0.5 flex-1 min-h-2 ml-[9px] transition-colors duration-300 border-l-2 border-dashed border-muted-foreground/15 bg-transparent" />
    );
  }
  return (
    <div className={cn(
      'w-0.5 flex-1 min-h-2 ml-[9px] transition-colors duration-300',
      completed ? 'bg-primary/50' : 'bg-muted-foreground/15',
    )} />
  );
}

function VConnectorSm({ completed, dashed }: { completed: boolean; dashed?: boolean }) {
  if (dashed) {
    return (
      <div className="w-0.5 flex-1 min-h-1.5 ml-[7px] transition-colors duration-300 border-l-2 border-dashed border-muted-foreground/15 bg-transparent" />
    );
  }
  return (
    <div className={cn(
      'w-0.5 flex-1 min-h-1.5 ml-[7px] transition-colors duration-300',
      completed ? 'bg-primary/50' : 'bg-muted-foreground/15',
    )} />
  );
}

// ---------------------------------------------------------------------------
// File path detection + clickable artifact link
// ---------------------------------------------------------------------------

function isFilePath(value: string): boolean {
  return value.startsWith('.') || value.startsWith('/') || value.endsWith('.md') || value.endsWith('.json');
}

function ArtifactLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(() => {
    navigator.clipboard.writeText(path).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => { /* clipboard permission denied — no-op */ });
  }, [path]);

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={handleClick}
        className="text-primary/80 hover:text-primary hover:underline cursor-pointer font-mono text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm px-0.5"
        aria-label={`Copy path: ${path}`}
      >
        {path}
      </button>
      {copied ? (
        <span className="text-[9px] text-status-green font-medium select-none animate-in fade-in duration-200">
          Copied!
        </span>
      ) : (
        <Copy className="h-2.5 w-2.5 text-muted-foreground/40" aria-hidden="true" />
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// CEO Action Banner — displayed below needsAction steps
// ---------------------------------------------------------------------------

function ActionBanner({
  stepId,
  onAction,
}: {
  stepId: string;
  onAction?: (stepId: string, action: 'approve' | 'reject') => void;
}) {
  const text = actionBannerText[stepId] ?? 'Action needed — this step requires your input to proceed.';

  return (
    <div className="ml-7 mt-1 mb-1 rounded-md border border-status-yellow/40 bg-status-yellow/5 px-3 py-2">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-3.5 w-3.5 text-status-yellow shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-foreground/80 leading-relaxed">{text}</p>
          {onAction && (
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => onAction(stepId, 'approve')}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-3"
                onClick={() => onAction(stepId, 'reject')}
              >
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline artifact display for vertical layout
// ---------------------------------------------------------------------------

function InlineArtifacts({ step, compact }: { step: PipelineStep; compact?: boolean }) {
  if (!step.artifacts || Object.keys(step.artifacts).length === 0) return null;

  // In compact mode, only show agent
  const entries = compact
    ? Object.entries(step.artifacts).filter(([k]) => k === 'Agent')
    : Object.entries(step.artifacts);
  if (entries.length === 0) return null;

  return (
    <div className={cn(
      'rounded px-2 py-1 mt-0.5 text-[10px]',
      step.status === 'failed'
        ? 'bg-destructive/5 border border-destructive/20'
        : step.needsAction
          ? 'bg-status-yellow/5 border border-status-yellow/20'
          : step.status === 'active'
            ? 'bg-primary/5 border border-primary/15'
            : 'bg-muted/50 border border-border/50',
    )}>
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-1.5">
          <span className="text-muted-foreground shrink-0">{k}:</span>
          {isFilePath(v) ? (
            <ArtifactLink path={v} />
          ) : (
            <span className={cn('break-words', k === 'Agent' ? 'text-primary font-medium' : 'text-foreground')}>{v}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step label styling helper
// ---------------------------------------------------------------------------

function stepLabelClass(step: PipelineStep, isFocus: boolean, size: 'sm' | 'md' = 'md'): string {
  const base = size === 'sm' ? 'text-[10px]' : 'text-[11px]';
  if (step.status === 'skipped') return cn(base, 'text-muted-foreground/50 line-through');
  if (isFocus && step.needsAction) return cn(base, 'text-status-yellow font-bold');
  if (isFocus) return cn(base, 'text-primary font-bold');
  if (step.status === 'completed') return cn(base, 'text-foreground/70');
  if (step.status === 'failed') return cn(base, 'text-destructive font-semibold');
  return cn(base, 'text-muted-foreground/50');
}

// ---------------------------------------------------------------------------
// Full mode — vertical timeline
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Current step header — prominent banner at top
// ---------------------------------------------------------------------------

function CurrentStepHeader({ step, elapsed }: { step: PipelineStep; elapsed: string }) {
  const agent = step.artifacts?.Agent;
  // Build a description from non-Agent artifacts
  const details = step.artifacts
    ? Object.entries(step.artifacts)
        .filter(([k]) => k !== 'Agent' && k !== 'Reviewers')
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ')
    : '';
  const reviewers = step.artifacts?.Reviewers;

  const isFailed = step.status === 'failed';
  const needsAction = step.needsAction;

  return (
    <div className={cn(
      'rounded-md px-3 py-2 mb-2 border',
      isFailed
        ? 'bg-destructive/10 border-destructive/30'
        : needsAction
          ? 'bg-status-yellow/10 border-status-yellow/30'
          : 'bg-primary/5 border-primary/20',
    )}>
      <div className="flex items-center gap-2">
        {!isFailed && !needsAction && (
          <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse shrink-0" />
        )}
        {isFailed && <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
        {needsAction && <AlertCircle className="h-3.5 w-3.5 text-status-yellow shrink-0" />}
        <span className={cn(
          'text-xs font-bold',
          isFailed ? 'text-destructive' : needsAction ? 'text-status-yellow' : 'text-primary',
        )}>
          {step.label}
        </span>
        {agent && (
          <span className="text-[11px] text-primary font-medium">{agent}</span>
        )}
        {reviewers && (
          <span className="text-[10px] text-muted-foreground">rev: {reviewers}</span>
        )}
        {elapsed && (
          <span className="text-[10px] text-muted-foreground tabular-nums ml-auto">{elapsed}</span>
        )}
      </div>
      {details && (
        <div className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{details}</div>
      )}
    </div>
  );
}

function FullStepper({ steps, onAction }: { steps: PipelineStep[]; onAction?: (stepId: string, action: 'approve' | 'reject') => void }) {
  const { focusStep, completedCount, allDone } = usePipelineState(steps);
  const elapsed = useElapsed(focusStep?.startedAt);
  const flashing = useStepFlash(steps);

  return (
    <div className="space-y-1.5">
      {/* Current step header — prominent at top */}
      {focusStep && !allDone && (
        <CurrentStepHeader step={focusStep} elapsed={elapsed} />
      )}

      {/* Vertical step list */}
      <div className="flex flex-col">
        {steps.map((step, i) => {
          const isFocus = focusStep?.id === step.id;
          const hasArtifacts = step.artifacts && Object.keys(step.artifacts).length > 0;
          // Show artifacts for all non-pending steps (completed, active, failed)
          const showArtifacts = hasArtifacts && step.status !== 'pending';

          const isSkipped = step.status === 'skipped';
          const showActionBanner = step.status === 'active' && step.needsAction;
          const nextStep = i < steps.length - 1 ? steps[i + 1] : undefined;
          const isDashedConnector = isSkipped || nextStep?.status === 'skipped';

          return (
            <div key={step.id}>
              {/* Step row: node + label + status */}
              <div className={cn(
                'flex items-center gap-2 min-h-[24px]',
                isSkipped && 'opacity-50',
              )}>
                <StepNode step={step} isFocus={isFocus} isFlashing={flashing.has(step.id)} />
                <div
                  className="flex items-center gap-2 flex-1 min-w-0"
                  aria-label={`${step.label} — ${step.status}${step.needsAction ? ', action needed' : ''}`}
                >
                  <span className={stepLabelClass(step, isFocus)}>{step.label}</span>
                  {isFocus && elapsed && (
                    <span className="text-muted-foreground tabular-nums text-[10px]">{elapsed}</span>
                  )}
                </div>
              </div>

              {/* Inline artifacts — always visible for non-pending, non-skipped steps */}
              {showArtifacts && !isSkipped && (
                <div className="ml-7 mb-0.5">
                  <InlineArtifacts step={step} />
                </div>
              )}

              {/* Action banner for needsAction steps */}
              {showActionBanner && <ActionBanner stepId={step.id} onAction={onAction} />}

              {/* Vertical connector */}
              {i < steps.length - 1 && (
                <VConnector completed={step.status === 'completed'} dashed={isDashedConnector} />
              )}
            </div>
          );
        })}
      </div>

      {/* Status summary line */}
      <div className="flex items-center gap-1.5 text-[10px] pt-0.5">
        {allDone ? (
          <>
            <Check className="h-3 w-3 text-status-green shrink-0" strokeWidth={3} />
            <span className="text-status-green font-semibold text-[11px]">Pipeline complete</span>
          </>
        ) : focusStep?.status === 'failed' ? (
          <>
            <XCircle className="h-3 w-3 text-destructive shrink-0" />
            <span className="text-destructive font-semibold text-[11px]">Failed at {focusStep.label}</span>
          </>
        ) : focusStep?.needsAction ? (
          <>
            <AlertCircle className="h-3 w-3 text-status-yellow shrink-0" />
            <span className="text-status-yellow font-semibold text-[11px]">Awaiting your action</span>
          </>
        ) : focusStep ? (
          <>
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
            <span className="text-foreground font-medium text-[11px]">{focusStep.label}</span>
          </>
        ) : (
          <span className="text-muted-foreground text-[11px]">Waiting to start</span>
        )}
        <span className="ml-auto text-muted-foreground/50 tabular-nums text-[10px]">
          {completedCount}/{steps.length}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact mode — focus step + neighbors (max 3), vertical
// ---------------------------------------------------------------------------

function CompactStepper({ steps }: { steps: PipelineStep[] }) {
  const { focusStep, focusIdx, completedCount, allDone } = usePipelineState(steps);
  const elapsed = useElapsed(focusStep?.startedAt);

  // All done — simple summary
  if (allDone) {
    return (
      <div className="flex items-center gap-1.5 text-[11px]">
        <Check className="h-3.5 w-3.5 text-status-green shrink-0" strokeWidth={3} />
        <span className="text-status-green font-semibold">Pipeline complete</span>
        <span className="ml-auto text-muted-foreground/50 tabular-nums text-[10px]">{steps.length} steps</span>
      </div>
    );
  }

  // No active step yet
  if (!focusStep || focusIdx < 0) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="h-2 w-2 rounded-full border border-muted-foreground/30 shrink-0" />
        <span>Pipeline pending</span>
        <span className="ml-auto tabular-nums text-[10px] text-muted-foreground/50">0/{steps.length}</span>
      </div>
    );
  }

  // Pick up to 3 steps: prev, focus, next
  const visible: PipelineStep[] = [];
  if (focusIdx > 0) visible.push(steps[focusIdx - 1]);
  visible.push(focusStep);
  if (focusIdx < steps.length - 1) visible.push(steps[focusIdx + 1]);

  return (
    <div className="space-y-1">
      {/* Leading context */}
      {focusIdx > 1 && (
        <span className="text-[9px] text-muted-foreground/40 ml-5 select-none">
          {focusIdx - 1} done...
        </span>
      )}

      {/* Vertical mini-steps */}
      <div className="flex flex-col">
        {visible.map((step, i) => {
          const isFocus = step.id === focusStep.id;
          return (
            <div key={step.id}>
              <div className="flex items-center gap-1.5 min-h-[18px]">
                <StepNode step={step} size="sm" isFocus={isFocus} />
                <span className={cn(
                  'text-[10px] leading-none select-none',
                  isFocus && step.needsAction
                    ? 'text-status-yellow font-bold'
                    : isFocus
                      ? 'text-foreground font-semibold'
                      : 'text-muted-foreground/50',
                )}>
                  {step.label}
                </span>
                {step.artifacts?.Agent && (
                  <span className="text-[9px] text-primary/70 font-medium select-none">{step.artifacts.Agent}</span>
                )}
                {isFocus && elapsed && (
                  <span className="text-muted-foreground/50 tabular-nums text-[9px]">{elapsed}</span>
                )}
              </div>
              {/* Show artifacts for focused step in compact mode */}
              {isFocus && step.artifacts && Object.keys(step.artifacts).length > 1 && (
                <div className="ml-5 mb-0.5">
                  <InlineArtifacts step={step} compact />
                </div>
              )}
              {i < visible.length - 1 && (
                <VConnectorSm
                  completed={visible[i].status === 'completed'}
                  dashed={visible[i].status === 'skipped' || visible[i + 1].status === 'skipped'}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Trailing context */}
      {focusIdx < steps.length - 2 && (
        <span className="text-[9px] text-muted-foreground/40 ml-5 select-none">
          +{steps.length - focusIdx - 2} more
        </span>
      )}

      {/* Status line */}
      <div className="flex items-center gap-1.5 text-[10px]">
        {focusStep.status === 'failed' ? (
          <>
            <XCircle className="h-3 w-3 text-destructive shrink-0" />
            <span className="text-destructive font-semibold">Failed</span>
          </>
        ) : focusStep.needsAction ? (
          <>
            <AlertCircle className="h-3 w-3 text-status-yellow shrink-0" />
            <span className="text-status-yellow font-semibold">Action needed</span>
          </>
        ) : null}
        <span className="ml-auto text-muted-foreground/50 tabular-nums">
          {completedCount}/{steps.length}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default function PipelineStepper({ steps, compact, onAction }: PipelineStepperProps) {
  if (steps.length === 0) return null;
  if (compact) return <CompactStepper steps={steps} />;
  return <FullStepper steps={steps} onAction={onAction} />;
}
