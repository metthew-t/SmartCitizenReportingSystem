import React, { useState, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import { DEPARTMENTS, getDepartmentStats } from '../store/demoData'
import { Building2, Search, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Departments() {
  const [searchQuery, setSearchQuery] = useState('')
  const { setDepartment } = useAuthStore()
  const navigate = useNavigate()

  const filteredDepts = useMemo(() => {
    if (!searchQuery) return DEPARTMENTS
    const q = searchQuery.toLowerCase()
    return DEPARTMENTS.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.nameEn.toLowerCase().includes(q)
    )
  }, [searchQuery])

  const handleDeptClick = (dept: typeof DEPARTMENTS[0]) => {
    setDepartment(dept)
    navigate('/dashboard')
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={22} color="#6366f1" /> All Departments
          </h2>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
            All 33 Adama City departments — click to view department dashboard
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div style={{
        position: 'relative', marginBottom: 20, maxWidth: 400,
      }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: 12, color: '#64748b' }} />
        <input
          type="text"
          placeholder="Search departments..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px 10px 40px', borderRadius: 12,
            border: '1px solid rgba(148,163,184,0.12)', background: 'rgba(30,41,59,0.6)',
            backdropFilter: 'blur(12px)', color: 'white', fontSize: 13, outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Summary row */}
      <div style={{
        display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap',
      }}>
        <SummaryChip label="Total Departments" value={String(DEPARTMENTS.length)} color="#6366f1" />
        <SummaryChip label="Showing" value={String(filteredDepts.length)} color="#10b981" />
      </div>

      {/* Department cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 16,
      }}>
        {filteredDepts.map(dept => {
          const stats = getDepartmentStats(dept.id)
          return (
            <button
              key={dept.id}
              onClick={() => handleDeptClick(dept)}
              style={{
                background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16,
                padding: 20, cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.3s', width: '100%',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${dept.color}40`
                e.currentTarget.style.boxShadow = `0 4px 20px ${dept.color}15`
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(148,163,184,0.08)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {/* Dept header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: `${dept.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, flexShrink: 0,
                }}>
                  {dept.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700 }}>
                    {dept.nameEn}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                    {dept.name}
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                <MiniStat label="Total" value={stats.total} color="#6366f1" />
                <MiniStat label="Pending" value={stats.pending} color="#f59e0b" />
                <MiniStat label="Resolved" value={stats.resolved} color="#10b981" />
                <MiniStat label="Critical" value={stats.critical} color="#ef4444" />
              </div>

              {/* Resolution rate bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>Resolution Rate</span>
                  <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>{stats.resolutionRate}%</span>
                </div>
                <div style={{ height: 4, background: 'rgba(148,163,184,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: `${stats.resolutionRate}%`,
                    background: `linear-gradient(90deg, ${dept.color}, #10b981)`,
                    transition: 'width 0.8s ease',
                  }} />
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {filteredDepts.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
          <Search size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontSize: 14 }}>No departments match "{searchQuery}"</p>
        </div>
      )}
    </div>
  )
}

function SummaryChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: '10px 20px', borderRadius: 12,
      background: `${color}08`, border: `1px solid ${color}15`,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ color, fontSize: 20, fontWeight: 800 }}>{value}</span>
      <span style={{ color: '#94a3b8', fontSize: 12 }}>{label}</span>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color, fontSize: 16, fontWeight: 700 }}>{value}</div>
      <div style={{ color: '#64748b', fontSize: 9, marginTop: 2 }}>{label}</div>
    </div>
  )
}
