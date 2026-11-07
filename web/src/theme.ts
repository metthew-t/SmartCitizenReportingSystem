/**
 * Adama Smart Citizen — Web Design Token System
 * Exactly matches the mobile Flutter CivicColors palette.
 * Aligned with GOV.UK, USWDS, Singapore OneService, Open311 GeoReport Protocol
 * WCAG 2.1 AA/AAA
 */
import type React from 'react'

// ── Brand colors (matches mobile CivicColors exactly) ─────────────────────────
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

  // Canvas — Dark (Admin / Officer dashboards)
  canvasDark:   '#0A1628',   // Deep navy — matches mobile navyDeep
  surfaceDark:  '#111F35',   // Slightly lighter card surface
  surface2Dark: '#1A2E4A',   // Elevated cards
  borderDark:   'rgba(255,255,255,0.08)',
  borderDark2:  'rgba(29,112,184,0.2)',

  // Text — Light
  textPrimary:   '#0F172A',
  textSecondary: '#475569',
  textMuted:     '#94A3B8',
  textInverse:   '#F8FAFC',

  // Text — Dark
  textDark1: '#F1F5F9',
  textDark2: '#94A3B8',
  textDark3: '#64748B',

  // Focus ring (WCAG gov yellow)
  focusRing: '#FDE047',

  // Semantic (same as mobile)
  dangerBg:     '#FEF2F2',
  dangerBorder: '#FCA5A5',
  dangerText:   '#DC2626',
  warningBg:    '#FFFBEB',
  warningText:  '#B45309',
  infoBg:       '#EFF6FF',
  infoText:     '#1D4ED8',
} as const

// ── Status semantic colors (identical to mobile CivicStatus) ──────────────────
export const StatusColors: Record<string, { accent: string; bg: string; text: string; darkBg: string }> = {
  SUBMITTED:           { accent: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8', darkBg: 'rgba(59,130,246,0.12)' },
  RECEIVED:            { accent: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8', darkBg: 'rgba(59,130,246,0.12)' },
  ASSIGNED:            { accent: '#F59E0B', bg: '#FFFBEB', text: '#B45309', darkBg: 'rgba(245,158,11,0.12)' },
  UNDER_INVESTIGATION: { accent: '#F59E0B', bg: '#FFFBEB', text: '#B45309', darkBg: 'rgba(245,158,11,0.12)' },
  IN_PROGRESS:         { accent: '#8B5CF6', bg: '#F5F3FF', text: '#6D28D9', darkBg: 'rgba(139,92,246,0.12)' },
  RESOLVED:            { accent: '#10B981', bg: '#ECFDF5', text: '#047857', darkBg: 'rgba(16,185,129,0.12)' },
  CLOSED:              { accent: '#64748B', bg: '#F1F5F9', text: '#334155', darkBg: 'rgba(100,116,139,0.12)' },
  REJECTED:            { accent: '#EF4444', bg: '#FEF2F2', text: '#B91C1C', darkBg: 'rgba(239,68,68,0.12)' },
  REOPENED:            { accent: '#EC4899', bg: '#FDF2F8', text: '#BE185D', darkBg: 'rgba(236,72,153,0.12)' },
  APPEALED:            { accent: '#EC4899', bg: '#FDF2F8', text: '#BE185D', darkBg: 'rgba(236,72,153,0.12)' },
}

export function getStatusColors(status: string) {
  return StatusColors[status?.toUpperCase()] ?? { accent: '#94A3B8', bg: '#F1F5F9', text: '#475569', darkBg: 'rgba(148,163,184,0.12)' }
}

export function statusLabel(status: string): string {
  return (status || '').replace(/_/g, ' ').split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

// ── Priority (identical to mobile CivicPriority) ──────────────────────────────
export const PriorityColors: Record<string, string> = {
  CRITICAL: '#DC2626',
  HIGH:     '#F59E0B',
  MEDIUM:   '#3B82F6',
  LOW:      '#94A3B8',
}

export function getPriorityColor(priority: string): string {
  return PriorityColors[priority?.toUpperCase()] ?? '#94A3B8'
}

// ── SLA ───────────────────────────────────────────────────────────────────────
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
  return hoursRemaining < 1 ? `${Math.round(hoursRemaining * 60)}m left` : `${hoursRemaining.toFixed(0)}h left`
}

// ── Dark page wrapper style (used by all authenticated pages) ─────────────────
// This is the "mobile look" applied to web: deep navy canvas, govBlue accents
export const darkPage: React.CSSProperties = {
  minHeight: '100vh',
  background: `linear-gradient(160deg, ${Colors.canvasDark} 0%, #0D1B2E 60%, #091420 100%)`,
  color: Colors.textDark1,
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
}

export const darkCard: React.CSSProperties = {
  background: Colors.surfaceDark,
  border: `1px solid ${Colors.borderDark}`,
  borderRadius: 14,
  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
}

export const darkCardHover: React.CSSProperties = {
  ...darkCard,
  transition: 'all 0.2s',
}

export const darkCardElevated: React.CSSProperties = {
  background: Colors.surface2Dark,
  border: `1px solid ${Colors.borderDark2}`,
  borderRadius: 14,
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
}

// ── Inline style helpers ──────────────────────────────────────────────────────
export const Styles = {
  // Light card
  card: {
    background: Colors.surface,
    border: `1px solid ${Colors.border}`,
    borderRadius: 14,
    boxShadow: '0 2px 12px -3px rgba(15,23,42,0.08)',
  } as React.CSSProperties,

  // Dark card
  darkCard,
  darkCardElevated,

  // Primary button (gradient — matches mobile CivicPrimaryButton)
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
    border: `1.5px solid ${Colors.borderDark}`,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
    color: Colors.textDark2,
    background: 'transparent',
    transition: 'all 0.2s',
  } as React.CSSProperties,

  // Ghost button (dark bg)
  btnGhost: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 8,
    border: `1px solid ${Colors.borderDark}`,
    background: 'rgba(255,255,255,0.04)',
    color: Colors.textDark2,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  } as React.CSSProperties,

  // Input (dark version)
  inputDark: {
    width: '100%',
    height: 44,
    padding: '0 14px',
    borderRadius: 10,
    border: `1px solid ${Colors.borderDark}`,
    background: 'rgba(255,255,255,0.05)',
    color: Colors.textDark1,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s',
  } as React.CSSProperties,

  // Input (light version)
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
  } as React.CSSProperties,

  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: Colors.textSecondary,
    marginBottom: 6,
  } as React.CSSProperties,

  labelDark: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: Colors.textDark2,
    marginBottom: 6,
  } as React.CSSProperties,
}

