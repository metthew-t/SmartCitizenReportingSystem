import React, { useState, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import {
  getReportsForDepartment, DEMO_REPORTS, STATUS_COLORS, STATUS_LABELS,
  PRIORITY_COLORS, CATEGORIES, DEPARTMENTS, DemoReport,
} from '../store/demoData'
import { Search, Filter, ChevronDown, Eye, MapPin, Clock } from 'lucide-react'

export default function Reports() {
  const { department } = useAuthStore()
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL')
  const [deptFilter, setDeptFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReport, setSelectedReport] = useState<DemoReport | null>(null)

  // Get reports for current department
  const allReports = useMemo(() => {
    const reports = department
      ? getReportsForDepartment(department.id)
      : DEMO_REPORTS
    return reports.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [department])

  // Apply filters
  const filteredReports = useMemo(() => {
    return allReports.filter(r => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
      if (priorityFilter !== 'ALL' && r.priority !== priorityFilter) return false
      if (deptFilter !== 'ALL' && r.departmentId !== Number(deptFilter)) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          r.caseNumber.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.citizenName.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [allReports, statusFilter, priorityFilter, deptFilter, searchQuery])

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>
            Reports
          </h2>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
            {department ? `${department.icon} ${department.nameEn}` : 'All Departments'} — {filteredReports.length} reports
          </p>
        </div>
      </div>

      {/* Filters bar */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap',
        padding: 16, borderRadius: 14,
        background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(148,163,184,0.08)',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search case number, description, citizen..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px 8px 36px', borderRadius: 10,
              border: '1px solid rgba(148,163,184,0.12)', background: 'rgba(15,23,42,0.5)',
              color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 14px', borderRadius: 10,
            border: '1px solid rgba(148,163,184,0.12)', background: 'rgba(15,23,42,0.5)',
            color: 'white', fontSize: 13, outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="ALL">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {/* Priority filter */}
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          style={{
            padding: '8px 14px', borderRadius: 10,
            border: '1px solid rgba(148,163,184,0.12)', background: 'rgba(15,23,42,0.5)',
            color: 'white', fontSize: 13, outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="ALL">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>

        {/* Department filter */}
        {!department && (
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            style={{
              padding: '8px 14px', borderRadius: 10,
              border: '1px solid rgba(148,163,184,0.12)', background: 'rgba(15,23,42,0.5)',
              color: 'white', fontSize: 13, outline: 'none', cursor: 'pointer',
              maxWidth: 220,
            }}
          >
            <option value="ALL">All Departments</option>
            {DEPARTMENTS.map(d => (
              <option key={d.id} value={d.id}>{d.nameEn}</option>
            ))}
          </select>
        )}
      </div>

      {/* Reports table */}
      <div style={{
        background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16,
        overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '110px 1fr 130px 100px 80px 120px',
          padding: '12px 20px',
          borderBottom: '1px solid rgba(148,163,184,0.08)',
          background: 'rgba(15,23,42,0.3)',
        }}>
          {['Case #', 'Description', 'Citizen', 'Status', 'Priority', 'Date'].map(h => (
            <div key={h} style={{ color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {h}
            </div>
          ))}
        </div>

        {/* Table rows */}
        <div style={{ maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
          {filteredReports.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              No reports match your filters.
            </div>
          ) : (
            filteredReports.map(report => (
              <div
                key={report.id}
                onClick={() => setSelectedReport(report)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '110px 1fr 130px 100px 80px 120px',
                  padding: '14px 20px',
                  borderBottom: '1px solid rgba(148,163,184,0.04)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  alignItems: 'center',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Case number */}
                <div style={{ color: '#818cf8', fontSize: 12, fontWeight: 600 }}>
                  {report.caseNumber}
                </div>

                {/* Description */}
                <div style={{
                  color: '#e2e8f0', fontSize: 12,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  paddingRight: 16,
                }}>
                  {report.description}
                </div>

                {/* Citizen */}
                <div style={{ color: '#94a3b8', fontSize: 12 }}>
                  {report.isAnonymous ? (
                    <span style={{ fontStyle: 'italic', color: '#64748b' }}>Anonymous</span>
                  ) : report.citizenName}
                </div>

                {/* Status badge */}
                <div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 10px', borderRadius: 20,
                    fontSize: 10, fontWeight: 600,
                    background: `${STATUS_COLORS[report.status]}15`,
                    color: STATUS_COLORS[report.status],
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: STATUS_COLORS[report.status],
                    }} />
                    {STATUS_LABELS[report.status]?.split(' ')[0]}
                  </span>
                </div>

                {/* Priority */}
                <div>
                  <span style={{
                    padding: '3px 8px', borderRadius: 6,
                    fontSize: 10, fontWeight: 600,
                    background: `${PRIORITY_COLORS[report.priority]}12`,
                    color: PRIORITY_COLORS[report.priority],
                  }}>
                    {report.priority}
                  </span>
                </div>

                {/* Date */}
                <div style={{ color: '#64748b', fontSize: 11 }}>
                  {formatDate(report.createdAt)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Report detail modal */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  )
}

// Report detail modal
function ReportDetailModal({ report, onClose }: { report: DemoReport; onClose: () => void }) {
  const dept = DEPARTMENTS.find(d => d.id === report.departmentId)
  const cat = CATEGORIES.find(c => c.id === report.categoryId)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1e293b', borderRadius: 20,
          border: '1px solid rgba(148,163,184,0.1)',
          maxWidth: 560, width: '100%', padding: 28,
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h3 style={{ color: '#818cf8', fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>
              {report.caseNumber}
            </h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: `${STATUS_COLORS[report.status]}15`, color: STATUS_COLORS[report.status],
              }}>
                {STATUS_LABELS[report.status]}
              </span>
              <span style={{
                padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: `${PRIORITY_COLORS[report.priority]}12`, color: PRIORITY_COLORS[report.priority],
              }}>
                {report.priority}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(148,163,184,0.1)', border: 'none', borderRadius: 8,
            color: '#94a3b8', cursor: 'pointer', padding: '6px 10px', fontSize: 14,
          }}>✕</button>
        </div>

        {/* Description */}
        <div style={{
          padding: 16, borderRadius: 12,
          background: 'rgba(15,23,42,0.5)', marginBottom: 20,
        }}>
          <p style={{ color: '#e2e8f0', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            {report.description}
          </p>
        </div>

        {/* Details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <DetailItem icon={<Clock size={14} />} label="Submitted" value={formatDate(report.createdAt)} />
          <DetailItem icon="👤" label="Citizen" value={report.isAnonymous ? 'Anonymous' : report.citizenName} />
          <DetailItem icon={<MapPin size={14} />} label="Location" value={`${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`} />
          <DetailItem icon={dept?.icon || '🏛️'} label="Department" value={dept?.nameEn || 'Unassigned'} />
          <DetailItem icon="📂" label="Category" value={cat?.nameEn || 'General'} />
          <DetailItem icon="🆔" label="Case #" value={report.caseNumber} />
        </div>

        {/* Status workflow */}
        <div style={{ marginTop: 20 }}>
          <h4 style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
            Report Workflow
          </h4>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {['SUBMITTED', 'RECEIVED', 'ASSIGNED', 'UNDER_INVESTIGATION', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(status => {
              const isActive = status === report.status
              const isPast = ['SUBMITTED', 'RECEIVED', 'ASSIGNED', 'UNDER_INVESTIGATION', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
                .indexOf(status) <= ['SUBMITTED', 'RECEIVED', 'ASSIGNED', 'UNDER_INVESTIGATION', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
                .indexOf(report.status)
              return (
                <div key={status} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 10,
                  fontWeight: isActive ? 700 : 400,
                  background: isActive ? `${STATUS_COLORS[status]}20` : isPast ? 'rgba(148,163,184,0.08)' : 'transparent',
                  color: isActive ? STATUS_COLORS[status] : isPast ? '#94a3b8' : '#475569',
                  border: `1px solid ${isActive ? STATUS_COLORS[status] + '40' : 'rgba(148,163,184,0.06)'}`,
                }}>
                  {STATUS_LABELS[status]?.split(' ')[0]}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailItem({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div style={{
      padding: 12, borderRadius: 10,
      background: 'rgba(15,23,42,0.3)',
      border: '1px solid rgba(148,163,184,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>{typeof icon === 'string' ? icon : icon}</span>
        <span style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 500 }}>{value}</div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}
