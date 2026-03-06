import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';

// Lazy load pages for code splitting
import { lazy, Suspense } from 'react';

const DashboardPage = lazy(() => import('@/components/dashboard/DashboardPage'));
const TeamDetail = lazy(() => import('@/components/teams/TeamDetail'));
const SessionsPage = lazy(() => import('@/components/sessions/SessionsPage'));
const ProjectsPage = lazy(() => import('@/components/projects/ProjectsPage'));
const OrgPage = lazy(() => import('@/components/org/OrgPage'));
const AgentDetailPage = lazy(() => import('@/components/org/AgentDetailPage'));
const GamePage = lazy(() => import('@/components/game/GamePage'));
const PrototypePage = lazy(() => import('@/components/prototype/PrototypePage'));

// eslint-disable-next-line react-refresh/only-export-components
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-muted-foreground text-sm">Loading...</div>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <SuspenseWrapper><GamePage /></SuspenseWrapper> },
      { path: 'office', element: <SuspenseWrapper><GamePage /></SuspenseWrapper> },
      { path: 'overview', element: <SuspenseWrapper><DashboardPage /></SuspenseWrapper> },
      { path: 'teams/:name', element: <SuspenseWrapper><TeamDetail /></SuspenseWrapper> },
      { path: 'org', element: <SuspenseWrapper><OrgPage /></SuspenseWrapper> },
      { path: 'org/:agentId', element: <SuspenseWrapper><AgentDetailPage /></SuspenseWrapper> },
      { path: 'directives', element: <SuspenseWrapper><ProjectsPage /></SuspenseWrapper> },
      { path: 'sessions', element: <SuspenseWrapper><SessionsPage /></SuspenseWrapper> },
      { path: 'prototype', element: <SuspenseWrapper><PrototypePage /></SuspenseWrapper> },
    ],
  },
]);
