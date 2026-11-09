import React from 'react'
import { MessageSquare, Send, Building2, Users, Search, Circle, CheckCheck, Eye } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

const API = 'https://smartcitizenreportingsystem.onrender.com/api/v1'

export default function DeptChat() {
  const { token, user, role } = useAuthStore()
  const [departments, setDepartments] = React.useState<any[]>([])
  const [selectedDept, setSelectedDept] = React.useState<any>(null)
  const [messages, setMessages] = React.useState<any[]>([])
  const [seenUsers, setSeenUsers] = React.useState<any[]>([])
  const [newMsg, setNewMsg] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [sending, setSending] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  React.useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await fetch(`${API}/departments/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          const list = Array.isArray(data) ? data : data.results || []
          setDepartments(list)
          if (list.length > 0) {
            setSelectedDept((prev: any) => {
              if (prev) return prev
              const mine = list.find((d: any) => d.name === user?.department_name)
              return mine || list[0]
            })
          }
        }
      } finally {
        setLoading(false)
      }
    }
    fetchDepts()
  }, [token])

  const markAndFetchSeen = React.useCallback(async () => {
    if (!selectedDept) return
    try {
      // Mark current user presence as seen
      await fetch(`${API}/dept-messages/mark-seen/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ department_id: selectedDept.id })
      })
      // Fetch users who have viewed this channel
      const res = await fetch(`${API}/dept-messages/seen-list/?department_id=${selectedDept.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSeenUsers(Array.isArray(data) ? data : [])
      }
    } catch {}
  }, [selectedDept, token])

  const fetchMessages = React.useCallback(async () => {
    if (!selectedDept) return
    try {
      const res = await fetch(`${API}/dept-messages/?department=${selectedDept.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(Array.isArray(data) ? data : data.results || [])
      }
    } catch {}
  }, [selectedDept, token])

  React.useEffect(() => {
    if (selectedDept) {
      fetchMessages()
      markAndFetchSeen()
      const interval = setInterval(() => {
        fetchMessages()
        markAndFetchSeen()
      }, 4000)
      return () => clearInterval(interval)
    }
  }, [selectedDept, fetchMessages, markAndFetchSeen])

  React.useEffect(() => { scrollToBottom() }, [messages])

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedDept) return
    setSending(true)
    try {
      const res = await fetch(`${API}/dept-messages/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: selectedDept.id, content: newMsg.trim() })
      })
      if (res.ok) {
        const msg = await res.json()
        setMessages(prev => [...prev, msg])
        setNewMsg('')
      }
    } finally {
      setSending(false)
    }
  }

  const myDept = departments.find(d => d.name === user?.department_name)
  const otherDepts = departments.filter(d => 
    (!myDept || d.id !== myDept.id) && d.name?.toLowerCase().includes(search.toLowerCase())
  )

  // Only officers are restricted to their own department.
  // Department managers, city admins, super admins, and mayors can chat with all departments!
  const isManagerOrAdmin = role !== 'officer'

  return (
    <div style={{
      fontFamily: "'Inter', sans-serif", height: 'calc(100vh - 80px)',
      display: 'flex', background: '#FFFFFF',
      borderRadius: 16, overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
    }}>
      {/* Sidebar */}
      <div style={{
        width: 280, background: '#F8FAFC',
        borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #1D70B8, #0F2942)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Building2 size={18} color="white" />
            </div>
            <div>
              <div style={{ color: '#0F172A', fontWeight: 700, fontSize: 15 }}>Department Chat</div>
              <div style={{ color: '#64748B', fontSize: 11 }}>Internal & Inter-department</div>
            </div>
          </div>
          {isManagerOrAdmin && (
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#64748b" style={{ position: 'absolute', left: 10, top: 10 }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search departments..."
                style={{
                  width: '100%', padding: '8px 8px 8px 32px', borderRadius: 8, boxSizing: 'border-box',
                  background: '#FFFFFF', border: '1px solid #CBD5E1',
                  color: '#0F172A', fontSize: 13, outline: 'none',
                }}
              />
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <div style={{ padding: 20, color: '#64748B', textAlign: 'center', fontSize: 13 }}>Loading...</div>
          ) : (
            <>
              {myDept && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ padding: '0 16px', fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: 4 }}>
                    My Department
                  </div>
                  <div
                    onClick={() => setSelectedDept(myDept)}
                    style={{
                      padding: '12px 16px', cursor: 'pointer',
                      background: selectedDept?.id === myDept.id ? 'rgba(29,112,184,0.1)' : 'transparent',
                      borderLeft: selectedDept?.id === myDept.id ? '3px solid #1D70B8' : '3px solid transparent',
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 12,
                    }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: `hsl(${(myDept.id * 37) % 360}, 60%, 35%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, color: 'white',
                    }}>
                      {myDept.name?.charAt(0) || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: selectedDept?.id === myDept.id ? '#1D70B8' : '#334155',
                        fontSize: 13, fontWeight: 600,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>{myDept.name}</div>
                    </div>
                  </div>
                </div>
              )}

              {isManagerOrAdmin && otherDepts.length > 0 && (
                <div>
                  <div style={{ padding: '0 16px', fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: 4 }}>
                    {myDept ? 'Other Departments' : 'All Departments'}
                  </div>
                  {otherDepts.map(dept => (
                    <div
                      key={dept.id}
                      onClick={() => setSelectedDept(dept)}
                      style={{
                        padding: '12px 16px', cursor: 'pointer',
                        background: selectedDept?.id === dept.id ? 'rgba(29,112,184,0.1)' : 'transparent',
                        borderLeft: selectedDept?.id === dept.id ? '3px solid #1D70B8' : '3px solid transparent',
                        transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 12,
                      }}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        background: `hsl(${(dept.id * 37) % 360}, 60%, 35%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700, color: 'white',
                      }}>
                        {dept.name?.charAt(0) || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          color: selectedDept?.id === dept.id ? '#1D70B8' : '#334155',
                          fontSize: 13, fontWeight: 600,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>{dept.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>

        <div style={{
          padding: '12px 16px', borderTop: '1px solid #E2E8F0',
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0
          }}>
            {(user?.name || 'U').charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#0F172A', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'You'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Circle size={6} color="#10b981" fill="#10b981" />
              <span style={{ color: '#10b981', fontSize: 10 }}>Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      {!selectedDept ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageSquare size={36} color="#1D70B8" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#0F172A', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Select a Department</div>
            <div style={{ color: '#64748B', fontSize: 14 }}>Choose a department to start inter-department communication</div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{
            padding: '16px 24px', borderBottom: '1px solid #E2E8F0',
            background: '#FFFFFF',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: `hsl(${(selectedDept.id * 37) % 360}, 60%, 35%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: 'white',
            }}>
              {selectedDept.name?.charAt(0)}
            </div>
            <div>
              <div style={{ color: '#0F172A', fontWeight: 700, fontSize: 15 }}>{selectedDept.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <Users size={11} color="#64748b" />
                <span style={{ color: '#64748B', fontSize: 11 }}>Department channel — all members can see messages</span>
              </div>
            </div>
          </div>

          <div style={{
            flex: 1, overflowY: 'auto', padding: '20px 24px', background: '#F8FAFC',
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748B', fontSize: 14, margin: 'auto' }}>
                No messages yet. Start the conversation!
              </div>
            ) : messages.map((msg, idx) => {
              const currentUserId = user?.id ? String(user.id) : null
              const isMe = Boolean(
                (currentUserId && String(msg.sender) === currentUserId) ||
                (user?.email && msg.sender_email && msg.sender_email.toLowerCase() === user.email.toLowerCase()) ||
                (user?.name && msg.sender_name && msg.sender_name.toLowerCase() === user.name.toLowerCase())
              )
              return (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                  gap: 10,
                  alignItems: 'flex-end'
                }}>
                  {!isMe && (
                    <div style={{
                      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                      background: `hsl(${((msg.sender || 0) * 73) % 360}, 50%, 35%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: 'white', overflow: 'hidden'
                    }}>
                      {msg.sender_photo_url ? (
                        <img src={msg.sender_photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => ((e.currentTarget as HTMLElement).style.display = 'none')} />
                      ) : (
                        (msg.sender_name || 'U').charAt(0)
                      )}
                    </div>
                  )}
                  <div style={{ maxWidth: '68%' }}>
                    {!isMe && (
                      <div style={{ color: '#334155', fontSize: 11, fontWeight: 700, marginBottom: 4, marginLeft: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{msg.sender_name || 'Department Officer'}</span>
                        {msg.sender_role && (
                          <span style={{
                            padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 700,
                            background: '#EFF6FF', color: '#1D70B8', border: '1px solid #BFDBFE'
                          }}>
                            {msg.sender_role}
                          </span>
                        )}
                        {msg.sender_dept_name && <span style={{ color: '#64748B', fontWeight: 500 }}>· {msg.sender_dept_name}</span>}
                      </div>
                    )}
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isMe ? 'linear-gradient(135deg, #1D70B8, #0D5C99)' : '#FFFFFF',
                      border: isMe ? 'none' : '1px solid #CBD5E1',
                      boxShadow: isMe ? '0 2px 8px rgba(29,112,184,0.25)' : '0 1px 3px rgba(0,0,0,0.04)',
                    }}>
                      <div style={{ color: isMe ? '#FFFFFF' : '#0F172A', fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word' }}>{msg.content}</div>
                      <div style={{ fontSize: 10, marginTop: 6, textAlign: 'right', color: isMe ? 'rgba(255,255,255,0.75)' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        <span>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        {isMe && <CheckCheck size={12} color="#93C5FD" />}
                      </div>
                    </div>
                  </div>
                  {isMe && (
                    <div style={{
                      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, #1D70B8, #0F2942)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: 'white', overflow: 'hidden'
                    }}>
                      {user?.profile_photo_url ? (
                        <img src={user.profile_photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => ((e.currentTarget as HTMLElement).style.display = 'none')} />
                      ) : (
                        (user?.name || 'You').charAt(0).toUpperCase()
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Seen By Bar */}
          {seenUsers.length > 0 && (
            <div style={{
              padding: '8px 24px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 11
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155', fontWeight: 600 }}>
                <Eye size={13} color="#1D70B8" />
                <span>Seen by ({seenUsers.length}):</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  {seenUsers.slice(0, 6).map((su: any) => (
                    <span key={su.id} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 12, background: '#EFF6FF',
                      color: '#1D70B8', fontWeight: 600, border: '1px solid #BFDBFE'
                    }}>
                      {su.user_photo_url ? (
                        <img src={su.user_photo_url} alt="" style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : null}
                      {su.user_name} ({su.user_role})
                    </span>
                  ))}
                  {seenUsers.length > 6 && (
                    <span style={{ color: '#64748B' }}>+{seenUsers.length - 6} more</span>
                  )}
                </div>
              </div>
              <span style={{ color: '#94A3B8', fontSize: 10 }}>Active presence</span>
            </div>
          )}

          <div style={{
            padding: '16px 24px', borderTop: '1px solid #E2E8F0',
            background: '#FFFFFF',
            display: 'flex', gap: 12, alignItems: 'flex-end'
          }}>
            <textarea
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder={`Message ${selectedDept.name}... (Enter to send)`}
              rows={1}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 12,
                background: '#F8FAFC', border: '1px solid #CBD5E1',
                color: '#0F172A', fontSize: 14, outline: 'none', resize: 'none',
                fontFamily: 'inherit', lineHeight: 1.5,
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#1D70B8'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(148,163,184,0.12)'}
            />
            <button
              onClick={sendMessage}
              disabled={!newMsg.trim() || sending}
              style={{
                width: 46, height: 46, borderRadius: 12, border: 'none', flexShrink: 0,
                background: !newMsg.trim() ? 'rgba(148,163,184,0.1)' : 'linear-gradient(135deg, #1D70B8, #0F2942)',
                color: !newMsg.trim() ? '#475569' : 'white',
                cursor: !newMsg.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
