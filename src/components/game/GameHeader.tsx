import { useDashboardStore } from '@/stores/dashboard-store';

export default function GameHeader() {
  const sessions = useDashboardStore((s) => s.sessions);

  const activeCount = sessions.filter((s) => s.status === 'working').length;
  const idleCount = sessions.filter(
    (s) => s.status === 'idle' || s.status === 'paused' || s.status === 'done',
  ).length;
  const attentionCount = sessions.filter(
    (s) => s.status === 'waiting-approval' || s.status === 'waiting-input' || s.status === 'error',
  ).length;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="bg-gray-900 text-white px-3 sm:px-4 py-2 rounded-t-lg flex items-center justify-between text-sm">
      {/* Left */}
      <span className="font-bold tracking-tight text-base">HQ</span>

      {/* Center — hidden on narrow screens */}
      <span className="text-gray-300 text-xs hidden sm:inline">{today}</span>

      {/* Right — status counts (compact on mobile: dots only, labels on sm+) */}
      <div className="flex items-center gap-2 sm:gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
          {activeCount}<span className="hidden sm:inline"> active</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-gray-400 inline-block" />
          {idleCount}<span className="hidden sm:inline"> idle</span>
        </span>
        {attentionCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
            {attentionCount}<span className="hidden sm:inline"> need attention</span>
          </span>
        )}
      </div>
    </header>
  );
}
