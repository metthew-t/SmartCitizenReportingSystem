import React from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, User, FileText, Building2, Tag, AlertTriangle, ExternalLink, CheckCircle, XCircle, Navigation, Calendar, Phone, MapPinned, Home, Star, Scale, ShieldAlert, Check, X, Lock, ShieldCheck, Timer, Users, Camera, CheckCircle2, Hash, FileCheck2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { Colors, darkCard, darkCardElevated, statusBadgeStyle, priorityBadgeStyle, slaBadgeStyle, getSlaLabel, getSlaColor, Styles } from '../theme'

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: '#3B82F6', RECEIVED: '#3B82F6', ASSIGNED: '#F59E0B',
  UNDER_INVESTIGATION: '#F59E0B', IN_PROGRESS: '#0E7490',
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

export default function ReportDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = React.useState<any>(null)
  const [messages, setMessages] = React.useState<any[]>([])
  const [newMessage, setNewMessage] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [statusUpdating, setStatusUpdating] = React.useState(false)
  const [statusMsg, setStatusMsg] = React.useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [departments, setDepartments] = React.useState<any[]>([])
  const [selectedDept, setSelectedDept] = React.useState('')
  const [officers, setOfficers] = React.useState<any[]>([])
  const [selectedOfficer, setSelectedOfficer] = React.useState('')
  const [resolutionNotes, setResolutionNotes] = React.useState('')
  const [resolutionFile, setResolutionFile] = React.useState<File | null>(null)
  const [showResolveModal, setShowResolveModal] = React.useState(false)
  const resolveFileRef = React.useRef<HTMLInputElement>(null)
  const [showRejectModal, setShowRejectModal] = React.useState(false)
  const [rejectionReason, setRejectionReason] = React.useState('')
  const [rejectError, setRejectError] = React.useState('')
  const [statusHistory, setStatusHistory] = React.useState<any[]>([])
  const [officerNote, setOfficerNote] = React.useState('')
  const [officerSelectedStatus, setOfficerSelectedStatus] = React.useState('')

  // Citizen Appeals Adjudication state
  const [appealModal, setAppealModal] = React.useState<{ show: boolean; appeal: any | null }>({ show: false, appeal: null })
  const [appealStatus, setAppealStatus] = React.useState<'UPHELD' | 'DISMISSED' | 'UNDER_REVIEW'>('UPHELD')
  const [appealDecision, setAppealDecision] = React.useState('')
  const [resolutionProofUrl, setResolutionProofUrl] = React.useState('')
  const [auditTrail, setAuditTrail] = React.useState<any[]>([])
  const [showAuditSection, setShowAuditSection] = React.useState(false)
  const [isUpvoting, setIsUpvoting] = React.useState(false)
  const [upvoteMsg, setUpvoteMsg] = React.useState<string | null>(null)
  const [confirmingResolution, setConfirmingResolution] = React.useState(false)
  const [showDisputeModal, setShowDisputeModal] = React.useState(false)
  const [disputeNotes, setDisputeNotes] = React.useState('')
  const [adjudicating, setAdjudicating] = React.useState(false)
  const [appealMsg, setAppealMsg] = React.useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Mark this report as viewed in localStorage and notify top bar
  React.useEffect(() => {
    if (id) {
      try {
        const userId = useAuthStore.getState().user?.id || 'default'
        const key = `viewed_cases_${userId}`
        const current: number[] = JSON.parse(localStorage.getItem(key) || '[]')
        const numId = Number(id)
        if (!current.includes(numId)) {
          current.push(numId)
          localStorage.setItem(key, JSON.stringify(current))
          window.dispatchEvent(new Event('cases_viewed_updated'))
        }
      } catch (_) {}
    }
  }, [id])

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const token = useAuthStore.getState().token
        const headers = { 'Authorization': `Bearer ${token}` }
        
        const repRes = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/reports/${id}/`, { headers })
        let data: any = null;
        if (repRes.ok) {
          data = await repRes.json()
          setReport({
            id: data.id,
            caseNumber: data.case_number,
            departmentName: data.department_name || 'Unassigned',
            categoryName: data.category_name || 'General',
            citizenName: data.is_anonymous ? 'Anonymous' : (data.citizen_name || data.citizen?.full_name || 'Citizen'),
            citizenPhone: data.citizen_phone || '',
            isAnonymous: data.is_anonymous,
            description: data.description,
            latitude: data.latitude,
            longitude: data.longitude,
            status: data.status,
            priority: data.priority,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            aanaa: data.aanaa || '',
            kutaMagaalaa: data.kuta_magaalaa || '',
            kebele: data.kebele || '',
            iddooAddaa: data.iddoo_addaa || '',
            media: data.media || [],
            assigned_officer: data.assigned_officer,
            assignedOfficerName: data.assigned_officer_name,
            shared_with: data.shared_with || [],
            resolutionNotes: data.resolution_notes || '',
            rejection_reason: data.rejection_reason || '',
            sla_metrics: data.sla_metrics,
            sla_deadline: data.sla_deadline,
            sla_hours: data.sla_hours,
            is_escalated: data.is_escalated,
            escalation_level: data.escalation_level,
            escalation_reason: data.escalation_reason,
            resolution_proof_url: data.resolution_proof_url,
            citizen_confirmed_resolution: data.citizen_confirmed_resolution,
            citizen_confirmation_notes: data.citizen_confirmation_notes,
            affected_count: data.affected_count || 1,
            is_within_geofence: data.is_within_geofence !== false,
            geofence_info: data.geofence_info,
            feedback: data.feedback,
            appeals: data.appeals,
          })
        }
        
        const deptsRes = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/departments/`, { headers })
        if (deptsRes.ok) {
          const deptsData = await deptsRes.json()
          setDepartments(Array.isArray(deptsData) ? deptsData : deptsData.results || [])
        }

        if (useAuthStore.getState().role === 'department_manager' && data && data.primary_department) {
          const offRes = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/departments/${data.primary_department}/officers/`, { headers })
          if (offRes.ok) {
            setOfficers(await offRes.json())
          }
        }
        
        const msgRes = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/messages/?report=${id}`, { headers })
        if (msgRes.ok) {
          const msgData = await msgRes.json()
          setMessages(Array.isArray(msgData) ? msgData : (msgData.results || []))
        }

        const histRes = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/reports/${id}/status_history/`, { headers })
        try {
          const auditRes = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/reports/${id}/audit_trail/`, { headers })
          if (auditRes.ok) {
            const auditData = await auditRes.json()
            setAuditTrail(auditData.audit_chain || [])
          }
        } catch (_) {}
        if (histRes.ok) {
          setStatusHistory(await histRes.json())
        }
      } catch (err) {
        console.error("Failed to fetch report details", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])


  // Poll for new messages every 5 seconds
  React.useEffect(() => {
    if (!id) return;
    const interval = setInterval(async () => {
      try {
        const token = useAuthStore.getState().token
        const headers = { 'Authorization': `Bearer ${token}` }
        const msgRes = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/messages/?report=${id}`, { headers })
        if (msgRes.ok) {
          const msgData = await msgRes.json()
          const newMessages = Array.isArray(msgData) ? msgData : (msgData.results || [])
          setMessages(prev => {
            if (prev.length !== newMessages.length) return newMessages;
            return prev;
          })
        }
      } catch (err) {
        console.error("Polling error", err)
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const token = useAuthStore.getState().token
      const res = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/messages/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ report: id, content: newMessage })
      })
      if (res.ok) {
        setMessages([...messages, await res.json()])
        setNewMessage('')
      }
    } catch (err) {
      console.error("Failed to send message", err)
    }
  }

  const updateStatus = async (newStatus: string, note?: string) => {
    if (newStatus === 'RESOLVED') {
      setShowResolveModal(true)
      return
    }
    if (newStatus === 'REJECTED') {
      setShowRejectModal(true)
      return
    }

    setStatusUpdating(true)
    try {
      const token = useAuthStore.getState().token
      const res = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/reports/${id}/update_status/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note: note || '' })
      })
      if (res.ok) {
        setReport((prev: any) => ({ ...prev, status: newStatus }))
        setStatusMsg({ type: 'success', text: `✅ Status updated to ${STATUS_LABELS[newStatus] || newStatus}` })
        // Refresh status history
        const histRes = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/reports/${id}/status_history/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (histRes.ok) setStatusHistory(await histRes.json())
      } else {
        const errData = await res.json().catch(() => ({}))
        setStatusMsg({ type: 'error', text: `Failed: ${errData.error || errData.detail || res.statusText}` })
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Network error — could not update status.' })
    } finally {
      setStatusUpdating(false)
      setTimeout(() => setStatusMsg(null), 5000)
    }
  }

  const handleAdjudicateAppeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!appealModal.appeal) return
    if (!appealDecision.trim()) {
      setAppealMsg({ type: 'error', text: 'Administrative decision remarks are mandatory.' })
      return
    }

    setAdjudicating(true)
    setAppealMsg(null)
    try {
      const token = useAuthStore.getState().token
      const res = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/appeals/${appealModal.appeal.id}/review/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: appealStatus,
          reviewer_decision: appealDecision.trim()
        })
      })
      const data = await res.json()
      if (res.ok) {
        setAppealModal({ show: false, appeal: null })
        setAppealDecision('')
        setStatusMsg({ type: 'success', text: `Official Appeal decision recorded: ${appealStatus}` })
        // Refresh report
        const repRes = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/reports/${id}/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (repRes.ok) setReport(await repRes.json())
        const histRes = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/reports/${id}/status_history/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (histRes.ok) setStatusHistory(await histRes.json())
      } else {
        setAppealMsg({ type: 'error', text: data.error || 'Failed to adjudicate appeal.' })
      }
    } catch {
      setAppealMsg({ type: 'error', text: 'Network error submitting appeal review.' })
    } finally {
      setAdjudicating(false)
    }
  }

  const submitRejection = async () => {
    if (!rejectionReason.trim()) {
      setRejectError('Please provide a mandatory justification explaining why this report is rejected.')
      return
    }
    setRejectError('')
    setStatusUpdating(true)
    try {
      const token = useAuthStore.getState().token
      const res = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/reports/${id}/update_status/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
          rejection_reason: rejectionReason.trim(),
          note: rejectionReason.trim(),
        })
      })
      if (res.ok) {
        setReport((prev: any) => ({ ...prev, status: 'REJECTED', rejection_reason: rejectionReason.trim() }))
        setStatusMsg({ type: 'success', text: '✅ Report rejected with recorded justification.' })
        setShowRejectModal(false)
        setRejectionReason('')
        try {
          const histRes = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/reports/${id}/status_history/`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (histRes.ok) setStatusHistory(await histRes.json())
        } catch (_) {}
      } else {
        const errData = await res.json().catch(() => ({}))
        setRejectError(errData.error || 'Failed to reject report.')
      }
    } catch {
      setRejectError('Network error — could not update status.')
    } finally {
      setStatusUpdating(false)
      setTimeout(() => setStatusMsg(null), 5000)
    }
  }

  const handleUpvoteAffected = async () => {
    setIsUpvoting(true)
    try {
      const token = useAuthStore.getState().token
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/reports/${id}/upvote_affected/`, {
        method: 'POST', headers
      })
      const data = await res.json()
      if (res.ok) {
        setReport((prev: any) => ({ ...prev, affected_count: data.affected_count }))
        setUpvoteMsg(data.message || 'Priority reinforced! Thank you.')
      } else {
        setUpvoteMsg(data.message || 'Could not record upvote.')
      }
    } catch {
      setUpvoteMsg('Network error.')
    } finally {
      setIsUpvoting(false)
      setTimeout(() => setUpvoteMsg(null), 4000)
    }
  }

  const handleConfirmResolution = async (confirmed: boolean, notes: string = '') => {
    setConfirmingResolution(true)
    try {
      const token = useAuthStore.getState().token
      const res = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/reports/${id}/confirm_resolution/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed, notes })
      })
      const data = await res.json()
      if (res.ok) {
        setReport((prev: any) => ({
          ...prev,
          status: data.report_status,
          citizen_confirmed_resolution: data.citizen_confirmed,
          citizen_confirmation_notes: notes
        }))
        setStatusMsg({ type: 'success', text: data.message })
        setShowDisputeModal(false)
        setDisputeNotes('')
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to submit confirmation.' })
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Network error submitting verification.' })
    } finally {
      setConfirmingResolution(false)
      setTimeout(() => setStatusMsg(null), 5000)
    }
  }

  const submitResolution = async () => {
    setStatusUpdating(true)
    try {
      const token = useAuthStore.getState().token
      if (resolutionFile) {
        const formData = new FormData()
        formData.append('status', 'RESOLVED')
        formData.append('resolution_notes', resolutionNotes)
        formData.append('resolution_document', resolutionFile)
        formData.append('resolution_proof', resolutionFile)
        if (resolutionProofUrl.trim()) formData.append('resolution_proof_url', resolutionProofUrl.trim())
        const res = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/reports/${id}/update_status/`, {
          method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData,
        })
        if (res.ok) {
          setReport((prev: any) => ({ ...prev, status: 'RESOLVED', resolution_notes: resolutionNotes }))
          setStatusMsg({ type: 'success', text: '✅ Report resolved with attached document!' })
        } else {
          const errData = await res.json().catch(() => ({}))
          setStatusMsg({ type: 'error', text: `Failed: ${errData.error || errData.detail || 'Error'}` })
        }
      } else {
        const res = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/reports/${id}/update_status/`, {
          method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'RESOLVED',
            resolution_notes: resolutionNotes,
            resolution_proof_url: resolutionProofUrl.trim() || undefined
          })
        })
        if (res.ok) {
          setReport((prev: any) => ({ ...prev, status: 'RESOLVED', resolution_notes: resolutionNotes }))
          setStatusMsg({ type: 'success', text: '✅ Report resolved successfully!' })
        } else {
          const errData = await res.json().catch(() => ({}))
          setStatusMsg({ type: 'error', text: `Failed: ${errData.error || errData.detail || 'Error'}` })
        }
      }
      setShowResolveModal(false)
      setResolutionNotes('')
      setResolutionProofUrl('')
      setResolutionFile(null)
      // Refresh status history after resolving
      try {
        const token2 = useAuthStore.getState().token
        const histRes = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/reports/${id}/status_history/`, {
          headers: { 'Authorization': `Bearer ${token2}` }
        })
        if (histRes.ok) setStatusHistory(await histRes.json())
      } catch (_) {}
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Network error — could not update status.' })
    } finally {
      setStatusUpdating(false)
      setTimeout(() => setStatusMsg(null), 5000)
    }
  }

  if (loading) return <div style={{ padding: 40, color: '#F1F5F9' }}>Loading...</div>

  if (!report) {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif", textAlign: 'center', padding: 60 }}>
        <AlertTriangle size={48} color="#f59e0b" />
        <h2 style={{ color: '#F1F5F9', fontSize: 20, fontWeight: 700, marginTop: 16 }}>
          Report Not Found
        </h2>
        <p style={{ color: '#64748B', fontSize: 14, margin: '8px 0 24px' }}>
          Report #{id} does not exist.
        </p>
        <button
          onClick={() => navigate('/reports')}
          style={{
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: 'rgba(29,112,184,0.15)', color: '#93c5fd',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}
        >
          ← Back to Reports
        </button>
      </div>
    )
  }

  const deptName = report.departmentName
  const catName = report.categoryName
  const createdDate = new Date(report.createdAt)
  const formattedDate = createdDate.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const formattedTime = createdDate.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  })

  const googleMapsDirectionUrl = `https://www.google.com/maps/dir/?api=1&destination=${report.latitude},${report.longitude}&travelmode=driving`
  const googleMapsUrl = `https://www.google.com/maps?q=${report.latitude},${report.longitude}&z=17`

  const workflowStatuses = ['SUBMITTED', 'RECEIVED', 'ASSIGNED', 'UNDER_INVESTIGATION', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
  const currentIdx = workflowStatuses.indexOf(report.status)

  const currentUser = useAuthStore.getState().user
  const currentRole = useAuthStore.getState().role
  const isOfficer = currentRole === 'officer'
  const isManagerOrAdmin = currentRole === 'department_manager' || currentRole === 'city_admin' || currentRole === 'super_admin'
  const isAssignedToCurrentOfficer = Boolean(
    report.is_assigned_to_me ||
    (report.assigned_officer_user_id && report.assigned_officer_user_id === currentUser?.id) ||
    (report.assigned_officer && (report.assigned_officer === currentUser?.id || report.assigned_officer === (currentUser as any)?.officer_profile_id))
  )
  const canPerformCaseActions = isManagerOrAdmin || (isOfficer && isAssignedToCurrentOfficer)

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 900 }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/reports')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(29,112,184,0.2)',
          color: '#93c5fd', borderRadius: 10,
          cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: '8px 16px',
          marginBottom: 20, transition: 'all 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(99,102,241,0.2)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.2)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(99,102,241,0.1)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <ArrowLeft size={16} /> Back to Reports
      </button>

      {/* Auto-Escalation Banner if SLA breached or escalated */}
      {(report.is_escalated || (report.escalation_level && report.escalation_level !== 'NONE')) && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(245,158,11,0.15))',
          border: '1.5px solid rgba(239,68,68,0.4)', borderRadius: 16,
          padding: '16px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: '0 4px 20px rgba(239,68,68,0.15)'
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', flexShrink: 0
          }}>
            <ShieldAlert size={22} color="#ef4444" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fca5a5', fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🚨 SLA Escalation Alert — {report.escalation_level} Queue
            </div>
            <div style={{ color: '#F1F5F9', fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
              {report.escalation_reason || `This case has breached the statutory SLA resolution window and has been escalated for high-level municipal intervention.`}
            </div>
          </div>
        </div>
      )}

      {/* Header card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(99,102,241,0.08))',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(99,102,241,0.15)', borderRadius: 16,
        padding: 28, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
              <h2 style={{ color: '#93c5fd', fontSize: 26, fontWeight: 800, margin: 0 }}>{report.caseNumber}</h2>
              <button
                onClick={handleUpvoteAffected}
                disabled={isUpvoting}
                title="Click if you are also affected by this municipal issue"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: 'rgba(245,158,11,0.15)', color: '#fbbf24',
                  border: '1px solid rgba(245,158,11,0.35)', cursor: isUpvoting ? 'wait' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Users size={13} color="#f59e0b" />
                <span>{report.affected_count || 1} Citizens Affected (+1)</span>
              </button>
              {upvoteMsg && (
                <span style={{ fontSize: 12, color: '#34d399', fontWeight: 600 }}>{upvoteMsg}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                background: `${STATUS_COLORS[report.status]}20`, color: STATUS_COLORS[report.status],
                display: 'inline-flex', alignItems: 'center', gap: 6,
                border: `1px solid ${STATUS_COLORS[report.status]}30`,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[report.status], boxShadow: `0 0 8px ${STATUS_COLORS[report.status]}` }} />
                {STATUS_LABELS[report.status]}
              </span>
              <span style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: `${PRIORITY_COLORS[report.priority]}15`, color: PRIORITY_COLORS[report.priority],
                border: `1px solid ${PRIORITY_COLORS[report.priority]}25`,
              }}>
                ⚡ {report.priority}
              </span>
              {/* SLA Countdown Timer Badge */}
              {report.sla_metrics && (
                <span style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: report.sla_metrics.is_breached
                    ? 'rgba(239,68,68,0.18)'
                    : (report.sla_metrics.remaining_hours <= 4 ? 'rgba(245,158,11,0.18)' : 'rgba(16,185,129,0.18)'),
                  color: report.sla_metrics.is_breached
                    ? '#f87171'
                    : (report.sla_metrics.remaining_hours <= 4 ? '#fbbf24' : '#34d399'),
                  border: `1px solid ${report.sla_metrics.is_breached ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.35)'}`,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  <Timer size={13} />
                  {report.sla_metrics.is_breached
                    ? `SLA Breached (${Math.abs(report.sla_metrics.remaining_hours)}h overdue)`
                    : `${report.sla_metrics.remaining_hours}h SLA remaining`}
                </span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: 13 }}>
              <Calendar size={14} color="#1D70B8" />
              <span style={{ fontWeight: 600 }}>{formattedDate}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: 12, marginTop: 4 }}>
              <Clock size={12} />
              {formattedTime}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={{
        background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        padding: 24, marginBottom: 20,
      }}>
        <h3 style={{ color: '#0F172A', fontSize: 15, fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={18} color="#1D70B8" /> Description
        </h3>
        <p style={{ color: '#1E293B', fontSize: 14, lineHeight: 1.8, margin: 0 }}>
          {report.description}
        </p>

        {report.resolutionNotes && (
          <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <h4 style={{ margin: '0 0 8px', color: '#10b981', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ✅ Resolution Notes
            </h4>
            <p style={{ color: '#F1F5F9', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              {report.resolutionNotes}
            </p>
          </div>
        )}
      </div>

      {/* Citizen & Department Info */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16, marginBottom: 20,
      }}>
        <DetailCard
          icon={<User size={18} color="#f59e0b" />}
          label="Reporter"
          value={report.isAnonymous ? 'Anonymous Citizen' : report.citizenName}
          sublabel={report.isAnonymous ? '🔒 Identity protected' : (report.citizenPhone ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Phone size={11} color="#64748b" /> {report.citizenPhone}
            </span>
          ) : undefined)}
          accentColor="#f59e0b"
        />
        <DetailCard
          icon={<Building2 size={18} color="#1D70B8" />}
          label="Department"
          value={deptName}
          accentColor="#1D70B8"
        />
        <DetailCard
          icon={<Tag size={18} color="#0E7490" />}
          label="Category"
          value={catName}
          accentColor="#0E7490"
        />
        {report.assigned_officer && (
          <DetailCard
            icon={<User size={18} color="#10b981" />}
            label="Assigned To"
            value={report.assignedOfficerName || 'Officer'}
            accentColor="#10b981"
          />
        )}
      </div>

      {/* Location Details — Full Address Info */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30,41,59,0.7), rgba(16,185,129,0.05))',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(16,185,129,0.15)', borderRadius: 16,
        padding: 24, marginBottom: 20,
      }}>
        <h3 style={{ color: '#0F172A', fontSize: 15, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={18} color="#10b981" /> Location Details
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
          {/* Aanaa */}
          <div style={{
            padding: '14px 16px', borderRadius: 12,
            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)',
          }}>
            <div style={{ color: '#64748B', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              📍 Aanaa (District)
            </div>
            <div style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 600 }}>
              {report.aanaa || '—'}
            </div>
          </div>
          {/* Kuta Magaalaa */}
          <div style={{
            padding: '14px 16px', borderRadius: 12,
            background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)',
          }}>
            <div style={{ color: '#64748B', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              🏘️ Kuta Magaalaa (Sub-city)
            </div>
            <div style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 600 }}>
              {report.kutaMagaalaa || '—'}
            </div>
          </div>
          {/* Kebele */}
          <div style={{
            padding: '14px 16px', borderRadius: 12,
            background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)',
          }}>
            <div style={{ color: '#64748B', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              📍 Kebele
            </div>
            <div style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 600 }}>
              {(report as any).kebele || '—'}
            </div>
          </div>
          {/* Iddoo Addaa */}
          <div style={{
            padding: '14px 16px', borderRadius: 12,
            background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.12)',
          }}>
            <div style={{ color: '#64748B', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              🏠 Iddoo Addaa (Specific Place)
            </div>
            <div style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 600 }}>
              {report.iddooAddaa || '—'}
            </div>
          </div>
        </div>

        {/* Coordinates */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          padding: '10px 14px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0',
        }}>
          <MapPinned size={14} color="#10b981" />
          <span style={{ color: '#94A3B8', fontSize: 12 }}>Coordinates:</span>
          <span style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600 }}>
            {report.latitude?.toFixed(6)}°N, {report.longitude?.toFixed(6)}°E
          </span>
        </div>

        {/* Google Maps Buttons */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 20px', borderRadius: 12,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 700,
              transition: 'all 0.3s', boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(16,185,129,0.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(16,185,129,0.3)'
            }}
          >
            <ExternalLink size={16} /> View on Google Maps
          </a>
          <a
            href={googleMapsDirectionUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 20px', borderRadius: 12,
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 700,
              transition: 'all 0.3s', boxShadow: '0 4px 15px rgba(59,130,246,0.3)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(59,130,246,0.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(59,130,246,0.3)'
            }}
          >
            <Navigation size={16} /> Get Directions
          </a>
        </div>
      </div>

      {/* Status workflow */}
      <div style={{
        background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        padding: 24, marginBottom: 20,
      }}>
        <h3 style={{ color: '#0F172A', fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>
          Report Workflow
        </h3>

        {/* Progress bar */}
        <div style={{
          height: 6, background: 'rgba(148,163,184,0.1)', borderRadius: 3,
          marginBottom: 16, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 3,
            width: `${currentIdx >= 0 ? ((currentIdx + 1) / workflowStatuses.length) * 100 : 0}%`,
            background: 'linear-gradient(90deg, #1D70B8, #10b981)',
            transition: 'width 0.5s ease',
            boxShadow: '0 0 10px rgba(99,102,241,0.3)',
          }} />
        </div>

        {/* Status steps */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {workflowStatuses.map((status, idx) => {
            const isActive = status === report.status
            const isPast = idx <= currentIdx
            return (
              <div key={status} style={{
                flex: '1 1 auto', padding: '10px 12px', borderRadius: 8, textAlign: 'center',
                fontSize: 11, fontWeight: isActive ? 700 : 500,
                background: isActive
                  ? `${STATUS_COLORS[status]}25`
                  : isPast ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.03)',
                color: isActive
                  ? STATUS_COLORS[status]
                  : isPast ? '#94a3b8' : '#475569',
                border: `1px solid ${isActive ? STATUS_COLORS[status] + '50' : 'rgba(148,163,184,0.06)'}`,
                transition: 'all 0.3s',
                boxShadow: isActive ? `0 0 12px ${STATUS_COLORS[status]}20` : 'none',
              }}>
                {isActive && '● '}
                {STATUS_LABELS[status]}
              </div>
            )
          })}
        </div>

        {/* Reopened / Rejected special statuses */}
        {report.status === 'REOPENED' && (
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 8,
            background: `${STATUS_COLORS[report.status]}15`,
            color: STATUS_COLORS[report.status],
            fontSize: 13, fontWeight: 600, textAlign: 'center',
            border: `1px solid ${STATUS_COLORS[report.status]}30`,
          }}>
            ⚠️ This report has been reopened for further investigation.
          </div>
        )}

        {report.status === 'REJECTED' && (
          <div style={{
            marginTop: 14, padding: '14px 18px', borderRadius: 10,
            background: 'rgba(239,68,68,0.1)',
            border: '1.5px solid rgba(239,68,68,0.3)',
            textAlign: 'left',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              color: '#ef4444', fontSize: 14, fontWeight: 700, marginBottom: 6
            }}>
              <span>🚫 Report Rejected</span>
            </div>
            <div style={{ color: '#E2E8F0', fontSize: 13, lineHeight: 1.5 }}>
              <strong style={{ color: '#fca5a5' }}>Mandatory Justification / Reason: </strong>
              {report.rejection_reason || 'Case was rejected in accordance with municipal review criteria.'}
            </div>
          </div>
        )}
      </div>
      {/* ── Feature 4: Officer Field Verification "Before & After" Resolution Evidence ── */}
      {(report.resolution_proof_url || report.status === 'RESOLVED') && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(16,185,129,0.08))',
          backdropFilter: 'blur(12px)',
          border: '1.5px solid rgba(16,185,129,0.3)', borderRadius: 16,
          padding: 24, marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: '#34d399', fontSize: 16, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={20} color="#10b981" /> Verified Resolution Proof Evidence
            </h3>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
              background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)'
            }}>
              GovTech Resolution Standard
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* Before: Citizen Incident Media */}
            <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 14, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Camera size={14} /> Initial Citizen Evidence (Before)
              </div>
              {report.media && report.media.length > 0 ? (
                <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', height: 180 }}>
                  <img
                    src={report.media[0].file_url}
                    alt="Before evidence"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 4, color: 'white', fontSize: 10 }}>
                    Incident Reported
                  </div>
                </div>
              ) : (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                  No photo attached by citizen
                </div>
              )}
            </div>

            {/* After: Officer Resolution Proof Photo */}
            <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 14, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#34d399', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={14} color="#10b981" /> Field Repair Proof (After)
              </div>
              {report.resolution_proof_url ? (
                <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', height: 180 }}>
                  <img
                    src={report.resolution_proof_url}
                    alt="Resolution proof"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(16,185,129,0.85)', padding: '2px 8px', borderRadius: 4, color: 'white', fontSize: 10, fontWeight: 700 }}>
                    Official Completion Photo
                  </div>
                </div>
              ) : (
                <div style={{ height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                  <FileText size={28} color="#94a3b8" style={{ marginBottom: 6 }} />
                  <span>Work completion document on file</span>
                </div>
              )}
            </div>
          </div>

          {/* Citizen Quality Verification Section */}
          <div style={{ marginTop: 18, borderTop: '1px solid rgba(16,185,129,0.15)', paddingTop: 16 }}>
            {report.citizen_confirmed_resolution === true ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#34d399', fontSize: 13, fontWeight: 700 }}>
                <CheckCircle2 size={18} color="#10b981" />
                <span>Citizen Verified: Ground resolution confirmed and accepted by citizen.</span>
              </div>
            ) : report.citizen_confirmed_resolution === false ? (
              <div style={{ color: '#f87171', fontSize: 13 }}>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <XCircle size={18} color="#ef4444" />
                  <span>Resolution Disputed by Citizen (Case Reopened)</span>
                </div>
                {report.citizen_confirmation_notes && (
                  <div style={{ marginTop: 4, color: '#fca5a5', fontSize: 12, background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: 8 }}>
                    Citizen notes: "{report.citizen_confirmation_notes}"
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 700 }}>
                    Citizen Verification Required
                  </div>
                  <div style={{ color: '#94A3B8', fontSize: 12 }}>
                    Has this repair been completed to your satisfaction?
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    disabled={confirmingResolution}
                    onClick={() => handleConfirmResolution(true)}
                    style={{
                      padding: '8px 16px', borderRadius: 8, border: 'none',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                      boxShadow: '0 2px 10px rgba(16,185,129,0.3)'
                    }}
                  >
                    Confirm Resolution
                  </button>
                  <button
                    disabled={confirmingResolution}
                    onClick={() => setShowDisputeModal(true)}
                    style={{
                      padding: '8px 14px', borderRadius: 8,
                      border: '1px solid rgba(239,68,68,0.4)',
                      background: 'rgba(239,68,68,0.1)', color: '#fca5a5',
                      fontWeight: 600, fontSize: 12, cursor: 'pointer'
                    }}
                  >
                    Dispute / Reopen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Feature 7: Tamper-Proof Cryptographic Forensic Audit Trail ── */}
      <div style={{
        background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        padding: 24, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setShowAuditSection(!showAuditSection)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(29,112,184,0.15)', border: '1px solid rgba(29,112,184,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#93c5fd'
            }}>
              <Hash size={18} />
            </div>
            <div>
              <h3 style={{ color: '#0F172A', fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                Forensic Audit Trail & Cryptographic Chain
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                  background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)'
                }}>
                  SHA-256 Verified
                </span>
              </h3>
              <p style={{ color: '#64748B', fontSize: 12, margin: '2px 0 0' }}>
                Immutable event blocks • {auditTrail.length} logged actions
              </p>
            </div>
          </div>
          <button style={{
            background: 'rgba(148,163,184,0.1)', border: 'none', color: '#E2E8F0',
            borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
          }}>
            {showAuditSection ? 'Hide Audit Log' : 'View Audit Log'}
          </button>
        </div>

        {showAuditSection && (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {auditTrail.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                No audit blocks recorded yet for this report.
              </div>
            ) : (
              auditTrail.map((log: any, idx: number) => (
                <div key={log.id || idx} style={{
                  background: 'rgba(15,23,42,0.7)',
                  border: '1px solid rgba(29,112,184,0.18)',
                  borderRadius: 12, padding: 14,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#1D70B8' }}>Block #{idx + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>{log.action}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                        background: 'rgba(29,112,184,0.15)', color: '#93c5fd'
                      }}>
                        {log.actor_role || 'SYSTEM'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>
                      {new Date(log.timestamp).toLocaleString()} • IP: {log.ip_address || '127.0.0.1'}
                    </div>
                  </div>
                  <div style={{ color: '#E2E8F0', fontSize: 12, marginBottom: 8 }}>
                    Actor: <strong style={{ color: '#F1F5F9' }}>{log.actor_name || 'System'}</strong>
                  </div>
                  {log.tamper_hash && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: 6,
                      fontSize: 10, fontFamily: 'monospace', color: '#94A3B8'
                    }}>
                      <ShieldCheck size={12} color="#10b981" />
                      <span style={{ color: '#64748B' }}>Hash:</span>
                      <span style={{ color: '#34d399', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.tamper_hash}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Share Department: Exclusively for Department Managers for inter-departmental collaboration */}
      {useAuthStore.getState().role === 'department_manager' && departments.length > 0 && (
        <div style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          padding: 20, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16
        }}>
          <div style={{ color: '#0F172A', fontSize: 14, fontWeight: 600 }}>Share Report:</div>
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #CBD5E1', color: 'white', outline: 'none'
            }}
          >
            <option value="">Select a department...</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <button
            disabled={!selectedDept || statusUpdating}
            onClick={async () => {
              setStatusUpdating(true)
              try {
                const token = useAuthStore.getState().token
                const res = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/reports/${id}/share_report/`, {
                  method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ department_id: selectedDept })
                })
                if (res.ok) {
                  const data = await res.json()
                  setReport((prev: any) => ({ ...prev, shared_with: [...(prev.shared_with || []), data.department_name] }))
                  setSelectedDept('')
                  setStatusMsg({ type: 'success', text: 'The report was successfully shared!' })
                  setTimeout(() => setStatusMsg(null), 3000)
                } else {
                  setStatusMsg({ type: 'error', text: 'Failed to share the report.' })
                  setTimeout(() => setStatusMsg(null), 3000)
                }
              } finally {
                setStatusUpdating(false)
              }
            }}
            style={{
              padding: '10px 20px', borderRadius: 8, border: 'none',
              background: !selectedDept ? 'rgba(148,163,184,0.2)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: !selectedDept ? '#64748b' : 'white', fontWeight: 600, cursor: !selectedDept ? 'not-allowed' : 'pointer',
            }}
          >
            Share
          </button>
        </div>
      )}

      {/* Status Feedback Banner */}
      {statusMsg && (
        <div style={{
          padding: '14px 20px', borderRadius: 12, marginBottom: 16,
          background: statusMsg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${statusMsg.type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
          color: statusMsg.type === 'success' ? '#10b981' : '#ef4444',
          fontWeight: 600, fontSize: 14,
        }}>
          {statusMsg.text}
        </div>
      )}

      {/* Officer Update Status Panel or Locked Banner */}
      {isOfficer && !isAssignedToCurrentOfficer ? (
        <div style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          borderRadius: 16, padding: '20px 24px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24', flexShrink: 0
          }}>
            <Lock size={22} color="#f59e0b" />
          </div>
          <div>
            <div style={{ color: '#fbbf24', fontSize: 15, fontWeight: 700 }}>
              Operational Actions Locked — Awaiting Department Manager Assignment
            </div>
            <div style={{ color: '#94A3B8', fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
              You have read access to inspect this citizen report on your dashboard. However, status transitions, resolving issues, and citizen communications remain locked until your Department Manager officially designates and assigns this case to you.
            </div>
          </div>
        </div>
      ) : canPerformCaseActions ? (
        <div style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(59,130,246,0.06))',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(59,130,246,0.2)', borderRadius: 16,
          padding: 24, marginBottom: 20,
        }}>
          <h3 style={{ color: '#0F172A', fontSize: 15, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            🔄 Update Case Status
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {(isOfficer
                ? ['RECEIVED', 'UNDER_INVESTIGATION', 'IN_PROGRESS', 'RESOLVED']
                : ['RECEIVED', 'UNDER_INVESTIGATION', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED']
              ).map(s => (
                <button
                  key={s}
                  disabled={statusUpdating || report.status === s}
                  onClick={() => {
                    if (s === 'RESOLVED') { setShowResolveModal(true); return; }
                    updateStatus(s, officerNote);
                  }}
                  style={{
                    padding: '8px 16px', borderRadius: 8, cursor: report.status === s ? 'default' : 'pointer',
                    background: report.status === s
                      ? `${STATUS_COLORS[s]}40`
                      : `${STATUS_COLORS[s]}20`,
                    color: STATUS_COLORS[s],
                    fontWeight: 700, fontSize: 12,
                    border: `1px solid ${STATUS_COLORS[s]}${report.status === s ? '80' : '40'}`,
                    opacity: statusUpdating ? 0.5 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {report.status === s ? '● ' : ''}{STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <textarea
              value={officerNote}
              onChange={e => setOfficerNote(e.target.value)}
              placeholder="Add a note about this status update (optional)..."
              rows={2}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                background: '#FFFFFF', border: '1px solid #CBD5E1',
                color: '#F1F5F9', fontSize: 13, outline: 'none', resize: 'vertical',
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Status History Timeline */}
      {statusHistory.length > 0 && (
        <div style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          padding: 24, marginBottom: 20,
        }}>
          <h3 style={{ color: '#0F172A', fontSize: 15, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            📋 Case Update History
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {statusHistory.map((h, idx) => (
              <div key={h.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', paddingBottom: idx < statusHistory.length - 1 ? 16 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: `${STATUS_COLORS[h.new_status] || '#1D70B8'}20`,
                    border: `2px solid ${STATUS_COLORS[h.new_status] || '#1D70B8'}60`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14,
                  }}>
                    {h.new_status === 'RESOLVED' ? '✅' : h.new_status === 'CLOSED' ? '🔒' : h.new_status === 'REJECTED' ? '❌' : h.new_status === 'IN_PROGRESS' ? '⚙️' : h.new_status === 'UNDER_INVESTIGATION' ? '🔍' : h.new_status === 'ASSIGNED' ? '👤' : '📬'}
                  </div>
                  {idx < statusHistory.length - 1 && (
                    <div style={{ width: 2, flex: 1, minHeight: 16, background: 'rgba(148,163,184,0.15)', margin: '4px 0' }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: STATUS_COLORS[h.new_status] || '#e2e8f0', fontWeight: 700, fontSize: 13 }}>
                      {STATUS_LABELS[h.new_status] || h.new_status}
                    </span>
                    {h.old_status && (
                      <span style={{ color: '#64748B', fontSize: 11 }}>
                        (from {STATUS_LABELS[h.old_status] || h.old_status})
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>
                    by <span style={{ color: '#0F172A', fontWeight: 600 }}>{h.changed_by_name}</span>
                    {' · '}
                    {new Date(h.changed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {h.note && (
                    <div style={{
                      marginTop: 6, padding: '8px 12px', borderRadius: 8,
                      background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
                      color: '#E2E8F0', fontSize: 13, lineHeight: 1.5,
                    }}>
                      {h.note}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        
        {/* Manager assignment dropdown */}
        {!report.assigned_officer && useAuthStore.getState().role === 'department_manager' && officers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={selectedOfficer}
              onChange={e => setSelectedOfficer(e.target.value)}
              style={{
                padding: '12px 16px', borderRadius: 12, background: '#FFFFFF', border: '1px solid #CBD5E1', color: 'white', outline: 'none'
              }}
            >
              <option value="">Assign to officer...</option>
              {officers.map(o => (
                <option key={o.id} value={o.id}>{o.full_name}</option>
              ))}
            </select>
            <button
              disabled={!selectedOfficer || statusUpdating}
              onClick={async () => {
                setStatusUpdating(true)
                try {
                  const token = useAuthStore.getState().token
                  const res = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/reports/${id}/assign_officer/`, {
                    method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ officer_id: selectedOfficer })
                  })
                  const data = await res.json()
                  if (res.ok) {
                    setReport((prev: any) => ({ ...prev, assigned_officer: Number(selectedOfficer), assignedOfficerName: data.officer_name, status: 'ASSIGNED', is_assigned_to_me: true }))
                  }
                } finally {
                  setStatusUpdating(false)
                }
              }}
              style={{
                padding: '12px 24px', borderRadius: 12, border: 'none', cursor: !selectedOfficer ? 'not-allowed' : 'pointer',
                background: !selectedOfficer ? 'rgba(148,163,184,0.2)' : 'linear-gradient(135deg, #0E7490, #1D70B8)',
                color: !selectedOfficer ? '#64748b' : 'white', fontSize: 14, fontWeight: 700,
              }}
            >
              Assign
            </button>
          </div>
        )}

        {/* Reject Report — Strictly for Department Managers and City Admins */}
        {isManagerOrAdmin && (
          <button
            onClick={() => updateStatus('REJECTED')}
            disabled={statusUpdating}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
              color: 'white', fontSize: 14, fontWeight: 700,
              transition: 'all 0.3s', boxShadow: '0 4px 15px rgba(225,29,72,0.3)',
              opacity: statusUpdating ? 0.5 : 1,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(225,29,72,0.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(225,29,72,0.3)'
            }}
          >
            <XCircle size={18} /> Reject Report
          </button>
        )}

        {/* Resolve Issue — for Managers/Admins, or Assigned Officer */}
        {canPerformCaseActions && (
          <button
            onClick={() => updateStatus('RESOLVED')}
            disabled={statusUpdating}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white', fontSize: 14, fontWeight: 700,
              transition: 'all 0.3s', boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
              opacity: statusUpdating ? 0.5 : 1,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(16,185,129,0.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(16,185,129,0.3)'
            }}
          >
            <CheckCircle size={18} /> Resolve Issue
          </button>
        )}
      </div>

      {/* Chat Section */}
      <div style={{
        marginTop: 8, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        padding: 24,
      }}>
        <h3 style={{ color: '#0F172A', fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>💬 Chat & Updates</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, maxHeight: 300, overflowY: 'auto' }}>
          {messages.length === 0 ? (
            <div style={{ color: '#64748B', fontSize: 14, textAlign: 'center', padding: 20 }}>No messages yet.</div>
          ) : messages.map((msg, idx) => {
            const isMe = msg.sender === useAuthStore.getState().user?.id;
            return (
              <div key={idx} style={{
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                background: isMe ? 'rgba(99,102,241,0.2)' : 'rgba(148,163,184,0.1)',
                padding: '12px 16px', borderRadius: 14, maxWidth: '80%',
                border: `1px solid ${isMe ? 'rgba(99,102,241,0.4)' : 'rgba(148,163,184,0.2)'}`
              }}>
                <div style={{ fontSize: 11, color: isMe ? '#93c5fd' : '#94a3b8', marginBottom: 4, fontWeight: 600 }}>
                  {isMe ? 'You' : (msg.sender_name || 'Citizen')}
                </div>
                <div style={{ fontSize: 14, color: isMe ? '#FFFFFF' : '#0F172A' }}>{msg.content}</div>
                <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, textAlign: 'right' }}>
                  {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            )
          })}
        </div>
        {isOfficer && !isAssignedToCurrentOfficer ? (
          <div style={{
            display: 'flex', gap: 10, alignItems: 'center',
            background: '#F8FAFC', padding: '14px 18px', borderRadius: 12, border: '1px solid #E2E8F0'
          }}>
            <Lock size={16} color="#fbbf24" />
            <span style={{ color: '#fbbf24', fontSize: 13, fontWeight: 600 }}>
              Communications locked. Only the designated assigned officer can send messages to the citizen on this case.
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 12,
                background: '#FFFFFF', border: '1px solid #CBD5E1',
                color: 'white', outline: 'none', fontSize: 14,
              }}
            />
            <button onClick={sendMessage} style={{
              padding: '12px 24px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #1D70B8, #0F2942)',
              color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14,
              transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.5)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.3)'}
            >Send</button>
          </div>
        )}
      </div>

      {/* Citizen Feedback & Satisfaction Card */}
      {report.feedback ? (
        <div style={{
          marginTop: 20,
          background: 'linear-gradient(135deg, rgba(30,41,59,0.85), rgba(245,158,11,0.06))',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(245,158,11,0.25)', borderRadius: 16,
          padding: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <h3 style={{ color: '#fbbf24', fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              ⭐ Citizen Service Feedback
            </h3>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>
              Submitted on {new Date(report.feedback.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 16 }}>
            <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600 }}>Overall Rating</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#fbbf24' }}>{report.feedback.rating} / 5</span>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={14} fill={s <= report.feedback.rating ? '#fbbf24' : 'transparent'} color={s <= report.feedback.rating ? '#fbbf24' : '#64748b'} />
                  ))}
                </div>
              </div>
            </div>

            {report.feedback.timeliness_rating && (
              <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600 }}>Response Timeliness</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#1D70B8' }}>{report.feedback.timeliness_rating} / 5</span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={12} fill={s <= report.feedback.timeliness_rating ? '#38bdf8' : 'transparent'} color={s <= report.feedback.timeliness_rating ? '#38bdf8' : '#64748b'} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {report.feedback.quality_rating && (
              <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600 }}>Resolution Quality</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#34d399' }}>{report.feedback.quality_rating} / 5</span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={12} fill={s <= report.feedback.quality_rating ? '#34d399' : 'transparent'} color={s <= report.feedback.quality_rating ? '#34d399' : '#64748b'} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {report.feedback.comment && (
            <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 12, color: '#E2E8F0', fontStyle: 'italic', lineHeight: 1.6 }}>
                "{report.feedback.comment}"
              </div>
            </div>
          )}
        </div>
      ) : (report.status === 'RESOLVED' || report.status === 'CLOSED') ? (
        <div style={{
          marginTop: 20, padding: 18, borderRadius: 16,
          background: 'rgba(17,31,53,0.8)', border: '1px dashed rgba(148,163,184,0.15)',
          display: 'flex', alignItems: 'center', gap: 10, color: '#94A3B8', fontSize: 13,
        }}>
          <Star size={18} color="#f59e0b" />
          <span>Case is resolved. Waiting for citizen feedback rating.</span>
        </div>
      ) : null}

      {/* Citizen Administrative Appeals Section */}
      <div style={{
        marginTop: 20,
        background: 'linear-gradient(135deg, rgba(30,41,59,0.85), rgba(99,102,241,0.06))',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(29,112,184,0.2)', borderRadius: 16,
        padding: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ color: '#0F172A', fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Scale size={20} color="#93c5fd" /> Citizen Administrative Appeals
            {report.appeals && report.appeals.length > 0 && (
              <span style={{
                background: 'rgba(29,112,184,0.25)', color: '#c7d2fe', padding: '2px 8px',
                borderRadius: 12, fontSize: 12, fontWeight: 700, border: '1px solid rgba(29,112,184,0.35)'
              }}>
                {report.appeals.length}
              </span>
            )}
          </h3>
        </div>

        {(!report.appeals || report.appeals.length === 0) ? (
          <div style={{ color: '#64748B', fontSize: 13, padding: '12px 0' }}>
            No administrative appeals lodged for this case. Citizens have the legal right to lodge an appeal if they believe their case was improperly rejected or resolved.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {report.appeals.map((appeal: any) => {
              const statusBg: Record<string, string> = {
                SUBMITTED: 'rgba(234, 179, 8, 0.15)',
                UNDER_REVIEW: 'rgba(59, 130, 246, 0.15)',
                UPHELD: 'rgba(16, 185, 129, 0.15)',
                DISMISSED: 'rgba(239, 68, 68, 0.15)',
              }
              const statusCol: Record<string, string> = {
                SUBMITTED: '#eab308',
                UNDER_REVIEW: '#60a5fa',
                UPHELD: '#34d399',
                DISMISSED: '#f87171',
              }
              const canAdjudicate = ['super_admin', 'city_admin', 'department_manager'].includes(useAuthStore.getState().role || '')

              return (
                <div key={appeal.id} style={{
                  background: 'rgba(15,23,42,0.65)', border: '1px solid rgba(29,112,184,0.2)',
                  borderRadius: 14, padding: 18,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    <div>
                      <div style={{ color: '#93c5fd', fontWeight: 800, fontSize: 14 }}>
                        {appeal.appeal_number}
                      </div>
                      <div style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>
                        Lodged on {new Date(appeal.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                        background: statusBg[appeal.status] || 'rgba(148,163,184,0.15)',
                        color: statusCol[appeal.status] || '#94a3b8',
                        border: `1px solid ${statusCol[appeal.status] || '#94a3b8'}40`,
                      }}>
                        {appeal.status}
                      </span>
                      {canAdjudicate && (
                        <button
                          onClick={() => {
                            setAppealModal({ show: true, appeal })
                            setAppealStatus(appeal.status === 'SUBMITTED' ? 'UPHELD' : appeal.status)
                            setAppealDecision(appeal.reviewer_decision || '')
                          }}
                          style={{
                            padding: '6px 12px', borderRadius: 8, border: 'none',
                            background: 'linear-gradient(135deg, #1D70B8, #0F2942)',
                            color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          Adjudicate
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                      Grounds for Appeal / Sababa Iyyannoo
                    </div>
                    <div style={{ color: '#F1F5F9', fontSize: 13, lineHeight: 1.6, background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: 8 }}>
                      {appeal.reason}
                    </div>
                  </div>

                  {appeal.desired_outcome && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                        Desired Citizen Outcome
                      </div>
                      <div style={{ color: '#E2E8F0', fontSize: 12 }}>
                        {appeal.desired_outcome}
                      </div>
                    </div>
                  )}

                  {appeal.reviewer_decision && (
                    <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: appeal.status === 'UPHELD' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${appeal.status === 'UPHELD' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: appeal.status === 'UPHELD' ? '#34d399' : '#f87171', textTransform: 'uppercase' }}>
                          ⚖️ Official Determination by {appeal.reviewer_name || 'Administrative Reviewer'}
                        </span>
                        {appeal.reviewed_at && (
                          <span style={{ fontSize: 10, color: '#94A3B8' }}>
                            {new Date(appeal.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: '#F1F5F9', lineHeight: 1.5 }}>
                        {appeal.reviewer_decision}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {showResolveModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
          }}>
            <h3 style={{ color: '#0F172A', margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>
              ✅ Resolve Report
            </h3>
            <p style={{ color: '#94A3B8', fontSize: 13, marginBottom: 16 }}>
              Describe how this issue was resolved. You can also attach supporting documents.
            </p>

            {/* Method 1: Write resolution notes */}
            <label style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Resolution Notes</label>
            <textarea
              value={resolutionNotes}
              onChange={e => setResolutionNotes(e.target.value)}
              placeholder="Describe how the issue was resolved..."
              rows={4}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                background: '#FFFFFF', border: '1px solid #CBD5E1',
                color: '#F1F5F9', fontSize: 13, outline: 'none', resize: 'vertical', marginBottom: 16
              }}
            />

            {/* Method 2: Upload document */}
            <label style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Attach Document (optional)
            </label>
            <div
              onClick={() => resolveFileRef.current?.click()}
              style={{
                padding: 16, borderRadius: 10, cursor: 'pointer',
                border: '2px dashed rgba(148,163,184,0.2)', textAlign: 'center',
                background: resolutionFile ? 'rgba(16,185,129,0.05)' : 'rgba(15,23,42,0.3)',
                marginBottom: 20, transition: 'all 0.2s',
              }}
            >
              {resolutionFile ? (
                <div style={{ color: '#10b981', fontSize: 13, fontWeight: 600 }}>
                  📄 {resolutionFile.name} ({(resolutionFile.size / 1024).toFixed(1)} KB)
                  <div style={{ color: '#64748B', fontSize: 11, marginTop: 4 }}>Click to change</div>
                </div>
              ) : (
                <div style={{ color: '#64748B', fontSize: 13 }}>
                  📎 Click to upload PDF, Word, or image file
                </div>
              )}
            </div>
            <input
              ref={resolveFileRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={e => setResolutionFile(e.target.files?.[0] || null)}
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setShowResolveModal(false); setResolutionNotes(''); setResolutionFile(null); }}
                style={{
                  flex: 1, padding: 12, borderRadius: 8, border: '1px solid rgba(29,112,184,0.25)',
                  background: 'transparent', color: '#94A3B8', fontWeight: 600, cursor: 'pointer'
                }}
              >Cancel</button>
              <button
                onClick={submitResolution}
                disabled={statusUpdating}
                style={{
                  flex: 1, padding: 12, borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white', fontWeight: 600, cursor: statusUpdating ? 'not-allowed' : 'pointer',
                  opacity: statusUpdating ? 0.6 : 1,
                }}
              >{statusUpdating ? 'Submitting...' : 'Submit Resolution'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Rejection Reason Modal */}
      {showRejectModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16
        }}>
          <div style={{
            background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: 24, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)'
          }}>
            <h3 style={{ color: '#f87171', margin: '0 0 10px', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              ⚠️ Reject Incident Report
            </h3>
            <p style={{ color: '#94A3B8', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
              In accordance with municipal transparency regulations, you must provide a clear and formal justification explaining why this case is rejected (e.g., duplicate filing, out-of-jurisdiction, unsubstantiated claim).
            </p>

            {rejectError && (
              <div style={{
                padding: '10px 12px', borderRadius: 8, marginBottom: 14,
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444', fontSize: 12, fontWeight: 600
              }}>
                {rejectError}
              </div>
            )}

            <label style={{ color: '#475569', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Mandatory Rejection Justification / Sababa Kufaa *
            </label>
            <textarea
              value={rejectionReason}
              onChange={e => { setRejectionReason(e.target.value); setRejectError(''); }}
              placeholder="State the official ground for rejecting this report..."
              rows={4}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', fontSize: 13, outline: 'none', resize: 'vertical', marginBottom: 20
              }}
            />

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => { setShowRejectModal(false); setRejectionReason(''); setRejectError(''); }}
                style={{
                  flex: 1, padding: 12, borderRadius: 8, border: '1px solid rgba(29,112,184,0.25)',
                  background: 'transparent', color: '#94A3B8', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRejection}
                disabled={statusUpdating}
                style={{
                  flex: 1, padding: 12, borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white', fontWeight: 700, cursor: statusUpdating ? 'not-allowed' : 'pointer',
                  opacity: statusUpdating ? 0.6 : 1, boxShadow: '0 4px 14px rgba(239,68,68,0.35)'
                }}
              >
                {statusUpdating ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appeal Adjudication Modal */}
      {appealModal.show && appealModal.appeal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16
        }}>
          <div style={{
            background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 24, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)'
          }}>
            <h3 style={{ color: '#93c5fd', margin: '0 0 8px', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Scale size={20} color="#93c5fd" /> Adjudicate Administrative Appeal
            </h3>
            <p style={{ color: '#94A3B8', fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
              Review the citizen's grievance for case #{report.caseNumber} ({appealModal.appeal.appeal_number}). Upholding an appeal will immediately return the case to <strong style={{ color: '#f87171' }}>REOPENED</strong> status for mandatory department corrective action.
            </p>

            <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 10, marginBottom: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>CITIZEN'S GROUNDS:</div>
              <div style={{ color: '#0F172A', fontSize: 13, marginTop: 4, fontStyle: 'italic' }}>
                "{appealModal.appeal.reason}"
              </div>
            </div>

            {appealMsg && (
              <div style={{
                padding: '10px 12px', borderRadius: 8, marginBottom: 14,
                background: appealMsg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                border: `1px solid ${appealMsg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: appealMsg.type === 'success' ? '#10b981' : '#ef4444',
                fontSize: 12, fontWeight: 600
              }}>
                {appealMsg.text}
              </div>
            )}

            <form onSubmit={handleAdjudicateAppeal}>
              <label style={{ color: '#E2E8F0', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Administrative Determination *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                {[
                  { value: 'UPHELD', label: 'Upheld (Reopen Case)', col: '#10b981' },
                  { value: 'DISMISSED', label: 'Dismissed (Reject)', col: '#ef4444' },
                  { value: 'UNDER_REVIEW', label: 'Under Review', col: '#3b82f6' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAppealStatus(opt.value as any)}
                    style={{
                      padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                      background: appealStatus === opt.value ? `${opt.col}25` : 'rgba(15,23,42,0.5)',
                      color: appealStatus === opt.value ? opt.col : '#94a3b8',
                      border: `1px solid ${appealStatus === opt.value ? opt.col : 'rgba(148,163,184,0.2)'}`,
                      fontWeight: 700, fontSize: 11, textAlign: 'center'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <label style={{ color: '#E2E8F0', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Written Official Determination / Justification *
              </label>
              <textarea
                value={appealDecision}
                onChange={e => setAppealDecision(e.target.value)}
                placeholder="State the formal basis of this ruling and directives for the department..."
                rows={4}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                  background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', fontSize: 13, outline: 'none', resize: 'vertical', marginBottom: 20
                }}
              />

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => { setAppealModal({ show: false, appeal: null }); setAppealMsg(null); }}
                  style={{
                    flex: 1, padding: 12, borderRadius: 8, border: '1px solid rgba(29,112,184,0.25)',
                    background: 'transparent', color: '#94A3B8', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjudicating}
                  style={{
                    flex: 1, padding: 12, borderRadius: 8, border: 'none',
                    background: 'linear-gradient(135deg, #1D70B8, #0F2942)',
                    color: 'white', fontWeight: 700, cursor: adjudicating ? 'not-allowed' : 'pointer',
                    opacity: adjudicating ? 0.6 : 1, boxShadow: '0 4px 14px rgba(99,102,241,0.35)'
                  }}
                >
                  {adjudicating ? 'Recording Ruling...' : 'Submit Ruling'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailCard({ icon, label, value, sublabel, accentColor = '#1D70B8' }: {
  icon: React.ReactNode; label: string; value: string; sublabel?: React.ReactNode; accentColor?: string
}) {
  return (
    <div style={{
      background: `linear-gradient(135deg, rgba(30,41,59,0.7), ${accentColor}08)`,
      backdropFilter: 'blur(12px)',
      border: `1px solid ${accentColor}15`, borderRadius: 16,
      padding: 20, transition: 'all 0.3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {icon}
        <span style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
      </div>
      <div style={{ color: '#0F172A', fontSize: 15, fontWeight: 700 }}>{value}</div>
      {sublabel && <div style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>{sublabel}</div>}
    </div>
  )
}
