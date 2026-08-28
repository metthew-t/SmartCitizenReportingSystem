import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { Activity, CheckCircle, AlertTriangle, Clock, TrendingUp, BarChart3, ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

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
            opacity: 0.7 + (d.value / max) * 0.3, transition: 'height 0.5s ease',
          }} />
          <span style={{ fontSize: 9, color: '#64748b', marginTop: 4 }}>{d.label}</span>
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
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>
        <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ height: 6, background: 'rgba(148,163,184,0.1)', borderRadius: 3, overflow: 'hidden' }}>
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
      background: `linear-gradient(135deg, rgba(30,41,59,0.9) 0%, ${color}10 100%)`,
      backdropFilter: 'blur(12px)', border: `1px solid ${color}30`,
      boxShadow: `0 4px 20px ${color}15`, borderRadius: 16, padding: 20,
      display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.3s',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14, background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 4px', fontWeight: 500 }}>{title}</p>
        <p style={{ color: '#e2e8f0', fontSize: 24, fontWeight: 700, margin: 0 }}>{value}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { departmentName, token } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

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
    fetchStats()
  }, [token])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b' }}>
        Loading dashboard...
      </div>
    )
  }

  const total = stats?.total || 0
  const resolved = stats?.resolved || 0
  const pending = stats?.pending || 0
  const critical = stats?.critical || 0

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>
          {departmentName ? `${departmentName} Dashboard` : 'Dashboard'}
        </h2>
        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
          Real-time overview of citizen reports
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard title="Total Reports" value={total} icon={Activity} color="#6366f1" />
        <StatCard title="Resolved" value={resolved} icon={CheckCircle} color="#10b981" />
        <StatCard title="Pending" value={pending} icon={Clock} color="#f59e0b" />
        <StatCard title="Critical" value={critical} icon={AlertTriangle} color="#ef4444" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Weekly trend */}
        <div style={{
          background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16, padding: 20,
        }}>
          <h3 style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={16} color="#6366f1" /> Weekly Report Trend
          </h3>
          <MiniBarChart
            data={(stats?.weekly_trend || []).map(w => ({ label: w.label, value: w.count }))}
            color="#6366f1"
          />
        </div>

        {/* Status distribution */}
        <div style={{
          background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16, padding: 20,
        }}>
          <h3 style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={16} color="#8b5cf6" /> Reports by Status
          </h3>
          {stats && Object.entries(stats.status_distribution).map(([s, count]) => (
            <ProgressBar key={s} label={STATUS_LABELS[s] || s} value={count} total={total} color={STATUS_COLORS[s] || '#6366f1'} />
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Priority */}
        <div style={{
          background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16, padding: 20,
        }}>
          <h3 style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, margin: '0 0 16px' }}>Priority Breakdown</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {stats && Object.entries(stats.priority_distribution).map(([p, count]) => (
              <div key={p} style={{
                padding: 14, borderRadius: 12,
                background: `${PRIORITY_COLORS[p]}10`, border: `1px solid ${PRIORITY_COLORS[p]}20`,
                textAlign: 'center',
              }}>
                <div style={{ color: PRIORITY_COLORS[p], fontSize: 22, fontWeight: 700 }}>{count}</div>
                <div style={{ color: '#94a3b8', fontSize: 11, textTransform: 'capitalize', marginTop: 2 }}>{p.toLowerCase()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent reports */}
        <div style={{
          background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16, padding: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, margin: 0 }}>Recent Reports</h3>
            <button onClick={() => navigate('/reports')} style={{
              background: 'none', border: 'none', color: '#818cf8', fontSize: 12, cursor: 'pointer', fontWeight: 500,
            }}>View all →</button>
          </div>
          {(!stats?.recent_reports || stats.recent_reports.length === 0) ? (
            <p style={{ color: '#64748b', fontSize: 13 }}>No reports yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.recent_reports.map(report => (
                <div key={report.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 10,
                  background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(148,163,184,0.06)',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[report.status] || '#6366f1', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {report.case_number} — {report.description}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>
                      {report.department_name}
                    </div>
                  </div>
                  <span style={{
                    padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                    background: `${PRIORITY_COLORS[report.priority]}15`, color: PRIORITY_COLORS[report.priority], flexShrink: 0,
                  }}>{report.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resolution rate */}
        {stats && stats.total > 0 && (
          <div style={{
            padding: 20, borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(99,102,241,0.15) 100%)',
            border: '1px solid rgba(16,185,129,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ color: '#10b981', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>Resolution Rate</p>
              <p style={{ color: '#94a3b8', fontSize: 11, margin: 0 }}>
                {resolved + (stats.closed || 0)} of {total} reports resolved or closed
              </p>
            </div>
            <div style={{
              fontSize: 32, fontWeight: 800,
              background: 'linear-gradient(135deg, #10b981, #6366f1)',
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
