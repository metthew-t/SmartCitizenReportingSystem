/**
 * Adama Smart Citizen — Web Design Token System
 * Aligned with GOV.UK, USWDS, Singapore OneService, Open311 GeoReport Protocol
 * WCAG 2.1 AA/AAA
 */

// ── Color tokens ──────────────────────────────────────────────────────────────
export const Colors = {
  // Brand
  navy:         '#0F2942',
  govBlue:      '#1D70B8',
  govBlueDark:  '#0D5C99',
  teal:         '#0E7490',
  emerald:      '#059669',
  emeraldLight: '#10B981',

  // Canvas — Light
  canvas:       '#F8FAFC',
  surface:      '#FFFFFF',
  border:       '#E2E8F0',
  muted:        '#F1F5F9',

  // Canvas — Dark
  canvasDark:   '#0F172A',
  surfaceDark:  '#1E293B',
  borderDark:   '#334155',

  // Text
  textPrimary:   '#0F172A',
  textSecondary: '#475569',
  textMuted:     '#94A3B8',
  textInverse:   '#F8FAFC',

  // Focus ring (WCAG gov yellow)
  focusRing: '#FDE047',

  // Danger / Warning / Info
  dangerBg:     '#FEF2F2',
  dangerBorder: '#FCA5A5',
  dangerText:   '#DC2626',
  warningBg:    '#FFFBEB',
  warningText:  '#B45309',
  infoBg:       '#EFF6FF',
  infoText:     '#1D4ED8',
} as const

// ── Status semantic colors ────────────────────────────────────────────────────
export const StatusColors: Record<string, { accent: string; bg: string; text: string }> = {
  SUBMITTED:           { accent: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8' },
  RECEIVED:            { accent: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8' },
  ASSIGNED:            { accent: '#F59E0B', bg: '#FFFBEB', text: '#B45309' },
  UNDER_INVESTIGATION: { accent: '#F59E0B', bg: '#FFFBEB', text: '#B45309' },
  IN_PROGRESS:         { accent: '#8B5CF6', bg: '#F5F3FF', text: '#6D28D9' },
  RESOLVED:            { accent: '#10B981', bg: '#ECFDF5', text: '#047857' },
  CLOSED:              { accent: '#64748B', bg: '#F1F5F9', text: '#334155' },
  REJECTED:            { accent: '#EF4444', bg: '#FEF2F2', text: '#B91C1C' },
  REOPENED:            { accent: '#EC4899', bg: '#FDF2F8', text: '#BE185D' },
  APPEALED:            { accent: '#EC4899', bg: '#FDF2F8', text: '#BE185D' },
}

export function getStatusColors(status: string) {
  return StatusColors[status?.toUpperCase()] ?? { accent: '#94A3B8', bg: '#F1F5F9', text: '#475569' }
}

export function statusLabel(status: string): string {
  return (status || '')
    .replace(/_/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

// ── Priority tokens ───────────────────────────────────────────────────────────
export const PriorityColors: Record<string, string> = {
  CRITICAL: '#DC2626',
  HIGH:     '#F59E0B',
  MEDIUM:   '#3B82F6',
  LOW:      '#94A3B8',
}

export function getPriorityColor(priority: string): string {
  return PriorityColors[priority?.toUpperCase()] ?? '#94A3B8'
}

// ── SLA tokens ────────────────────────────────────────────────────────────────
export function getSlaColor(hoursRemaining: number, isBreached: boolean): string {
  if (isBreached) return '#EF4444'
  if (hoursRemaining <= 4) return '#F59E0B'
  return '#10B981'
}

export function getSlaLabel(hoursRemaining: number, isBreached: boolean): string {
  if (isBreached) {
    const h = Math.abs(hoursRemaining)
    return h < 1 ? `Overdue ${Math.round(h * 60)}m` : `Overdue ${h.toFixed(0)}h`
  }
  if (hoursRemaining < 1) return `${Math.round(hoursRemaining * 60)}m left`
  return `${hoursRemaining.toFixed(0)}h left`
}

// ── Inline style helpers ─────────────────────────────────────────────────────
// Used in inline-style-heavy components (App.tsx, DashboardLayout.tsx)

export const Styles = {
  // Card
  card: {
    background: Colors.surface,
    border: `1px solid ${Colors.border}`,
    borderRadius: 14,
    boxShadow: '0 2px 12px -3px rgba(15,23,42,0.08)',
  } as React.CSSProperties,

  // Dark card (command center / admin)
  darkCard: {
    background: 'rgba(30,41,59,0.7)',
    border: '1px solid rgba(148,163,184,0.1)',
    borderRadius: 14,
    backdropFilter: 'blur(12px)',
  } as React.CSSProperties,

  // Primary button
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    padding: '0 20px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
    color: 'white',
    background: `linear-gradient(135deg, ${Colors.govBlue}, ${Colors.navy})`,
    boxShadow: '0 4px 14px rgba(29,112,184,0.3)',
    transition: 'all 0.2s',
  } as React.CSSProperties,

  // Secondary button
  btnSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    padding: '0 16px',
    borderRadius: 10,
    border: `1.5px solid ${Colors.border}`,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
    color: Colors.textPrimary,
    background: Colors.surface,
    transition: 'all 0.2s',
  } as React.CSSProperties,

  // Input
  input: {
    width: '100%',
    height: 44,
    padding: '0 14px',
    borderRadius: 10,
    border: `1px solid ${Colors.border}`,
    background: Colors.surface,
    color: Colors.textPrimary,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s',
  } as React.CSSProperties,

  // Label
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: Colors.textSecondary,
    marginBottom: 6,
  } as React.CSSProperties,
}

// ── Status badge inline styles ────────────────────────────────────────────────
export function statusBadgeStyle(status: string): React.CSSProperties {
  const { accent, bg, text } = getStatusColors(status)
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
    background: bg,
    color: text,
    border: `1px solid ${accent}40`,
  }
}

export function priorityBadgeStyle(priority: string): React.CSSProperties {
  const color = getPriorityColor(priority)
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 9px',
    borderRadius: 8,
    fontSize: 10,
    fontWeight: 700,
    background: `${color}12`,
    color: color,
    border: `1px solid ${color}30`,
  }
}

export function slaBadgeStyle(hoursRemaining: number, isBreached: boolean): React.CSSProperties {
  const color = getSlaColor(hoursRemaining, isBreached)
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 9px',
    borderRadius: 8,
    fontSize: 10,
    fontWeight: 700,
    background: `${color}12`,
    color: color,
    border: `1px solid ${color}35`,
  }
}

// Make React.CSSProperties available without importing React everywhere
import type React from 'react'
