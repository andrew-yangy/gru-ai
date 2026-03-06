import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { useDashboardStore } from '@/stores/dashboard-store';
import type { DirectiveProject, DirectiveState } from '@/stores/types';
import { cn } from '@/lib/utils';
import { API_BASE } from '@/lib/api';
import {
  Crosshair,
  CheckCircle2,
  Circle,
  Loader2,
  SkipForward,
  XCircle,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  ShieldX,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import PipelineStepper from '@/components/shared/PipelineStepper';

function phaseColor(phase: string): string {
  switch (phase) {
    case 'audit': return 'bg-status-blue/15 text-status-blue border-status-blue/30';
    case 'design': return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    case 'build': return 'bg-status-green/15 text-status-green border-status-green/30';
    case 'review': return 'bg-status-yellow/15 text-status-yellow border-status-yellow/30';
    default: return 'bg-secondary text-secondary-foreground border-border';
  }
}

function ProjectIcon({ status }: { status: DirectiveProject['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-3.5 w-3.5 text-status-green shrink-0" />;
    case 'in_progress':
      return <Loader2 className="h-3.5 w-3.5 text-status-yellow shrink-0 animate-spin" />;
    case 'failed':
      return <XCircle className="h-3.5 w-3.5 text-status-red shrink-0" />;
    case 'skipped':
      return <SkipForward className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
    default:
      return <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  }
}

// ---------------------------------------------------------------------------
// Task progress bar for individual projects
// ---------------------------------------------------------------------------

function TaskProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden min-w-[40px]">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            pct === 100 ? 'bg-status-green' : 'bg-primary',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">
        {completed}/{total}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expandable project card
// ---------------------------------------------------------------------------

function ProjectCard({ project }: { project: DirectiveProject }) {
  const [expanded, setExpanded] = useState(false);
  const hasTasks = (project.totalTasks ?? 0) > 0;
  const isExpandable = hasTasks;

  return (
    <div className="border border-border/50 rounded-md overflow-hidden">
      <button
        type="button"
        className={cn(
          'flex items-center gap-2 text-xs w-full px-2 py-1.5 text-left transition-colors',
          project.status === 'in_progress' ? 'text-foreground' : 'text-muted-foreground',
          isExpandable && 'hover:bg-muted/50 cursor-pointer',
          !isExpandable && 'cursor-default',
        )}
        onClick={() => isExpandable && setExpanded(!expanded)}
        aria-expanded={isExpandable ? expanded : undefined}
        aria-label={`${project.title} - ${project.status}${hasTasks ? `, ${project.completedTasks ?? 0} of ${project.totalTasks} tasks completed` : ''}`}
      >
        {isExpandable ? (
          expanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <ProjectIcon status={project.status} />
        <span className="truncate flex-1">{project.title}</span>
        {project.status === 'in_progress' && project.phase && (
          <Badge variant="outline" className={cn('text-[9px] px-1 py-0 shrink-0', phaseColor(project.phase))}>
            {project.phase}
          </Badge>
        )}
      </button>

      {/* Task progress bar - always visible when there are tasks */}
      {hasTasks && (
        <div className="px-2 pb-1.5">
          <TaskProgressBar
            completed={project.completedTasks ?? 0}
            total={project.totalTasks ?? 0}
          />
        </div>
      )}

      {/* Expanded task details placeholder */}
      {expanded && hasTasks && (
        <div className="px-2 pb-2 border-t border-border/30">
          <div className="pt-1.5 space-y-0.5">
            <div className="text-[10px] text-muted-foreground">
              {project.completedTasks ?? 0} of {project.totalTasks} tasks completed
            </div>
            {project.status === 'completed' && (
              <div className="flex items-center gap-1 text-[10px] text-status-green">
                <CheckCircle2 className="h-2.5 w-2.5" />
                <span>All tasks done</span>
              </div>
            )}
            {project.status === 'in_progress' && (
              <div className="flex items-center gap-1 text-[10px] text-status-yellow">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                <span>In progress{project.phase ? ` (${project.phase} phase)` : ''}</span>
              </div>
            )}
            {project.status === 'failed' && (
              <div className="flex items-center gap-1 text-[10px] text-status-red">
                <XCircle className="h-2.5 w-2.5" />
                <span>Failed</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Completion gate banner with approve/reject
// ---------------------------------------------------------------------------

function CompletionGateBanner() {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = useCallback(async (action: 'approve' | 'reject') => {
    setLoading(action);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/actions/directive-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ...(action === 'reject' && feedback.trim() ? { feedback: feedback.trim() } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? 'Request failed');
      } else {
        // Success -- store will update via WebSocket
        setFeedback('');
        setShowFeedback(false);
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(null);
    }
  }, [feedback]);

  return (
    <div className="mt-3 rounded-md border border-status-yellow/40 bg-status-yellow/5 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-4 w-4 text-status-yellow shrink-0" />
        <span className="text-xs font-bold text-status-yellow">Awaiting CEO sign-off</span>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        All projects have completed. Review the results and approve to finalize, or reject to send back for revision.
      </p>

      {error && (
        <div className="flex items-center gap-1.5 text-[11px] text-status-red mb-2">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showFeedback && (
        <div className="mb-2">
          <textarea
            className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            rows={2}
            placeholder="Optional feedback for revision..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className={cn(
            'flex-1 h-7 text-xs gap-1',
            'text-green-500 border-green-500/30 hover:bg-green-500/10 hover:text-green-500',
          )}
          onClick={() => handleAction('approve')}
          disabled={loading !== null}
        >
          {loading === 'approve' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ShieldCheck className="h-3 w-3" />
          )}
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={cn(
            'flex-1 h-7 text-xs gap-1',
            'text-red-500 border-red-500/30 hover:bg-red-500/10 hover:text-red-500',
          )}
          onClick={() => {
            if (!showFeedback) {
              setShowFeedback(true);
            } else {
              handleAction('reject');
            }
          }}
          disabled={loading !== null}
        >
          {loading === 'reject' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ShieldX className="h-3 w-3" />
          )}
          Reject
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent Directives history section
// ---------------------------------------------------------------------------

function formatHistoryTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function RecentDirectivesSection() {
  const [open, setOpen] = useState(false);
  const directiveHistory = useDashboardStore((s) => s.directiveHistory);

  const entries = useMemo(() => {
    return directiveHistory
      .filter((d: DirectiveState) => d.status === 'completed' || d.status === 'failed')
      .sort((a: DirectiveState, b: DirectiveState) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
      .slice(0, 10);
  }, [directiveHistory]);

  if (entries.length === 0) return null;

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
                {entries.length}
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
            {entries.map((entry: DirectiveState) => (
              <div
                key={`${entry.directiveName}-${entry.lastUpdated}`}
                className="flex items-center gap-3 rounded-md border border-border/50 bg-muted/20 px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {entry.title || entry.directiveName}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatHistoryTimestamp(entry.lastUpdated)}
                    {entry.weight && (
                      <>
                        <span className="mx-1.5 text-muted-foreground/30">|</span>
                        {entry.weight}
                      </>
                    )}
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
// Main component
// ---------------------------------------------------------------------------

export default function DirectiveProgress() {
  const directiveState = useDashboardStore((s) => s.directiveState);
  const [showProjects, setShowProjects] = useState(false);

  if (!directiveState) return null;

  const { directiveName, title, status, totalProjects, currentPhase, projects, pipelineSteps } = directiveState;
  const completedCount = projects.filter((p) => p.status === 'completed').length;
  const progressPercent = totalProjects > 0 ? Math.round((completedCount / totalProjects) * 100) : 0;
  const isFinished = status === 'completed' || status === 'failed';
  const isAwaitingCompletion = status === 'awaiting_completion';
  const displayName = title || directiveName;

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Crosshair className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-semibold truncate">{displayName}</span>
            </div>
            <Badge
              variant={isFinished ? (status === 'completed' ? 'default' : 'destructive') : isAwaitingCompletion ? 'secondary' : 'secondary'}
              className={cn(
                'text-[10px] px-1.5 py-0 shrink-0',
                isAwaitingCompletion && 'bg-status-yellow/15 text-status-yellow border-status-yellow/30',
              )}
            >
              {isAwaitingCompletion ? 'sign-off' : isFinished ? status : `${completedCount}/${totalProjects}`}
            </Badge>
          </div>

          {/* Pipeline stepper */}
          {pipelineSteps && pipelineSteps.length > 0 ? (
            <PipelineStepper steps={pipelineSteps} />
          ) : (
            /* Fallback progress bar when no pipeline data */
            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  status === 'failed' ? 'bg-status-red' : 'bg-primary',
                )}
                style={{ width: `${isFinished && status === 'completed' ? 100 : progressPercent}%` }}
              />
            </div>
          )}

          {/* Project list — collapsible with expandable cards */}
          {projects.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full"
                onClick={() => setShowProjects(!showProjects)}
              >
                <ChevronDown className={cn('h-3 w-3 transition-transform', !showProjects && '-rotate-90')} />
                <span>Projects ({completedCount}/{totalProjects})</span>
              </button>
              {showProjects && (
                <div className="space-y-1 mt-1.5">
                  {projects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Completion gate banner */}
          {isAwaitingCompletion && <CompletionGateBanner />}
        </CardContent>
      </Card>

      {/* Recent directive history */}
      <RecentDirectivesSection />
    </div>
  );
}
