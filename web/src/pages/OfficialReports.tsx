import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  ScrollText, Plus, Search, Filter, CheckCircle2, Clock,
  AlertTriangle, FileText, Send, Building2, User, Eye,
  ArrowRight, ShieldCheck, X, Printer, AlertCircle, FileCheck, Check,
  CornerDownRight, RefreshCw, Bookmark, Download, FileSpreadsheet, ShieldAlert
} from 'lucide-react'
import { exportToWord, exportToExcel, exportAllReportsToExcel } from '../utils/reportExporter'
import { logAuditEvent } from '../utils/auditLogger'

const API = 'https://smartcitizenreportingsystem.onrender.com/api/v1'

interface OfficialReport {
  id: number
  reference_number: string
  title: string
  report_type: string
  level: 'OFFICER_TO_MANAGER' | 'MANAGER_TO_ADMIN' | 'INTER_DEPARTMENT'
  sender: number
  sender_name: string
  sender_role: string
  department: number
  department_name: string
  target_department?: number | null
  target_department_name?: string | null
  linked_citizen_report?: number | null
  linked_case_number?: string | null
  linked_report_title?: string | null
  priority: 'ROUTINE' | 'PRIORITY' | 'URGENT' | 'CRITICAL'
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REVISION_REQUESTED' | 'REJECTED' | 'DIRECTIVE_ISSUED'
  executive_summary: string
  findings: string
  recommendations?: string
  attachment_url?: string
  reviewer?: number | null
  reviewer_name?: string | null
  reviewer_feedback?: string | null
  reviewed_at?: string | null
  created_at: string
  updated_at: string
}

interface CitizenCaseOption {
  id: number
  case_number: string
  title: string
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  FIELD_INVESTIGATION: 'Field Investigation & Case Finding',
  INTER_DEPT_COLLABORATION: 'Inter-Department Case Collaboration',
  WEEKLY_ACTIVITY: 'Weekly Activity Report',
  MONTHLY_SUMMARY: 'Monthly Operations & Performance',
  INCIDENT_ESCALATION: 'Urgent Incident Escalation',
  RESOURCE_REQUEST: 'Resource, Equipment & Budget Request',
  POLICY_RECOMMENDATION: 'Administrative & Policy Recommendation',
}

