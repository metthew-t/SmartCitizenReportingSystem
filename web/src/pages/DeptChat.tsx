import React from 'react'
import { MessageSquare, Send, Building2, Users, Search, Circle } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

const API = 'https://smartcitizenreportingsystem.onrender.com/api/v1'

export default function DeptChat() {
  const { token, user, role } = useAuthStore()
  const [departments, setDepartments] = React.useState<any[]>([])
  const [selectedDept, setSelectedDept] = React.useState<any>(null)
  const [messages, setMessages] = React.useState<any[]>([])
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
          setDepartments(Array.isArray(data) ? data : data.results || [])
        }
      } finally {
        setLoading(false)
      }
    }
    fetchDepts()
  }, [token])

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
      const interval = setInterval(fetchMessages, 4000)
      return () => clearInterval(interval)
    }
  }, [selectedDept, fetchMessages])

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
    d.name !== user?.department_name && d.name?.toLowerCase().includes(search.toLowerCase())
  )

  const isManagerOrAdmin = role === 'city_admin' || role === 'department_manager' || user?.is_city_admin

  return (
    <div style={{
      fontFamily: "'Inter', sans-serif", height: 'calc(100vh - 80px)',
      display: 'flex', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(148,163,184,0.08)'
    }}>
      {/* Sidebar */}
      <div style={{
        width: 280, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(16px)',
        borderRight: '1px solid rgba(148,163,184,0.08)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Building2 size={18} color="white" />
            </div>
            <div>
              <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 15 }}>Department Chat</div>
              <div style={{ color: '#64748b', fontSize: 11 }}>Internal & Inter-department</div>
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
                  background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(148,163,184,0.1)',
                  color: '#e2e8f0', fontSize: 13, outline: 'none',
                }}
              />
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <div style={{ padding: 20, color: '#64748b', textAlign: 'center', fontSize: 13 }}>Loading...</div>
          ) : (
            <>
              {myDept && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ padding: '0 16px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
                    My Department
                  </div>
                  <div
                    onClick={() => setSelectedDept(myDept)}
                    style={{
                      padding: '12px 16px', cursor: 'pointer',
                      background: selectedDept?.id === myDept.id ? 'linear-gradient(90deg, rgba(99,102,241,0.2), transparent)' : 'transparent',
                      borderLeft: selectedDept?.id === myDept.id ? '3px solid #6366f1' : '3px solid transparent',
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
                        color: selectedDept?.id === myDept.id ? '#a5b4fc' : '#cbd5e1',
                        fontSize: 13, fontWeight: 600,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>{myDept.name}</div>
                    </div>
                  </div>
                </div>
              )}

              {isManagerOrAdmin && otherDepts.length > 0 && (
                <div>
                  <div style={{ padding: '0 16px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
                    Other Departments
                  </div>
                  {otherDepts.map(dept => (
                    <div
                      key={dept.id}
                      onClick={() => setSelectedDept(dept)}
                      style={{
                        padding: '12px 16px', cursor: 'pointer',
                        background: selectedDept?.id === dept.id ? 'linear-gradient(90deg, rgba(99,102,241,0.2), transparent)' : 'transparent',
                        borderLeft: selectedDept?.id === dept.id ? '3px solid #6366f1' : '3px solid transparent',
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
                          color: selectedDept?.id === dept.id ? '#a5b4fc' : '#cbd5e1',
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
          padding: '12px 16px', borderTop: '1px solid rgba(148,163,184,0.06)',
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
            <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
            <MessageSquare size={36} color="#6366f1" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Select a Department</div>
            <div style={{ color: '#64748b', fontSize: 14 }}>Choose a department to start inter-department communication</div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{
            padding: '16px 24px', borderBottom: '1px solid rgba(148,163,184,0.06)',
            background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)',
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
              <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 15 }}>{selectedDept.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <Users size={11} color="#64748b" />
                <span style={{ color: '#64748b', fontSize: 11 }}>Department channel — all members can see messages</span>
              </div>
            </div>
          </div>

          <div style={{
            flex: 1, overflowY: 'auto', padding: '20px 24px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#475569', fontSize: 14, margin: 'auto' }}>
                No messages yet. Start the conversation!
              </div>
            ) : messages.map((msg, idx) => {
              const isMe = msg.sender === user?.id
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-end' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: isMe ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : `hsl(${((msg.sender || 0) * 73) % 360}, 50%, 35%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: 'white',
                  }}>
                    {(msg.sender_name || 'U').charAt(0)}
                  </div>
                  <div style={{ maxWidth: '65%' }}>
                    {!isMe && (
                      <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, marginBottom: 4, marginLeft: 4 }}>
                        {msg.sender_name || 'Department User'}
                        {msg.sender_dept_name && <span style={{ color: '#475569', marginLeft: 6 }}>· {msg.sender_dept_name}</span>}
                      </div>
                    )}
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isMe ? 'linear-gradient(135deg, #6366f1, #7c3aed)' : 'rgba(30,41,59,0.8)',
                      border: isMe ? 'none' : '1px solid rgba(148,163,184,0.08)',
                    }}>
                      <div style={{ color: '#e2e8f0', fontSize: 14, lineHeight: 1.5 }}>{msg.content}</div>
                      <div style={{ fontSize: 10, marginTop: 6, textAlign: 'right', color: isMe ? 'rgba(255,255,255,0.5)' : '#475569' }}>
                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          <div style={{
            padding: '16px 24px', borderTop: '1px solid rgba(148,163,184,0.06)',
            background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)',
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
                background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(148,163,184,0.12)',
                color: '#e2e8f0', fontSize: 14, outline: 'none', resize: 'none',
                fontFamily: 'inherit', lineHeight: 1.5,
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(148,163,184,0.12)'}
            />
            <button
              onClick={sendMessage}
              disabled={!newMsg.trim() || sending}
              style={{
                width: 46, height: 46, borderRadius: 12, border: 'none', flexShrink: 0,
                background: !newMsg.trim() ? 'rgba(148,163,184,0.1)' : 'linear-gradient(135deg, #6366f1, #7c3aed)',
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
