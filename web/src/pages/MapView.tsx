import React, { useState, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import {
  DEMO_REPORTS, DEPARTMENTS, CATEGORIES,
  STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS,
  getReportsForDepartment, DemoReport,
} from '../store/demoData'
import { MapPin, Navigation, Layers, Info, ExternalLink } from 'lucide-react'

export default function MapView() {
  const { department } = useAuthStore()
  const [selected, setSelected] = useState<DemoReport | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL')

  const reports = useMemo(() => {
    const list = department
      ? getReportsForDepartment(department.id)
      : DEMO_REPORTS
    if (priorityFilter !== 'ALL') {
      return list.filter(r => r.priority === priorityFilter)
    }
    return list
  }, [department, priorityFilter])

  // Map bounds for Adama city
  const ADAMA_LAT = 8.54
  const ADAMA_LNG = 39.27
  const MAP_SIZE = 0.06

  // Convert lat/lng to pixel positions within the map container
  const toPosition = (lat: number, lng: number) => ({
    left: `${((lng - (ADAMA_LNG - MAP_SIZE / 2)) / MAP_SIZE) * 100}%`,
    top: `${((ADAMA_LAT + MAP_SIZE / 2 - lat) / MAP_SIZE) * 100}%`,
  })

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>
          <MapPin size={20} style={{ display: 'inline', marginRight: 8 }} />
          GIS Map — Report Locations
        </h2>
        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
          {department ? `${department.icon} ${department.nameEn}` : 'All Departments'} — {reports.length} reports plotted
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, height: 'calc(100vh - 200px)' }}>
        {/* Left: Report list panel */}
        <div style={{
          background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16,
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '16px', borderBottom: '1px solid rgba(148,163,184,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <h3 style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={16} color="#6366f1" /> Reports
            </h3>
            <span style={{ color: '#64748b', fontSize: 11 }}>{reports.length}</span>
          </div>

          {/* Priority filter pills */}
          <div style={{ display: 'flex', gap: 4, padding: '8px 16px', flexWrap: 'wrap' }}>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                style={{
                  padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontSize: 10, fontWeight: 600,
                  background: priorityFilter === p ? (p === 'ALL' ? 'rgba(99,102,241,0.2)' : `${PRIORITY_COLORS[p]}20`) : 'rgba(15,23,42,0.4)',
                  color: priorityFilter === p ? (p === 'ALL' ? '#818cf8' : PRIORITY_COLORS[p]) : '#64748b',
                }}
              >
                {p === 'ALL' ? 'All' : p}
              </button>
            ))}
          </div>

          {/* Report list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
            {reports.map(r => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                  border: selected?.id === r.id ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                  background: selected?.id === r.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                  color: '#e2e8f0', textAlign: 'left', marginBottom: 2, transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
                onMouseEnter={e => { if (selected?.id !== r.id) e.currentTarget.style.background = 'rgba(148,163,184,0.05)' }}
                onMouseLeave={e => { if (selected?.id !== r.id) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: PRIORITY_COLORS[r.priority],
                }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#818cf8' }}>{r.caseNumber}</div>
                  <div style={{
                    fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {r.description.slice(0, 40)}...
                  </div>
                  <div style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>
                    {STATUS_LABELS[r.status]}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Map + detail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Map area */}
          <div style={{
            flex: 1, borderRadius: 16, overflow: 'hidden', position: 'relative',
            background: 'linear-gradient(135deg, #1a2332 0%, #0f172a 50%, #1e293b 100%)',
            border: '1px solid rgba(148,163,184,0.08)',
          }}>
            {/* Grid lines for map effect */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'linear-gradient(rgba(148,163,184,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }} />

            {/* Map label */}
            <div style={{
              position: 'absolute', top: 16, left: 16, zIndex: 10,
              padding: '8px 14px', borderRadius: 10,
              background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(148,163,184,0.1)',
            }}>
              <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Navigation size={14} color="#6366f1" />
                Adama City, Ethiopia
              </div>
              <div style={{ color: '#64748b', fontSize: 10 }}>
                8.54°N, 39.27°E — OpenStreetMap
              </div>
            </div>

            {/* Report pins */}
            {reports.map(r => {
              const pos = toPosition(r.latitude, r.longitude)
              const isSelected = selected?.id === r.id
              return (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  title={`${r.caseNumber} — ${r.priority}`}
                  style={{
                    position: 'absolute',
                    left: pos.left, top: pos.top,
                    width: isSelected ? 16 : 10, height: isSelected ? 16 : 10,
                    borderRadius: '50%',
                    background: PRIORITY_COLORS[r.priority],
                    border: isSelected ? '3px solid white' : '2px solid rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    transform: 'translate(-50%, -50%)',
                    transition: 'all 0.2s',
                    zIndex: isSelected ? 20 : 10,
                    boxShadow: isSelected
                      ? `0 0 12px ${PRIORITY_COLORS[r.priority]}80`
                      : `0 0 4px ${PRIORITY_COLORS[r.priority]}40`,
                  }}
                />
              )
            })}
          </div>

          {/* Selected report detail */}
          {selected && (
            <div style={{
              background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16,
              padding: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ color: '#818cf8', fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>
                    {selected.caseNumber}
                  </h3>
                  <p style={{ color: '#e2e8f0', fontSize: 13, margin: '0 0 12px', lineHeight: 1.5 }}>
                    {selected.description}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  style={{
                    background: 'rgba(148,163,184,0.1)', border: 'none', borderRadius: 8,
                    color: '#94a3b8', cursor: 'pointer', padding: '4px 8px', fontSize: 12,
                  }}
                >✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                <InfoChip label="Status" value={STATUS_LABELS[selected.status]} color={STATUS_COLORS[selected.status]} />
                <InfoChip label="Priority" value={selected.priority} color={PRIORITY_COLORS[selected.priority]} />
                <InfoChip label="Category" value={CATEGORIES.find(c => c.id === selected.categoryId)?.nameEn || 'General'} color="#8b5cf6" />
                <InfoChip label="Department" value={DEPARTMENTS.find(d => d.id === selected.departmentId)?.nameEn || 'Unassigned'} color="#6366f1" />
                <div style={{
                  padding: '10px 12px', borderRadius: 10, gridColumn: 'span 2',
                  background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Coordinates</div>
                    <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500 }}>{`${selected.latitude.toFixed(4)}, ${selected.longitude.toFixed(4)}`}</div>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${selected.latitude},${selected.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                      borderRadius: 8, background: 'rgba(16,185,129,0.2)',
                      color: '#10b981', textDecoration: 'none', fontSize: 11, fontWeight: 600,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.2)'}
                  >
                    <ExternalLink size={14} /> Open Map
                  </a>
                </div>
                <InfoChip label="Reporter" value={selected.isAnonymous ? 'Anonymous' : selected.citizenName} color="#f59e0b" />
              </div>
            </div>
          )}

          {/* Legend */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 20, padding: '12px 20px', borderRadius: 12,
            background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(148,163,184,0.08)',
          }}>
            <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>Priority:</span>
            {Object.entries(PRIORITY_COLORS).map(([level, color]) => (
              <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                <span style={{ color: '#94a3b8', fontSize: 11 }}>{level}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 10,
      background: `${color}08`, border: `1px solid ${color}15`,
    }}>
      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500 }}>{value}</div>
    </div>
  )
}