// ── Status badge (inline) ─────────────────────────────────────────────────────
export function statusBadgeStyle(status: string, dark = false): React.CSSProperties {
  const { accent, bg, text, darkBg } = getStatusColors(status)
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
    background: dark ? darkBg : bg,
    color: dark ? accent : text,
    border: `1px solid ${accent}40`,
  }
}

export function priorityBadgeStyle(priority: string): React.CSSProperties {
  const color = getPriorityColor(priority)
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 9px', borderRadius: 8,
    fontSize: 10, fontWeight: 700,
    background: `${color}12`, color, border: `1px solid ${color}30`,
  }
}

export function slaBadgeStyle(hoursRemaining: number, isBreached: boolean): React.CSSProperties {
  const color = getSlaColor(hoursRemaining, isBreached)
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 9px', borderRadius: 8,
    fontSize: 10, fontWeight: 700,
    background: `${color}12`, color, border: `1px solid ${color}35`,
  }
}

// ── Section header (dark) ─────────────────────────────────────────────────────
export function sectionHeaderStyle(): React.CSSProperties {
  return {
    fontSize: 14,
    fontWeight: 700,
    color: Colors.textDark1,
    margin: '0 0 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }
}

// ── Page header ────────────────────────────────────────────────────────────────
export function pageTitle(text: string): React.CSSProperties {
  return { color: Colors.textDark1, fontSize: 22, fontWeight: 800, margin: '0 0 4px', letterSpacing: -0.3 }
}

// ── Scrollable content wrapper for authenticated pages ─────────────────────────
export const pageContent: React.CSSProperties = {
  padding: '24px 28px',
  maxWidth: 1400,
  margin: '0 auto',
}
