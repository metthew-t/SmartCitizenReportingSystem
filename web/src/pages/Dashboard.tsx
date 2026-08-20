import React from 'react'
import { useAuthStore } from '../store/authStore'
import {
  getDepartmentStats, getStatusDistribution, getPriorityDistribution,
  getWeeklyTrend, getCategoryDistribution, getReportsForDepartment,
  STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, CATEGORIES,
  DEPARTMENTS, getCityWideStats, DemoReport,
} from '../store/demoData'
import { Activity, CheckCircle, AlertTriangle, Clock, TrendingUp, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Mini bar chart component
function MiniBarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <div
            style={{
              width: '100%', maxWidth: 28,
              height: Math.max(4, (d.value / max) * 50),
              background: `${color}`,
              borderRadius: '4px 4px 0 0',
              opacity: 0.7 + (d.value / max) * 0.3,
              transition: 'height 0.5s ease',
            }}
          />
          <span style={{ fontSize: 9, color: '#64748b', marginTop: 4 }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// Horizontal progress bar
function ProgressBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>
        <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ height: 6, background: 'rgba(148,163,184,0.1)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: color,
          borderRadius: 3, transition: 'width 0.8s ease',
        }} />
      </div>
    </div>
  )
}

// Stat card
function StatCard({ title, value, icon: Icon, color, trend }: {
  title: string; value: string | number; icon: any; color: string; trend?: number
}) {
  return (
    <div style={{
      background: `linear-gradient(135deg, rgba(30,41,59,0.9) 0%, ${color}10 100%)`,
      backdropFilter: 'blur(12px)',
      border: `1px solid ${color}30`,
      boxShadow: `0 4px 20px ${color}15`,
      borderRadius: 16, padding: 20,
      display: 'flex', alignItems: 'center', gap: 16,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'default',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'translateY(-4px)'
      e.currentTarget.style.boxShadow = `0 10px 30px ${color}30`
      e.currentTarget.style.borderColor = `${color}60`
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = `0 4px 20px ${color}15`
      e.currentTarget.style.borderColor = `${color}30`
    }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={22} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 4px', fontWeight: 500 }}>{title}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <p style={{ color: '#e2e8f0', fontSize: 24, fontWeight: 700, margin: 0 }}>{value}</p>
          {trend !== undefined && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              fontSize: 11, fontWeight: 600,
              color: trend >= 0 ? '#10b981' : '#ef4444',
            }}>
              {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { department } = useAuthStore()
  const navigate = useNavigate()
  const deptId = department?.id

  // Get department-specific or city-wide stats
  const stats = deptId ? getDepartmentStats(deptId) : null
  const cityStats = getCityWideStats()
  const statusDist = getStatusDistribution(deptId)
  const priorityDist = getPriorityDistribution(deptId)
  const weeklyTrend = getWeeklyTrend(deptId)
  const categoryDist = getCategoryDistribution(deptId)
  const recentReports = (deptId ? getReportsForDepartment(deptId) : [])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const total = stats?.total || cityStats.total
  const resolved = stats?.resolved || cityStats.resolved
  const pending = stats?.pending || cityStats.pending
  const critical = stats?.critical || cityStats.critical

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Page title */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>
          {department ? `${department.icon} ${department.nameEn} Dashboard` : 'City Overview'}
        </h2>
        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
          {department ? department.name : 'All 33 departments'}
          {' — '}Real-time overview of citizen reports
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard title="Total Reports" value={total} icon={Activity} color="#6366f1" trend={12} />
        <StatCard title="Resolved" value={resolved} icon={CheckCircle} color="#10b981" trend={8} />
        <StatCard title="Pending" value={pending} icon={Clock} color="#f59e0b" trend={-3} />
        <StatCard title="Critical" value={critical} icon={AlertTriangle} color="#ef4444" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Weekly trend chart */}
        <div style={{
          background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16, padding: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} color="#6366f1" /> Weekly Report Trend
            </h3>
          </div>
          <MiniBarChart
            data={weeklyTrend.map(w => ({ label: w.label, value: w.count }))}
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
          {Object.entries(statusDist).map(([status, count]) => (
            <ProgressBar
              key={status}
              label={STATUS_LABELS[status] || status}
              value={count}
              total={total}
              color={STATUS_COLORS[status] || '#6366f1'}
            />
          ))}
        </div>
      </div>

      {/* Bottom row: Priority + Category + Recent Reports */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Priority breakdown */}
        <div style={{
          background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16, padding: 20,
        }}>
          <h3 style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, margin: '0 0 16px' }}>
            Priority Breakdown
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {Object.entries(priorityDist).map(([priority, count]) => (
              <div key={priority} style={{
                padding: 14, borderRadius: 12,
                background: `${PRIORITY_COLORS[priority]}10`,
                border: `1px solid ${PRIORITY_COLORS[priority]}20`,
                textAlign: 'center',
              }}>
                <div style={{ color: PRIORITY_COLORS[priority], fontSize: 22, fontWeight: 700 }}>{count}</div>
                <div style={{ color: '#94a3b8', fontSize: 11, textTransform: 'capitalize', marginTop: 2 }}>{priority.toLowerCase()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Category distribution */}
        <div style={{
          background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16, padding: 20,
        }}>
          <h3 style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, margin: '0 0 16px' }}>
            Reports by Category
          </h3>
          {categoryDist.map(cat => (
            <ProgressBar
              key={cat.name}
              label={cat.name}
              value={cat.count}
              total={total}
              color="#8b5cf6"
            />
          ))}
        </div>

        {/* Recent reports */}
        <div style={{
          background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16, padding: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, margin: 0 }}>
              Recent Reports
            </h3>
            <button
              onClick={() => navigate('/reports')}
              style={{
                background: 'none', border: 'none', color: '#818cf8',
                fontSize: 12, cursor: 'pointer', fontWeight: 500,
              }}
            >
              View all →
            </button>
          </div>
          {recentReports.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 13 }}>No reports for this department yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentReports.map(report => (
                <ReportRow key={report.id} report={report} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resolution rate footer */}
      {stats && (
        <div style={{
          marginTop: 24, padding: 20, borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(99,102,241,0.15) 100%)',
          border: '1px solid rgba(16,185,129,0.25)',
          boxShadow: '0 8px 32px rgba(16,185,129,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <p style={{ color: '#10b981', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>
              Resolution Rate
            </p>
            <p style={{ color: '#94a3b8', fontSize: 11, margin: 0 }}>
              {stats.resolved + stats.closed} of {stats.total} reports resolved or closed
            </p>
          </div>
          <div style={{
            fontSize: 32, fontWeight: 800,
            background: 'linear-gradient(135deg, #10b981, #6366f1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {stats.resolutionRate}%
          </div>
        </div>
      )}
    </div>
  )
}

// Report row mini component
function ReportRow({ report }: { report: DemoReport }) {
  const timeAgo = getTimeAgo(report.createdAt)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px', borderRadius: 10,
      background: 'rgba(15,23,42,0.4)',
      border: '1px solid rgba(148,163,184,0.06)',
      cursor: 'pointer', transition: 'all 0.2s',
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: STATUS_COLORS[report.status] || '#6366f1',
        flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: '#e2e8f0', fontSize: 12, fontWeight: 500,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {report.caseNumber} — {report.description.slice(0, 50)}...
        </div>
        <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>
          {report.citizenName} • {timeAgo}
        </div>
      </div>
      <span style={{
        padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
        background: `${PRIORITY_COLORS[report.priority]}15`,
        color: PRIORITY_COLORS[report.priority],
        flexShrink: 0,
      }}>
        {report.priority}
      </span>
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}
