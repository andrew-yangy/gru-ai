import { create } from 'zustand';
import type { DashboardState, DirectiveState, GoalInventory, Session, HookEvent, Team, TeamTask, SessionActivity, NotificationConfig, ProjectGroup, FullWorkState } from './types';

interface DashboardStore extends DashboardState {
  connected: boolean;
  workState: FullWorkState | null;
  notificationConfig: NotificationConfig;
  notificationFired: Record<string, number>;
  setFullState: (state: DashboardState) => void;
  updateSessions: (sessions: Session[]) => void;
  updateProjects: (projects: ProjectGroup[]) => void;
  updateTeams: (teams: Team[]) => void;
  updateTasks: (tasksByTeam: Record<string, TeamTask[]>, tasksBySession?: Record<string, TeamTask[]>) => void;
  addEvent: (event: HookEvent) => void;
  updateEvents: (events: HookEvent[]) => void;
  setConnected: (connected: boolean) => void;
  updateSessionActivities: (activities: Record<string, SessionActivity>) => void;
  updateDirectiveState: (state: DirectiveState | null, history?: DirectiveState[]) => void;
  updateGoalInventory: (inventory: GoalInventory | null) => void;
  setWorkState: (state: FullWorkState) => void;
  updateNotificationConfig: (config: NotificationConfig) => void;
  addNotificationFired: (sessionId: string) => void;
  deleteTeam: (teamName: string) => Promise<void>;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  teams: [],
  sessions: [],
  projects: [],
  tasksByTeam: {},
  tasksBySession: {},
  events: [],
  sessionActivities: {},
  directiveState: null,
  directiveHistory: [],
  goalInventory: null,
  workState: null,
  lastUpdated: '',
  connected: false,
  notificationConfig: { macOS: true, browser: true },
  notificationFired: {},

  setFullState: (state) =>
    set({
      teams: state.teams ?? [],
      sessions: state.sessions ?? [],
      projects: state.projects ?? [],
      tasksByTeam: state.tasksByTeam ?? {},
      tasksBySession: state.tasksBySession ?? {},
      events: state.events ?? [],
      directiveState: state.directiveState ?? null,
      directiveHistory: state.directiveHistory ?? [],
      goalInventory: state.goalInventory ?? null,
      lastUpdated: state.lastUpdated || new Date().toISOString(),
    }),

  updateSessions: (sessions) =>
    set({ sessions, lastUpdated: new Date().toISOString() }),

  updateProjects: (projects) =>
    set({ projects, lastUpdated: new Date().toISOString() }),

  updateTeams: (teams) =>
    set({ teams, lastUpdated: new Date().toISOString() }),

  updateTasks: (tasksByTeam, tasksBySession) =>
    set((state) => ({
      tasksByTeam,
      tasksBySession: tasksBySession ?? state.tasksBySession,
      lastUpdated: new Date().toISOString(),
    })),

  addEvent: (event) =>
    set((state) => ({
      events: [event, ...state.events].slice(0, 200),
      lastUpdated: new Date().toISOString(),
    })),

  updateEvents: (events) =>
    set({ events, lastUpdated: new Date().toISOString() }),

  setConnected: (connected) => set({ connected }),

  updateSessionActivities: (activities) =>
    set((state) => ({
      sessionActivities: { ...state.sessionActivities, ...activities },
    })),

  updateDirectiveState: (directiveState, history) =>
    set((state) => ({
      directiveState,
      directiveHistory: history ?? state.directiveHistory,
    })),

  updateGoalInventory: (goalInventory) =>
    set({ goalInventory }),

  setWorkState: (workState) =>
    set({ workState, lastUpdated: new Date().toISOString() }),

  updateNotificationConfig: (config) =>
    set({ notificationConfig: config }),

  addNotificationFired: (sessionId) =>
    set((state) => ({
      notificationFired: { ...state.notificationFired, [sessionId]: Date.now() },
    })),

  deleteTeam: async (teamName) => {
    try {
      const { API_BASE } = await import('@/lib/api');
      const res = await fetch(`${API_BASE}/api/teams/${encodeURIComponent(teamName)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        console.error('Failed to delete team:', data.error);
      }
    } catch (err) {
      console.error('Failed to delete team:', err);
    }
  },
}));
