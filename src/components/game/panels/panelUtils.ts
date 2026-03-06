// ---------------------------------------------------------------------------
// Shared panel utilities — pixel-art game UI styling system
// ---------------------------------------------------------------------------

import React from 'react';
import type { DirectiveProject } from '@/stores/types';
import type { AgentStatus } from '../types';

// ---------------------------------------------------------------------------
// Parchment theme constants
// ---------------------------------------------------------------------------

export const PARCHMENT = {
  bg: '#F5ECD7',
  card: '#E8D5B0',
  cardHover: '#E0CCA0',
  text: '#3D2B1F',
  textDim: '#6B4C3B',
  border: '#C4A265',
  borderDark: '#8B6914',
  highlight: '#F5ECD7',
  shadow: '#A08040',
  accent: '#C4A265',
  insetShadow: 'inset -2px -2px 0 0 #8B6914, inset 2px 2px 0 0 #F5ECD7',
  cardShadow: 'inset -1px -1px 0 0 #A08040, inset 1px 1px 0 0 #F5ECD7',
} as const;

// ---------------------------------------------------------------------------
// Pixel-art card styles (RPG inventory slot aesthetic)
// ---------------------------------------------------------------------------

/** Recessed card — looks like it's inset into the parchment */
export const PIXEL_CARD = {
  backgroundColor: PARCHMENT.card,
  boxShadow: [
    '0 0 0 1px #A08040',           // outer border
    'inset 1px 1px 0 0 #C8B090',   // inner top-left highlight
    'inset -1px -1px 0 0 #9A7A40', // inner bottom-right shadow
  ].join(', '),
  borderRadius: '2px',
} as const;

/** Raised card — looks like it pops up from the parchment (for active items) */
export const PIXEL_CARD_RAISED = {
  backgroundColor: '#EEDCB0',
  boxShadow: [
    '0 0 0 1px #8B6914',           // outer dark border
    '0 1px 0 1px #A08040',         // outer bottom shadow
    'inset 1px 1px 0 0 #F5ECD7',   // inner top-left bright
    'inset -1px -1px 0 0 #B8960A', // inner bottom-right dark
  ].join(', '),
  borderRadius: '2px',
} as const;

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

export function statusBadgeVariant(status: AgentStatus): string {
  switch (status) {
    case 'working': return 'bg-green-100 text-green-700';
    case 'waiting': return 'bg-yellow-100 text-yellow-700';
    case 'idle':    return 'bg-gray-100 text-gray-600';
    case 'error':   return 'bg-red-100 text-red-700';
    case 'offline': return 'bg-gray-50 text-gray-400';
  }
}

