import React, { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import { MapPin, Navigation, Layers, Info, ExternalLink } from 'lucide-react'

const API = 'https://smartcitizenreportingsystem.onrender.com/api/v1'

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: '#6366F1', RECEIVED: '#8B5CF6', ASSIGNED: '#3B82F6',
  UNDER_INVESTIGATION: '#F59E0B', IN_PROGRESS: '#F97316',
  RESOLVED: '#10B981', CLOSED: '#6B7280', REOPENED: '#EF4444', REJECTED: '#DC2626',
}
const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#6B7280', MEDIUM: '#3B82F6', HIGH: '#F59E0B', CRITICAL: '#EF4444',
}

interface Report {
  id: number
  case_number: string
  description: string
  status: string
  priority: string
  department_name: string
  category_name: string
  latitude: number
  longitude: number
  created_at: string
}

export default function MapView() {
  const { token, departmentName, role } = useAuthStore()
  const [selected, setSelected] = useState<Report | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL')
  const [allReports, setAllReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true)
      try {
        const response = await fetch(`${API}/reports/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          setAllReports(await response.json())
        }
      } catch (err) {
        console.error("Failed to fetch reports", err)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [token])

  const reports = useMemo(() => {
    return allReports.filter(r => {
      if (priorityFilter !== 'ALL' && r.priority !== priorityFilter) return false
      // Role filtering should already be handled by the backend /reports endpoint
      // City Admins see all, Officers see only theirs.
      return true
    })
  }, [allReports, priorityFilter])

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
          {role === 'city_admin' ? 'All Departments' : departmentName} — {reports.length} reports plotted
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
              <Layers size={16} color="#6366f1" /> Reports in View
            </h3>
          </div>

          {/* Filters */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
            <label style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>Priority Filter</label>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              style={{
                width: '100%', background: 'rgba(15,23,42,0.4)', color: '#e2e8f0',
                border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8,
                padding: '8px 12px', fontSize: 12, outline: 'none',
              }}
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Loading...</div>
            ) : reports.map(r => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                style={{
                  width: '100%', padding: '12px 16px', border: 'none', borderBottom: '1px solid rgba(148,163,184,0.04)',
                  background: selected?.id === r.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                  textAlign: 'left', cursor: 'pointer', transition: 'background 0.2s',
                  display: 'block',
                }}
                onMouseEnter={e => { if (selected?.id !== r.id) e.currentTarget.style.background = 'rgba(15,23,42,0.4)' }}
                onMouseLeave={e => { if (selected?.id !== r.id) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}>{r.case_number}</span>
                  <span style={{
                    color: PRIORITY_COLORS[r.priority] || '#6b7280', fontSize: 10, fontWeight: 700,
                    padding: '2px 6px', background: `${PRIORITY_COLORS[r.priority] || '#6b7280'}15`, borderRadius: 4,
                  }}>{r.priority}</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.department_name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Mock Map container */}
        <div style={{
          position: 'relative', borderRadius: 16, overflow: 'hidden',
          border: '1px solid rgba(148,163,184,0.08)',
          background: '#0f172a',
          backgroundImage: `
            linear-gradient(rgba(30,41,59,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(30,41,59,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}>
          {/* Overlay elements */}
          <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(15,23,42,0.8)', padding: '8px 12px', borderRadius: 8, backdropFilter: 'blur(8px)', border: '1px solid rgba(148,163,184,0.1)', color: '#94a3b8', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Navigation size={14} /> Adama Live Map Simulation
          </div>

          {/* Plot markers */}
          {reports.map(r => {
            const pos = toPosition(r.latitude, r.longitude)
            const color = PRIORITY_COLORS[r.priority] || '#3b82f6'
            const isSelected = selected?.id === r.id
            return (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                style={{
                  position: 'absolute', left: pos.left, top: pos.top,
                  transform: 'translate(-50%, -50%)',
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer', zIndex: isSelected ? 10 : 1,
                }}
              >
                {/* Ping animation wrapper */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {(isSelected || r.priority === 'CRITICAL') && (
                    <div style={{
                      position: 'absolute', width: 32, height: 32, borderRadius: '50%',
                      background: color, opacity: 0.2, animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                    }} />
                  )}
                  <div style={{
                    width: isSelected ? 16 : 12, height: isSelected ? 16 : 12, borderRadius: '50%',
                    background: color, border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }} />
                </div>
              </button>
            )
          })}

          {/* Floating detail panel if selected */}
          {selected && (
            <div style={{
              position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(30,41,59,0.95)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(148,163,184,0.2)', borderRadius: 16,
              padding: 20, width: 400, boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ color: 'white', margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>
                    {selected.case_number}
                  </h3>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{selected.department_name}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: `${STATUS_COLORS[selected.status] || '#6366f1'}15`, color: STATUS_COLORS[selected.status] || '#6366f1' }}>
                    {selected.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <p style={{ color: '#e2e8f0', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                {selected.description}
              </p>
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 11 }}>
                  <MapPin size={12} /> {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 11 }}>
                  <Info size={12} /> {selected.category_name}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
