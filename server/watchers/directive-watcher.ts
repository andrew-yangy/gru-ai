import path from 'node:path';
import fs from 'node:fs';
import { watch, type FSWatcher } from 'chokidar';
import type { Aggregator } from '../state/aggregator.js';
import type { DirectiveState, DirectiveProject, PipelineStep } from '../types.js';

// Pipeline steps by weight class. Steps not in a weight's list are skipped.
const FULL_PIPELINE_STEPS: Array<{ id: string; label: string }> = [
  { id: 'triage',             label: 'Triage' },
  { id: 'read',               label: 'Read' },
  { id: 'context',            label: 'Context' },
  { id: 'challenge',          label: 'Challenge' },
  { id: 'brainstorm',         label: 'Brainstorm' },
  { id: 'plan',               label: 'Plan' },
  { id: 'audit',              label: 'Audit' },
  { id: 'approve',            label: 'Approve' },
  { id: 'project-brainstorm', label: 'Project Brainstorm' },
  { id: 'setup',              label: 'Setup' },
  { id: 'execute',            label: 'Execute' },
  { id: 'review-gate',        label: 'Review Gate' },
  { id: 'wrapup',             label: 'Wrapup' },
  { id: 'completion',         label: 'Completion' },
];

const SKIPPED_STEPS: Record<string, Set<string>> = {
  lightweight: new Set(['challenge', 'brainstorm', 'project-brainstorm', 'audit', 'approve']),
  medium: new Set(['challenge']),
  heavyweight: new Set([]),
  strategic: new Set([]),
};

// ---------------------------------------------------------------------------
// Build pipeline steps from directive.json's pipeline{} object
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPipelineFromDirective(directive: any): PipelineStep[] {
  const weight: string = directive.weight ?? 'medium';
  const skipped = SKIPPED_STEPS[weight];
  const pipeline = directive.pipeline ?? {};

  return FULL_PIPELINE_STEPS
    .map(def => {
      const stepData = pipeline[def.id];
      const isSkipped = skipped?.has(def.id) && !stepData;
      const step: PipelineStep = {
        id: def.id,
        label: def.label,
        status: isSkipped ? 'skipped' : (stepData?.status ?? 'pending'),
      };

      // Build artifacts from step output + agent
      const artifacts: Record<string, string> = {};
      if (stepData?.agent) artifacts['Agent'] = stepData.agent;
      if (stepData?.reviewers?.length > 0) {
        artifacts['Reviewers'] = stepData.reviewers
          .map((r: string) => r.charAt(0).toUpperCase() + r.slice(1))
          .join(', ');
      }
      if (stepData?.output && typeof stepData.output === 'object') {
        for (const [k, v] of Object.entries(stepData.output)) {
          if (typeof v === 'string' && v) {
            artifacts[k.charAt(0).toUpperCase() + k.slice(1)] = v;
          }
        }
      }
      if (stepData?.artifacts?.length > 0) {
        artifacts['Files'] = stepData.artifacts
          .map((p: string) => String(p).split('/').pop())
          .join(', ');
      }

      if (Object.keys(artifacts).length > 0) step.artifacts = artifacts;
      if (step.status === 'active' && def.id === 'approve') step.needsAction = true;
      if (step.status === 'active' && def.id === 'completion') step.needsAction = true;
      if (directive.status === 'awaiting_completion' && def.id === 'completion') {
        step.status = 'active';
        step.needsAction = true;
      }
      if (step.status === 'active' && directive.updated_at) step.startedAt = directive.updated_at;

      return step;
    });
}

// Derive pipeline steps when directive.json has no pipeline{} (legacy or simple)
function derivePipelineSteps(weight: string, directiveStatus: string): PipelineStep[] {
  const skipped = SKIPPED_STEPS[weight];
  const isCompleted = directiveStatus === 'completed';
  const isFailed = directiveStatus === 'failed';

  return FULL_PIPELINE_STEPS.map((def) => {
    const isSkipped = skipped?.has(def.id);
    let status: PipelineStep['status'];
    if (isSkipped) status = 'skipped';
    else if (isCompleted) status = 'completed';
    else if (isFailed) status = def.id === 'wrapup' || def.id === 'completion' ? 'failed' : 'completed';
    else status = 'pending';
    return { id: def.id, label: def.label, status };
  });
}

// ---------------------------------------------------------------------------
// Map directive.json status to DirectiveState status
// ---------------------------------------------------------------------------
function mapStatus(status: string): DirectiveState['status'] {
  switch (status) {
    case 'in_progress': return 'in_progress';
    case 'awaiting_completion': return 'awaiting_completion';
    case 'completed': return 'completed';
    case 'failed': return 'failed';
    default: return 'in_progress';
  }
}