export function statusDotColor(status: string): string {
  switch (status) {
    case 'working': return 'bg-green-500';
    case 'waiting-approval':
    case 'waiting-input': return 'bg-yellow-500';
    case 'error': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
}

export function statusPriority(status: string): number {
  switch (status) {
    case 'working': return 0;
    case 'waiting-approval': return 1;
    case 'waiting-input': return 2;
    case 'error': return 3;
    default: return 4;
  }
}

// ---------------------------------------------------------------------------
// Phase color (mirrors DirectiveProgress)
// ---------------------------------------------------------------------------

export function phaseColor(phase: string): string {
  switch (phase) {
    case 'audit': return 'bg-status-blue/15 text-status-blue border-status-blue/30';
    case 'design': return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    case 'build': return 'bg-status-green/15 text-status-green border-status-green/30';
    case 'review': return 'bg-status-yellow/15 text-status-yellow border-status-yellow/30';
    default: return 'bg-secondary text-secondary-foreground border-border';
  }
}

// ---------------------------------------------------------------------------
// Project status type (re-exported for convenience)
// ---------------------------------------------------------------------------

export type ProjectStatus = DirectiveProject['status'];

// ---------------------------------------------------------------------------
// Model label shortener
// ---------------------------------------------------------------------------

export function shortenModel(model?: string): string | null {
  if (!model) return null;
  if (model.includes('opus')) return 'opus';
  if (model.includes('sonnet')) return 'sonnet';
  if (model.includes('haiku')) return 'haiku';
  return model.replace('claude-', '').slice(0, 12);
}

// ---------------------------------------------------------------------------
// SectionHeader — game-style section with ornamental lines
// ---------------------------------------------------------------------------

export function SectionHeader({
  children,
  count,
  icon,
  color,
}: {
  children: React.ReactNode;
  count?: number;
  icon?: React.ReactNode;
  color?: string;
}) {
  return React.createElement('div', {
    className: 'flex items-center gap-2 py-1',
  },
    // Left ornamental line
    React.createElement('div', {
      className: 'h-px flex-1',
      style: { background: `linear-gradient(to right, transparent, ${PARCHMENT.border})` },
    }),
    // Icon + label cluster
    React.createElement('div', {
      className: 'flex items-center gap-1.5 shrink-0',
    },
      icon && React.createElement('span', {
        className: 'flex items-center',
        style: { color: color ?? PARCHMENT.textDim },
      }, icon),
      React.createElement('span', {
        className: 'text-[10px] font-bold uppercase tracking-widest font-mono',
        style: { color: color ?? PARCHMENT.textDim },
      }, children),
      count !== undefined && React.createElement('span', {
        className: 'text-[10px] font-bold font-mono',
        style: {
          color: PARCHMENT.bg,
          backgroundColor: color ?? PARCHMENT.textDim,
          borderRadius: '2px',
          padding: '0 4px',
          minWidth: '16px',
          textAlign: 'center' as const,
          lineHeight: '16px',
        },
      }, String(count)),
    ),
    // Right ornamental line
    React.createElement('div', {
      className: 'h-px flex-1',
      style: { background: `linear-gradient(to left, transparent, ${PARCHMENT.border})` },
    }),
  );
}

// ---------------------------------------------------------------------------
// PixelProgress — retro progress bar
// ---------------------------------------------------------------------------

export function PixelProgress({
  value,
  max,
  color = '#5B8C3E',
  height = 6,
  showLabel = false,
}: {
  value: number;
  max: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return React.createElement('div', {
    className: 'flex items-center gap-1.5',
  },
    React.createElement('div', {
      style: {
        height: `${height}px`,
        flex: 1,
        backgroundColor: '#C8B09060',
        borderRadius: '1px',
        boxShadow: 'inset 1px 1px 0 0 #A0804060, inset -1px -1px 0 0 #F5ECD740',
        overflow: 'hidden',
        position: 'relative' as const,
      },
    },
      React.createElement('div', {
        style: {
          height: '100%',
          width: `${pct}%`,
          backgroundColor: color,
          borderRadius: '1px',
          boxShadow: pct > 0 ? `inset 0 1px 0 0 ${color}60` : 'none',
          transition: 'width 300ms ease',
        },
      }),
    ),
    showLabel && React.createElement('span', {
      className: 'text-[9px] font-mono tabular-nums shrink-0',
      style: { color: PARCHMENT.textDim, minWidth: '28px', textAlign: 'right' as const },
    }, `${pct}%`),
  );
}

// ---------------------------------------------------------------------------
// Parchment-themed divider with diamond ornament
// ---------------------------------------------------------------------------

export function ParchmentDivider({ ornament = false }: { ornament?: boolean } = {}) {
  if (ornament) {
    return React.createElement('div', {
      className: 'flex items-center gap-2 my-2',
      role: 'separator',
    },
      React.createElement('div', {
        className: 'h-px flex-1',
        style: { backgroundColor: PARCHMENT.border },
      }),
      React.createElement('div', {
        style: {
          width: '4px',
          height: '4px',
          backgroundColor: PARCHMENT.border,
          transform: 'rotate(45deg)',
        },
      }),
      React.createElement('div', {
        className: 'h-px flex-1',
        style: { backgroundColor: PARCHMENT.border },
      }),
    );
  }

  return React.createElement('div', {
    className: 'h-px w-full my-1.5',
    style: {
      background: `linear-gradient(to right, transparent, ${PARCHMENT.border}, transparent)`,
    },
    role: 'separator',
  });
}

// ---------------------------------------------------------------------------
// StatusChip — larger, more visible status indicator
// ---------------------------------------------------------------------------

export function StatusChip({ status, animated = false }: { status: string; animated?: boolean }) {
  let bg = '#9CA3AF';
  let text = '#fff';
  let label = status;

  switch (status) {
    case 'working':
      bg = '#22C55E'; text = '#052E16'; label = 'Working';
      break;
    case 'waiting-approval':
      bg = '#EAB308'; text = '#422006'; label = 'Approval';
      break;
    case 'waiting-input':
      bg = '#3B82F6'; text = '#1E3A5F'; label = 'Input';
      break;
    case 'error':
      bg = '#EF4444'; text = '#fff'; label = 'Error';
      break;
    case 'idle':
      bg = '#9CA3AF'; text = '#1F2937'; label = 'Idle';
      break;
    case 'done':
      bg = '#10B981'; text = '#064E3B'; label = 'Done';
      break;
  }

  return React.createElement('span', {
    className: `text-[9px] font-bold font-mono px-1.5 py-0.5 leading-none ${animated ? 'animate-pulse' : ''}`,
    style: {
      backgroundColor: bg,
      color: text,
      borderRadius: '2px',
      boxShadow: `0 1px 0 0 ${bg}80`,
      letterSpacing: '0.02em',
    },
  }, label);
}

// ---------------------------------------------------------------------------
// Inline markdown renderer (originally from CeoBrief)
// ---------------------------------------------------------------------------

export function renderBriefMarkdown(md: string, maxLines = 20): React.ReactNode[] {
  const lines = md.split('\n').slice(0, maxLines);
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.startsWith('```')) continue;

    if (line.startsWith('# ') && key === 0) {
      key++;
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        renderHeading(key++, 'h3', 'text-xs font-semibold mt-2 mb-0.5', line.slice(3)),
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        renderHeading(key++, 'h4', 'text-xs font-medium mt-1.5 mb-0.5', line.slice(4)),
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const text = line.slice(2);
      elements.push(renderBullet(key++, text));
    } else if (line.trim() === '') {
      elements.push(renderSpacer(key++));
    } else if (line.startsWith('|')) {
      // skip tables
    } else {
      elements.push(renderParagraph(key++, line));
    }
  }

  return elements;
}

// -- private render helpers --

function boldParts(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return React.createElement('strong', {
        key: i,
        className: 'font-semibold',
        style: { color: PARCHMENT.text },
      }, part.slice(2, -2));
    }
    return part;
  });
}

function renderHeading(key: number, tag: 'h3' | 'h4', className: string, text: string): React.ReactNode {
  return React.createElement(tag, {
    key,
    className,
    style: { color: PARCHMENT.text },
  }, text);
}

function renderBullet(key: number, text: string): React.ReactNode {
  return React.createElement('div', {
    key,
    className: 'text-[11px] leading-relaxed pl-3 flex gap-1.5 font-mono',
    style: { color: PARCHMENT.textDim },
  },
    React.createElement('span', { className: 'shrink-0', style: { color: PARCHMENT.accent } }, '\u2022'),
    React.createElement('span', null, ...boldParts(text)),
  );
}

function renderSpacer(key: number): React.ReactNode {
  return React.createElement('div', { key, className: 'h-1' });
}

function renderParagraph(key: number, line: string): React.ReactNode {
  return React.createElement('p', {
    key,
    className: 'text-[11px] leading-relaxed font-mono',
    style: { color: PARCHMENT.textDim },
  }, ...boldParts(line));
}
