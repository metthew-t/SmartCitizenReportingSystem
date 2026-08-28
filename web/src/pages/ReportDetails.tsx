import React from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, User, FileText, Building2, Tag, AlertTriangle, ExternalLink, CheckCircle, XCircle } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

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

export default function ReportDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = React.useState<any>(null)
  const [messages, setMessages] = React.useState<any[]>([])
  const [newMessage, setNewMessage] = React.useState('')
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const token = useAuthStore.getState().token
        const headers = { 'Authorization': `Bearer ${token}` }
        
        const repRes = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/reports/${id}/`, { headers })
        if (repRes.ok) {
          const data = await repRes.json()
          setReport({
            id: data.id,
            caseNumber: data.case_number,
            departmentName: data.department_name || 'Unassigned',
            categoryName: data.category_name || 'General',
            citizenName: data.citizen?.full_name || 'Citizen',
            isAnonymous: data.is_anonymous,
            description: data.description,
            latitude: data.latitude,
            longitude: data.longitude,
            status: data.status,
            priority: data.priority,
            createdAt: data.created_at,
            aanaa: data.aanaa,
            kutaMagaalaa: data.kuta_magaalaa,
            iddooAddaa: data.iddoo_addaa,
          })
        }
        
        const msgRes = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/messages/?report=${id}`, { headers })
        if (msgRes.ok) {
          const msgData = await msgRes.json()
          setMessages(Array.isArray(msgData) ? msgData : (msgData.results || []))
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
          // Only update if messages changed to avoid re-renders
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

  if (loading) return <div style={{ padding: 40, color: '#e2e8f0' }}>Loading...</div>

  if (!report) {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif", textAlign: 'center', padding: 60 }}>
        <AlertTriangle size={48} color="#f59e0b" />
        <h2 style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 700, marginTop: 16 }}>
          Report Not Found
        </h2>
        <p style={{ color: '#64748b', fontSize: 14, margin: '8px 0 24px' }}>
          Report #{id} does not exist.
        </p>
        <button
          onClick={() => navigate('/reports')}
          style={{
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: 'rgba(99,102,241,0.15)', color: '#818cf8',
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
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const workflowStatuses = ['SUBMITTED', 'RECEIVED', 'ASSIGNED', 'UNDER_INVESTIGATION', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
  const currentIdx = workflowStatuses.indexOf(report.status)

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 800 }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/reports')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'none', border: 'none', color: '#818cf8',
          cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: 0,
          marginBottom: 20,
        }}
      >
        <ArrowLeft size={16} /> Back to Reports
      </button>

      {/* Header card */}
      <div style={{
        background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16,
        padding: 24, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ color: '#818cf8', fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>
              {report.caseNumber}
            </h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: `${STATUS_COLORS[report.status]}15`, color: STATUS_COLORS[report.status],
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[report.status] }} />
                {STATUS_LABELS[report.status]}
              </span>
              <span style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: `${PRIORITY_COLORS[report.priority]}12`, color: PRIORITY_COLORS[report.priority],
              }}>
                {report.priority}
              </span>
            </div>
          </div>
          <div style={{ color: '#64748b', fontSize: 12, textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} /> {formattedDate}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={{
        background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16,
        padding: 24, marginBottom: 16,
      }}>
        <h3 style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={16} color="#6366f1" /> Description
        </h3>
        <p style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
          {report.description}
        </p>
      </div>

      {/* Details grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16, marginBottom: 16,
      }}>
        <DetailCard
          icon={<User size={16} color="#f59e0b" />}
          label="Reporter"
          value={report.isAnonymous ? 'Anonymous Citizen' : report.citizenName}
          sublabel={report.isAnonymous ? 'Identity protected' : undefined}
        />
        <DetailCard
          icon={<Building2 size={16} color="#6366f1" />}
          label="Department"
          value={deptName}
        />
        <DetailCard
          icon={<Tag size={16} color="#8b5cf6" />}
          label="Category"
          value={catName}
        />
        <DetailCard
          icon={<MapPin size={16} color="#10b981" />}
          label="Location"
          value={
            [report.kutaMagaalaa, report.aanaa, report.iddooAddaa].filter(Boolean).join(', ') || 'No address provided'
          }
          sublabel={
            <div style={{ marginTop: 4 }}>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>Coordinates: </span>
              {report.latitude.toFixed(4)}°N, {report.longitude.toFixed(4)}°E
            </div>
          }
        />
        <DetailCard
          icon={<ExternalLink size={16} color="#3b82f6" />}
          label="Map Link"
          value="View on Maps"
          sublabel={
            <a
              href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6,
                padding: '4px 10px', borderRadius: 6, background: 'rgba(16,185,129,0.15)',
                color: '#10b981', textDecoration: 'none', fontSize: 11, fontWeight: 600,
                transition: 'all 0.2s', border: '1px solid rgba(16,185,129,0.3)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(16,185,129,0.25)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(16,185,129,0.2)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(16,185,129,0.15)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <ExternalLink size={12} /> Open in Google Maps
            </a>
          }
        />
      </div>

      {/* Status workflow */}
      <div style={{
        background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16,
        padding: 24,
      }}>
        <h3 style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, margin: '0 0 16px' }}>
          Report Workflow
        </h3>

        {/* Progress bar */}
        <div style={{
          height: 4, background: 'rgba(148,163,184,0.1)', borderRadius: 2,
          marginBottom: 16, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: `${currentIdx >= 0 ? ((currentIdx + 1) / workflowStatuses.length) * 100 : 0}%`,
            background: 'linear-gradient(90deg, #6366f1, #10b981)',
            transition: 'width 0.5s ease',
          }} />
        </div>

        {/* Status steps */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {workflowStatuses.map((status, idx) => {
            const isActive = status === report.status
            const isPast = idx <= currentIdx
            return (
              <div key={status} style={{
                flex: '1 1 auto', padding: '8px 12px', borderRadius: 8, textAlign: 'center',
                fontSize: 10, fontWeight: isActive ? 700 : 500,
                background: isActive
                  ? `${STATUS_COLORS[status]}20`
                  : isPast ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.03)',
                color: isActive
                  ? STATUS_COLORS[status]
                  : isPast ? '#94a3b8' : '#475569',
                border: `1px solid ${isActive ? STATUS_COLORS[status] + '40' : 'rgba(148,163,184,0.06)'}`,
                transition: 'all 0.3s',
              }}>
                {isActive && '● '}
                {STATUS_LABELS[status]}
              </div>
            )
          })}
        </div>

        {/* Reopened / Rejected special statuses */}
        {(report.status === 'REOPENED' || report.status === 'REJECTED') && (
          <div style={{
            marginTop: 12, padding: '8px 14px', borderRadius: 8,
            background: `${STATUS_COLORS[report.status]}15`,
            color: STATUS_COLORS[report.status],
            fontSize: 12, fontWeight: 600, textAlign: 'center',
          }}>
            ⚠️ This report has been {report.status.toLowerCase()}.
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 16, marginTop: 24, justifyContent: 'flex-end' }}>
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
            color: 'white', fontSize: 14, fontWeight: 600,
            transition: 'all 0.3s', boxShadow: '0 4px 15px rgba(225,29,72,0.3)',
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
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white', fontSize: 14, fontWeight: 600,
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
          <CheckCircle size={18} /> Resolve Issue
        </button>
      </div>

      {/* Chat Section */}
      <div style={{
        marginTop: 32, background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16,
        padding: 24,
      }}>
        <h3 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Chat & Updates</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, maxHeight: 300, overflowY: 'auto' }}>
          {messages.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 14, textAlign: 'center', padding: 20 }}>No messages yet.</div>
          ) : messages.map((msg, idx) => (
            <div key={idx} style={{
              alignSelf: msg.sender === useAuthStore.getState().user?.id ? 'flex-end' : 'flex-start',
              background: msg.sender === useAuthStore.getState().user?.id ? 'rgba(99,102,241,0.2)' : 'rgba(148,163,184,0.1)',
              padding: '10px 14px', borderRadius: 12, maxWidth: '80%',
              border: `1px solid ${msg.sender === useAuthStore.getState().user?.id ? 'rgba(99,102,241,0.4)' : 'rgba(148,163,184,0.2)'}`
            }}>
              <div style={{ fontSize: 14, color: '#e2e8f0' }}>{msg.content}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, textAlign: 'right' }}>
                {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 12,
              background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)',
              color: 'white', outline: 'none'
            }}
          />
          <button onClick={sendMessage} style={{
            padding: '12px 24px', borderRadius: 12, border: 'none', background: '#6366f1',
            color: 'white', fontWeight: 600, cursor: 'pointer'
          }}>Send</button>
        </div>
      </div>
    </div>
  )
}

function DetailCard({ icon, label, value, sublabel }: {
  icon: React.ReactNode; label: string; value: string; sublabel?: React.ReactNode
}) {
  return (
    <div style={{
      background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16,
      padding: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {icon}
        <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
      </div>
      <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>{value}</div>
      {sublabel && <div style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>{sublabel}</div>}
    </div>
  )
}