// ---------------------------------------------------------------------------
// DirectiveWatcher — watches directive.json files directly
// No more current.json dependency — derives everything from directive.json
// + project.json files in the directive's projects/ subdirectory.
// ---------------------------------------------------------------------------

export class DirectiveWatcher {
  private directivesWatcher: FSWatcher | null = null;
  private aggregator: Aggregator;
  private directivesDir: string;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _ready = false;

  /** mtime-based cache: dirId -> { mtimeMs, state } */
  private historyCache = new Map<string, { mtimeMs: number; state: DirectiveState }>();

  constructor(aggregator: Aggregator, _claudeHome: string) {
    this.aggregator = aggregator;
    this.directivesDir = path.join(process.cwd(), '.context', 'directives');
  }

  start(): void {
    // Read initial state
    this.readAndUpdate();

    // Watch .context/directives/ for directive.json and project.json changes
    if (!fs.existsSync(this.directivesDir)) {
      try {
        fs.mkdirSync(this.directivesDir, { recursive: true });
      } catch {
        console.log(`[directive-watcher] Could not create directives dir, skipping`);
        this._ready = true;
        return;
      }
    }

    console.log(`[directive-watcher] Watching directives at ${this.directivesDir}`);

    this.directivesWatcher = watch(this.directivesDir, {
      ignoreInitial: true,
      persistent: true,
      depth: 4, // Deep enough for {id}/projects/{proj-id}/project.json
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    });

    this.directivesWatcher.on('all', (_event: string, filePath: string) => {
      if (!filePath.endsWith('.json')) return;
      this.handleChange();
    });

    this.directivesWatcher.on('ready', () => {
      this._ready = true;
      console.log(`[directive-watcher] Ready`);
    });

    this.directivesWatcher.on('error', (err: unknown) => {
      console.error(`[directive-watcher] Error:`, err);
    });
  }

  get ready(): boolean {
    return this._ready;
  }

