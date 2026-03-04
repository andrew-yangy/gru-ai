/**
 * Static configuration for the conductor's named agents.
 * This defines the org hierarchy, display properties, and team groupings.
 *
 * Data is sourced from the canonical agent-registry.json.
 */

import registry from '../../../.claude/agent-registry.json';

export interface AgentConfig {
  id: string;
  name: string;
  title: string;
  role: string;
  description: string;
  reportsTo: string | null;
  domains: string[];
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
  /** Whether this agent is a C-suite executive (vs specialist builder) */
  isCsuite: boolean;
}

export interface TeamConfig {
  id: string;
  name: string;
  description: string;
  leadAgentId: string;
  memberAgentIds: string[];
  color: string;
  bgColor: string;
  borderColor: string;
}

// ---------------------------------------------------------------------------
// Agent configs derived from registry (excludes CEO — he has his own export)
// ---------------------------------------------------------------------------

export const AGENT_CONFIGS: AgentConfig[] = registry.agents
  .filter((a) => a.id !== 'ceo')
  .map((a) => ({
    id: a.id,
    name: a.name,
    title: a.title,
    role: a.role,
    description: a.description,
    reportsTo: a.reportsTo,
    domains: a.domains,
    color: a.color,
    bgColor: a.bgColor,
    borderColor: a.borderColor,
    dotColor: a.dotColor,
    isCsuite: a.isCsuite,
  }));

// ---------------------------------------------------------------------------
// Team Definitions (display-only -- cosmetic groupings, not operational)
// ---------------------------------------------------------------------------

export const TEAM_CONFIGS: TeamConfig[] = registry.teams.map((t) => ({
  id: t.id,
  name: t.name,
  description: t.description,
  leadAgentId: t.leadAgentId,
  memberAgentIds: t.memberAgentIds,
  color: t.color,
  bgColor: t.bgColor,
  borderColor: t.borderColor,
}));

const ceoEntry = registry.agents.find((a) => a.id === 'ceo')!;

export const CEO_CONFIG: AgentConfig = {
  id: ceoEntry.id,
  name: ceoEntry.name,
  title: ceoEntry.title,
  role: ceoEntry.role,
  description: ceoEntry.description,
  reportsTo: ceoEntry.reportsTo,
  domains: ceoEntry.domains,
  color: ceoEntry.color,
  bgColor: ceoEntry.bgColor,
  borderColor: ceoEntry.borderColor,
  dotColor: ceoEntry.dotColor,
  isCsuite: ceoEntry.isCsuite,
};

export function getAgentConfig(name: string): AgentConfig | undefined {
  return AGENT_CONFIGS.find(a => a.id === name.toLowerCase());
}

export function getTeamConfig(teamId: string): TeamConfig | undefined {
  return TEAM_CONFIGS.find(t => t.id === teamId);
}

/** Get all agents that belong to a team */
export function getTeamMembers(teamId: string): AgentConfig[] {
  const team = getTeamConfig(teamId);
  if (!team) return [];
  return team.memberAgentIds
    .map(id => getAgentConfig(id))
    .filter((a): a is AgentConfig => a !== undefined);
}

// ---------------------------------------------------------------------------
// Session badge colors (derived from registry — replaces hardcoded switches)
// ---------------------------------------------------------------------------

const GENERIC_BADGE = 'bg-slate-500/15 text-slate-400 border-slate-500/30';
const GENERIC_ROLES = new Set(['builder', 'reviewer', 'auditor', 'investigator']);

/** Badge color for a named agent in session cards */
export function agentBadgeColor(name?: string): string {
  if (!name) return 'bg-secondary text-muted-foreground border-border';
  const agent = getAgentConfig(name);
  if (agent) return `${agent.bgColor} ${agent.color} ${agent.borderColor}`;
  if (GENERIC_ROLES.has(name.toLowerCase())) return GENERIC_BADGE;
  return 'bg-secondary text-muted-foreground border-border';
}

/** Left border accent color for a named agent in kanban cards */
export function agentBorderAccent(name?: string): string {
  if (!name) return '';
  const agent = getAgentConfig(name);
  if (agent) {
    // Extract color from borderColor (e.g. "border-violet-500/40" → "border-l-violet-500/60")
    const base = agent.borderColor.replace('border-', 'border-l-').replace(/\/\d+$/, '/60');
    return base;
  }
  if (GENERIC_ROLES.has(name.toLowerCase())) return 'border-l-slate-500/60';
  return '';
}
