import React, { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import { Building2, Search } from 'lucide-react'

const API = 'https://smartcitizenreportingsystem.onrender.com/api/v1'

interface Report {
  id: number
  status: string
  priority: string
  department_name: string
}

interface DeptStats {
  name: string
  total: number
  pending: number
  resolved: number
  critical: number
  resolutionRate: number
}

export default function Departments() {
  const { token, role } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
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
          const data = await response.json()
          const list = Array.isArray(data) ? data : (data.results || [])
          setAllReports(list)
        }
      } catch (err) {
        console.error("Failed to fetch reports", err)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [token, role])

  const departmentStats = useMemo(() => {
    const statsMap: Record<string, DeptStats> = {}
    
    allReports.forEach(r => {
      const deptName = r.department_name || 'Unassigned'
      if (!statsMap[deptName]) {
        statsMap[deptName] = { name: deptName, total: 0, pending: 0, resolved: 0, critical: 0, resolutionRate: 0 }
      }
      const s = statsMap[deptName]
      s.total++
      if (r.status === 'RESOLVED' || r.status === 'CLOSED') s.resolved++
      else if (r.status !== 'REJECTED') s.pending++
      if (r.priority === 'CRITICAL') s.critical++
    })

    return Object.values(statsMap).map(s => {
      s.resolutionRate = s.total > 0 ? Math.round((s.resolved / s.total) * 100) : 0
      return s
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [allReports])

  const filteredDepts = useMemo(() => {
    if (!searchQuery) return departmentStats
    const q = searchQuery.toLowerCase()
    return departmentStats.filter(d => d.name.toLowerCase().includes(q))
  }, [searchQuery, departmentStats])

  if (role !== 'city_admin' && role !== 'super_admin') {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#ef4444' }}>
        <h2>Access Denied</h2>
        <p>You must be an Administrator to view the aggregate departments page.</p>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ color: '#0F172A', fontSize: 22, fontWeight: 700, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={22} color="#1D70B8" /> All Departments
          </h2>
          <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>
            Overview of report handling across all City Administration departments
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 400 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: 12, color: '#64748B' }} />
        <input
          type="text"
          placeholder="Search departments..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px 10px 40px', borderRadius: 12,
            border: '1px solid #CBD5E1', background: '#FFFFFF',
            color: '#0F172A', fontSize: 13, outline: 'none',
            boxSizing: 'border-box', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        />
      </div>

      {/* Summary row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <SummaryChip label="Total Active Departments" value={String(departmentStats.length)} color="#1D70B8" />
        <SummaryChip label="Showing" value={String(filteredDepts.length)} color="#10b981" />
      </div>

      {/* Department cards grid */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading department statistics...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filteredDepts.map(dept => (
            <div
              key={dept.name}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0', borderRadius: 16,
                padding: 20, textAlign: 'left',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              {/* Dept header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: 'rgba(29,112,184,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Building2 size={22} color="#1D70B8" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#0F172A', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {dept.name}
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                <MiniStat label="Total" value={dept.total} color="#1D70B8" />
                <MiniStat label="Pending" value={dept.pending} color="#f59e0b" />
                <MiniStat label="Resolved" value={dept.resolved} color="#10b981" />
                <MiniStat label="Critical" value={dept.critical} color="#ef4444" />
              </div>

              {/* Resolution rate bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: '#64748B' }}>Resolution Rate</span>
                  <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>{dept.resolutionRate}%</span>
                </div>
                <div style={{ height: 4, background: '#E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: `${dept.resolutionRate}%`,
                    background: `linear-gradient(90deg, #1D70B8, #10b981)`,
                    transition: 'width 0.8s ease',
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredDepts.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748B' }}>
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
      background: '#FFFFFF', border: '1px solid #E2E8F0',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    }}>
      <span style={{ color, fontSize: 20, fontWeight: 800 }}>{value}</span>
      <span style={{ color: '#64748B', fontSize: 12 }}>{label}</span>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color, fontSize: 16, fontWeight: 700 }}>{value}</div>
      <div style={{ color: '#64748B', fontSize: 9, marginTop: 2 }}>{label}</div>
    </div>
  )
}