  async stop(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.directivesWatcher) {
      await this.directivesWatcher.close();
      this.directivesWatcher = null;
    }
  }

  /**
   * Find the active directive (status = in_progress or awaiting_completion)
   * and build DirectiveState from directive.json + project.json files.
   */
  readCurrentState(): DirectiveState | null {
    try {
      const dirIds = this.listDirs(this.directivesDir);

      // Find all active directives, pick the most recently updated
      let best: { dirId: string; directive: any; updatedAt: string } | null = null;

      for (const dirId of dirIds) {
        const directive = this.readDirectiveJson(dirId);
        if (!directive) continue;

        const status = String(directive.status ?? '');
        if (status !== 'in_progress' && status !== 'awaiting_completion') continue;

        const updatedAt = String(directive.updated_at ?? directive.started_at ?? directive.created ?? '');
        if (!best || updatedAt > best.updatedAt) {
          best = { dirId, directive, updatedAt };
        }
      }

      if (best) {
        return this.buildStateFromDirective(best.dirId, best.directive);
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Build DirectiveState[] for ALL directives (completed, failed, in_progress, etc.).
   * Uses mtime-based caching so we only re-parse directive.json when it changes.
   */
  readAllDirectiveStates(): DirectiveState[] {
    try {
      const dirIds = this.listDirs(this.directivesDir);
      const results: DirectiveState[] = [];
      const seenIds = new Set<string>();

      for (const dirId of dirIds) {
        seenIds.add(dirId);
        const filePath = path.join(this.directivesDir, dirId, 'directive.json');

        // Check mtime for cache validity
        let mtimeMs: number;
        try {
          const stat = fs.statSync(filePath);
          mtimeMs = stat.mtimeMs;
        } catch {
          // No directive.json in this dir — skip
          continue;
        }

        const cached = this.historyCache.get(dirId);
        if (cached && cached.mtimeMs === mtimeMs && cached.state.status !== 'in_progress' && cached.state.status !== 'awaiting_completion') {
          results.push(cached.state);
          continue;
        }

        // Cache miss — re-parse
        const directive = this.readJson(filePath);
        if (!directive) continue;

        const state = this.buildStateFromDirective(dirId, directive);
        this.historyCache.set(dirId, { mtimeMs, state });
        results.push(state);
      }

      // Prune deleted directives from cache
      for (const cachedId of this.historyCache.keys()) {
        if (!seenIds.has(cachedId)) {
          this.historyCache.delete(cachedId);
        }
      }

      return results;
    } catch {
      return [];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildStateFromDirective(dirId: string, directive: any): DirectiveState {
    // Read projects from the directive's projects/ subdirectory
    const projectsDir = path.join(this.directivesDir, dirId, 'projects');
    const projects: DirectiveProject[] = [];

    if (fs.existsSync(projectsDir)) {
      const projIds = this.listDirs(projectsDir);
      for (const projId of projIds) {
        const projJsonPath = path.join(projectsDir, projId, 'project.json');
        const projJson = this.readJson(projJsonPath);
        if (!projJson) continue;

        const tasks = Array.isArray(projJson.tasks) ? projJson.tasks : [];
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(
          (t: { status?: string }) => t.status === 'completed'
        ).length;

        // Determine phase from current task status
        let phase: DirectiveProject['phase'] = null;
        if (projJson.status === 'in_progress') {
          const activeTask = tasks.find((t: { status?: string }) => t.status === 'in_progress');
          if (activeTask) phase = 'build';
        }

        projects.push({
          id: projId,
          title: String(projJson.title ?? projId),
          status: this.mapProjectStatus(String(projJson.status ?? 'pending')),
          phase,
          totalTasks,
          completedTasks,
        });
      }
    }

    // Also check produced_projects for projects stored under goals/
    if (Array.isArray(directive.produced_projects)) {
      for (const prodPath of directive.produced_projects) {
        const prodId = String(prodPath).split('/').pop() ?? '';
        // Skip if already found in directive's projects/ dir
        if (projects.some(p => p.id === prodId)) continue;

        // Try reading from goals structure
        // produced_projects format: "directive-id/projects/project-id" or "goal-id/project-id"
        // We already read from directive's projects/ dir above, so this catches
        // any projects stored elsewhere
      }
    }

    const completedCount = projects.filter(p => p.status === 'completed').length;
    const executeOutput = directive.pipeline?.execute?.output;
    const currentStep = directive.current_step ?? '';

    // Determine current phase from pipeline state (named step IDs)
    let currentPhase = 'unknown';
    if (currentStep === 'execute' || currentStep === 'review-gate') currentPhase = 'executing';
    else if (currentStep === 'wrapup') currentPhase = 'wrapup';
    else if (currentStep === 'completion') currentPhase = 'completion';
    else if (['triage', 'read', 'context', 'challenge', 'brainstorm', 'plan', 'audit', 'approve', 'project-brainstorm', 'setup'].includes(currentStep)) currentPhase = 'planning';
    else if (directive.pipeline?.execute?.status === 'completed') currentPhase = 'wrapup';

    // Build pipeline steps
    let pipelineSteps: PipelineStep[];
    if (directive.pipeline && Object.keys(directive.pipeline).length > 0) {
      pipelineSteps = buildPipelineFromDirective(directive);
    } else {
      pipelineSteps = derivePipelineSteps(directive.weight ?? 'medium', directive.status);
    }

    return {
      directiveName: dirId,
      title: directive.title ?? dirId,
      status: mapStatus(directive.status),
      totalProjects: projects.length,
      currentProject: completedCount,
      currentPhase,
      projects,
      startedAt: directive.started_at ?? directive.created ?? new Date().toISOString(),
      lastUpdated: directive.updated_at ?? new Date().toISOString(),
      pipelineSteps,
      currentStepId: currentStep,
      weight: directive.weight,
    };
  }

  private mapProjectStatus(status: string): DirectiveProject['status'] {
    switch (status) {
      case 'completed': return 'completed';
      case 'in_progress': return 'in_progress';
      case 'failed': return 'failed';
      case 'skipped': return 'skipped';
      default: return 'pending';
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readDirectiveJson(dirId: string): any | null {
    const filePath = path.join(this.directivesDir, dirId, 'directive.json');
    return this.readJson(filePath);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readJson(filePath: string): any | null {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private listDirs(dirPath: string): string[] {
    try {
      return fs.readdirSync(dirPath).filter((name) => {
        if (name.startsWith('.') || name.startsWith('_')) return false;
        try {
          return fs.statSync(path.join(dirPath, name)).isDirectory();
        } catch {
          return false;
        }
      });
    } catch {
      return [];
    }
  }

  private handleChange(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.readAndUpdate();
    }, 300);
  }

  private readAndUpdate(): void {
    const state = this.readCurrentState();
    const history = this.readAllDirectiveStates();
    console.log(`[directive-watcher] Directive state: ${state ? `${state.directiveName} (${state.status}, ${state.currentProject}/${state.totalProjects})` : 'none'} | history: ${history.length} directives`);
    this.aggregator.updateDirectiveState(state, history);
  }
}
