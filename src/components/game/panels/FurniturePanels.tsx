// ---------------------------------------------------------------------------
// FurniturePanels — game-style panels for clickable furniture items
// ---------------------------------------------------------------------------

import {
  Crown, FileText, Inbox, Users, Bell, Server,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { timeAgo } from '@/lib/utils';
import { useDashboardStore } from '@/stores/dashboard-store';
import {
  SectionHeader, PixelProgress, PIXEL_CARD, PIXEL_CARD_RAISED,
  ParchmentDivider, PARCHMENT,
} from './panelUtils';

// ---------------------------------------------------------------------------
// CeoDeskPanel
// ---------------------------------------------------------------------------

export function CeoDeskPanel() {
  const directiveState = useDashboardStore((s) => s.directiveState);
  const sessions = useDashboardStore((s) => s.sessions);
  const pendingApprovals = sessions.filter((s) => s.status === 'waiting-approval').length;
  const errorCount = sessions.filter((s) => !s.isSubagent && s.status === 'error').length;

  return (
    <div className="space-y-3 font-mono">
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-yellow-600" aria-hidden="true" />
        <span className="font-bold text-sm" style={{ color: PARCHMENT.text }}>CEO Desk</span>
      </div>

      <div className="space-y-1.5" style={PIXEL_CARD}>
        <div className="flex justify-between items-center px-2 py-1.5">
          <span className="text-xs" style={{ color: PARCHMENT.textDim }}>Pending approvals</span>
          <Badge
            variant={pendingApprovals > 0 ? 'destructive' : 'secondary'}
            className="text-[10px] px-1.5 py-0"
          >
            {pendingApprovals}
          </Badge>
        </div>
        {errorCount > 0 && (
          <div className="flex justify-between items-center px-2 py-1.5 border-t" style={{ borderColor: `${PARCHMENT.border}40` }}>
            <span className="text-xs" style={{ color: PARCHMENT.textDim }}>Errors</span>
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              {errorCount}
            </Badge>
          </div>
        )}
      </div>

      {directiveState ? (
        <div className="space-y-1.5 p-2" style={PIXEL_CARD_RAISED}>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: PARCHMENT.textDim }}>
            Active Directive
          </span>
          <p className="text-xs font-semibold" style={{ color: PARCHMENT.text }}>
            {directiveState.directiveName}
          </p>
          <div className="flex justify-between text-[11px]">
            <span style={{ color: PARCHMENT.textDim }}>Phase</span>
            <span className="font-medium" style={{ color: PARCHMENT.text }}>{directiveState.currentPhase}</span>
          </div>
          <PixelProgress
            value={directiveState.currentProject}
            max={directiveState.totalProjects}
            color="#C4A265"
            showLabel
          />
        </div>
      ) : (
        <div className="text-center py-4" style={PIXEL_CARD}>
          <p className="text-xs" style={{ color: PARCHMENT.textDim }}>No active directive</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WhiteboardPanel
// ---------------------------------------------------------------------------

export function WhiteboardPanel() {
  const workState = useDashboardStore((s) => s.workState);
  const directives = workState?.conductor?.directives ?? [];

  return (
    <div className="space-y-3 font-mono">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4" style={{ color: PARCHMENT.text }} aria-hidden="true" />
        <span className="font-bold text-sm" style={{ color: PARCHMENT.text }}>Directives</span>
      </div>

      {directives.length > 0 ? (
        <div className="space-y-1.5">
          {directives.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between text-xs px-2 py-1.5"
              style={PIXEL_CARD}
            >
              <span className="truncate mr-2 font-medium" style={{ color: PARCHMENT.text }}>{d.title}</span>
              <Badge variant="secondary" className="text-[9px] shrink-0 px-1 py-0">
                {d.status}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4" style={PIXEL_CARD}>
          <p className="text-xs" style={{ color: PARCHMENT.textDim }}>No active directives</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MailboxPanel
// ---------------------------------------------------------------------------

export function MailboxPanel() {
  const workState = useDashboardStore((s) => s.workState);
  const reports = workState?.conductor?.reports ?? [];

  return (
    <div className="space-y-3 font-mono">
      <div className="flex items-center gap-2">
        <Inbox className="h-4 w-4" style={{ color: PARCHMENT.text }} aria-hidden="true" />
        <span className="font-bold text-sm" style={{ color: PARCHMENT.text }}>Reports</span>
      </div>

      {reports.length > 0 ? (
        <div className="space-y-1.5">
          {reports.map((r) => (
            <div key={r.id} className="px-2 py-1.5" style={PIXEL_CARD}>
              <span className="block text-xs truncate font-medium" style={{ color: PARCHMENT.text }}>{r.title}</span>
              <span className="text-[10px]" style={{ color: PARCHMENT.textDim }}>{timeAgo(r.updatedAt)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4" style={PIXEL_CARD}>
          <p className="text-xs" style={{ color: PARCHMENT.textDim }}>No reports available</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConferencePanel
// ---------------------------------------------------------------------------

export function ConferencePanel() {
  const directiveState = useDashboardStore((s) => s.directiveState);

  return (
    <div className="space-y-3 font-mono">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4" style={{ color: PARCHMENT.text }} aria-hidden="true" />
        <span className="font-bold text-sm" style={{ color: PARCHMENT.text }}>Conference Room</span>
      </div>

      {directiveState ? (
        <div className="space-y-2 p-2" style={PIXEL_CARD_RAISED}>
          <p className="text-xs font-semibold" style={{ color: PARCHMENT.text }}>
            {directiveState.directiveName}
          </p>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span style={{ color: PARCHMENT.textDim }}>Phase</span>
              <span className="font-medium" style={{ color: PARCHMENT.text }}>{directiveState.currentPhase}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span style={{ color: PARCHMENT.textDim }}>Status</span>
              <Badge variant="secondary" className="text-[9px] px-1 py-0">{directiveState.status}</Badge>
            </div>
          </div>
          <PixelProgress
            value={directiveState.currentProject}
            max={directiveState.totalProjects}
            color="#5B8C3E"
            showLabel
          />
        </div>
      ) : (
        <div className="text-center py-4" style={PIXEL_CARD}>
          <p className="text-xs" style={{ color: PARCHMENT.textDim }}>No directive in progress</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BellPanel
// ---------------------------------------------------------------------------

export function BellPanel() {
  return (
    <div className="space-y-3 font-mono">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-yellow-600" aria-hidden="true" />
        <span className="font-bold text-sm" style={{ color: PARCHMENT.text }}>Scout Bell</span>
      </div>

      <div className="text-center py-6" style={PIXEL_CARD}>
        <div className="text-2xl mb-2" style={{ opacity: 0.25 }}>&#x1F514;</div>
        <p className="text-xs font-medium" style={{ color: PARCHMENT.text }}>
          Ring the bell to start <span className="font-mono">/scout</span>
        </p>
        <p className="text-[10px] mt-1" style={{ color: PARCHMENT.textDim }}>
          Coming in Phase 4 — action layer
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ServerRoomPanel
// ---------------------------------------------------------------------------

export function ServerRoomPanel() {
  const sessions = useDashboardStore((s) => s.sessions);
  const activeCount = sessions.filter((s) => s.status === 'working').length;
  const totalCount = sessions.filter((s) => !s.isSubagent).length;

  return (
    <div className="space-y-3 font-mono">
      <div className="flex items-center gap-2">
        <Server className="h-4 w-4 text-emerald-500" aria-hidden="true" />
        <span className="font-bold text-sm" style={{ color: PARCHMENT.text }}>Server Room</span>
      </div>

      <div className="space-y-2 p-2" style={PIXEL_CARD}>
        <div className="flex justify-between text-xs">
          <span style={{ color: PARCHMENT.textDim }}>Active sessions</span>
          <span
            className="font-bold"
            style={{ color: activeCount > 0 ? '#22C55E' : PARCHMENT.text }}
          >
            {activeCount}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span style={{ color: PARCHMENT.textDim }}>Total sessions</span>
          <span className="font-medium" style={{ color: PARCHMENT.text }}>{totalCount}</span>
        </div>
        {activeCount > 0 && (
          <PixelProgress
            value={activeCount}
            max={totalCount}
            color="#22C55E"
            showLabel
          />
        )}
      </div>
    </div>
  );
}
