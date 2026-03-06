import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import {
  Filter,
  BookOpen,
  FolderSearch,
  Swords,
  Lightbulb,
  Map,
  SearchCheck,
  ThumbsUp,
  Sparkles,
  Settings,
  Play,
  ShieldCheck,
  PackageCheck,
  Flag,
  SkipForward,
  Check,
  ChevronDown,
  Copy,
  AlertCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PipelineStep } from '@/stores/types';

// ---------------------------------------------------------------------------
// Step Icon Map
// ---------------------------------------------------------------------------

const stepIconMap: Record<string, LucideIcon> = {
  triage: Filter,
  read: BookOpen,
  context: FolderSearch,
  challenge: Swords,
  brainstorm: Lightbulb,
  plan: Map,
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
// Action banner config per step
// ---------------------------------------------------------------------------

const actionBannerText: Record<string, string> = {
  approve:
    'Plan ready for review. Approve to begin execution or reject with feedback.',
  completion:
    'All projects complete. Sign off to finalize this directive.',
};

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_STEPS: PipelineStep[] = [
  { id: 'triage', label: 'Triage', status: 'completed', artifacts: { Agent: 'CEO', Weight: 'heavyweight' } },
  { id: 'read', label: 'Read', status: 'completed', artifacts: { Agent: 'CEO' } },
  { id: 'context', label: 'Context', status: 'completed', artifacts: { Agent: 'CEO' } },
  { id: 'challenge', label: 'Challenge', status: 'skipped' },
  { id: 'brainstorm', label: 'Brainstorm', status: 'completed', artifacts: { Agent: 'C-suite', Files: '.context/directives/pipeline-stepper-v3/brainstorm.md' } },
  { id: 'plan', label: 'Plan', status: 'completed', artifacts: { Agent: 'Morgan', Files: '.context/directives/pipeline-stepper-v3/morgan-plan.json' } },
  { id: 'audit', label: 'Audit', status: 'completed', artifacts: { Agent: 'Sarah + Marcus', Files: '.context/directives/pipeline-stepper-v3/audit.md' } },
  { id: 'approve', label: 'Approve', status: 'active', needsAction: true, artifacts: { Agent: 'CEO', Decision: 'pending' } },
  { id: 'project-brainstorm', label: 'Project Brainstorm', status: 'pending' },
  { id: 'setup', label: 'Setup', status: 'pending' },
  { id: 'execute', label: 'Execute', status: 'pending' },
  { id: 'review-gate', label: 'Review Gate', status: 'pending' },
  { id: 'wrapup', label: 'Wrapup', status: 'pending' },
  { id: 'completion', label: 'Completion', status: 'pending' },
];

const MOCK_LIGHTWEIGHT_STEPS: PipelineStep[] = [
  { id: 'triage', label: 'Triage', status: 'completed' },
  { id: 'read', label: 'Read', status: 'completed' },
  { id: 'context', label: 'Context', status: 'completed' },
  { id: 'challenge', label: 'Challenge', status: 'skipped' },
  { id: 'brainstorm', label: 'Brainstorm', status: 'skipped' },
  { id: 'plan', label: 'Plan', status: 'completed' },
  { id: 'audit', label: 'Audit', status: 'completed' },
  { id: 'approve', label: 'Approve', status: 'skipped' },
  { id: 'project-brainstorm', label: 'Project Brainstorm', status: 'skipped' },
  { id: 'setup', label: 'Setup', status: 'completed' },
  { id: 'execute', label: 'Execute', status: 'active', startedAt: new Date().toISOString(), artifacts: { Agent: 'Riley', Progress: '3/5 tasks' } },
  { id: 'review-gate', label: 'Review Gate', status: 'pending' },
  { id: 'wrapup', label: 'Wrapup', status: 'pending' },
  { id: 'completion', label: 'Completion', status: 'pending' },
];

interface HistoryEntry {
  title: string;
  status: 'completed' | 'failed';
  weight: string;
  lastUpdated: string;
}

const MOCK_HISTORY: HistoryEntry[] = [
  { title: 'Game Phase 3 -- Living Office', status: 'completed', weight: 'heavyweight', lastUpdated: '2026-03-05T18:30:00Z' },
  { title: 'Pipeline Visualization v2', status: 'completed', weight: 'medium', lastUpdated: '2026-03-04T14:20:00Z' },
  { title: 'CEO Player Character', status: 'failed', weight: 'medium', lastUpdated: '2026-03-03T09:15:00Z' },
  { title: 'Game HUD Redesign', status: 'completed', weight: 'heavyweight', lastUpdated: '2026-03-02T16:45:00Z' },
  { title: 'Directive Data Consolidation', status: 'completed', weight: 'lightweight', lastUpdated: '2026-03-01T11:00:00Z' },
];

// ---------------------------------------------------------------------------
// Clickable Artifact Link
// ---------------------------------------------------------------------------

function ArtifactLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(() => {
    navigator.clipboard.writeText(path).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
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
// Inline Artifact Display (v3 with clickable file paths)
// ---------------------------------------------------------------------------

function isFilePath(value: string): boolean {
  return value.startsWith('.') || value.startsWith('/') || value.endsWith('.md') || value.endsWith('.json');
}

function StepArtifacts({ step }: { step: PipelineStep }) {
  if (!step.artifacts || Object.keys(step.artifacts).length === 0) return null;

  return (
    <div
      className={cn(
        'rounded px-2 py-1 mt-1 text-[10px]',
        step.needsAction
          ? 'bg-status-yellow/5 border border-status-yellow/20'
          : step.status === 'active'
            ? 'bg-primary/5 border border-primary/15'
            : 'bg-muted/50 border border-border/50',
      )}
    >
      {Object.entries(step.artifacts).map(([key, value]) => (
        <div key={key} className="flex gap-1.5">
          <span className="text-muted-foreground shrink-0">{key}:</span>
          {isFilePath(value) ? (
            <ArtifactLink path={value} />
          ) : (
            <span
              className={cn(
                'break-words',
                key === 'Agent' ? 'text-primary font-medium' : 'text-foreground',
              )}
            >
              {value}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CEO Action Banner
// ---------------------------------------------------------------------------

function ActionBanner({ stepId }: { stepId: string }) {
  const text = actionBannerText[stepId];
  if (!text) return null;

  return (
    <div className="ml-7 mt-1 mb-1 rounded-md border border-status-yellow/40 bg-status-yellow/5 px-3 py-2">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-3.5 w-3.5 text-status-yellow shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-foreground/80 leading-relaxed">{text}</p>
          <div className="flex gap-2 mt-2">
            <Button size="sm" className="h-7 text-xs px-3">
              Approve
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs px-3">
              Reject
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step Node (v3 with step-specific icons)
// ---------------------------------------------------------------------------

function StepNodeV3({ step, isFocus }: { step: PipelineStep; isFocus: boolean }) {
  const size = 'h-5 w-5';
  const iconSize = 'h-3 w-3';

  // Skipped: SkipForward icon in muted circle
  if (step.status === 'skipped') {
    return (
      <span className={cn(size, 'rounded-full bg-muted-foreground/15 shrink-0 flex items-center justify-center')}>
        <SkipForward className={cn(iconSize, 'text-muted-foreground/50')} strokeWidth={2.5} />
      </span>
    );
  }

  // Completed: green circle with check
  if (step.status === 'completed') {
    return (
      <span className={cn(size, 'rounded-full bg-primary shrink-0 flex items-center justify-center')}>
        <Check className={cn(iconSize, 'text-primary-foreground')} strokeWidth={3} />
      </span>
    );
  }

  // Active with needsAction: yellow pulsing circle with step icon
  if (step.status === 'active' && step.needsAction) {
    const Icon = stepIconMap[step.id] ?? AlertCircle;
    return (
      <span
        className={cn(
          size,
          'rounded-full bg-status-yellow shrink-0 flex items-center justify-center',
          isFocus && 'ring-2 ring-status-yellow/40 animate-pulse',
        )}
      >
        <Icon className={cn(iconSize, 'text-black')} strokeWidth={2.5} />
      </span>
    );
  }

  // Active: primary circle with step icon
  if (step.status === 'active') {
    const Icon = stepIconMap[step.id] ?? Play;
    return (
      <span
        className={cn(
          size,
          'rounded-full bg-primary shrink-0 flex items-center justify-center',
          isFocus && 'ring-2 ring-primary/40 animate-pulse',
        )}
      >
        <Icon className={cn(iconSize, 'text-primary-foreground')} strokeWidth={2.5} />
      </span>
    );
  }

  // Pending: outlined circle with step icon
  const Icon = stepIconMap[step.id];
  if (Icon) {
    return (
      <span className={cn(size, 'rounded-full border-2 border-muted-foreground/25 shrink-0 flex items-center justify-center')}>
        <Icon className="h-2.5 w-2.5 text-muted-foreground/30" strokeWidth={2} />
      </span>
    );
  }

  // Fallback: empty outlined circle
  return <span className={cn(size, 'rounded-full border-2 border-muted-foreground/25 shrink-0')} />;
}

// ---------------------------------------------------------------------------
// Vertical Connector (v3 with dashed for skipped)
// ---------------------------------------------------------------------------

function ConnectorV3({ fromStatus, toStatus }: { fromStatus: string; toStatus: string }) {
  const isSkippedTransition = fromStatus === 'skipped' || toStatus === 'skipped';
  const isCompleted = fromStatus === 'completed' && toStatus !== 'pending';

  return (
    <div
      className={cn(
        'w-0.5 min-h-3 ml-[9px] transition-colors duration-300',
        isSkippedTransition
          ? 'border-l-2 border-dashed border-muted-foreground/15 bg-transparent'
          : isCompleted
            ? 'bg-primary/50'
            : 'bg-muted-foreground/15',
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Pipeline Stepper v3 Component
// ---------------------------------------------------------------------------

function PipelineStepperV3({ steps, title }: { steps: PipelineStep[]; title: string }) {
  const activeStep = steps.find((s) => s.status === 'active');
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const skippedCount = steps.filter((s) => s.status === 'skipped').length;
  const allDone = steps.length > 0 && steps.every((s) => s.status === 'completed' || s.status === 'skipped');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Vertical timeline */}
        <div className="flex flex-col">
          {steps.map((step, i) => {
            const isFocus = activeStep?.id === step.id;
            const isSkipped = step.status === 'skipped';
            const showArtifacts = step.artifacts && Object.keys(step.artifacts).length > 0 && step.status !== 'pending';
            const showActionBanner = step.status === 'active' && step.needsAction;

            return (
              <div key={step.id}>
                {/* Step row */}
                <div
                  className={cn(
                    'flex items-center gap-2.5 min-h-[28px]',
                    isSkipped && 'opacity-50',
                  )}
                  role="listitem"
                  aria-label={`${step.label} -- ${step.status}${step.needsAction ? ', action needed' : ''}`}
                >
                  <StepNodeV3 step={step} isFocus={isFocus} />
                  <span
                    className={cn(
                      'text-xs select-none',
                      isSkipped && 'line-through text-muted-foreground',
                      !isSkipped && isFocus && step.needsAction && 'text-status-yellow font-bold',
                      !isSkipped && isFocus && !step.needsAction && 'text-primary font-bold',
                      !isSkipped && !isFocus && step.status === 'completed' && 'text-foreground/70',
                      !isSkipped && !isFocus && step.status === 'pending' && 'text-muted-foreground/50',
                    )}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Artifacts */}
                {showArtifacts && !isSkipped && (
                  <div className="ml-7 mb-0.5">
                    <StepArtifacts step={step} />
                  </div>
                )}

                {/* Action banner */}
                {showActionBanner && <ActionBanner stepId={step.id} />}

                {/* Connector to next step */}
                {i < steps.length - 1 && (
                  <ConnectorV3
                    fromStatus={step.status}
                    toStatus={steps[i + 1].status}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Summary line */}
        <div className="flex items-center gap-1.5 text-[10px] pt-2 mt-1 border-t border-border/50">
          {allDone ? (
            <>
              <Check className="h-3 w-3 text-status-green shrink-0" strokeWidth={3} />
              <span className="text-status-green font-semibold text-[11px]">Pipeline complete</span>
            </>
          ) : activeStep?.needsAction ? (
            <>
              <AlertCircle className="h-3 w-3 text-status-yellow shrink-0" />
              <span className="text-status-yellow font-semibold text-[11px]">Awaiting your action</span>
            </>
          ) : activeStep ? (
            <>
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
              <span className="text-foreground font-medium text-[11px]">{activeStep.label}</span>
            </>
          ) : (
            <span className="text-muted-foreground text-[11px]">Waiting to start</span>
          )}
          <span className="ml-auto text-muted-foreground/50 tabular-nums text-[10px]">
            {completedCount}/{steps.length}
            {skippedCount > 0 && ` (${skippedCount} skipped)`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// History Section
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function HistorySection() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
            aria-expanded={open}
          >
            <span className="text-sm font-semibold">Recent Directives</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] px-2 py-0">
                {MOCK_HISTORY.length}
              </Badge>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform duration-200',
                  open && 'rotate-180',
                )}
                aria-hidden="true"
              />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-2">
            {MOCK_HISTORY.map((entry) => (
              <div
                key={entry.title}
                className="flex items-center gap-3 rounded-md border border-border/50 bg-muted/20 px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {entry.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatTimestamp(entry.lastUpdated)}
                    <span className="mx-1.5 text-muted-foreground/30">|</span>
                    {entry.weight}
                  </p>
                </div>
                <Badge
                  className={cn(
                    'text-[10px] px-2 py-0 shrink-0',
                    entry.status === 'completed'
                      ? 'bg-status-green/15 text-status-green border-status-green/30'
                      : 'bg-destructive/15 text-destructive border-destructive/30',
                  )}
                >
                  {entry.status}
                </Badge>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// Prototype Page
// ---------------------------------------------------------------------------

export default function PrototypePage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold text-foreground">
          Pipeline Stepper v3 -- Design Prototype
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visual prototype for the redesigned pipeline stepper. All data is hardcoded mock data.
        </p>
      </div>

      {/* Directive Title */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
          Active Directive
        </p>
        <h2 className="text-lg font-bold text-foreground mt-0.5">
          Pipeline Stepper v3 -- Full Dashboard UX Overhaul
        </h2>
      </div>

      {/* Two-column stepper comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PipelineStepperV3
          steps={MOCK_STEPS}
          title="Heavyweight Directive"
        />
        <PipelineStepperV3
          steps={MOCK_LIGHTWEIGHT_STEPS}
          title="Lightweight Directive"
        />
      </div>

      {/* History section */}
      <HistorySection />
    </div>
  );
}
