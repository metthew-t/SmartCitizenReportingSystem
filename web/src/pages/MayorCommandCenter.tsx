import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import {
  Crown, ShieldAlert, CheckCircle2, Clock, AlertTriangle, Building2,
  Send, RefreshCw, Printer, Search, ArrowUpRight, Flame, MapPin,
  FileCheck2, Compass, Award, ExternalLink, BarChart3, ChevronRight,
  TrendingUp, Users, AlertOctagon, Sparkles, Filter, X, ScrollText, FileText,
  Scale, Star
} from 'lucide-react'

const API = 'https://smartcitizenreportingsystem.onrender.com/api/v1'

interface SectorData {
  id: number
  name: string
  total_reports: number
  resolved: number
  closed: number
  in_progress: number
  under_investigation: number
  pending: number
  critical_active: number
  resolution_rate: number
  citizen_satisfaction?: number
  satisfaction_percentage?: number
  feedback_count?: number
  performance_tier: 'EXCELLENT' | 'SATISFACTORY' | 'ATTENTION_REQUIRED'
}

interface ActivityItem {
  id: number
  case_number: string
  report_title: string
  department_name: string
  old_status: string
  new_status: string
  actor_name: string
  timestamp: string
  note: string
  priority: string
}

interface ExecutiveReportItem {
  id: number
  reference_number: string
  title: string
  department_name: string
  sender_name: string
  level: string
  status: string
  priority: string
  created_at: string
  executive_summary: string
}

interface MayorDirective {
  id: number
  reference_number: string
  title: string
  target_department: string
  target_department_id: number | null
  priority: 'ROUTINE' | 'CRITICAL' | 'EMERGENCY'
  status: string
  instructions: string
  deadline: string | null
  created_at: string
}

interface KebeleItem {
  kebele: string
  total: number
  resolved: number
  rate: number
}

interface Telemetry {
  total_reports: number
  resolved_count: number
  closed_count: number
  in_progress_count: number
  investigation_count: number
  submitted_count: number
  critical_active: number
  high_active: number
  resolution_rate: number
  citizen_satisfaction: number
  total_sectors: number
  total_appeals?: number
  pending_appeals?: number
}

