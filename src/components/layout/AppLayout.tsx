import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import SearchCommandPalette from '@/components/shared/SearchCommandPalette';
import { useDashboardStore } from '@/stores/dashboard-store';
import { API_BASE } from '@/lib/api';

export default function AppLayout() {
  const workState = useDashboardStore((s) => s.workState);
  const fetchedRef = useRef(false);
  const location = useLocation();
  const isGameRoute = location.pathname === '/office' || location.pathname === '/';

  // Eagerly fetch work state on app load so orientation banner + search have data
  useEffect(() => {
    if (workState?.goals || fetchedRef.current) return;
    fetchedRef.current = true;
    Promise.all([
      fetch( `${API_BASE}/api/state/goals`).then(r => r.json()).catch(() => null),
      fetch( `${API_BASE}/api/state/features`).then(r => r.json()).catch(() => null),
      fetch( `${API_BASE}/api/state/backlogs`).then(r => r.json()).catch(() => null),
      fetch( `${API_BASE}/api/state/conductor`).then(r => r.json()).catch(() => null),
    ]).then(([goals, features, backlogs, conductor]) => {
      if (goals?.goals) {
        const current = useDashboardStore.getState().workState;
        useDashboardStore.getState().setWorkState({
          goals: current?.goals ?? goals,
          features: current?.features ?? features,
          backlogs: current?.backlogs ?? backlogs,
          conductor: current?.conductor ?? conductor,
          index: current?.index ?? null,
        });
      }
    });
  }, [workState?.goals]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {!isGameRoute && <Header />}
        <main className={`flex-1 overflow-y-auto ${isGameRoute ? '' : 'p-6'}`}>
          <Outlet />
        </main>
      </div>
      <SearchCommandPalette />
    </div>
  );
}
