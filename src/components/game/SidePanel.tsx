import { useEffect, useCallback } from 'react';
import { X, User, Crown, FileText, Inbox, Users, Bell, Server } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn, timeAgo, sessionStatusLabel } from '@/lib/utils';
import { useDashboardStore } from '@/stores/dashboard-store';
import { OFFICE_AGENTS, type AgentStatus, type SelectedItem } from './types';
import type { Session } from '@/stores/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SidePanelProps {
  selected: SelectedItem | null;
  agentStatuses: Record<string, AgentStatus>;
  onClose: () => void;
  /** 'side' = fixed right column (desktop), 'bottom' = overlay sheet (mobile) */
  variant?: 'side' | 'bottom';
}

// ---------------------------------------------------------------------------
// Status badge color mapping
// ---------------------------------------------------------------------------

function statusBadgeVariant(status: AgentStatus): string {
  switch (status) {
    case 'working': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'waiting': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    case 'idle':    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    case 'error':   return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    case 'offline': return 'bg-gray-50 text-gray-400 dark:bg-gray-900 dark:text-gray-500';
  }
}

// ---------------------------------------------------------------------------
// Sub-panels
// ---------------------------------------------------------------------------

function OverviewPanel({ agentStatuses }: { agentStatuses: Record<string, AgentStatus> }) {
  const sessions = useDashboardStore((s) => s.sessions);
  const activeCount = sessions.filter((s) => s.status === 'working').length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select an item in the office to see details.
      </p>
      <Separator />
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Agents</span>
          <span className="font-medium">{OFFICE_AGENTS.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Active sessions</span>
          <span className="font-medium">{activeCount}</span>
        </div>
      </div>
      <Separator />
      <div className="space-y-1.5">
        {OFFICE_AGENTS.map((a) => {
          const st = agentStatuses[a.agentName] ?? 'offline';
          return (
            <div key={a.agentName} className="flex items-center gap-2 text-xs">
              <span className={cn('h-2 w-2 rounded-full shrink-0', statusBadgeVariant(st).split(' ')[0])} />
              <span className="font-medium">{a.agentName}</span>
              <span className="text-muted-foreground">{a.agentRole}</span>
              <span className="ml-auto text-muted-foreground">{st}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgentPanel({ agentName, agentStatuses }: { agentName: string; agentStatuses: Record<string, AgentStatus> }) {
  const sessions = useDashboardStore((s) => s.sessions);
  const agent = OFFICE_AGENTS.find((a) => a.agentName === agentName);
  const status = agentStatuses[agentName] ?? 'offline';
  const agentSession: Session | undefined = sessions.find(
    (s) => s.agentName === agentName && !s.isSubagent,
  );

  if (!agent) return <p className="text-sm text-muted-foreground">Unknown agent</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="font-semibold">{agent.agentName}</span>
        <span className="text-xs text-muted-foreground">{agent.agentRole}</span>
      </div>
      <Badge className={cn('text-xs', statusBadgeVariant(status))}>
        {status}
      </Badge>

      <Separator />

      {agentSession ? (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span>{sessionStatusLabel(agentSession.status)}</span>
          </div>
          {agentSession.model && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Model</span>
              <span className="font-mono text-xs">{agentSession.model}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last active</span>
            <span>{timeAgo(agentSession.lastActivity)}</span>
          </div>
          {agentSession.initialPrompt && (
            <div className="mt-2">
              <span className="text-muted-foreground text-xs block mb-1">Current work</span>
              <p className="text-xs bg-muted rounded p-2 line-clamp-4">
                {agentSession.initialPrompt}
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No active session</p>
      )}
    </div>
  );
}

function CeoDeskPanel() {
  const directiveState = useDashboardStore((s) => s.directiveState);
  const sessions = useDashboardStore((s) => s.sessions);
  const pendingApprovals = sessions.filter(
    (s) => s.status === 'waiting-approval',
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-yellow-500" aria-hidden="true" />
        <span className="font-semibold">CEO Desk</span>
      </div>
      <Separator />
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Pending approvals</span>
          <Badge variant={pendingApprovals > 0 ? 'destructive' : 'secondary'}>
            {pendingApprovals}
          </Badge>
        </div>
      </div>
      {directiveState ? (
        <div className="space-y-2 text-sm mt-2">
          <span className="text-muted-foreground text-xs">Active directive</span>
          <p className="font-medium">{directiveState.directiveName}</p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phase</span>
            <span>{directiveState.currentPhase}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Progress</span>
            <span>{directiveState.currentInitiative}/{directiveState.totalInitiatives}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mt-2">No active directive</p>
      )}
    </div>
  );
}

function WhiteboardPanel() {
  const workState = useDashboardStore((s) => s.workState);
  const directives = workState?.conductor?.directives ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="font-semibold">Directives</span>
      </div>
      <Separator />
      {directives.length > 0 ? (
        <div className="space-y-2">
          {directives.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-sm">
              <span className="truncate mr-2">{d.title}</span>
              <Badge variant="secondary" className="text-xs shrink-0">
                {d.status}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No active directives</p>
      )}
    </div>
  );
}

function MailboxPanel() {
  const workState = useDashboardStore((s) => s.workState);
  const reports = workState?.conductor?.reports ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Inbox className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="font-semibold">Reports</span>
      </div>
      <Separator />
      {reports.length > 0 ? (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="text-sm">
              <span className="block truncate">{r.title}</span>
              <span className="text-xs text-muted-foreground">{timeAgo(r.updatedAt)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No reports available</p>
      )}
    </div>
  );
}

function ConferencePanel() {
  const directiveState = useDashboardStore((s) => s.directiveState);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="font-semibold">Conference Room</span>
      </div>
      <Separator />
      {directiveState ? (
        <div className="space-y-2 text-sm">
          <p className="font-medium">{directiveState.directiveName}</p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phase</span>
            <span>{directiveState.currentPhase}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="secondary" className="text-xs">{directiveState.status}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Progress</span>
            <span>{directiveState.currentInitiative}/{directiveState.totalInitiatives}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No initiative in progress</p>
      )}
    </div>
  );
}

function BellPanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-yellow-500" aria-hidden="true" />
        <span className="font-semibold">Scout Bell</span>
      </div>
      <Separator />
      <p className="text-sm text-muted-foreground">
        Ring the bell to start <span className="font-mono">/scout</span>
      </p>
      <p className="text-xs text-muted-foreground italic">
        (Coming in Phase 4 — action layer)
      </p>
    </div>
  );
}

function ServerRoomPanel() {
  const sessions = useDashboardStore((s) => s.sessions);
  const activeCount = sessions.filter((s) => s.status === 'working').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Server className="h-4 w-4 text-emerald-500" aria-hidden="true" />
        <span className="font-semibold">Server Room</span>
      </div>
      <Separator />
      {activeCount > 0 ? (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Active sessions</span>
            <span className="font-medium">{activeCount}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {activeCount} session{activeCount !== 1 ? 's' : ''} currently processing
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Server room is quiet</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel header titles
// ---------------------------------------------------------------------------

function panelTitle(selected: SelectedItem | null): string {
  if (!selected) return 'Office Overview';
  switch (selected.type) {
    case 'desk':        return selected.agentName ?? 'Agent Desk';
    case 'ceo-desk':    return 'CEO Desk';
    case 'conference':  return 'Conference Room';
    case 'whiteboard':  return 'Whiteboard';
    case 'mailbox':     return 'Mailbox';
    case 'bell':        return 'Scout Bell';
    case 'server-room': return 'Server Room';
    case 'door':        return 'Entrance';
    default:            return 'Office';
  }
}

// ---------------------------------------------------------------------------
// Panel content renderer
// ---------------------------------------------------------------------------

function PanelContent({ selected, agentStatuses }: { selected: SelectedItem | null; agentStatuses: Record<string, AgentStatus> }) {
  if (!selected) return <OverviewPanel agentStatuses={agentStatuses} />;

  switch (selected.type) {
    case 'desk':
      return selected.agentName
        ? <AgentPanel agentName={selected.agentName} agentStatuses={agentStatuses} />
        : <p className="text-sm text-muted-foreground">Empty desk</p>;
    case 'ceo-desk':    return <CeoDeskPanel />;
    case 'whiteboard':  return <WhiteboardPanel />;
    case 'mailbox':     return <MailboxPanel />;
    case 'conference':  return <ConferencePanel />;
    case 'bell':        return <BellPanel />;
    case 'server-room': return <ServerRoomPanel />;
    case 'door':
      return <p className="text-sm text-muted-foreground">The office entrance.</p>;
    default:
      return <OverviewPanel agentStatuses={agentStatuses} />;
  }
}

// ---------------------------------------------------------------------------
// SidePanel
// ---------------------------------------------------------------------------

export default function SidePanel({ selected, agentStatuses, onClose, variant = 'side' }: SidePanelProps) {
  // Escape key dismisses bottom sheet
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (variant !== 'bottom') return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [variant, handleKeyDown]);

  // -- Side variant (desktop) -----------------------------------------------
  if (variant === 'side') {
    return (
      <aside className="w-80 border-l border-border bg-card flex flex-col shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">{panelTitle(selected)}</h2>
          {selected && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClose}
              aria-label="Close panel"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            <PanelContent selected={selected} agentStatuses={agentStatuses} />
          </div>
        </ScrollArea>
      </aside>
    );
  }

  // -- Bottom sheet variant (mobile) ----------------------------------------
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl max-h-[55vh] flex flex-col animate-[slideUp_200ms_ease-out]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <h2 id="sheet-title" className="text-sm font-semibold">{panelTitle(selected)}</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 pb-4">
            <PanelContent selected={selected} agentStatuses={agentStatuses} />
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