const STATUS_COLORS: Record<string, { bg: string, text: string, border: string }> = {
  DRAFT: { bg: 'rgba(148, 163, 184, 0.12)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' },
  SUBMITTED: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
  UNDER_REVIEW: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  APPROVED: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  REVISION_REQUESTED: { bg: 'rgba(249, 115, 22, 0.15)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.3)' },
  REJECTED: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  DIRECTIVE_ISSUED: { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted for Review',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved / Endorsed',
  REVISION_REQUESTED: 'Revision Requested',
  REJECTED: 'Rejected',
  DIRECTIVE_ISSUED: 'Directive Issued',
}

const PRIORITY_COLORS: Record<string, string> = {
  ROUTINE: '#94a3b8',
  PRIORITY: '#3b82f6',
  URGENT: '#f59e0b',
  CRITICAL: '#ef4444',
}

export default function OfficialReports() {
  const navigate = useNavigate()
  const { token, user, role, departmentName } = useAuthStore()

  const [reports, setReports] = useState<OfficialReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Active view tab
  // For Officer: 'my_reports'
  // For Manager: 'incoming_officer_reports' | 'my_admin_reports'
  // For Admin: 'manager_reports' | 'all_reports'
  const defaultTab = role === 'officer'
    ? 'my_reports'
    : role === 'department_manager'
      ? 'incoming_officer_reports'
      : 'manager_reports'

  const [activeTab, setActiveTab] = useState<string>(defaultTab)

  // Filters & Search
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<OfficialReport | null>(null)
  const [isDossierOpen, setIsDossierOpen] = useState(false)

  // Citizen cases for linking
  const [citizenCases, setCitizenCases] = useState<CitizenCaseOption[]>([])
  // Municipal departments for filing / targeting
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([])

  // Create form state
  const [createForm, setCreateForm] = useState({
    title: '',
    report_type: 'FIELD_INVESTIGATION',
    priority: 'ROUTINE',
    level: role === 'department_manager' ? 'MANAGER_TO_ADMIN' : 'OFFICER_TO_MANAGER',
    department: '',
    target_department: '',
    linked_citizen_report: '',
    executive_summary: '',
    findings: '',
    recommendations: '',
    attachment_url: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [createError, setCreateError] = useState('')

  // Review form state inside Dossier
  const [reviewStatus, setReviewStatus] = useState<string>('APPROVED')
  const [reviewFeedback, setReviewFeedback] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [reviewMsg, setReviewMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Fetch reports from API
  const fetchReports = async () => {
    if (!token) return
    try {
      setLoading(true)
      const res = await fetch(`${API}/official-reports/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setReports(Array.isArray(data) ? data : data.results || [])
        setError('')
      } else {
        setError('Failed to load official reports.')
      }
    } catch {
      setError('Network connection error.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch citizen reports for the linking dropdown
  const fetchCitizenCases = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API}/reports/?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : (data.results || [])
        setCitizenCases(items.map((r: any) => ({
          id: r.id,
          case_number: r.case_number || `Report #${r.id}`,
          title: r.title || 'Untitled Case'
        })))
      }
    } catch {}
  }

  // Fetch municipal departments
  const fetchDepartments = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API}/departments/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : (data.results || [])
        setDepartments(items.map((d: any) => ({ id: d.id, name: d.name })))
      }
    } catch {}
  }

  useEffect(() => {
    fetchReports()
    fetchCitizenCases()
    fetchDepartments()
  }, [token])

  // Create report submission
  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.title.trim() || !createForm.executive_summary.trim() || !createForm.findings.trim()) {
      setCreateError('Title, Executive Summary, and Detailed Findings are required.')
      return
    }

    setSubmitting(true)
    setCreateError('')

    try {
      const payload: any = {
        title: createForm.title.trim(),
        report_type: createForm.report_type,
        priority: createForm.priority,
        level: createForm.level || (role === 'department_manager' ? 'MANAGER_TO_ADMIN' : 'OFFICER_TO_MANAGER'),
        executive_summary: createForm.executive_summary.trim(),
        findings: createForm.findings.trim(),
        recommendations: createForm.recommendations.trim() || null,
        attachment_url: createForm.attachment_url.trim() || null,
      }

      if (createForm.level === 'INTER_DEPARTMENT') {
        if (!createForm.target_department) {
          setCreateError('Please select a target collaborating department.')
          setSubmitting(false)
          return
        }
        payload.target_department = parseInt(createForm.target_department)
        payload.level = 'INTER_DEPARTMENT'
      }

      if (createForm.department) {
        payload.department = parseInt(createForm.department)
      }

      if (createForm.linked_citizen_report) {
        payload.linked_citizen_report = parseInt(createForm.linked_citizen_report)
      }

      const res = await fetch(`${API}/official-reports/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        setIsCreateOpen(false)
        setCreateForm({
          title: '',
          report_type: 'FIELD_INVESTIGATION',
          priority: 'ROUTINE',
          level: role === 'department_manager' ? 'MANAGER_TO_ADMIN' : 'OFFICER_TO_MANAGER',
          department: '',
          target_department: '',
          linked_citizen_report: '',
          executive_summary: '',
          findings: '',
          recommendations: '',
          attachment_url: '',
        })
        fetchReports()
      } else {
        const data = await res.json()
        setCreateError(data.error || Object.values(data).flat().join(', ') || 'Failed to submit report.')
      }
    } catch {
      setCreateError('Network error submitting report.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Review action (Approve, Revision, Reject, Directive)
  const handleReviewReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedReport) return
    if (reviewStatus === 'REJECTED' && !reviewFeedback.trim()) {
      setReviewMsg({ type: 'error', text: 'A mandatory justification / remarks are required when rejecting an official report.' })
      return
    }
    setReviewing(true)
    setReviewMsg(null)

    try {
      const res = await fetch(`${API}/official-reports/${selectedReport.id}/review/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: reviewStatus,
          feedback: reviewFeedback.trim(),
        })
      })

      const data = await res.json()
      if (res.ok) {
        setSelectedReport(data)
        setReviewMsg({ type: 'success', text: `Report successfully marked as ${STATUS_LABELS[reviewStatus] || reviewStatus}!` })
        fetchReports()
      } else {
        setReviewMsg({ type: 'error', text: data.error || 'Failed to submit official review.' })
      }
    } catch {
      setReviewMsg({ type: 'error', text: 'Network error during review submission.' })
    } finally {
      setReviewing(false)
    }
  }

  // Filter reports by active tab
  const getTabFilteredReports = () => {
    return reports.filter(r => {
      if (activeTab === 'my_reports') {
        return r.sender === user?.id
      }
      if (activeTab === 'incoming_officer_reports') {
        return r.level === 'OFFICER_TO_MANAGER'
      }
      if (activeTab === 'my_admin_reports') {
        return r.level === 'MANAGER_TO_ADMIN' && r.sender === user?.id
      }
      if (activeTab === 'inter_department_collab') {
        return r.level === 'INTER_DEPARTMENT'
      }
      if (activeTab === 'manager_reports') {
        return r.level === 'MANAGER_TO_ADMIN'
      }
      if (activeTab === 'all_reports') {
        return true
      }
      return true
    })
  }

  // Secondary filters (search, type, status)
  const displayedReports = getTabFilteredReports().filter(r => {
    const matchSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.reference_number.toLowerCase().includes(search.toLowerCase()) ||
      (r.sender_name && r.sender_name.toLowerCase().includes(search.toLowerCase())) ||
      (r.department_name && r.department_name.toLowerCase().includes(search.toLowerCase())) ||
      (r.target_department_name && r.target_department_name.toLowerCase().includes(search.toLowerCase()))

    const matchType = typeFilter === 'ALL' || r.report_type === typeFilter
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter

    return matchSearch && matchType && matchStatus
  })

  // KPI Calculations
  const totalCount = reports.length
  const pendingCount = reports.filter(r => r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW').length
  const approvedCount = reports.filter(r => r.status === 'APPROVED').length
  const directivesCount = reports.filter(r => r.status === 'DIRECTIVE_ISSUED').length
  const collabCount = reports.filter(r => r.level === 'INTER_DEPARTMENT').length

  // Check if current user can review the selected report
  const canReviewSelected = () => {
    if (!selectedReport) return false
    if (role === 'city_admin') return true
    if (role === 'department_manager') {
      if (selectedReport.level === 'OFFICER_TO_MANAGER') return true
      if (selectedReport.level === 'INTER_DEPARTMENT') return true
    }
    return false
  }

  // Super Admin view: Informative redirection to Audit Logs
  if (role === 'super_admin') {
    return (
      <div style={{
        fontFamily: "'Inter', sans-serif",
        padding: '60px 20px',
        textAlign: 'center',
        color: '#F1F5F9',
        maxWidth: 620,
        margin: '0 auto',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
        }}>
          <ShieldAlert size={32} color="#f59e0b" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#F1F5F9', marginBottom: 10 }}>
          Civil Staff Administrative Channel
        </h2>
        <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.6, marginBottom: 24 }}>
          Official Administrative Reports (field investigations, departmental briefs, and resource requests) are filed and reviewed directly by Field Officers, Department Managers, and the City Administration.
          <br /><br />
          As <strong>Super Admin</strong>, you manage the complete system forensic <strong>Audit Logs</strong> which record every report submission, review, and directive issued across all departments.
        </p>
        <button
          onClick={() => navigate('/audit-logs')}
          style={{
            background: 'linear-gradient(135deg, #1D70B8, #0F2942)', color: 'white',
            border: 'none', padding: '10px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.35)'
          }}
        >
          View System Audit Logs
        </button>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#0F172A', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #1D70B8, #0F2942)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            }}>
              <ScrollText size={20} color="white" />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#0F172A', letterSpacing: '-0.02em' }}>
              Official Government Reports
            </h1>
          </div>
          <p style={{ color: '#94A3B8', fontSize: 13, margin: '6px 0 0 46px' }}>
            Administrative reporting hierarchy &bull; {role === 'officer' ? 'Field Officer to Department Manager' : role === 'department_manager' ? 'Department Manager Dossiers & Executive Escalations' : 'City Executive Administration Oversight'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={fetchReports}
            title="Refresh reports"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#FFFFFF', border: '1px solid #CBD5E1',
              color: '#475569', padding: '9px 14px', borderRadius: 10, fontSize: 13,
              fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>

          <button
            onClick={() => {
              const listToExport = displayedReports.length > 0 ? displayedReports : reports
              if (listToExport.length === 0) return
              exportAllReportsToExcel(listToExport)
              logAuditEvent({
                action: 'OFFICIAL_REPORTS_BATCH_EXPORT',
                entity_type: 'OFFICIAL_REPORT',
                entity_id: 'ALL',
                changes: { count: listToExport.length, format: 'CSV_EXCEL' }
              })
            }}
            disabled={reports.length === 0}
            title="Export official reports to Excel / CSV"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399', padding: '9px 14px', borderRadius: 10, fontSize: 13,
              fontWeight: 600, cursor: reports.length === 0 ? 'not-allowed' : 'pointer',
              opacity: reports.length === 0 ? 0.6 : 1, transition: 'all 0.2s',
            }}
          >
            <FileSpreadsheet size={15} /> Export Registry (Excel)
          </button>

          <button
            onClick={() => {
              setCreateError('')
              setIsCreateOpen(true)
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #1D70B8, #0F2942)',
              border: 'none', color: 'white', padding: '9px 18px', borderRadius: 10,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)', transition: 'all 0.2s',
            }}
          >
            <Plus size={16} />
            {role === 'officer' ? 'Submit Officer Report' : role === 'department_manager' ? 'Submit Executive Report' : 'File Administrative Report'}
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(29,112,184,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ScrollText size={20} color="#93c5fd" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A' }}>{totalCount}</div>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Total Dossiers Filed</div>
          </div>
        </div>

        <div style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} color="#fbbf24" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fbbf24' }}>{pendingCount}</div>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Pending Official Review</div>
          </div>
        </div>

        <div style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={20} color="#34d399" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#34d399' }}>{approvedCount}</div>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Approved / Endorsed</div>
          </div>
        </div>

        <div style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(168,85,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bookmark size={20} color="#c084fc" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#c084fc' }}>{directivesCount}</div>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Executive Directives Issued</div>
          </div>
        </div>
      </div>

      {/* Role Navigation Tabs */}
      <div style={{
        display: 'flex', gap: 8, borderBottom: '1px solid rgba(148,163,184,0.12)',
        marginBottom: 20, paddingBottom: 4, overflowX: 'auto'
      }}>
        {role === 'officer' && (
          <button
            onClick={() => setActiveTab('my_reports')}
            style={{
              padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
              background: activeTab === 'my_reports' ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: activeTab === 'my_reports' ? '#93c5fd' : '#94a3b8',
              borderBottom: activeTab === 'my_reports' ? '2px solid #1D70B8' : '2px solid transparent',
            }}
          >
            My Reports to Manager ({reports.filter(r => r.sender === user?.id).length})
          </button>
        )}

        {role === 'department_manager' && (
          <>
            <button
              onClick={() => setActiveTab('incoming_officer_reports')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                background: activeTab === 'incoming_officer_reports' ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: activeTab === 'incoming_officer_reports' ? '#93c5fd' : '#94a3b8',
                borderBottom: activeTab === 'incoming_officer_reports' ? '2px solid #1D70B8' : '2px solid transparent',
              }}
            >
              Officer Reports (To Review)
              {reports.filter(r => r.level === 'OFFICER_TO_MANAGER' && (r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW')).length > 0 && (
                <span style={{
                  background: '#f59e0b', color: '#0f172a', fontSize: 11, fontWeight: 700,
                  padding: '2px 7px', borderRadius: 20,
                }}>
                  {reports.filter(r => r.level === 'OFFICER_TO_MANAGER' && (r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW')).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('my_admin_reports')}
              style={{
                padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                background: activeTab === 'my_admin_reports' ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: activeTab === 'my_admin_reports' ? '#93c5fd' : '#94a3b8',
                borderBottom: activeTab === 'my_admin_reports' ? '2px solid #1D70B8' : '2px solid transparent',
              }}
            >
              My Executive Reports to City Admin ({reports.filter(r => r.level === 'MANAGER_TO_ADMIN' && r.sender === user?.id).length})
            </button>

            <button
              onClick={() => setActiveTab('inter_department_collab')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                background: activeTab === 'inter_department_collab' ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: activeTab === 'inter_department_collab' ? '#93c5fd' : '#94a3b8',
                borderBottom: activeTab === 'inter_department_collab' ? '2px solid #1D70B8' : '2px solid transparent',
              }}
            >
              Inter-Department Collaboration ({reports.filter(r => r.level === 'INTER_DEPARTMENT').length})
              {reports.filter(r => r.level === 'INTER_DEPARTMENT' && (r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW')).length > 0 && (
                <span style={{
                  background: '#1D70B8', color: '#ffffff', fontSize: 11, fontWeight: 700,
                  padding: '2px 7px', borderRadius: 20,
                }}>
                  {reports.filter(r => r.level === 'INTER_DEPARTMENT' && (r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW')).length}
                </span>
              )}
            </button>
          </>
        )}

        {role === 'city_admin' && (
          <>
            <button
              onClick={() => setActiveTab('manager_reports')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                background: activeTab === 'manager_reports' ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: activeTab === 'manager_reports' ? '#93c5fd' : '#94a3b8',
                borderBottom: activeTab === 'manager_reports' ? '2px solid #1D70B8' : '2px solid transparent',
              }}
            >
              Executive Department Reports
              {reports.filter(r => r.level === 'MANAGER_TO_ADMIN' && (r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW')).length > 0 && (
                <span style={{
                  background: '#f59e0b', color: '#0f172a', fontSize: 11, fontWeight: 700,
                  padding: '2px 7px', borderRadius: 20,
                }}>
                  {reports.filter(r => r.level === 'MANAGER_TO_ADMIN' && (r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW')).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('all_reports')}
              style={{
                padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                background: activeTab === 'all_reports' ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: activeTab === 'all_reports' ? '#93c5fd' : '#94a3b8',
                borderBottom: activeTab === 'all_reports' ? '2px solid #1D70B8' : '2px solid transparent',
              }}
            >
              All Internal Municipal Filings ({reports.length})
            </button>
          </>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, alignItems: 'center',
        background: '#FFFFFF', padding: '12px 16px', borderRadius: 12,
        border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
          <input
            type="text"
            placeholder="Search reference #, title, sender..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px 9px 36px',
              background: '#F8FAFC', border: '1px solid #CBD5E1',
              borderRadius: 8, color: '#0F172A', fontSize: 13, outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={14} color="#94a3b8" />
          <span style={{ fontSize: 12, color: '#334155', fontWeight: 700 }}>Type:</span>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{
              padding: '8px 12px', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', fontSize: 12, outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="ALL">All Report Types</option>
            {Object.entries(REPORT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#334155', fontWeight: 700 }}>Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', fontSize: 12, outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="ALL">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Reports List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
          <div>Loading official reports...</div>
        </div>
      ) : displayedReports.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px', background: '#FFFFFF',
          borderRadius: 16, border: '1px dashed #CBD5E1', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <ScrollText size={40} color="#64748b" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', margin: '0 0 6px' }}>
            No Official Reports Found
          </h3>
          <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
            {search || typeFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'No reports match your selected search or filter criteria.'
              : 'No official reports filed in this category yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayedReports.map(report => {
            const statusStyle = STATUS_COLORS[report.status] || STATUS_COLORS.SUBMITTED
            return (
              <div
                key={report.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0', borderRadius: 14,
                  padding: '18px 20px', transition: 'all 0.2s', display: 'flex', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
                }}
              >
                <div style={{ flex: '1 1 450px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
                      color: '#1D70B8', background: 'rgba(29,112,184,0.1)',
                      padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(29,112,184,0.2)',
                    }}>
                      {report.reference_number}
                    </span>

                    <span style={{
                      fontSize: 11, fontWeight: 600, color: PRIORITY_COLORS[report.priority] || '#94a3b8',
                      border: `1px solid ${PRIORITY_COLORS[report.priority]}40`,
                      background: `${PRIORITY_COLORS[report.priority]}15`,
                      padding: '2px 8px', borderRadius: 6,
                    }}>
                      {report.priority}
                    </span>

                    <span style={{
                      fontSize: 11, fontWeight: 600, color: statusStyle.text,
                      background: statusStyle.bg, border: `1px solid ${statusStyle.border}`,
                      padding: '2px 8px', borderRadius: 6,
                    }}>
                      {STATUS_LABELS[report.status] || report.status}
                    </span>

                    <span style={{ fontSize: 12, color: '#64748B' }}>&bull;</span>
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>
                      {REPORT_TYPE_LABELS[report.report_type] || report.report_type}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                    {report.title}
                  </h3>

                  <p style={{
                    fontSize: 13, color: '#475569', margin: '0 0 10px',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                  }}>
                    {report.executive_summary}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 12, color: '#64748B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <User size={13} color="#94a3b8" />
                      <span style={{ color: '#0F172A', fontWeight: 600 }}>{report.sender_name || 'Staff Member'}</span>
                      <span style={{ color: '#64748B' }}>({report.sender_role || 'Staff'})</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Building2 size={13} color="#94a3b8" />
                      <span>{report.department_name}</span>
                    </div>

                    {report.level === 'INTER_DEPARTMENT' && report.target_department_name && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        color: '#1D70B8', background: 'rgba(56, 189, 248, 0.12)',
                        padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(56, 189, 248, 0.3)',
                        fontWeight: 600, fontSize: 11
                      }}>
                        <ArrowRight size={12} />
                        <span>Collab Target: {report.target_department_name}</span>
                      </div>
                    )}

                    {report.linked_case_number && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#1D70B8' }}>
                        <FileText size={13} />
                        <span>Case #{report.linked_case_number}</span>
                      </div>
                    )}

                    <div>
                      {new Date(report.created_at).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      exportToExcel(report)
                      logAuditEvent({
                        action: 'OFFICIAL_REPORT_EXPORT_EXCEL',
                        entity_type: 'OFFICIAL_REPORT',
                        entity_id: report.reference_number,
                        changes: { title: report.title, format: 'EXCEL_CSV' }
                      })
                    }}
                    title="Export this report directly to Excel (.csv)"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
                      color: '#34d399', padding: '9px 13px', borderRadius: 10,
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    <FileSpreadsheet size={15} /> Excel
                  </button>

                  <button
                    onClick={() => {
                      setSelectedReport(report)
                      setReviewFeedback(report.reviewer_feedback || '')
                      setReviewStatus(report.status === 'SUBMITTED' ? 'APPROVED' : report.status)
                      setReviewMsg(null)
                      setIsDossierOpen(true)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(29,112,184,0.15)', border: '1px solid rgba(29,112,184,0.3)',
                      color: '#1D70B8', padding: '9px 16px', borderRadius: 10,
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    <Eye size={15} /> Open Dossier
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Official Government Dossier Modal */}
      {isDossierOpen && selectedReport && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: '#FFFFFF', border: '1px solid #E2E8F0',
            borderRadius: 16, width: '100%', maxWidth: 840, maxHeight: '92vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          }}>
            {/* Modal Top Actions */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 20px', borderBottom: '1px solid #E2E8F0',
              background: '#F8FAFC',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ScrollText size={18} color="#1D70B8" />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                  Official Dossier: {selectedReport.reference_number}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    exportToWord(selectedReport)
                    logAuditEvent({
                      action: 'OFFICIAL_REPORT_EXPORT_WORD',
                      entity_type: 'OFFICIAL_REPORT',
                      entity_id: selectedReport.reference_number,
                      changes: { title: selectedReport.title, format: 'WORD_DOC' }
                    })
                  }}
                  title="Export official dossier as Microsoft Word document"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                    color: '#60a5fa', padding: '6px 12px', borderRadius: 8, fontSize: 12,
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <FileText size={13} /> Export Word (.doc)
                </button>

                <button
                  onClick={() => {
                    exportToExcel(selectedReport)
                    logAuditEvent({
                      action: 'OFFICIAL_REPORT_EXPORT_EXCEL',
                      entity_type: 'OFFICIAL_REPORT',
                      entity_id: selectedReport.reference_number,
                      changes: { title: selectedReport.title, format: 'EXCEL_CSV' }
                    })
                  }}
                  title="Export official dossier as Excel spreadsheet"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                    color: '#34d399', padding: '6px 12px', borderRadius: 8, fontSize: 12,
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <FileSpreadsheet size={13} /> Export Excel
                </button>

                <button
                  onClick={() => {
                    window.print()
                    logAuditEvent({
                      action: 'OFFICIAL_REPORT_PRINT_PDF',
                      entity_type: 'OFFICIAL_REPORT',
                      entity_id: selectedReport.reference_number,
                      changes: { title: selectedReport.title, format: 'PRINT_PDF' }
                    })
                  }}
                  title="Print dossier or save as PDF"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'linear-gradient(135deg, #1D70B8, #0F2942)', border: 'none',
                    color: 'white', padding: '6px 14px', borderRadius: 8, fontSize: 12,
                    fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                  }}
                >
                  <Printer size={13} /> Print / Save PDF
                </button>

                <button
                  onClick={() => setIsDossierOpen(false)}
                  style={{
                    background: 'none', border: 'none', color: '#94A3B8',
                    cursor: 'pointer', padding: 4, display: 'flex'
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Printable Official Government Letterhead Document */}
            <div id="official-dossier-printable" style={{ overflowY: 'auto', padding: 28, flex: 1 }}>
              {/* Header Letterhead */}
              <div style={{
                textAlign: 'center', paddingBottom: 20, marginBottom: 24,
                borderBottom: '2px solid rgba(99,102,241,0.4)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#93c5fd', textTransform: 'uppercase', marginBottom: 4 }}>
                  FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA &bull; OROMIA REGIONAL STATE
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                  ADAMA CITY ADMINISTRATION
                </h2>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.04em' }}>
                  BULCHIINSA MAGAALAA ADAAMAA &bull; OFFICIAL ADMINISTRATIVE DOSSIER
                </div>
              </div>

              {/* Dossier Metadata Grid */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 16, borderRadius: 12,
                marginBottom: 24,
              }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Reference Number</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1D70B8', fontFamily: 'monospace', marginTop: 2 }}>
                    {selectedReport.reference_number}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Date of Submission</div>
                  <div style={{ fontSize: 13, color: '#0F172A', marginTop: 2 }}>
                    {new Date(selectedReport.created_at).toLocaleString()}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Reporting Level</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginTop: 2 }}>
                    {selectedReport.level === 'OFFICER_TO_MANAGER' ? 'Officer to Department Manager' : 'Department Manager to City Admin'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Classification / Priority</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: PRIORITY_COLORS[selectedReport.priority], marginTop: 2 }}>
                    {selectedReport.priority}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Reporting Official</div>
                  <div style={{ fontSize: 13, color: '#0F172A', marginTop: 2 }}>
                    {selectedReport.sender_name} ({selectedReport.sender_role})
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Municipal Department</div>
                  <div style={{ fontSize: 13, color: '#0F172A', marginTop: 2 }}>
                    {selectedReport.department_name}
                  </div>
                </div>

                {selectedReport.linked_case_number && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Linked Citizen Incident</div>
                    <div style={{ fontSize: 13, color: '#1D70B8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileText size={14} /> Case #{selectedReport.linked_case_number} &mdash; {selectedReport.linked_report_title || 'Public Report'}
                    </div>
                  </div>
                )}
              </div>

              {/* Formal Government Endorsement & Official Seal Block */}
              <div style={{
                marginTop: 28, paddingTop: 20, borderTop: '2pt double rgba(148,163,184,0.25)',
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20
              }}>
                <div style={{
                  padding: 16, borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0'
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>
                    SUBMITTING CIVIL SERVANT / INVESTIGATOR
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                    {selectedReport.sender_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#1D70B8', fontWeight: 600 }}>
                    {selectedReport.sender_role} &bull; {selectedReport.department_name}
                  </div>
                  <div style={{ marginTop: 24, borderTop: '1px solid #475569', paddingTop: 6, fontSize: 11, color: '#64748B' }}>
                    Authorized Digital Signature &bull; {new Date(selectedReport.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div style={{
                  padding: 16, borderRadius: 10, background: '#F8FAFC',
                  border: '1.5pt dashed rgba(99,102,241,0.3)', textAlign: 'center', position: 'relative'
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1D70B8', textTransform: 'uppercase', marginBottom: 4 }}>
                    MUNICIPAL EXECUTIVE REGISTRY SEAL
                  </div>
                  <div style={{ fontSize: 10, color: '#94A3B8', fontStyle: 'italic', marginBottom: 12 }}>
                    Bulchiinsa Magaalaa Adaamaa &bull; Waajjira Kantiibaa
                  </div>
                  <div style={{
                    display: 'inline-block', padding: '6px 14px', borderRadius: 8,
                    background: selectedReport.status === 'APPROVED' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
                    border: `1.5pt solid ${selectedReport.status === 'APPROVED' ? '#10b981' : '#1D70B8'}`,
                    color: selectedReport.status === 'APPROVED' ? '#34d399' : '#93c5fd',
                    fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase'
                  }}>
                    {STATUS_LABELS[selectedReport.status] || selectedReport.status}
                  </div>
                  <div style={{ marginTop: 14, fontSize: 10, color: '#64748B' }}>
                    Verified via Adama Smart Governance System &bull; Ref: {selectedReport.reference_number}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>
                  SUBJECT / REPORT TITLE
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  {selectedReport.title}
                </h3>
              </div>

              {/* Section I: Executive Summary */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{
                  fontSize: 12, fontWeight: 700, color: '#1D70B8', letterSpacing: '0.05em',
                  textTransform: 'uppercase', borderBottom: '1px solid rgba(148,163,184,0.12)',
                  paddingBottom: 6, margin: '0 0 10px',
                }}>
                  I. Executive Summary
                </h4>
                <div style={{
                  background: '#F8FAFC', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0',
                  fontSize: 13, lineHeight: '1.6', color: '#0F172A', whiteSpace: 'pre-wrap'
                }}>
                  {selectedReport.executive_summary}
                </div>
              </div>

              {/* Section II: Detailed Findings & Observations */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{
                  fontSize: 12, fontWeight: 700, color: '#1D70B8', letterSpacing: '0.05em',
                  textTransform: 'uppercase', borderBottom: '1px solid rgba(148,163,184,0.12)',
                  paddingBottom: 6, margin: '0 0 10px',
                }}>
                  II. Detailed Findings & Field Evidence
                </h4>
                <div style={{
                  background: '#F8FAFC', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0',
                  fontSize: 13, lineHeight: '1.6', color: '#0F172A', whiteSpace: 'pre-wrap'
                }}>
                  {selectedReport.findings}
                </div>
              </div>

              {/* Section III: Proposed Recommendations & Directives */}
              {selectedReport.recommendations && (
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{
                    fontSize: 12, fontWeight: 700, color: '#1D70B8', letterSpacing: '0.05em',
                    textTransform: 'uppercase', borderBottom: '1px solid rgba(148,163,184,0.12)',
                    paddingBottom: 6, margin: '0 0 10px',
                  }}>
                    III. Official Recommendations & Proposed Directives
                  </h4>
                  <div style={{
                    background: '#F8FAFC', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0',
                    fontSize: 13, lineHeight: '1.6', color: '#0F172A', whiteSpace: 'pre-wrap'
                  }}>
                    {selectedReport.recommendations}
                  </div>
                </div>
              )}

              {/* Attachment link if present */}
              {selectedReport.attachment_url && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                    Supporting Document / Dossier Attachment
                  </div>
                  <a
                    href={selectedReport.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#1D70B8', fontSize: 13, textDecoration: 'underline' }}
                  >
                    {selectedReport.attachment_url}
                  </a>
                </div>
              )}

              {/* Section IV: Official Review & Endorsement Status */}
              <div style={{
                background: '#F8FAFC', border: '1px solid #E2E8F0',
                borderRadius: 12, padding: 18, marginTop: 24,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{
                    fontSize: 12, fontWeight: 700, color: '#0F172A', letterSpacing: '0.05em',
                    textTransform: 'uppercase', margin: 0,
                  }}>
                    IV. Administrative Review & Disposition
                  </h4>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: STATUS_COLORS[selectedReport.status]?.text || '#94a3b8',
                    background: STATUS_COLORS[selectedReport.status]?.bg || 'transparent',
                    border: `1px solid ${STATUS_COLORS[selectedReport.status]?.border || 'transparent'}`,
                    padding: '3px 10px', borderRadius: 6,
                  }}>
                    {STATUS_LABELS[selectedReport.status] || selectedReport.status}
                  </span>
                </div>

                {selectedReport.reviewed_at ? (
                  <div style={{ fontSize: 13, color: '#0F172A' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <ShieldCheck size={16} color="#10b981" />
                      <strong>Reviewed & Endorsed by:</strong> {selectedReport.reviewer_name || 'Designated Authority'}
                      <span style={{ color: '#64748B' }}>&bull;</span>
                      <span style={{ color: '#94A3B8' }}>{new Date(selectedReport.reviewed_at).toLocaleString()}</span>
                    </div>

                    {selectedReport.reviewer_feedback && (
                      <div style={{
                        marginTop: 10, padding: 12, borderRadius: 8,
                        background: '#FFFFFF', border: '1px solid #CBD5E1',
                        color: '#0F172A', fontStyle: 'italic',
                      }}>
                        &ldquo;{selectedReport.reviewer_feedback}&rdquo;
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: '#94A3B8' }}>
                    This official dossier is currently pending review by designated administrative leadership.
                  </div>
                )}

                {/* Review Form (Only visible to authorized reviewers) */}
                {canReviewSelected() && (
                  <form onSubmit={handleReviewReport} style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid rgba(29,112,184,0.2)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1D70B8', marginBottom: 10 }}>
                      SUBMIT OFFICIAL ADMINISTRATIVE DECISION:
                    </div>

                    {reviewMsg && (
                      <div style={{
                        padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13, fontWeight: 600,
                        background: reviewMsg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        border: `1px solid ${reviewMsg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        color: reviewMsg.type === 'success' ? '#10b981' : '#ef4444',
                      }}>
                        {reviewMsg.text}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 12 }}>
                      <button
                        type="button"
                        onClick={() => setReviewStatus('APPROVED')}
                        style={{
                          padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          background: reviewStatus === 'APPROVED' ? 'rgba(16,185,129,0.25)' : 'rgba(30,41,59,0.6)',
                          border: reviewStatus === 'APPROVED' ? '1px solid #10b981' : '1px solid rgba(29,112,184,0.2)',
                          color: reviewStatus === 'APPROVED' ? '#34d399' : '#94a3b8',
                        }}
                      >
                        ✓ Approve / Endorse
                      </button>

                      {role === 'city_admin' && (
                        <button
                          type="button"
                          onClick={() => setReviewStatus('DIRECTIVE_ISSUED')}
                          style={{
                            padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            background: reviewStatus === 'DIRECTIVE_ISSUED' ? 'rgba(168,85,247,0.25)' : 'rgba(30,41,59,0.6)',
                            border: reviewStatus === 'DIRECTIVE_ISSUED' ? '1px solid #a855f7' : '1px solid rgba(29,112,184,0.2)',
                            color: reviewStatus === 'DIRECTIVE_ISSUED' ? '#c084fc' : '#94a3b8',
                          }}
                        >
                          ★ Issue Directive
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setReviewStatus('REVISION_REQUESTED')}
                        style={{
                          padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          background: reviewStatus === 'REVISION_REQUESTED' ? 'rgba(249,115,22,0.25)' : 'rgba(30,41,59,0.6)',
                          border: reviewStatus === 'REVISION_REQUESTED' ? '1px solid #f97316' : '1px solid rgba(29,112,184,0.2)',
                          color: reviewStatus === 'REVISION_REQUESTED' ? '#fb923c' : '#94a3b8',
                        }}
                      >
                        ↺ Request Revision
                      </button>

                      <button
                        type="button"
                        onClick={() => setReviewStatus('REJECTED')}
                        style={{
                          padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          background: reviewStatus === 'REJECTED' ? 'rgba(239,68,68,0.25)' : 'rgba(30,41,59,0.6)',
                          border: reviewStatus === 'REJECTED' ? '1px solid #ef4444' : '1px solid rgba(29,112,184,0.2)',
                          color: reviewStatus === 'REJECTED' ? '#f87171' : '#94a3b8',
                        }}
                      >
                        ✕ Reject
                      </button>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 12, color: '#475569', fontWeight: 600, marginBottom: 4 }}>
                        Official Feedback / Executive Directive Instructions
                      </label>
                      <textarea
                        rows={3}
                        value={reviewFeedback}
                        onChange={e => setReviewFeedback(e.target.value)}
                        placeholder="Enter official remarks, directives, or reasons for requested revision..."
                        style={{
                          width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', fontSize: 13, outline: 'none', resize: 'vertical'
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={reviewing}
                      style={{
                        padding: '9px 18px', borderRadius: 8, border: 'none',
                        background: '#1D70B8', color: 'white', fontSize: 13, fontWeight: 600,
                        cursor: reviewing ? 'not-allowed' : 'pointer', opacity: reviewing ? 0.7 : 1,
                      }}
                    >
                      {reviewing ? 'Recording Decision...' : 'Save & Issue Official Review'}
                    </button>
                  </form>
                )}
              </div>

              {/* Formal Government Endorsement & Official Seal Block */}
              <div style={{
                marginTop: 28, paddingTop: 20, borderTop: '2pt double rgba(148,163,184,0.25)',
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20
              }}>
                <div style={{
                  padding: 16, borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0'
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>
                    SUBMITTING CIVIL SERVANT / INVESTIGATOR
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                    {selectedReport.sender_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 600 }}>
                    {selectedReport.sender_role} &bull; {selectedReport.department_name}
                  </div>
                  <div style={{ marginTop: 24, borderTop: '1px solid #475569', paddingTop: 6, fontSize: 11, color: '#64748B' }}>
                    Authorized Digital Signature &bull; {new Date(selectedReport.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div style={{
                  padding: 16, borderRadius: 10, background: '#F8FAFC',
                  border: '1.5pt dashed rgba(99,102,241,0.3)', textAlign: 'center', position: 'relative'
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', marginBottom: 4 }}>
                    MUNICIPAL EXECUTIVE REGISTRY SEAL
                  </div>
                  <div style={{ fontSize: 10, color: '#94A3B8', fontStyle: 'italic', marginBottom: 12 }}>
                    Bulchiinsa Magaalaa Adaamaa &bull; Waajjira Kantiibaa
                  </div>
                  <div style={{
                    display: 'inline-block', padding: '6px 14px', borderRadius: 8,
                    background: selectedReport.status === 'APPROVED' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
                    border: `1.5pt solid ${selectedReport.status === 'APPROVED' ? '#10b981' : '#1D70B8'}`,
                    color: selectedReport.status === 'APPROVED' ? '#34d399' : '#93c5fd',
                    fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase'
                  }}>
                    {STATUS_LABELS[selectedReport.status] || selectedReport.status}
                  </div>
                  <div style={{ marginTop: 14, fontSize: 10, color: '#64748B' }}>
                    Verified via Adama Smart Governance System &bull; Ref: {selectedReport.reference_number}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Official Report Submission Modal */}
      {isCreateOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: '#FFFFFF', border: '1px solid #E2E8F0',
            borderRadius: 16, width: '100%', maxWidth: 740, maxHeight: '92vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 22px', borderBottom: '1px solid #E2E8F0',
              background: '#F8FAFC',
            }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  File Official Administrative Report
                </h3>
                <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0' }}>
                  {role === 'officer' ? 'Submit official findings to Department Manager' : 'Submit executive dossier to City Administration'}
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateReport} style={{ overflowY: 'auto', padding: 22, flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {createError && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444'
                }}>
                  {createError}
                </div>
              )}

              {/* Reporting Channel & Inter-Department Selection */}
              {(role === 'department_manager' || role === 'city_admin') && (
                <div style={{
                  background: '#F8FAFC', border: '1px solid #E2E8F0',
                  borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10
                }}>
                  <label style={{ fontSize: 12, color: '#1D70B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Reporting Objective & Routing Channel
                  </label>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1E293B', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="reportLevel"
                        value="MANAGER_TO_ADMIN"
                        checked={createForm.level === 'MANAGER_TO_ADMIN'}
                        onChange={() => setCreateForm({ ...createForm, level: 'MANAGER_TO_ADMIN', target_department: '' })}
                      />
                      Executive Report to City Administration
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1D70B8', cursor: 'pointer', fontWeight: 600 }}>
                      <input
                        type="radio"
                        name="reportLevel"
                        value="INTER_DEPARTMENT"
                        checked={createForm.level === 'INTER_DEPARTMENT'}
                        onChange={() => setCreateForm({ ...createForm, level: 'INTER_DEPARTMENT', report_type: 'INTER_DEPT_COLLABORATION' })}
                      />
                      <Building2 size={14} /> Send Collaboration to Another Department
                    </label>
                  </div>

                  {createForm.level === 'INTER_DEPARTMENT' && (
                    <div style={{ marginTop: 6 }}>
                      <label style={{ display: 'block', fontSize: 12, color: '#1D70B8', fontWeight: 600, marginBottom: 4 }}>
                        Target Collaborating Department *
                      </label>
                      <select
                        required
                        value={createForm.target_department}
                        onChange={e => setCreateForm({ ...createForm, target_department: e.target.value })}
                        style={{
                          width: '100%', padding: '10px 12px', background: '#FFFFFF',
                          border: '1.5px solid #1D70B8', borderRadius: 8,
                          color: '#0F172A', fontSize: 13, outline: 'none',
                        }}
                      >
                        <option value="">-- Select Target Department to Collaborate With --</option>
                        {departments.filter(d => d.name !== departmentName).map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                        The target department manager will be notified immediately to review and coordinate action on this case.
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#334155', fontWeight: 700, marginBottom: 4 }}>
                    Report Classification / Type
                  </label>
                  <select
                    value={createForm.report_type}
                    onChange={e => setCreateForm({ ...createForm, report_type: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', fontSize: 13, outline: 'none',
                    }}
                  >
                    {Object.entries(REPORT_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#334155', fontWeight: 700, marginBottom: 4 }}>
                    Priority Level
                  </label>
                  <select
                    value={createForm.priority}
                    onChange={e => setCreateForm({ ...createForm, priority: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', fontSize: 13, outline: 'none',
                    }}
                  >
                    <option value="ROUTINE">Routine</option>
                    <option value="PRIORITY">Priority</option>
                    <option value="URGENT">Urgent</option>
                    <option value="CRITICAL">Critical / Immediate Action</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#334155', fontWeight: 700, marginBottom: 4 }}>
                  Report Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Investigation Report on Water Pipeline Failure in Kebele 04"
                  value={createForm.title}
                  onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', fontSize: 13, outline: 'none',
                  }}
                />
              </div>

              {role === 'city_admin' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#334155', fontWeight: 700, marginBottom: 4 }}>
                    Department / Sector (Optional)
                  </label>
                  <select
                    value={createForm.department}
                    onChange={e => setCreateForm({ ...createForm, department: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', fontSize: 13, outline: 'none',
                    }}
                  >
                    <option value="">-- General Municipal Administration (Default) --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#334155', fontWeight: 700, marginBottom: 4 }}>
                  Linked Citizen Case (Optional)
                </label>
                <select
                  value={createForm.linked_citizen_report}
                  onChange={e => setCreateForm({ ...createForm, linked_citizen_report: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', fontSize: 13, outline: 'none',
                  }}
                >
                  <option value="">-- No Linked Citizen Case (General Departmental Report) --</option>
                  {citizenCases.map(c => (
                    <option key={c.id} value={c.id}>[{c.case_number}] {c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#334155', fontWeight: 700, marginBottom: 4 }}>
                  Executive Summary *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide a concise executive overview of the report..."
                  value={createForm.executive_summary}
                  onChange={e => setCreateForm({ ...createForm, executive_summary: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', fontSize: 13, outline: 'none', resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#334155', fontWeight: 700, marginBottom: 4 }}>
                  Detailed Findings & Evidence *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Detail observations, root cause analysis, evidence collected, timeline, and actions taken..."
                  value={createForm.findings}
                  onChange={e => setCreateForm({ ...createForm, findings: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', fontSize: 13, outline: 'none', resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#334155', fontWeight: 700, marginBottom: 4 }}>
                  Recommendations / Requested Directives (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Specify recommended corrective actions, budget/equipment allocations, or policy changes requested..."
                  value={createForm.recommendations}
                  onChange={e => setCreateForm({ ...createForm, recommendations: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', fontSize: 13, outline: 'none', resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#334155', fontWeight: 700, marginBottom: 4 }}>
                  Attachment URL / File Reference (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={createForm.attachment_url}
                  onChange={e => setCreateForm({ ...createForm, attachment_url: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', fontSize: 13, outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  style={{
                    padding: '9px 16px', borderRadius: 8,
                    background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '9px 20px', borderRadius: 8, border: 'none',
                    background: '#1D70B8', color: 'white', fontSize: 13, fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Submitting Dossier...' : 'Submit Official Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* High-Fidelity Print Styling for Official Government Documents */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          aside, header, nav, button, select, input, .no-print {
            display: none !important;
          }
          #official-dossier-printable, #official-dossier-printable * {
            visibility: visible;
          }
          #official-dossier-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #0f172a !important;
            padding: 24px !important;
            box-shadow: none !important;
            border: none !important;
          }
          #official-dossier-printable h2,
          #official-dossier-printable h3,
          #official-dossier-printable h4,
          #official-dossier-printable div,
          #official-dossier-printable span,
          #official-dossier-printable strong {
            color: #0f172a !important;
          }
          #official-dossier-printable .print-border {
            border-color: #cbd5e1 !important;
          }
        }
      `}</style>
    </div>
  )
}