export default function MayorCommandCenter() {
  const { token, role, user } = useAuthStore()
  const isAuthorized = role === 'mayor' || role === 'super_admin' || user?.is_mayor

  const [loading, setLoading] = useState(true)
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null)
  const [sectors, setSectors] = useState<SectorData[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [execReports, setExecReports] = useState<ExecutiveReportItem[]>([])
  const [directives, setDirectives] = useState<MayorDirective[]>([])
  const [kebeles, setKebeles] = useState<KebeleItem[]>([])
  const [currentTime, setCurrentTime] = useState<string>('')

  // Citizen Appeals Oversight
  const [appealsSummary, setAppealsSummary] = useState<{ total: number; pending: number; upheld: number; dismissed: number } | null>(null)
  const [recentAppeals, setRecentAppeals] = useState<any[]>([])
  const [selectedAppeal, setSelectedAppeal] = useState<any | null>(null)

  // Sector filtering
  const [sectorSearch, setSectorSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState<'ALL' | 'CRITICAL' | 'EXCELLENT'>('ALL')
  const [selectedSector, setSelectedSector] = useState<SectorData | null>(null)

  // Activity Intelligence Hub state
  const [activityTab, setActivityTab] = useState<'ACTIONS' | 'REPORTS' | 'APPEALS' | 'ESCALATIONS'>('ACTIONS')
  const [escalatedCases, setEscalatedCases] = useState<any[]>([])
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null)
  const [selectedExecReport, setSelectedExecReport] = useState<ExecutiveReportItem | null>(null)

  // Directive Modal
  const [showDirectiveModal, setShowDirectiveModal] = useState(false)
  const [directiveForm, setDirectiveForm] = useState({
    title: '',
    target_department_id: '',
    priority: 'CRITICAL',
    instructions: '',
    deadline: '',
  })
  const [submittingDirective, setSubmittingDirective] = useState(false)

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleString('en-US', {
        timeZone: 'Africa/Addis_Ababa',
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchOverview = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API}/mayor/overview/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setTelemetry(data.telemetry || null)
        setSectors(data.sectors_matrix || [])
        setActivity(data.recent_activity || [])
        setExecReports(data.executive_reports || [])
        setDirectives(data.directives || [])
        setKebeles(data.kebele_summary || [])
        setAppealsSummary(data.appeals_summary || null)
        setRecentAppeals(data.recent_appeals || [])
      }
    } catch (err) {
      console.error('Error fetching mayor overview', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthorized) {
      fetchOverview()
      const interval = setInterval(fetchOverview, 30000) // 30s live telemetry poll
      return () => clearInterval(interval)
    }
  }, [token, isAuthorized])

  const handleCreateDirective = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!directiveForm.title || !directiveForm.instructions) {
      alert('Title and instructions are required.')
      return
    }
    setSubmittingDirective(true)
    try {
      const payload: any = {
        title: directiveForm.title,
        priority: directiveForm.priority,
        instructions: directiveForm.instructions,
      }
      if (directiveForm.target_department_id) {
        payload.target_department = Number(directiveForm.target_department_id)
      }
      if (directiveForm.deadline) {
        payload.deadline = new Date(directiveForm.deadline).toISOString()
      }

      const res = await fetch(`${API}/mayor/directives/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        alert('Executive Mayoral Directive successfully promulgated to municipal sectors!')
        setShowDirectiveModal(false)
        setDirectiveForm({ title: '', target_department_id: '', priority: 'CRITICAL', instructions: '', deadline: '' })
        fetchOverview()
      } else {
        const err = await res.json()
        alert('Failed to dispatch directive: ' + JSON.stringify(err))
      }
    } catch {
      alert('Network error while issuing directive.')
    } finally {
      setSubmittingDirective(false)
    }
  }

  const openDirectiveForSector = (dept: SectorData) => {
    setDirectiveForm({
      title: `Executive Order: Immediate Remediation of ${dept.name} Operations`,
      target_department_id: String(dept.id),
      priority: dept.critical_active > 0 ? 'EMERGENCY' : 'CRITICAL',
      instructions: `The Mayor's Office directs ${dept.name} to expedite resolution of open citizen reports and submit an executive remediation report within 48 hours.`,
      deadline: '',
    })
    setShowDirectiveModal(true)
  }

  if (!isAuthorized) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#070b14', color: '#e2e8f0', fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{
          background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 20, padding: 40, maxWidth: 500, textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
            background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', border: '2px solid rgba(239,68,68,0.4)',
          }}>
            <Crown size={36} color="#ef4444" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f87171', margin: '0 0 10px' }}>
            MAYORAL CLEARANCE REQUIRED
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
            This portal is the Sovereign Executive Command Center of the <strong>Mayor of Adama City</strong> (Waajjira Kantiibaa). Access is restricted exclusively to the Executive Mayor and Super Administrative Leadership.
          </p>
          <div style={{
            fontSize: 12, padding: '10px 16px', borderRadius: 8,
            background: 'rgba(239,68,68,0.1)', color: '#fca5a5',
            fontFamily: 'monospace',
          }}>
            Security Protocol 403 • Executive Hierarchy Clearance Failure
          </div>
        </div>
      </div>
    )
  }

  const filteredSectors = sectors.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(sectorSearch.toLowerCase())
    if (sectorFilter === 'CRITICAL') return matchesSearch && (s.critical_active > 0 || s.resolution_rate < 50)
    if (sectorFilter === 'EXCELLENT') return matchesSearch && s.resolution_rate >= 80
    return matchesSearch
  })

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% -15%, #1a1713 0%, #0d0e13 45%, #050608 100%)',
      color: '#e2e8f0',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: '28px 32px 60px',
      margin: '-24px', // Offset default layout padding for edge-to-edge grandeur
    }}>

      {/* ── Top Ceremonial Mayoral Header ────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(38, 30, 20, 0.75) 0%, rgba(13, 14, 19, 0.9) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        borderRadius: 20,
        padding: '24px 28px',
        marginBottom: 28,
        backdropFilter: 'blur(16px)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(245, 158, 11, 0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          
          {/* Mayoral Seal & Titles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 25px rgba(245,158,11,0.4), inset 0 2px 4px rgba(255,255,255,0.4)',
              border: '2px solid #fbbf24', flexShrink: 0,
            }}>
              <Crown size={34} color="#ffffff" strokeWidth={2.2} />
            </div>

            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                padding: '2px 10px', borderRadius: 20, color: '#fbbf24',
                fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4,
              }}>
                <Sparkles size={11} /> Office of the Executive Mayor • Waajjira Kantiibaa
              </div>
              <h1 style={{
                margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5,
                background: 'linear-gradient(90deg, #ffffff 0%, #fef08a 60%, #fbbf24 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Adama City Executive Command Center
              </h1>
              <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 13 }}>
                Real-time Cross-Sector Governance • Municipal Performance Telemetry • Mayoral Oversight
              </p>
            </div>
          </div>

          {/* Time Beacon & Executive Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{
              textAlign: 'right', padding: '8px 16px', borderRadius: 12,
              background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.15)',
            }}>
              <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                EAT UTC+3 LIVE CLOCK
              </div>
              <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, fontFamily: 'monospace', marginTop: 2 }}>
                {currentTime || 'Synchronizing...'}
              </div>
            </div>

            <button
              onClick={() => {
                setDirectiveForm({ title: '', target_department_id: '', priority: 'CRITICAL', instructions: '', deadline: '' })
                setShowDirectiveModal(true)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#0f172a', border: 'none', padding: '11px 20px', borderRadius: 12,
                fontSize: 13, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(245,158,11,0.4)', transition: 'all 0.2s',
              }}
            >
              <Send size={15} /> Issue Mayoral Directive
            </button>

            <button
              onClick={() => window.print()}
              title="Print Executive Briefing"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(148,163,184,0.2)',
                color: '#cbd5e1', padding: '11px 14px', borderRadius: 12,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Printer size={15} /> Briefing
            </button>

            <button
              onClick={fetchOverview}
              title="Refresh Live Telemetry"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(148,163,184,0.2)',
                color: '#cbd5e1', padding: '11px 14px', borderRadius: 12,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

        </div>
      </div>

      {/* ── Key Executive Telemetry Ribbon ────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 16, marginBottom: 28,
      }}>
        {/* Metric 1: Overall Resolution Rate */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(28, 24, 19, 0.75) 0%, rgba(13, 14, 19, 0.9) 100%)',
          border: '1px solid rgba(16,185,129,0.3)', borderRadius: 16, padding: '20px 22px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                City Resolution Rate
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#34d399', margin: '6px 0 2px' }}>
                {telemetry ? `${telemetry.resolution_rate}%` : '---'}
              </div>
              <div style={{ fontSize: 11, color: '#6ee7b7' }}>
                {telemetry ? `${telemetry.resolved_count + telemetry.closed_count} of ${telemetry.total_reports} cases closed` : 'Calculating...'}
              </div>
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981',
            }}>
              <CheckCircle2 size={24} />
            </div>
          </div>
          {/* Progress track */}
          <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, marginTop: 14 }}>
            <div style={{
              width: `${Math.min(telemetry?.resolution_rate || 0, 100)}%`,
              height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)',
              borderRadius: 3, transition: 'width 0.8s ease',
            }} />
          </div>
        </div>

        {/* Metric 2: Total City Incidents Processed */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(28, 24, 19, 0.75) 0%, rgba(13, 14, 19, 0.9) 100%)',
          border: '1px solid rgba(245,158,11,0.3)', borderRadius: 16, padding: '20px 22px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Total Civic Reports
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#fbbf24', margin: '6px 0 2px' }}>
                {telemetry?.total_reports ?? '---'}
              </div>
              <div style={{ fontSize: 11, color: '#fde68a' }}>
                {telemetry ? `${telemetry.in_progress_count + telemetry.investigation_count} currently active` : 'Loading...'}
              </div>
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: 'rgba(245,158,11,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b',
            }}>
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

        {/* Metric 3: Critical Hotspots Needing Intervention */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(28, 24, 19, 0.75) 0%, rgba(13, 14, 19, 0.9) 100%)',
          border: '1px solid rgba(239,68,68,0.35)', borderRadius: 16, padding: '20px 22px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Critical Emergencies
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#f87171', margin: '6px 0 2px' }}>
                {telemetry?.critical_active ?? '---'}
              </div>
              <div style={{ fontSize: 11, color: '#fca5a5' }}>
                {telemetry?.high_active ? `+ ${telemetry.high_active} High Priority cases` : 'Prioritized issues'}
              </div>
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444',
            }}>
              <AlertOctagon size={24} />
            </div>
          </div>
        </div>

        {/* Metric 4: Municipal Sectors Operating */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(28, 24, 19, 0.75) 0%, rgba(13, 14, 19, 0.9) 100%)',
          border: '1px solid rgba(168,85,247,0.3)', borderRadius: 16, padding: '20px 22px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Active City Sectors
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#c084fc', margin: '6px 0 2px' }}>
                {telemetry?.total_sectors ?? '33'}
              </div>
              <div style={{ fontSize: 11, color: '#d8b4fe' }}>
                Full municipal apparatus connected
              </div>
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: 'rgba(168,85,247,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7',
            }}>
              <Building2 size={24} />
            </div>
          </div>
        </div>

        {/* Metric 5: Citizen Satisfaction Index */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(28, 24, 19, 0.75) 0%, rgba(13, 14, 19, 0.9) 100%)',
          border: '1px solid rgba(245,158,11,0.3)', borderRadius: 16, padding: '20px 22px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Civic Trust Index
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#fbbf24', margin: '6px 0 2px' }}>
                {telemetry?.citizen_satisfaction ? `${telemetry.citizen_satisfaction} / 5.0` : '4.2 / 5.0'}
              </div>
              <div style={{ fontSize: 11, color: '#fde68a' }}>
                Public satisfaction rating
              </div>
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: 'rgba(245,158,11,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b',
            }}>
              <Award size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Operations Grid: Sectors Oversight + Live Activity Feed ───────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: 24, marginBottom: 32 }}>

        {/* ── LEFT: All Sectors Municipal Oversight Matrix ────────────────────────── */}
        <div style={{
          background: 'rgba(18,19,26,0.85)',
          border: '1px solid rgba(245,158,11,0.22)',
          borderRadius: 20, padding: 24, backdropFilter: 'blur(16px)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={20} color="#f59e0b" />
                All Sectors Governance Matrix
              </h2>
              <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 12 }}>
                Comprehensive cross-department performance, backlog tracking, and direct intervention
              </p>
            </div>

            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['ALL', 'CRITICAL', 'EXCELLENT'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setSectorFilter(f)}
                  style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: sectorFilter === f ? 'rgba(245,158,11,0.2)' : 'rgba(30,41,59,0.5)',
                    color: sectorFilter === f ? '#fbbf24' : '#94a3b8',
                    border: sectorFilter === f ? '1px solid #f59e0b' : '1px solid rgba(148,163,184,0.1)',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {f === 'ALL' ? 'All Sectors' : f === 'CRITICAL' ? '⚠️ Attention Needed' : '⭐ Top Rated'}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(30,41,59,0.5)', borderRadius: 10,
            padding: '8px 14px', border: '1px solid rgba(148,163,184,0.1)',
            marginBottom: 16,
          }}>
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search sector (e.g. Police, Water, Health, Revenue, Investment)..."
              value={sectorSearch}
              onChange={e => setSectorSearch(e.target.value)}
              style={{
                background: 'transparent', border: 'none', color: '#ffffff',
                outline: 'none', fontSize: 12, width: '100%',
              }}
            />
          </div>

          {/* Sectors Grid List */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            maxHeight: 520, overflowY: 'auto', paddingRight: 4,
          }}>
            {filteredSectors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                No sectors matched the criteria.
              </div>
            ) : (
              filteredSectors.map(s => {
                const tierColor =
                  s.performance_tier === 'EXCELLENT' ? '#10b981' :
                  s.performance_tier === 'SATISFACTORY' ? '#3b82f6' : '#ef4444'

                return (
                  <div
                    key={s.id}
                    style={{
                      background: 'rgba(30,41,59,0.4)',
                      border: s.critical_active > 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(148,163,184,0.08)',
                      borderRadius: 14, padding: '14px 18px',
                      display: 'flex', flexDirection: 'column', gap: 10,
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: `${tierColor}15`, border: `1px solid ${tierColor}40`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: tierColor, fontWeight: 700, fontSize: 12,
                        }}>
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ color: '#ffffff', fontSize: 14, fontWeight: 700 }}>
                            {s.name}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            {s.total_reports} total cases recorded
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                          background: `${tierColor}20`, color: tierColor, border: `1px solid ${tierColor}40`,
                        }}>
                          {s.resolution_rate}% Solved
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                          background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)',
                          display: 'flex', alignItems: 'center', gap: 3
                        }} title={`Citizen satisfaction: ${s.citizen_satisfaction ?? 4.0}/5 (${s.feedback_count || 0} reviews)`}>
                          ⭐ {s.citizen_satisfaction ?? 4.0} ({s.feedback_count || 0})
                        </span>
                        {s.critical_active > 0 && (
                          <span style={{
                            fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                            background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)',
                          }}>
                            {s.critical_active} Critical
                          </span>
                        )}
                        <button
                          onClick={() => openDirectiveForSector(s)}
                          title="Direct Mayoral Order to this Sector"
                          style={{
                            background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
                            color: '#fbbf24', padding: '5px 10px', borderRadius: 8,
                            fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          Directive <ArrowUpRight size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Mini metrics bar */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 11 }}>
                      <div style={{ background: 'rgba(15,23,42,0.4)', padding: '6px 8px', borderRadius: 8 }}>
                        <span style={{ color: '#94a3b8' }}>Resolved: </span>
                        <strong style={{ color: '#34d399' }}>{s.resolved + s.closed}</strong>
                      </div>
                      <div style={{ background: 'rgba(15,23,42,0.4)', padding: '6px 8px', borderRadius: 8 }}>
                        <span style={{ color: '#94a3b8' }}>Active: </span>
                        <strong style={{ color: '#60a5fa' }}>{s.in_progress + s.under_investigation}</strong>
                      </div>
                      <div style={{ background: 'rgba(15,23,42,0.4)', padding: '6px 8px', borderRadius: 8 }}>
                        <span style={{ color: '#94a3b8' }}>Pending: </span>
                        <strong style={{ color: '#f59e0b' }}>{s.pending}</strong>
                      </div>
                      <div style={{ background: 'rgba(15,23,42,0.4)', padding: '6px 8px', borderRadius: 8 }}>
                        <span style={{ color: '#94a3b8' }}>Tier: </span>
                        <strong style={{ color: tierColor }}>{s.performance_tier}</strong>
                      </div>
                    </div>

                    {/* Progress track */}
                    <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                      <div style={{
                        width: `${s.resolution_rate}%`, height: '100%',
                        background: tierColor, borderRadius: 2,
                      }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: Real-Time Mayoral Intelligence & Action Feed ───────────────── */}
        <div style={{
          background: 'rgba(18,19,26,0.85)',
          border: '1px solid rgba(245,158,11,0.22)',
          borderRadius: 20, padding: 24, backdropFilter: 'blur(16px)',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
        }}>
          {/* Header & Sub-tabs */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Flame size={20} color="#f59e0b" />
                  Mayoral Intelligence Hub
                </h2>
                <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 12 }}>
                  Live operational audit trail and official sector submissions
                </p>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)',
              }}>
                LIVE TELEMETRY
              </span>
            </div>

            {/* Toggle Tabs */}
            <div style={{ display: 'flex', gap: 6, background: 'rgba(10,11,15,0.7)', padding: 4, borderRadius: 10, border: '1px solid rgba(245,158,11,0.15)' }}>
              <button
                onClick={() => setActivityTab('ACTIONS')}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  background: activityTab === 'ACTIONS' ? 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(180,83,9,0.25))' : 'transparent',
                  color: activityTab === 'ACTIONS' ? '#fbbf24' : '#94a3b8',
                  border: activityTab === 'ACTIONS' ? '1px solid rgba(245,158,11,0.4)' : '1px solid transparent',
                  cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                <Flame size={13} /> Live Actions ({activity.length})
              </button>
              <button
                onClick={() => setActivityTab('REPORTS')}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  background: activityTab === 'REPORTS' ? 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(180,83,9,0.25))' : 'transparent',
                  color: activityTab === 'REPORTS' ? '#fbbf24' : '#94a3b8',
                  border: activityTab === 'REPORTS' ? '1px solid rgba(245,158,11,0.4)' : '1px solid transparent',
                  cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                <ScrollText size={13} /> Sector Briefings ({execReports.length})
              </button>
              <button
                onClick={() => setActivityTab('APPEALS')}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  background: activityTab === 'APPEALS' ? 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(180,83,9,0.25))' : 'transparent',
                  color: activityTab === 'APPEALS' ? '#fbbf24' : '#94a3b8',
                  border: activityTab === 'APPEALS' ? '1px solid rgba(245,158,11,0.4)' : '1px solid transparent',
                  cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                <Scale size={13} /> Citizen Appeals ({appealsSummary?.total ?? recentAppeals.length})
              </button>
              <button
                onClick={() => setActivityTab('ESCALATIONS')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 10, cursor: 'pointer',
                  background: activityTab === 'ESCALATIONS' ? 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(185,28,28,0.25))' : 'transparent',
                  color: activityTab === 'ESCALATIONS' ? '#f87171' : '#94a3b8',
                  border: activityTab === 'ESCALATIONS' ? '1px solid rgba(239,68,68,0.5)' : '1px solid transparent',
                  fontWeight: activityTab === 'ESCALATIONS' ? 700 : 500, fontSize: 13,
                  transition: 'all 0.2s'
                }}
              >
                <ShieldAlert size={14} color={activityTab === 'ESCALATIONS' ? '#ef4444' : '#64748b'} />
                <span>Mayor Escalations</span>
                {escalatedCases.length > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 10,
                    background: '#ef4444', color: '#fff'
                  }}>
                    {escalatedCases.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div style={{
            display: 'flex', flexDirection: 'column', gap: 12,
            maxHeight: 520, overflowY: 'auto', paddingRight: 4, flex: 1,
          }}>
            {activityTab === 'ACTIONS' ? (
              activity.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                  No recent municipal activity recorded yet.
                </div>
              ) : (
                activity.map(act => (
                  <div
                    key={act.id}
                    onClick={() => setSelectedActivity(act)}
                    style={{
                      background: 'rgba(28,24,20,0.6)',
                      border: '1px solid rgba(245,158,11,0.15)',
                      borderRadius: 12, padding: '12px 14px',
                      display: 'flex', flexDirection: 'column', gap: 6,
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(245,158,11,0.45)'
                      e.currentTarget.style.background = 'rgba(38,30,22,0.7)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(245,158,11,0.15)'
                      e.currentTarget.style.background = 'rgba(28,24,20,0.6)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        color: '#fbbf24', fontSize: 11, fontWeight: 700,
                        fontFamily: 'monospace',
                      }}>
                        {act.case_number}
                      </span>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>
                      {act.actor_name} &bull; <span style={{ color: '#fbbf24' }}>{act.department_name}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                      <span style={{
                        padding: '2px 6px', borderRadius: 4,
                        background: 'rgba(148,163,184,0.1)', color: '#94a3b8',
                      }}>
                        {act.old_status}
                      </span>
                      <span style={{ color: '#64748b' }}>&rarr;</span>
                      <span style={{
                        padding: '2px 6px', borderRadius: 4, fontWeight: 700,
                        background: act.new_status === 'RESOLVED' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)',
                        color: act.new_status === 'RESOLVED' ? '#34d399' : '#60a5fa',
                      }}>
                        {act.new_status}
                      </span>
                    </div>

                    {act.note && (
                      <div style={{
                        fontSize: 11, color: '#94a3b8', fontStyle: 'italic',
                        background: 'rgba(10,11,15,0.4)', padding: '6px 8px', borderRadius: 6,
                      }}>
                        "{act.note}"
                      </div>
                    )}
                  </div>
                ))
              )
            ) : activityTab === 'REPORTS' ? (
              execReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                  No official sector reports submitted to the Mayor yet.
                </div>
              ) : (
                execReports.map(rep => (
                  <div
                    key={rep.id}
                    onClick={() => setSelectedExecReport(rep)}
                    style={{
                      background: 'rgba(28,24,20,0.6)',
                      border: '1px solid rgba(245,158,11,0.15)',
                      borderRadius: 12, padding: '14px 16px',
                      display: 'flex', flexDirection: 'column', gap: 6,
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(245,158,11,0.45)'
                      e.currentTarget.style.background = 'rgba(38,30,22,0.7)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(245,158,11,0.15)'
                      e.currentTarget.style.background = 'rgba(28,24,20,0.6)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>
                        {rep.reference_number}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                        background: rep.priority === 'CRITICAL' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                        color: rep.priority === 'CRITICAL' ? '#f87171' : '#fbbf24',
                      }}>
                        {rep.priority}
                      </span>
                    </div>

                    <div style={{ color: '#ffffff', fontSize: 13, fontWeight: 700 }}>
                      {rep.title}
                    </div>

                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      Submitted by: <strong style={{ color: '#cbd5e1' }}>{rep.sender_name}</strong> &bull; {rep.department_name}
                    </div>

                    {rep.executive_summary && (
                      <div style={{
                        fontSize: 11, color: '#94a3b8',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {rep.executive_summary}
                      </div>
                    )}
                  </div>
                ))
              )
            ) : (
              recentAppeals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                  No citizen administrative appeals filed at this time.
                </div>
              ) : (
                recentAppeals.map(app => (
                  <div
                    key={app.id}
                    onClick={() => setSelectedAppeal(app)}
                    style={{
                      background: 'rgba(28,24,20,0.6)',
                      border: app.status === 'UPHELD' ? '1px solid rgba(16,185,129,0.3)' : app.status === 'SUBMITTED' ? '1px solid rgba(234,179,8,0.3)' : '1px solid rgba(245,158,11,0.15)',
                      borderRadius: 12, padding: '12px 14px',
                      display: 'flex', flexDirection: 'column', gap: 6,
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(245,158,11,0.45)'
                      e.currentTarget.style.background = 'rgba(38,30,22,0.7)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = app.status === 'UPHELD' ? 'rgba(16,185,129,0.3)' : app.status === 'SUBMITTED' ? 'rgba(234,179,8,0.3)' : 'rgba(245,158,11,0.15)'
                      e.currentTarget.style.background = 'rgba(28,24,20,0.6)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>
                        {app.appeal_number} &bull; Case #{app.case_number}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                        background: app.status === 'UPHELD' ? 'rgba(16,185,129,0.2)' : app.status === 'DISMISSED' ? 'rgba(239,68,68,0.2)' : 'rgba(234,179,8,0.2)',
                        color: app.status === 'UPHELD' ? '#34d399' : app.status === 'DISMISSED' ? '#f87171' : '#facc15',
                      }}>
                        {app.status}
                      </span>
                    </div>

                    <div style={{ color: '#ffffff', fontSize: 13, fontWeight: 700 }}>
                      Sector: {app.department_name}
                    </div>

                    <div style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.4, fontStyle: 'italic' }}>
                      "{app.reason}"
                    </div>

                    {app.reviewer_decision && (
                      <div style={{ fontSize: 11, color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 4 }}>
                        Ruling: <strong style={{ color: '#e2e8f0' }}>{app.reviewer_decision}</strong>
                      </div>
                    )}
                  </div>
                ))
              )
            )}
          </div>
        </div>

      </div>

      {/* ── Bottom Section: Active Mayoral Directives & Kebele Spatial Summary ──── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: 24 }}>

        {/* Mayoral Directives Center */}
        <div style={{
          background: 'rgba(18,19,26,0.85)',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 20, padding: 24, backdropFilter: 'blur(16px)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Send size={18} color="#f59e0b" />
                Active Mayoral Directives (Ajaja Kantiibaa)
              </h3>
              <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 12 }}>
                Executive mandates issued directly to municipal department heads
              </p>
            </div>
            <button
              onClick={() => setShowDirectiveModal(true)}
              style={{
                background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                color: '#fbbf24', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + New Directive
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
            {directives.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                No mayoral directives currently active. Click "+ New Directive" to issue an executive order.
              </div>
            ) : (
              directives.map(d => (
                <div
                  key={d.id}
                  style={{
                    background: 'rgba(30,41,59,0.5)',
                    border: '1px solid rgba(148,163,184,0.1)',
                    borderRadius: 12, padding: '14px 16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#f59e0b', fontWeight: 700 }}>
                      {d.reference_number} &bull; Target: {d.target_department}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 4,
                      background: d.priority === 'EMERGENCY' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                      color: d.priority === 'EMERGENCY' ? '#f87171' : '#fbbf24',
                    }}>
                      {d.priority}
                    </span>
                  </div>
                  <div style={{ color: '#ffffff', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    {d.title}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>
                    {d.instructions}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kebele Spatial Distribution */}
        <div style={{
          background: 'rgba(18,19,26,0.85)',
          border: '1px solid rgba(245,158,11,0.22)',
          borderRadius: 20, padding: 24, backdropFilter: 'blur(16px)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
        }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} color="#f59e0b" />
            Adama Kebeles Distribution
          </h3>
          <p style={{ margin: '0 0 16px', color: '#94a3b8', fontSize: 12 }}>
            Incident resolution and coverage by city kebele
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
            {kebeles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                Spatial kebele telemetry aggregating...
              </div>
            ) : (
              kebeles.map((k, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'rgba(30,41,59,0.4)', padding: '10px 14px', borderRadius: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, width: 20 }}>
                      #{i + 1}
                    </span>
                    <span style={{ color: '#ffffff', fontSize: 13, fontWeight: 600 }}>
                      Kebele {k.kebele}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                    <span style={{ color: '#94a3b8' }}>{k.total} incidents</span>
                    <span style={{ color: '#34d399', fontWeight: 700 }}>{k.rate}% solved</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── Mayoral Directive Creation Modal ───────────────────────────────────── */}
      {showDirectiveModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          padding: 20,
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            border: '2px solid rgba(245,158,11,0.4)',
            borderRadius: 20, maxWidth: 560, width: '100%', padding: 28,
            boxShadow: '0 25px 50px rgba(0,0,0,0.8), 0 0 30px rgba(245,158,11,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Crown size={22} color="#f59e0b" />
                <h3 style={{ margin: 0, color: '#ffffff', fontSize: 18, fontWeight: 800 }}>
                  Promulgate Executive Mayoral Directive
                </h3>
              </div>
              <button
                onClick={() => setShowDirectiveModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateDirective} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Directive Title / Subject *
                </label>
                <input
                  type="text" required
                  placeholder="e.g. Immediate Water Supply Restoration in Boku Shenan"
                  value={directiveForm.title}
                  onChange={e => setDirectiveForm({ ...directiveForm, title: e.target.value })}
                  style={{
                    width: '100%', padding: '11px 14px', background: 'rgba(15,23,42,0.6)',
                    border: '1px solid rgba(148,163,184,0.2)', borderRadius: 10,
                    color: '#ffffff', outline: 'none', fontSize: 13,
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Target Sector
                  </label>
                  <select
                    value={directiveForm.target_department_id}
                    onChange={e => setDirectiveForm({ ...directiveForm, target_department_id: e.target.value })}
                    style={{
                      width: '100%', padding: '11px 14px', background: 'rgba(15,23,42,0.6)',
                      border: '1px solid rgba(148,163,184,0.2)', borderRadius: 10,
                      color: '#ffffff', outline: 'none', fontSize: 13,
                    }}
                  >
                    <option value="">All Sectors (Citywide Order)</option>
                    {sectors.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Priority Classification
                  </label>
                  <select
                    value={directiveForm.priority}
                    onChange={e => setDirectiveForm({ ...directiveForm, priority: e.target.value as any })}
                    style={{
                      width: '100%', padding: '11px 14px', background: 'rgba(15,23,42,0.6)',
                      border: '1px solid rgba(148,163,184,0.2)', borderRadius: 10,
                      color: '#ffffff', outline: 'none', fontSize: 13,
                    }}
                  >
                    <option value="CRITICAL">Critical Executive Priority</option>
                    <option value="EMERGENCY">State of Emergency / Immediate</option>
                    <option value="ROUTINE">Routine Mandate</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Executive Instructions & Mandate *
                </label>
                <textarea
                  required rows={4}
                  placeholder="Detail the actions, resources to deploy, and expected deliverables..."
                  value={directiveForm.instructions}
                  onChange={e => setDirectiveForm({ ...directiveForm, instructions: e.target.value })}
                  style={{
                    width: '100%', padding: '11px 14px', background: 'rgba(15,23,42,0.6)',
                    border: '1px solid rgba(148,163,184,0.2)', borderRadius: 10,
                    color: '#ffffff', outline: 'none', fontSize: 13, resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowDirectiveModal(false)}
                  style={{
                    padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.2)',
                    background: 'transparent', color: '#94a3b8', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDirective}
                  style={{
                    padding: '10px 22px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#0f172a', fontWeight: 800, cursor: submittingDirective ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submittingDirective ? 'Promulgating...' : 'Dispatch Executive Directive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Live Activity Inspection & Mayoral Action ──────────────────── */}
      {selectedActivity && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 110,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #181922 0%, #0d0e14 100%)',
            border: '1px solid rgba(245,158,11,0.4)', borderRadius: 20,
            padding: 32, width: '100%', maxWidth: 580,
            boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(245,158,11,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                  background: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.4)',
                }}>
                  MAYORAL INCIDENT AUDIT
                </span>
                <h3 style={{ margin: '8px 0 2px', color: '#ffffff', fontSize: 20, fontWeight: 800 }}>
                  Case {selectedActivity.case_number}
                </h3>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 12 }}>
                  Sector in charge: <strong style={{ color: '#fbbf24' }}>{selectedActivity.department_name}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedActivity(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              <div style={{ background: 'rgba(28,24,20,0.6)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>STATUS TRANSITION RECORDED:</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(148,163,184,0.15)', color: '#cbd5e1' }}>
                    {selectedActivity.old_status}
                  </span>
                  <span style={{ color: '#f59e0b', fontWeight: 800 }}>&rarr;</span>
                  <span style={{
                    padding: '3px 8px', borderRadius: 6, fontWeight: 700,
                    background: selectedActivity.new_status === 'RESOLVED' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)',
                    color: selectedActivity.new_status === 'RESOLVED' ? '#34d399' : '#60a5fa',
                  }}>
                    {selectedActivity.new_status}
                  </span>
                </div>
              </div>

              <div style={{ background: 'rgba(28,24,20,0.6)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>ACTOR / OFFICER:</div>
                <div style={{ color: '#ffffff', fontSize: 13, fontWeight: 600 }}>
                  {selectedActivity.actor_name} &bull; {new Date(selectedActivity.timestamp).toLocaleString()}
                </div>
              </div>

              {selectedActivity.note && (
                <div style={{ background: 'rgba(28,24,20,0.6)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>OPERATIONAL AUDIT NOTE:</div>
                  <div style={{ color: '#e2e8f0', fontSize: 13, lineHeight: 1.6, fontStyle: 'italic' }}>
                    "{selectedActivity.note}"
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                style={{
                  padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.2)',
                  background: 'transparent', color: '#94a3b8', cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetDept = sectors.find(s => s.name === selectedActivity.department_name)
                  setDirectiveForm({
                    title: `Mayoral Directive: Expedite Case ${selectedActivity.case_number}`,
                    target_department_id: targetDept ? String(targetDept.id) : '',
                    priority: 'CRITICAL',
                    instructions: `Following mayoral audit on case ${selectedActivity.case_number} handled by ${selectedActivity.department_name}. Current status: ${selectedActivity.new_status}. Officer note: "${selectedActivity.note}". Executive order mandates immediate full resolution within 24 hours.`,
                    deadline: '',
                  })
                  setSelectedActivity(null)
                  setShowDirectiveModal(true)
                }}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#000000', fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 4px 15px rgba(245,158,11,0.3)',
                }}
              >
                <Send size={15} /> Issue Directive for this Case
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Official Sector Briefing Inspection ──────────────────────────── */}
      {selectedExecReport && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 110,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #181922 0%, #0d0e14 100%)',
            border: '1px solid rgba(245,158,11,0.4)', borderRadius: 20,
            padding: 32, width: '100%', maxWidth: 640,
            boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(245,158,11,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                  background: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.4)',
                }}>
                  OFFICIAL SECTOR BRIEFING
                </span>
                <h3 style={{ margin: '8px 0 2px', color: '#ffffff', fontSize: 20, fontWeight: 800 }}>
                  {selectedExecReport.title}
                </h3>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 12 }}>
                  Ref: <strong style={{ color: '#fbbf24', fontFamily: 'monospace' }}>{selectedExecReport.reference_number}</strong> &bull; Sector: {selectedExecReport.department_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedExecReport(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <div style={{ background: 'rgba(28,24,20,0.6)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>SUBMITTING OFFICIAL</div>
                  <div style={{ color: '#ffffff', fontSize: 13, fontWeight: 700, marginTop: 2 }}>{selectedExecReport.sender_name}</div>
                </div>
                <div style={{ background: 'rgba(28,24,20,0.6)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>LEVEL</div>
                  <div style={{ color: '#fbbf24', fontSize: 13, fontWeight: 700, marginTop: 2 }}>{selectedExecReport.level}</div>
                </div>
                <div style={{ background: 'rgba(28,24,20,0.6)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>DATE SUBMITTED</div>
                  <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600, marginTop: 2 }}>
                    {new Date(selectedExecReport.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(28,24,20,0.6)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>
                  EXECUTIVE SUMMARY & BRIEFING:
                </div>
                <div style={{ color: '#e2e8f0', fontSize: 13, lineHeight: 1.7 }}>
                  {selectedExecReport.executive_summary}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedExecReport(null)}
                style={{
                  padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.2)',
                  background: 'transparent', color: '#94a3b8', cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetDept = sectors.find(s => s.name === selectedExecReport.department_name)
                  setDirectiveForm({
                    title: `Mayoral Mandate: Action on ${selectedExecReport.title}`,
                    target_department_id: targetDept ? String(targetDept.id) : '',
                    priority: 'CRITICAL',
                    instructions: `In response to official briefing [${selectedExecReport.reference_number}] from ${selectedExecReport.department_name}, the Office of the Executive Mayor mandates:`,
                    deadline: '',
                  })
                  setSelectedExecReport(null)
                  setShowDirectiveModal(true)
                }}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#000000', fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 4px 15px rgba(245,158,11,0.3)',
                }}
              >
                <Send size={15} /> Issue Directive in Response
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Citizen Appeal Mayoral Oversight ──────────────────────────── */}
      {selectedAppeal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 110,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #181922 0%, #0d0e14 100%)',
            border: '1px solid rgba(245,158,11,0.4)', borderRadius: 20,
            padding: 32, width: '100%', maxWidth: 640,
            boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(245,158,11,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                  background: selectedAppeal.status === 'UPHELD' ? 'rgba(16,185,129,0.2)' : 'rgba(234,179,8,0.2)',
                  color: selectedAppeal.status === 'UPHELD' ? '#34d399' : '#facc15',
                  border: `1px solid ${selectedAppeal.status === 'UPHELD' ? 'rgba(16,185,129,0.4)' : 'rgba(234,179,8,0.4)'}`,
                }}>
                  CITIZEN ADMINISTRATIVE APPEAL &bull; {selectedAppeal.status}
                </span>
                <h3 style={{ margin: '8px 0 2px', color: '#ffffff', fontSize: 20, fontWeight: 800 }}>
                  Appeal {selectedAppeal.appeal_number}
                </h3>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 12 }}>
                  Case #{selectedAppeal.case_number} &bull; Sector: <strong>{selectedAppeal.department_name}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedAppeal(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              <div style={{ background: 'rgba(28,24,20,0.6)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>
                  CITIZEN'S GROUNDS FOR GRIEVANCE:
                </div>
                <div style={{ color: '#e2e8f0', fontSize: 13, lineHeight: 1.7, fontStyle: 'italic' }}>
                  "{selectedAppeal.reason}"
                </div>
              </div>

              {selectedAppeal.desired_outcome && (
                <div style={{ background: 'rgba(28,24,20,0.6)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>DESIRED CITIZEN REMEDY</div>
                  <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 4 }}>{selectedAppeal.desired_outcome}</div>
                </div>
              )}

              {selectedAppeal.reviewer_decision && (
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontSize: 10, color: '#34d399', fontWeight: 700 }}>
                    ADMINISTRATIVE ADJUDICATION ({selectedAppeal.reviewer_name || 'Reviewer'})
                  </div>
                  <div style={{ color: '#ffffff', fontSize: 13, marginTop: 4 }}>{selectedAppeal.reviewer_decision}</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedAppeal(null)}
                style={{
                  padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.2)',
                  background: 'transparent', color: '#94a3b8', cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetDept = sectors.find(s => s.name === selectedAppeal.department_name)
                  setDirectiveForm({
                    title: `Mayoral Directive: Remedy Citizen Grievance (Appeal ${selectedAppeal.appeal_number})`,
                    target_department_id: targetDept ? String(targetDept.id) : '',
                    priority: 'CRITICAL',
                    instructions: `Executive Mayoral Intervention for Appeal ${selectedAppeal.appeal_number} (Case #${selectedAppeal.case_number}). Citizen claims: "${selectedAppeal.reason}". Department ${selectedAppeal.department_name} is instructed to urgently review the matter and take corrective measures immediately.`,
                    deadline: '',
                  })
                  setSelectedAppeal(null)
                  setShowDirectiveModal(true)
                }}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#000000', fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 4px 15px rgba(245,158,11,0.3)',
                }}
              >
                <Send size={15} /> Issue Directive for this Appeal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

