import React, { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import {
  ShieldAlert, Search, Filter, RefreshCw, Download, Eye,
  Calendar, Clock, User, ShieldCheck, FileText, CheckCircle2,
  AlertTriangle, ArrowUpRight, Crown, Building2, Key, Terminal,
  SlidersHorizontal, X, FileSpreadsheet, Lock
} from 'lucide-react'

const API = 'https://smartcitizenreportingsystem.onrender.com/api/v1'

export interface AuditRecord {
  id: number
  user_id?: number | null
  user: string
  actor_name: string
  actor_email: string
  actor_role: string
  action: string
  entity_type: string
  entity_id: string
  changes: Record<string, any>
  ip_address: string
  timestamp: string
}

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  super_admin: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  mayor: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  city_admin: { bg: 'rgba(99, 102, 241, 0.15)', text: '#93c5fd', border: 'rgba(99, 102, 241, 0.3)' },
  department_manager: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
  officer: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  citizen: { bg: 'rgba(148, 163, 184, 0.12)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.2)' },
  system: { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
}

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  USER_CREATED: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399' },
  USER_UPDATED: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' },
  USER_DELETED: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' },
  PASSWORD_RESET: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' },
  MAYOR_DIRECTIVE_PROMULGATED: { bg: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b' },
  OFFICIAL_REPORT_SUBMITTED: { bg: 'rgba(99, 102, 241, 0.15)', text: '#93c5fd' },
  OFFICIAL_REPORT_APPROVED: { bg: 'rgba(16, 185, 129, 0.2)', text: '#10b981' },
  OFFICIAL_REPORT_REJECTED: { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' },
  REPORT_STATUS_RESOLVED: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' },
  REPORT_STATUS_IN_PROGRESS: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
  REPORT_STATUS_REJECTED: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
}

export default function AuditLogs() {
  const { token, role } = useAuthStore()
  const [logs, setLogs] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState('ALL')
  const [selectedEntity, setSelectedEntity] = useState('ALL')
  const [selectedActionCat, setSelectedActionCat] = useState('ALL')
  const [inspectRecord, setInspectRecord] = useState<AuditRecord | null>(null)

  const isAuthorized = role === 'super_admin' || role === 'city_admin'

  const fetchLogs = async () => {
    try {
      setRefreshing(true)
      const res = await fetch(`${API}/analytics/audit-logs/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setLogs(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    const timer = setInterval(fetchLogs, 20000)
    return () => clearInterval(timer)
  }, [token])

  // Computed summary counts
  const stats = useMemo(() => {
    const total = logs.length
    const criticalOps = logs.filter(
      l =>
        l.action.includes('DELETE') ||
        l.action.includes('RESET') ||
        l.action.includes('PROMULGATED') ||
        l.action.includes('REJECTED') ||
        l.action.includes('SUPER_ADMIN')
    ).length
    const actors = new Set(logs.map(l => l.actor_name || l.user)).size
    const today = new Date().toISOString().slice(0, 10)
    const todayCount = logs.filter(l => l.timestamp.slice(0, 10) === today).length
    return { total, criticalOps, actors, todayCount }
  }, [logs])

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (selectedRole !== 'ALL' && log.actor_role !== selectedRole) return false
      if (selectedEntity !== 'ALL' && log.entity_type !== selectedEntity) return false

      if (selectedActionCat !== 'ALL') {
        if (selectedActionCat === 'USER' && !log.action.includes('USER') && !log.action.includes('PASSWORD')) return false
        if (selectedActionCat === 'REPORT' && !log.action.includes('REPORT') && !log.action.includes('STATUS')) return false
        if (selectedActionCat === 'DIRECTIVE' && !log.action.includes('DIRECTIVE')) return false
        if (selectedActionCat === 'OFFICIAL' && !log.action.includes('OFFICIAL')) return false
      }

      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = log.actor_name?.toLowerCase().includes(q)
        const matchUser = log.user?.toLowerCase().includes(q)
        const matchEmail = log.actor_email?.toLowerCase().includes(q)
        const matchAction = log.action?.toLowerCase().includes(q)
        const matchEntity = log.entity_id?.toLowerCase().includes(q)
        const matchIp = log.ip_address?.toLowerCase().includes(q)
        if (!matchName && !matchUser && !matchEmail && !matchAction && !matchEntity && !matchIp) {
          return false
        }
      }
      return true
    })
  }, [logs, selectedRole, selectedEntity, selectedActionCat, search])

  // Export to CSV / Excel
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return
    const headers = [
      'Log ID', 'Timestamp', 'Actor Name', 'Actor Role', 'Actor User',
      'Action Taken', 'Entity Type', 'Entity ID', 'IP Address', 'Details'
    ]
    const rows = filteredLogs.map(l => [
      l.id,
      new Date(l.timestamp).toLocaleString(),
      `"${(l.actor_name || '').replace(/"/g, '""')}"`,
      l.actor_role,
      l.user,
      l.action,
      l.entity_type,
      `"${(l.entity_id || '').replace(/"/g, '""')}"`,
      l.ip_address,
      `"${JSON.stringify(l.changes || {}).replace(/"/g, '""')}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Adama_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!isAuthorized) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#ef4444' }}>
        <ShieldAlert size={48} style={{ marginBottom: 16 }} />
        <h2>Access Restricted</h2>
        <p style={{ color: '#475569' }}>
          System Audit Vault access is reserved exclusively for Super Administrators and City Administration.
        </p>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Page Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 24, flexWrap: 'wrap', gap: 16
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)'
            }}>
              <ShieldAlert size={20} color="white" />
            </div>
            <div>
              <h2 style={{ color: '#0F172A', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>
                System Audit Vault & Traceability
              </h2>
              <p style={{ color: '#475569', fontSize: 13, margin: '2px 0 0' }}>
                Immutable historical telemetry of all operations across all rules and actors
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={fetchLogs}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#FFFFFF', border: '1px solid #CBD5E1',
              color: '#475569', padding: '8px 14px', borderRadius: 10, fontSize: 12,
              fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none',
              color: 'white', padding: '8px 16px', borderRadius: 10, fontSize: 12,
              fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 10px rgba(16,185,129,0.3)',
            }}
          >
            <FileSpreadsheet size={14} />
            Export Audit Trail (Excel/CSV)
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 16, marginBottom: 24
      }}>
        <div style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', gap: 14
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: 'rgba(29,112,184,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Terminal size={20} color="#93c5fd" />
          </div>
          <div>
            <div style={{ color: '#475569', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Total Actions Logged</div>
            <div style={{ color: '#0F172A', fontSize: 22, fontWeight: 800 }}>{stats.total}</div>
          </div>
        </div>

        <div style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', gap: 14
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <AlertTriangle size={20} color="#ef4444" />
          </div>
          <div>
            <div style={{ color: '#475569', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Security & Critical Ops</div>
            <div style={{ color: '#ef4444', fontSize: 22, fontWeight: 800 }}>{stats.criticalOps}</div>
          </div>
        </div>

        <div style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', gap: 14
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: 'rgba(59,130,246,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <User size={20} color="#60a5fa" />
          </div>
          <div>
            <div style={{ color: '#475569', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Unique Active Actors</div>
            <div style={{ color: '#1D70B8', fontSize: 22, fontWeight: 800 }}>{stats.actors}</div>
          </div>
        </div>

        <div style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', gap: 14
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Clock size={20} color="#34d399" />
          </div>
          <div>
            <div style={{ color: '#475569', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Recorded Today</div>
            <div style={{ color: '#10b981', fontSize: 22, fontWeight: 800 }}>{stats.todayCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        marginBottom: 20
      }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <Search size={15} color="#64748b" style={{ position: 'absolute', left: 12, top: 11 }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by actor, action, case #, or IP..."
              style={{
                width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10,
                background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A', fontSize: 13, outline: 'none', boxSizing: 'border-box'
              }}
            />
            {search && (
              <X size={14} color="#94a3b8" style={{ position: 'absolute', right: 10, top: 11, cursor: 'pointer' }} onClick={() => setSearch('')} />
            )}
          </div>

          {/* Role Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#334155', fontSize: 12, fontWeight: 700 }}>Role:</span>
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A', fontSize: 12,
                outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="ALL">All Roles</option>
              <option value="super_admin">Super Administrator</option>
              <option value="mayor">Executive Mayor</option>
              <option value="city_admin">City Administrator</option>
              <option value="department_manager">Sector Director</option>
              <option value="officer">Field Officer</option>
              <option value="citizen">Citizen</option>
              <option value="system">System Core</option>
            </select>
          </div>

          {/* Action Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#334155', fontSize: 12, fontWeight: 700 }}>Category:</span>
            <select
              value={selectedActionCat}
              onChange={e => setSelectedActionCat(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A', fontSize: 12,
                outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="ALL">All Operations</option>
              <option value="USER">User Account Management</option>
              <option value="REPORT">Citizen Report Lifecycle</option>
              <option value="DIRECTIVE">Mayoral Directives</option>
              <option value="OFFICIAL">Official Government Dossiers</option>
            </select>
          </div>

          {/* Entity Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#334155', fontSize: 12, fontWeight: 700 }}>Entity:</span>
            <select
              value={selectedEntity}
              onChange={e => setSelectedEntity(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A', fontSize: 12,
                outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="ALL">All Entities</option>
              <option value="REPORT">Reports</option>
              <option value="USER">Users</option>
              <option value="OFFICIAL_REPORT">Official Reports</option>
              <option value="MAYOR_DIRECTIVE">Directives</option>
              <option value="DEPARTMENT">Departments</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Audit Records Table */}
      <div style={{
        background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <div>Synchronizing system audit logs...</div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748B' }}>
            <Lock size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>No audit records found matching your filters</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Try clearing search or filter terms to view more entries</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '14px 18px', color: '#64748B', fontWeight: 600 }}>Timestamp</th>
                  <th style={{ padding: '14px 18px', color: '#64748B', fontWeight: 600 }}>Actor</th>
                  <th style={{ padding: '14px 18px', color: '#64748B', fontWeight: 600 }}>Action</th>
                  <th style={{ padding: '14px 18px', color: '#64748B', fontWeight: 600 }}>Target Entity</th>
                  <th style={{ padding: '14px 18px', color: '#64748B', fontWeight: 600 }}>IP / Origin</th>
                  <th style={{ padding: '14px 18px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Inspection</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => {
                  const roleStyle = ROLE_COLORS[log.actor_role] || ROLE_COLORS.citizen
                  const actionStyle = ACTION_COLORS[log.action] || { bg: 'rgba(99,102,241,0.12)', text: '#93c5fd' }
                  const dateObj = new Date(log.timestamp)

                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Timestamp */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <div style={{ color: '#0F172A', fontWeight: 600, fontSize: 12 }}>
                          {dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div style={{ color: '#64748B', fontSize: 10, marginTop: 2 }}>
                          {Math.floor((Date.now() - dateObj.getTime()) / 60000) < 60
                            ? `${Math.floor((Date.now() - dateObj.getTime()) / 60000)}m ago`
                            : `${Math.floor((Date.now() - dateObj.getTime()) / 3600000)}h ago`}
                        </div>
                      </td>

                      {/* Actor */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                            background: roleStyle.bg, color: roleStyle.text, border: `1px solid ${roleStyle.border}`,
                            textTransform: 'uppercase'
                          }}>
                            {log.actor_role.replace('_', ' ')}
                          </span>
                          <div>
                            <div style={{ color: '#0F172A', fontWeight: 600 }}>{log.actor_name || log.user}</div>
                            {log.actor_email && (
                              <div style={{ color: '#64748B', fontSize: 11 }}>{log.actor_email}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                          background: actionStyle.bg, color: actionStyle.text,
                          fontFamily: 'monospace'
                        }}>
                          {log.action}
                        </span>
                        {log.changes?.note && (
                          <div style={{ color: '#475569', fontSize: 11, marginTop: 4, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.changes.note}
                          </div>
                        )}
                      </td>

                      {/* Target Entity */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                            background: '#F1F5F9', color: '#475569'
                          }}>
                            {log.entity_type}
                          </span>
                          <span style={{ color: '#0F172A', fontWeight: 600, fontFamily: 'monospace' }}>
                            {log.entity_id}
                          </span>
                        </div>
                      </td>

                      {/* IP / Origin */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ color: '#475569', fontSize: 12, fontFamily: 'monospace' }}>
                          {log.ip_address || '127.0.0.1'}
                        </div>
                        <div style={{ color: '#64748B', fontSize: 10 }}>Secure Gateway</div>
                      </td>

                      {/* Inspection Button */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button
                          onClick={() => setInspectRecord(log)}
                          style={{
                            padding: '6px 12px', borderRadius: 8,
                            background: 'rgba(29,112,184,0.1)', border: '1px solid rgba(29,112,184,0.25)',
                            color: '#1D70B8', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.25)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.12)'}
                        >
                          <Eye size={13} />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Detail Inspection Modal */}
      {inspectRecord && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
          backdropFilter: 'blur(4px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{
            width: '100%', maxWidth: 650, background: '#FFFFFF',
            border: '1px solid #E2E8F0', borderRadius: 20,
            overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid #E2E8F0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#F8FAFC'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={20} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                  Audit Evidence Dossier #{inspectRecord.id}
                </h3>
              </div>
              <button
                onClick={() => setInspectRecord(null)}
                style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: 24, maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
                marginBottom: 20, background: '#F8FAFC', padding: 16, borderRadius: 12,
                border: '1px solid #E2E8F0'
              }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Action Executed</div>
                  <div style={{ color: '#0F172A', fontWeight: 700, fontSize: 13, marginTop: 2, fontFamily: 'monospace' }}>
                    {inspectRecord.action}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Target Entity</div>
                  <div style={{ color: '#1D70B8', fontWeight: 700, fontSize: 13, marginTop: 2 }}>
                    {inspectRecord.entity_type} ({inspectRecord.entity_id})
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Actor Credentials</div>
                  <div style={{ color: '#0F172A', fontSize: 13, marginTop: 2, fontWeight: 600 }}>
                    {inspectRecord.actor_name} [{inspectRecord.actor_role}]
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Origin Network IP</div>
                  <div style={{ color: '#1D70B8', fontSize: 13, marginTop: 2, fontFamily: 'monospace' }}>
                    {inspectRecord.ip_address}
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Timestamp</div>
                  <div style={{ color: '#0F172A', fontSize: 13, marginTop: 2 }}>
                    {new Date(inspectRecord.timestamp).toLocaleString()} ({inspectRecord.timestamp})
                  </div>
                </div>
              </div>

              {/* Payload Changes JSON Block */}
              <div>
                <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Terminal size={14} color="#93c5fd" />
                  State Changes & Telemetry Payload (JSON)
                </div>
                <pre style={{
                  background: 'rgba(15,23,42,0.9)', padding: 16, borderRadius: 10,
                  border: '1px solid rgba(29,112,184,0.2)', color: '#34d399',
                  fontSize: 12, lineHeight: 1.6, overflowX: 'auto',
                  fontFamily: "Consolas, Monaco, 'Courier New', monospace"
                }}>
                  {JSON.stringify(inspectRecord.changes, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px', borderTop: '1px solid #E2E8F0',
              background: '#F8FAFC', display: 'flex', justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setInspectRecord(null)}
                style={{
                  padding: '8px 18px', borderRadius: 8, background: '#3b82f6',
                  color: 'white', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer'
                }}
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

