import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { Activity, CheckCircle, AlertTriangle, Clock, TrendingUp, BarChart3, ScrollText, ArrowRight, ShieldAlert, ShieldCheck, Users, Building2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Colors, darkCard, darkCardElevated, statusBadgeStyle, priorityBadgeStyle, getStatusColors, getPriorityColor, Styles, statusLabel } from '../theme'

const API = 'https://smartcitizenreportingsystem.onrender.com/api/v1'

// Use theme tokens — matches mobile exactly
const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: '#3B82F6', RECEIVED: '#3B82F6', ASSIGNED: '#F59E0B',
  UNDER_INVESTIGATION: '#F59E0B', IN_PROGRESS: '#8B5CF6',
  RESOLVED: '#10B981', CLOSED: '#64748B', REOPENED: '#EC4899', REJECTED: '#EF4444',
}
const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted', RECEIVED: 'Received', ASSIGNED: 'Assigned',
  UNDER_INVESTIGATION: 'Under Investigation', IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved', CLOSED: 'Closed', REOPENED: 'Reopened', REJECTED: 'Rejected',
}
const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#94A3B8', MEDIUM: '#3B82F6', HIGH: '#F59E0B', CRITICAL: '#DC2626',
}

interface Stats {
  total: number; resolved: number; closed: number; pending: number; critical: number
  resolution_rate: number
  status_distribution: Record<string, number>
  priority_distribution: Record<string, number>
  weekly_trend: { label: string; count: number }[]
  recent_reports: { id: number; case_number: string; description: string; status: string; priority: string; department_name: string; created_at: string }[]
}

function MiniBarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <div style={{
            width: '100%', maxWidth: 28,
            height: Math.max(4, (d.value / max) * 50),
            background: color, borderRadius: '4px 4px 0 0',
            opacity: 0.6 + (d.value / max) * 0.4, transition: 'height 0.5s ease',
          }} />
          <span style={{ fontSize: 9, color: Colors.textDark3, marginTop: 4 }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function ProgressBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: Colors.textDark2 }}>{label}</span>
        <span style={{ fontSize: 12, color: Colors.textDark1, fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: {
  title: string; value: string | number; icon: any; color: string
}) {
  return (
    <div style={{
      ...darkCard,
      borderLeft: `3px solid ${color}`,
      padding: 20,
      display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.2s',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, background: `${color}15`,
        border: `1px solid ${color}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <p style={{ color: Colors.textDark2, fontSize: 12, margin: '0 0 4px', fontWeight: 500 }}>{title}</p>
        <p style={{ color: Colors.textDark1, fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>{value}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { departmentName, token, role } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingOfficialCount, setPendingOfficialCount] = useState<number>(0)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API}/stats/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          setStats(await res.json())
        }
      } catch (err) {
        console.error('Failed to fetch stats', err)
      } finally {
        setLoading(false)
      }
    }

    const fetchOfficialReports = async () => {
      if (role !== 'department_manager' && role !== 'city_admin') return
      try {
        const res = await fetch(`${API}/official-reports/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const list: any[] = await res.json()
          const items = Array.isArray(list) ? list : (list as any).results || []
          if (role === 'department_manager') {
            const count = items.filter((r: any) => r.level === 'OFFICER_TO_MANAGER' && (r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW')).length
            setPendingOfficialCount(count)
          } else if (role === 'city_admin') {
            const count = items.filter((r: any) => r.level === 'MANAGER_TO_ADMIN' && (r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW')).length
            setPendingOfficialCount(count)
          }
        }
      } catch {}
    }

    fetchStats()
    fetchOfficialReports()
    const interval = setInterval(() => {
      fetchStats()
      fetchOfficialReports()
    }, 15000)
    return () => clearInterval(interval)
  }, [token, role])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: Colors.textDark2 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: `3px solid ${Colors.govBlue}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>Loading dashboard...</span>
        </div>
      </div>
    )
  }

  const total = stats?.total || 0
  const resolved = stats?.resolved || 0
  const pending = stats?.pending || 0
  const critical = stats?.critical || 0

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: Colors.textDark1 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: Colors.textDark1, fontSize: 22, fontWeight: 800, margin: '0 0 4px', letterSpacing: -0.3 }}>
          {role === 'super_admin'
            ? '🛡️ System Governance & Security Dashboard'
            : role === 'city_admin'
            ? '🏛️ City Operations Administration Dashboard'
            : departmentName
            ? `${departmentName} Sector Command Dashboard`
            : 'Dashboard'}
        </h2>
        <p style={{ color: Colors.textDark2, fontSize: 13, margin: 0 }}>
          {role === 'super_admin'
            ? 'Root system security oversight, cryptographic audit logs & administrator governance'
            : role === 'city_admin'
            ? 'Real-time overview of citizen complaints, sector assignments & municipal operations'
            : 'Real-time overview of citizen reports and field operations'}
        </p>
      </div>

      {/* Super Admin Exclusive Governance & Administrator Control Panel */}
      {role === 'super_admin' && (
        <div style={{
          marginBottom: 24, padding: 18, borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(217,119,6,0.03) 100%)',
          border: '1px solid rgba(245,158,11,0.35)',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: 'rgba(245,158,11,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ShieldCheck size={24} color="#D97706" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#92400E' }}>Administrator Governance</div>
              <div style={{ fontSize: 11, color: '#B45309' }}>Exclusive authority to manage & audit City Admins</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/users')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8, background: '#D97706', color: 'white',
                border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(217,119,6,0.25)'
              }}
            >
              <Users size={14} /> Manage City Admins
            </button>
            <button
              onClick={() => navigate('/audit-logs')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8, background: '#0F172A', color: '#FCD34D',
                border: '1px solid rgba(245,158,11,0.4)', fontWeight: 700, fontSize: 12, cursor: 'pointer'
              }}
            >
              <ShieldAlert size={14} /> Cryptographic Audit Logs
            </button>
          </div>
        </div>
      )}

      {/* Operational Official Reports Pending Action Alert Banner */}
      {pendingOfficialCount > 0 && (
        <div style={{
          marginBottom: 20, padding: '14px 18px', borderRadius: 12,
          background: `linear-gradient(135deg, ${Colors.govBlue}18 0%, ${Colors.navy}30 100%)`,
          border: `1px solid ${Colors.govBlue}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: `${Colors.govBlue}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ScrollText size={20} color={Colors.govBlue} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                {role === 'department_manager'
                  ? `${pendingOfficialCount} Officer Field Report${pendingOfficialCount > 1 ? 's' : ''} Awaiting Review`
                  : `${pendingOfficialCount} Department Executive Report${pendingOfficialCount > 1 ? 's' : ''} Awaiting Review`}
              </div>
              <div style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>
                {role === 'department_manager'
                  ? 'Field officers from your sector have submitted investigation dossiers for your evaluation.'
                  : 'Executive departmental briefs from sector directors have been submitted for city administration oversight.'}
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/official-reports')}
            style={{ ...Styles.btnPrimary, height: 38, padding: '0 16px', fontSize: 13 }}
          >
            Review in Official Reports <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard title="Total Reports" value={total} icon={Activity} color={Colors.govBlue} />
        <StatCard title="Resolved" value={resolved} icon={CheckCircle} color={Colors.emeraldLight} />
        <StatCard title="Pending" value={pending} icon={Clock} color="#F59E0B" />
        <StatCard title="Critical" value={critical} icon={AlertTriangle} color="#EF4444" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Weekly trend */}
        <div style={{ ...darkCard, padding: 20 }}>
          <h3 style={{ color: Colors.textDark1, fontSize: 14, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={16} color={Colors.govBlue} /> Weekly Report Trend
          </h3>
          <MiniBarChart
            data={(stats?.weekly_trend || []).map(w => ({ label: w.label, value: w.count }))}
            color={Colors.govBlue}
          />
        </div>

        {/* Status distribution */}
        <div style={{ ...darkCard, padding: 20 }}>
          <h3 style={{ color: Colors.textDark1, fontSize: 14, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={16} color={Colors.teal} /> Reports by Status
          </h3>
          {stats && Object.entries(stats.status_distribution).map(([s, count]) => (
            <ProgressBar key={s} label={STATUS_LABELS[s] || s} value={count} total={total} color={STATUS_COLORS[s] || Colors.govBlue} />
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Priority */}
        <div style={{ ...darkCard, padding: 20 }}>
          <h3 style={{ color: Colors.textDark1, fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>Priority Breakdown</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {stats && Object.entries(stats.priority_distribution).map(([p, count]) => (
              <div key={p} style={{
                padding: 14, borderRadius: 12,
                background: `${PRIORITY_COLORS[p]}12`, border: `1px solid ${PRIORITY_COLORS[p]}25`,
                textAlign: 'center',
              }}>
                <div style={{ color: PRIORITY_COLORS[p], fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>{count}</div>
                <div style={{ color: Colors.textDark2, fontSize: 11, textTransform: 'capitalize', marginTop: 3, fontWeight: 600 }}>{p.toLowerCase()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent reports */}
        <div style={{ ...darkCard, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: Colors.textDark1, fontSize: 14, fontWeight: 700, margin: 0 }}>Recent Reports</h3>
            <button onClick={() => navigate('/reports')} style={{ background: 'none', border: 'none', color: Colors.govBlue, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>View all →</button>
          </div>
          {(!stats?.recent_reports || stats.recent_reports.length === 0) ? (
            <p style={{ color: Colors.textDark2, fontSize: 13 }}>No reports yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.recent_reports.map(report => (
                <div key={report.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.03)', border: `1px solid ${Colors.borderDark}`,
                  cursor: 'pointer', transition: 'background 0.2s',
                }}
                onClick={() => navigate(`/reports/${report.id}`)}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(29,112,184,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[report.status] || Colors.govBlue, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: Colors.textDark1, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {report.case_number} — {report.description}
                    </div>
                    <div style={{ color: Colors.textDark3, fontSize: 10, marginTop: 2 }}>
                      {report.department_name}
                    </div>
                  </div>
                  <span style={{ ...priorityBadgeStyle(report.priority), flexShrink: 0 }}>{report.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resolution rate */}
        {stats && stats.total > 0 && (
          <div style={{
            ...darkCardElevated,
            padding: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ color: Colors.emeraldLight, fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>Resolution Rate</p>
              <p style={{ color: Colors.textDark2, fontSize: 11, margin: 0 }}>
                {resolved + (stats.closed || 0)} of {total} reports resolved or closed
              </p>
            </div>
            <div style={{
              fontSize: 36, fontWeight: 800, letterSpacing: -1,
              background: `linear-gradient(135deg, ${Colors.emeraldLight}, ${Colors.govBlue})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {stats.resolution_rate}%
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
