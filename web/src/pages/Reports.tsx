import React, { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import { Search, Filter, ChevronDown, Eye, MapPin, Clock } from 'lucide-react'

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
  citizen_name: string
  is_anonymous: boolean
  latitude: number
  longitude: number
  created_at: string
}

export default function Reports() {
  const { token, departmentName, role } = useAuthStore()
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL')
  const [deptFilter, setDeptFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)

  const [allReports, setAllReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true)
      try {
        const response = await fetch(`${API}/reports/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json()
          const mapped = data.map((item: any) => ({
            id: item.id,
            case_number: item.case_number,
            department_name: item.department_name || 'Unassigned',
            category_name: item.category_name || 'General',
            citizen_name: item.is_anonymous ? 'Anonymous' : (item.citizen?.full_name || 'Citizen'),
            is_anonymous: item.is_anonymous,
            description: item.description,
            latitude: item.latitude,
            longitude: item.longitude,
            status: item.status,
            priority: item.priority,
            created_at: item.created_at,
          }))
          
          setAllReports(mapped.sort((a: Report, b: Report) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
        }
      } catch (err) {
        console.error("Failed to fetch reports", err)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [token])

  const filteredReports = useMemo(() => {
    return allReports.filter(r => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
      if (priorityFilter !== 'ALL' && r.priority !== priorityFilter) return false
      
      // If we are city admin, we can filter by department. If we are an officer, we only see our own (already filtered by backend).
      if (role === 'city_admin' && deptFilter !== 'ALL' && r.department_name !== deptFilter) return false
      
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          r.case_number.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.department_name.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [allReports, statusFilter, priorityFilter, deptFilter, searchQuery, role])

  // Get unique departments for the filter dropdown
  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>()
    allReports.forEach(r => { if (r.department_name) depts.add(r.department_name) })
    return Array.from(depts).sort()
  }, [allReports])

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>
            {role === 'city_admin' ? 'All System Reports' : `${departmentName} Reports`}
          </h2>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
            Manage and track citizen incidents
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16,
        padding: 16, marginBottom: 24,
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(15,23,42,0.4)', borderRadius: 10,
          padding: '8px 12px', border: '1px solid rgba(148,163,184,0.08)',
          flex: '1 1 250px',
        }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Search cases, descriptions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent', border: 'none', color: '#e2e8f0',
              fontSize: 13, outline: 'none', width: '100%',
            }}
          />
        </div>

        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'ALL', label: 'All Statuses' },
            { value: 'SUBMITTED', label: 'Submitted' },
            { value: 'RECEIVED', label: 'Received' },
            { value: 'IN_PROGRESS', label: 'In Progress' },
            { value: 'RESOLVED', label: 'Resolved' },
          ]}
        />
        <FilterSelect
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={[
            { value: 'ALL', label: 'All Priorities' },
            { value: 'CRITICAL', label: 'Critical' },
            { value: 'HIGH', label: 'High' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'LOW', label: 'Low' },
          ]}
        />

        {role === 'city_admin' && (
          <FilterSelect
            value={deptFilter}
            onChange={setDeptFilter}
            options={[
              { value: 'ALL', label: 'All Departments' },
              ...uniqueDepartments.map(d => ({ value: d, label: d }))
            ]}
          />
        )}
      </div>

      {/* Table */}
      <div style={{
        background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16,
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading reports...</div>
        ) : filteredReports.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No reports found matching your criteria.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.08)', background: 'rgba(15,23,42,0.2)' }}>
                  <th style={thStyle}>Case</th>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Department</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Priority</th>
                  <th style={thStyle}>Submitted</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map(report => (
                  <tr
                    key={report.id}
                    style={{ borderBottom: '1px solid rgba(148,163,184,0.04)', transition: 'background 0.2s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,23,42,0.4)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => setSelectedReport(report)}
                  >
                    <td style={{ ...tdStyle, color: '#818cf8', fontWeight: 600 }}>{report.case_number}</td>
                    <td style={{ ...tdStyle, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {report.description}
                    </td>
                    <td style={{ ...tdStyle, color: '#94a3b8' }}>{report.department_name}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                        background: `${STATUS_COLORS[report.status] || '#6366f1'}15`,
                        color: STATUS_COLORS[report.status] || '#6366f1',
                      }}>
                        {report.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                        background: `${PRIORITY_COLORS[report.priority] || '#6b7280'}15`,
                        color: PRIORITY_COLORS[report.priority] || '#6b7280',
                      }}>
                        {report.priority}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: '#94a3b8' }}>
                      {new Date(report.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button style={{
                        background: 'rgba(99,102,241,0.1)', border: 'none',
                        color: '#818cf8', padding: '6px 12px', borderRadius: 6,
                        cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}>
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Detail Modal placeholder */}
      {selectedReport && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24,
        }}>
          <div style={{
            background: '#1e293b', border: '1px solid rgba(148,163,184,0.1)',
            borderRadius: 20, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ padding: 20, borderBottom: '1px solid rgba(148,163,184,0.1)', display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ color: 'white', margin: 0 }}>{selectedReport.case_number}</h3>
              <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>Close</button>
            </div>
            <div style={{ padding: 20, color: '#e2e8f0' }}>
              <p><strong>Status:</strong> {selectedReport.status}</p>
              <p><strong>Priority:</strong> {selectedReport.priority}</p>
              <p><strong>Department:</strong> {selectedReport.department_name}</p>
              <p><strong>Description:</strong> {selectedReport.description}</p>
              <p><strong>Citizen:</strong> {selectedReport.citizen_name}</p>
              <p><strong>Submitted:</strong> {new Date(selectedReport.created_at).toLocaleString()}</p>
              <div style={{ marginTop: 20, padding: 16, background: 'rgba(15,23,42,0.5)', borderRadius: 10 }}>
                Map Location: [{selectedReport.latitude}, {selectedReport.longitude}]
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle = { padding: '16px', color: '#94a3b8', fontSize: 12, fontWeight: 600 }
const tdStyle = { padding: '16px', color: '#e2e8f0', fontSize: 13, fontWeight: 500 }

function FilterSelect({ value, onChange, options }: { value: string, onChange: (v: string) => void, options: { value: string, label: string }[] }) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          appearance: 'none',
          background: 'rgba(15,23,42,0.4)', borderRadius: 10,
          border: '1px solid rgba(148,163,184,0.08)',
          color: '#e2e8f0', fontSize: 13, fontWeight: 500,
          padding: '8px 32px 8px 12px', outline: 'none', cursor: 'pointer',
        }}
      >
        {options.map(o => <option key={o.value} value={o.value} style={{ background: '#1e293b' }}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  )
}
