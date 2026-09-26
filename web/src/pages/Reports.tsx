import React, { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, ChevronDown, Eye, MapPin, Clock, ExternalLink, Navigation, Phone, User, Building2, Tag, Calendar, X } from 'lucide-react'

const API = 'https://smartcitizenreportingsystem.onrender.com/api/v1'

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: '#6366F1', RECEIVED: '#8B5CF6', ASSIGNED: '#3B82F6',
  UNDER_INVESTIGATION: '#F59E0B', IN_PROGRESS: '#F97316',
  RESOLVED: '#10B981', CLOSED: '#6B7280', REOPENED: '#EF4444', REJECTED: '#DC2626',
}
const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted', RECEIVED: 'Received', ASSIGNED: 'Assigned',
  UNDER_INVESTIGATION: 'Under Investigation', IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved', CLOSED: 'Closed', REOPENED: 'Reopened', REJECTED: 'Rejected',
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
  citizen_phone: string
  is_anonymous: boolean
  latitude: number
  longitude: number
  created_at: string
  aanaa: string
  kuta_magaalaa: string
  iddoo_addaa: string
}

export default function Reports() {
  const { token, departmentName, role } = useAuthStore()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL')
  const [deptFilter, setDeptFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)

  const [allReports, setAllReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReports = async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const response = await fetch(`${API}/reports/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json()
        const list = Array.isArray(data) ? data : (data.results || [])
        const mapped = list.map((item: any) => ({
          id: item.id,
          case_number: item.case_number,
          department_name: item.department_name || 'Unassigned',
          category_name: item.category_name || 'General',
          citizen_name: item.is_anonymous ? 'Anonymous' : (item.citizen_name || item.citizen?.full_name || 'Citizen'),
          citizen_phone: item.citizen_phone || '',
          is_anonymous: item.is_anonymous,
          description: item.description,
          latitude: item.latitude,
          longitude: item.longitude,
          status: item.status,
          priority: item.priority,
          created_at: item.created_at,
          aanaa: item.aanaa || '',
          kuta_magaalaa: item.kuta_magaalaa || '',
          iddoo_addaa: item.iddoo_addaa || '',
        }))
        
        setAllReports(mapped.sort((a: Report, b: Report) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      }
    } catch (err) {
      console.error("Failed to fetch reports", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports(true)
    // Auto-poll every 10 seconds for new incoming mobile reports
    const interval = setInterval(() => {
      fetchReports(false)
    }, 10000)
    return () => clearInterval(interval)
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
          r.department_name.toLowerCase().includes(q) ||
          r.aanaa.toLowerCase().includes(q) ||
          r.kuta_magaalaa.toLowerCase().includes(q)
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
          <h2 style={{ color: '#e2e8f0', fontSize: 24, fontWeight: 800, margin: '0 0 4px' }}>
            {role === 'city_admin' ? '📋 All System Reports' : `📋 ${departmentName} Reports`}
          </h2>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
            Manage and track citizen incidents • <span style={{ color: '#10b981', fontWeight: 600 }}>{filteredReports.length} reports</span>
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
          padding: '10px 14px', border: '1px solid rgba(148,163,184,0.08)',
          flex: '1 1 250px',
        }}>
          <Search size={16} color="#6366f1" />
          <input
            type="text"
            placeholder="Search cases, descriptions, locations..."
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
                <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.08)', background: 'rgba(15,23,42,0.3)' }}>
                  <th style={thStyle}>Case</th>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Department</th>
                  <th style={thStyle}>Location</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Priority</th>
                  <th style={thStyle}>Date & Time</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map(report => {
                  const date = new Date(report.created_at)
                  return (
                  <tr
                    key={report.id}
                    style={{ borderBottom: '1px solid rgba(148,163,184,0.04)', transition: 'background 0.2s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => setSelectedReport(report)}
                  >
                    <td style={{ ...tdStyle, color: '#a5b4fc', fontWeight: 700 }}>{report.case_number}</td>
                    <td style={{ ...tdStyle, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {report.description}
                    </td>
                    <td style={{ ...tdStyle, color: '#94a3b8' }}>{report.department_name}</td>
                    <td style={{ ...tdStyle, color: '#94a3b8', fontSize: 12 }}>
                      {[report.kuta_magaalaa, report.aanaa].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                        background: `${STATUS_COLORS[report.status] || '#6366f1'}18`,
                        color: STATUS_COLORS[report.status] || '#6366f1',
                        border: `1px solid ${STATUS_COLORS[report.status] || '#6366f1'}25`,
                      }}>
                        {STATUS_LABELS[report.status] || report.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                        background: `${PRIORITY_COLORS[report.priority] || '#6b7280'}18`,
                        color: PRIORITY_COLORS[report.priority] || '#6b7280',
                        border: `1px solid ${PRIORITY_COLORS[report.priority] || '#6b7280'}25`,
                      }}>
                        {report.priority}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: '#94a3b8', fontSize: 12 }}>
                      <div>{date.toLocaleDateString()}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>{date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/reports/${report.id}`) }}
                        style={{
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
                        border: '1px solid rgba(99,102,241,0.2)',
                        color: '#a5b4fc', padding: '8px 14px', borderRadius: 8,
                        cursor: 'pointer', fontSize: 12, fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.25)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Detail Modal */}
      {selectedReport && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24,
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #1e293b, #0f172a)', border: '1px solid rgba(148,163,184,0.12)',
            borderRadius: 20, width: '100%', maxWidth: 650, maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid rgba(148,163,184,0.1)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(99,102,241,0.05)',
            }}>
              <div>
                <h3 style={{ color: '#a5b4fc', margin: 0, fontSize: 20, fontWeight: 800 }}>{selectedReport.case_number}</h3>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <span style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: `${STATUS_COLORS[selectedReport.status]}20`, color: STATUS_COLORS[selectedReport.status],
                  }}>{STATUS_LABELS[selectedReport.status] || selectedReport.status}</span>
                  <span style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: `${PRIORITY_COLORS[selectedReport.priority]}20`, color: PRIORITY_COLORS[selectedReport.priority],
                  }}>{selectedReport.priority}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                  color: '#ef4444', cursor: 'pointer', borderRadius: 8, padding: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 24, color: '#e2e8f0' }}>
              {/* Description */}
              <div style={{ marginBottom: 20, padding: 16, background: 'rgba(15,23,42,0.5)', borderRadius: 12 }}>
                <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>📝 Description</div>
                <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>{selectedReport.description}</p>
              </div>

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <InfoRow icon={<User size={14} color="#f59e0b" />} label="Citizen" value={selectedReport.citizen_name} />
                {selectedReport.citizen_phone && (
                  <InfoRow icon={<Phone size={14} color="#10b981" />} label="Phone" value={selectedReport.citizen_phone} />
                )}
                <InfoRow icon={<Building2 size={14} color="#6366f1" />} label="Department" value={selectedReport.department_name} />
                <InfoRow icon={<Tag size={14} color="#8b5cf6" />} label="Category" value={selectedReport.category_name} />
                <InfoRow icon={<Calendar size={14} color="#3b82f6" />} label="Date" value={new Date(selectedReport.created_at).toLocaleDateString()} />
                <InfoRow icon={<Clock size={14} color="#64748b" />} label="Time" value={new Date(selectedReport.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} />
              </div>

              {/* Location Details */}
              <div style={{
                padding: 16, borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(59,130,246,0.04))',
                border: '1px solid rgba(16,185,129,0.12)', marginBottom: 20,
              }}>
                <div style={{ color: '#10b981', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>📍 Location Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ color: '#64748b', fontSize: 10, fontWeight: 600 }}>Aanaa</div>
                    <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, marginTop: 2 }}>{selectedReport.aanaa || '—'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontSize: 10, fontWeight: 600 }}>Kuta Magaalaa</div>
                    <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, marginTop: 2 }}>{selectedReport.kuta_magaalaa || '—'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontSize: 10, fontWeight: 600 }}>Iddoo Addaa</div>
                    <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, marginTop: 2 }}>{selectedReport.iddoo_addaa || '—'}</div>
                  </div>
                </div>
                <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
                  📌 {selectedReport.latitude?.toFixed(6)}°N, {selectedReport.longitude?.toFixed(6)}°E
                </div>

                {/* Google Maps buttons */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <a
                    href={`https://www.google.com/maps?q=${selectedReport.latitude},${selectedReport.longitude}&z=17`}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: 8,
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white', textDecoration: 'none', fontSize: 12, fontWeight: 700,
                      transition: 'all 0.2s',
                    }}
                  >
                    <ExternalLink size={13} /> View Map
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedReport.latitude},${selectedReport.longitude}&travelmode=driving`}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: 8,
                      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      color: 'white', textDecoration: 'none', fontSize: 12, fontWeight: 700,
                      transition: 'all 0.2s',
                    }}
                  >
                    <Navigation size={13} /> Directions
                  </a>
                </div>
              </div>

              {/* View Full Details Button */}
              <button
                onClick={() => { setSelectedReport(null); navigate(`/reports/${selectedReport.id}`) }}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.3s', boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 25px rgba(99,102,241,0.5)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 15px rgba(99,102,241,0.3)'}
              >
                Open Full Report Details →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 10,
      background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(148,163,184,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        {icon}
        <span style={{ color: '#64748b', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{value}</div>
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '14px 16px', color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }
const tdStyle: React.CSSProperties = { padding: '14px 16px', color: '#e2e8f0', fontSize: 13, fontWeight: 500 }

function FilterSelect({ value, onChange, options }: { value: string, onChange: (v: string) => void, options: { value: string, label: string }[] }) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          appearance: 'none',
          background: 'rgba(15,23,42,0.4)', borderRadius: 10,
          border: '1px solid rgba(148,163,184,0.1)',
          color: '#e2e8f0', fontSize: 13, fontWeight: 600,
          padding: '10px 36px 10px 14px', outline: 'none', cursor: 'pointer',
        }}
      >
        {options.map(o => <option key={o.value} value={o.value} style={{ background: '#1e293b' }}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  )
}
