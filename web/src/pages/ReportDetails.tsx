import React from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, User, FileText, Building2, Tag, AlertTriangle, ExternalLink, CheckCircle, XCircle, Navigation, Calendar, Phone, MapPinned, Home } from 'lucide-react'
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
  const [statusUpdating, setStatusUpdating] = React.useState(false)

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
            iddooAddaa: data.iddoo_addaa || '',
            media: data.media || [],
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

  const updateStatus = async (newStatus: string) => {
    setStatusUpdating(true)
    try {
      const token = useAuthStore.getState().token
      const res = await fetch(`https://smartcitizenreportingsystem.onrender.com/api/v1/reports/${id}/update_status/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        setReport((prev: any) => ({ ...prev, status: newStatus }))
      }
    } catch (err) {
      console.error("Failed to update status", err)
    } finally {
      setStatusUpdating(false)
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
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const formattedTime = createdDate.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  })

  const googleMapsDirectionUrl = `https://www.google.com/maps/dir/?api=1&destination=${report.latitude},${report.longitude}&travelmode=driving`
  const googleMapsUrl = `https://www.google.com/maps?q=${report.latitude},${report.longitude}&z=17`

  const workflowStatuses = ['SUBMITTED', 'RECEIVED', 'ASSIGNED', 'UNDER_INVESTIGATION', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
  const currentIdx = workflowStatuses.indexOf(report.status)

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 900 }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/reports')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
          color: '#a5b4fc', borderRadius: 10,
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

      {/* Header card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(99,102,241,0.08))',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(99,102,241,0.15)', borderRadius: 16,
        padding: 28, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ color: '#a5b4fc', fontSize: 26, fontWeight: 800, margin: '0 0 10px' }}>
              {report.caseNumber}
            </h2>
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
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: 13 }}>
              <Calendar size={14} color="#6366f1" />
              <span style={{ fontWeight: 600 }}>{formattedDate}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12, marginTop: 4 }}>
              <Clock size={12} />
              {formattedTime}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={{
        background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16,
        padding: 24, marginBottom: 20,
      }}>
        <h3 style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={18} color="#6366f1" /> Description
        </h3>
        <p style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.8, margin: 0 }}>
          {report.description}
        </p>
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
          icon={<Building2 size={18} color="#6366f1" />}
          label="Department"
          value={deptName}
          accentColor="#6366f1"
        />
        <DetailCard
          icon={<Tag size={18} color="#8b5cf6" />}
          label="Category"
          value={catName}
          accentColor="#8b5cf6"
        />
      </div>

      {/* Location Details — Full Address Info */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30,41,59,0.7), rgba(16,185,129,0.05))',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(16,185,129,0.15)', borderRadius: 16,
        padding: 24, marginBottom: 20,
      }}>
        <h3 style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={18} color="#10b981" /> Location Details
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
          {/* Aanaa */}
          <div style={{
            padding: '14px 16px', borderRadius: 12,
            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)',
          }}>
            <div style={{ color: '#64748b', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              📍 Aanaa (District)
            </div>
            <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>
              {report.aanaa || '—'}
            </div>
          </div>
          {/* Kuta Magaalaa */}
          <div style={{
            padding: '14px 16px', borderRadius: 12,
            background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)',
          }}>
            <div style={{ color: '#64748b', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              🏘️ Kuta Magaalaa (Sub-city)
            </div>
            <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>
              {report.kutaMagaalaa || '—'}
            </div>
          </div>
          {/* Iddoo Addaa */}
          <div style={{
            padding: '14px 16px', borderRadius: 12,
            background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.12)',
          }}>
            <div style={{ color: '#64748b', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              🏠 Iddoo Addaa (Specific Place)
            </div>
            <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>
              {report.iddooAddaa || '—'}
            </div>
          </div>
        </div>

        {/* Coordinates */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          padding: '10px 14px', borderRadius: 10, background: 'rgba(15,23,42,0.4)',
        }}>
          <MapPinned size={14} color="#10b981" />
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Coordinates:</span>
          <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>
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
        background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16,
        padding: 24, marginBottom: 20,
      }}>
        <h3 style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>
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
            background: 'linear-gradient(90deg, #6366f1, #10b981)',
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
        {(report.status === 'REOPENED' || report.status === 'REJECTED') && (
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 8,
            background: `${STATUS_COLORS[report.status]}15`,
            color: STATUS_COLORS[report.status],
            fontSize: 13, fontWeight: 600, textAlign: 'center',
            border: `1px solid ${STATUS_COLORS[report.status]}30`,
          }}>
            ⚠️ This report has been {report.status.toLowerCase()}.
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
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
      </div>

      {/* Chat Section */}
      <div style={{
        marginTop: 8, background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16,
        padding: 24,
      }}>
        <h3 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>💬 Chat & Updates</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, maxHeight: 300, overflowY: 'auto' }}>
          {messages.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 14, textAlign: 'center', padding: 20 }}>No messages yet.</div>
          ) : messages.map((msg, idx) => (
            <div key={idx} style={{
              alignSelf: msg.sender === useAuthStore.getState().user?.id ? 'flex-end' : 'flex-start',
              background: msg.sender === useAuthStore.getState().user?.id ? 'rgba(99,102,241,0.2)' : 'rgba(148,163,184,0.1)',
              padding: '12px 16px', borderRadius: 14, maxWidth: '80%',
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
              color: 'white', outline: 'none', fontSize: 14,
            }}
          />
          <button onClick={sendMessage} style={{
            padding: '12px 24px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14,
            transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.5)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.3)'}
          >Send</button>
        </div>
      </div>
    </div>
  )
}

function DetailCard({ icon, label, value, sublabel, accentColor = '#6366f1' }: {
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
        <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
      </div>
      <div style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 700 }}>{value}</div>
      {sublabel && <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{sublabel}</div>}
    </div>
  )
}
