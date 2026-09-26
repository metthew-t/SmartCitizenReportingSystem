import React, { useState, useEffect, useRef } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  LayoutDashboard, FileText, Map, Users, Settings, LogOut,
  Bell, Menu, X, Building2, ShieldCheck, Clock, AlertTriangle
} from 'lucide-react'

interface Notification {
  id: number
  case_number: string
  description: string
  status: string
  priority: string
  created_at: string
  type: 'report' | 'message'
}

const API = 'https://smartcitizenreportingsystem.onrender.com/api/v1'

export default function DashboardLayout() {
  const { logout, departmentName, user, role, token } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [lastSeenCount, setLastSeenCount] = useState(0)
  const notifRef = useRef<HTMLDivElement>(null)

  // Fetch notifications (recent reports)
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${API}/reports/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          const list = Array.isArray(data) ? data : (data.results || [])
          const sorted = list
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 10)
            .map((item: any) => ({
              id: item.id,
              case_number: item.case_number,
              description: item.description?.substring(0, 80) || '',
              status: item.status,
              priority: item.priority,
              created_at: item.created_at,
              type: 'report' as const,
            }))
          setNotifications(sorted)
          // Calculate unread as new items since last seen
          if (sorted.length > lastSeenCount) {
            setUnreadCount(sorted.length - lastSeenCount)
          }
        }
      } catch (err) {
        console.error('Failed to fetch notifications', err)
      }
    }
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 15000)
    return () => clearInterval(interval)
  }, [token, lastSeenCount])

  // Close notification dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleBellClick = () => {
    setShowNotifications(!showNotifications)
    if (!showNotifications) {
      setLastSeenCount(notifications.length)
      setUnreadCount(0)
    }
  }

  const baseNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/reports', label: 'Reports', icon: FileText },
    { path: '/map', label: 'GIS Map', icon: Map },
  ]

  // Add role-specific navigation
  const navItems = [...baseNavItems]
  if (role === 'city_admin' || role === 'department_manager') {
    navItems.push({ path: '/departments', label: 'Departments', icon: Building2 })
  }
  if (role === 'city_admin') {
    navItems.push({ path: '/users', label: 'User Management', icon: Users })
  }
  navItems.push({ path: '/settings', label: 'Settings', icon: Settings })

  const isActive = (path: string) => location.pathname === path

  const PRIORITY_COLORS: Record<string, string> = {
    LOW: '#6B7280', MEDIUM: '#3B82F6', HIGH: '#F59E0B', CRITICAL: '#EF4444',
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: '#0f172a',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarCollapsed ? 72 : 264,
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        borderRight: '1px solid rgba(148,163,184,0.08)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.3s ease',
        flexShrink: 0,
      }}>
        {/* Logo & Department */}
        <div style={{
          padding: sidebarCollapsed ? '16px 12px' : '20px 20px',
          borderBottom: '1px solid rgba(148,163,184,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sidebarCollapsed ? 0 : 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, boxShadow: '0 0 20px rgba(99,102,241,0.2)',
              }}>
                <Building2 size={20} color="#a5b4fc" />
              </div>
              {!sidebarCollapsed && (
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'white', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Adama Smart
                  </div>
                  <div style={{ color: '#64748b', fontSize: 10 }}>City Administration</div>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#64748b', padding: 4,
              }}
            >
              {sidebarCollapsed ? <Menu size={18} /> : <X size={16} />}
            </button>
          </div>

          {/* Current department badge */}
          {!sidebarCollapsed && (
            <div
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 10,
                border: '1px solid rgba(148,163,184,0.1)',
                background: 'rgba(255,255,255,0.03)',
                color: '#e2e8f0',
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 12,
              }}
            >
              {role === 'city_admin' ? (
                <ShieldCheck size={14} color="#10b981" />
              ) : (
                <Building2 size={14} color="#94a3b8" />
              )}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                {role === 'city_admin' ? 'City Admin' : departmentName || 'Loading...'}
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          {navItems.map(item => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: sidebarCollapsed ? '10px' : '10px 14px',
                  margin: '4px 0', borderRadius: 10,
                  background: active ? 'linear-gradient(90deg, rgba(99,102,241,0.15) 0%, transparent 100%)' : 'transparent',
                  color: active ? '#a5b4fc' : '#94a3b8',
                  textDecoration: 'none', transition: 'all 0.2s',
                  borderLeft: active ? '3px solid #818cf8' : '3px solid transparent',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.color = '#e2e8f0'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.color = '#94a3b8'
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <Icon size={18} />
                {!sidebarCollapsed && <span style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User Profile & Logout */}
        <div style={{
          padding: sidebarCollapsed ? '16px 12px' : '20px 20px',
          borderTop: '1px solid rgba(148,163,184,0.08)',
        }}>
          {!sidebarCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: 14,
                boxShadow: '0 0 15px rgba(16,185,129,0.3)',
              }}>
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name || 'Loading...'}
                </div>
                <div style={{ color: '#64748b', fontSize: 11, textTransform: 'capitalize' }}>
                  {role?.replace('_', ' ') || 'Officer'}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '10px', borderRadius: 10,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444', display: 'flex', alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              gap: 8, cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
          >
            <LogOut size={16} />
            {!sidebarCollapsed && <span style={{ fontSize: 13, fontWeight: 600 }}>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minWidth: 0,
      }}>
        {/* Top Header */}
        <header style={{
          height: 64, background: 'rgba(15,23,42,0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(148,163,184,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', flexShrink: 0,
        }}>
          <div>
            {/* Can put page title or breadcrumbs here in future */}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }} ref={notifRef}>
            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={handleBellClick}
                style={{
                  background: showNotifications ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                  border: showNotifications ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                  width: 40, height: 40, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: showNotifications ? '#a5b4fc' : '#94a3b8',
                  cursor: 'pointer', position: 'relative',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(99,102,241,0.15)'
                  e.currentTarget.style.color = '#a5b4fc'
                }}
                onMouseLeave={e => {
                  if (!showNotifications) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.color = '#94a3b8'
                  }
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 4, right: 4,
                    minWidth: 18, height: 18, borderRadius: 9,
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: 'white', fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px',
                    boxShadow: '0 0 10px rgba(239,68,68,0.5)',
                    animation: 'pulse 2s infinite',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div style={{
                  position: 'absolute', top: 50, right: 0,
                  width: 380, maxHeight: 480,
                  background: '#1e293b', border: '1px solid rgba(148,163,184,0.15)',
                  borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                  zIndex: 100, overflow: 'hidden',
                }}>
                  {/* Header */}
                  <div style={{
                    padding: '16px 20px', borderBottom: '1px solid rgba(148,163,184,0.1)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <h3 style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 700, margin: 0 }}>Notifications</h3>
                      <p style={{ color: '#64748b', fontSize: 11, margin: '2px 0 0' }}>Recent reports & updates</p>
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
                    }}>
                      {notifications.length} items
                    </span>
                  </div>

                  {/* Notification Items */}
                  <div style={{ maxHeight: 370, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                        No notifications yet
                      </div>
                    ) : notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          setShowNotifications(false)
                          navigate(`/reports/${notif.id}`)
                        }}
                        style={{
                          padding: '14px 20px', cursor: 'pointer',
                          borderBottom: '1px solid rgba(148,163,184,0.06)',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                            background: `${PRIORITY_COLORS[notif.priority] || '#6366f1'}15`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {notif.priority === 'CRITICAL' ? (
                              <AlertTriangle size={16} color="#ef4444" />
                            ) : (
                              <FileText size={16} color={PRIORITY_COLORS[notif.priority] || '#6366f1'} />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: '#a5b4fc', fontSize: 12, fontWeight: 700 }}>
                                {notif.case_number}
                              </span>
                              <span style={{
                                padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600,
                                background: `${PRIORITY_COLORS[notif.priority]}20`,
                                color: PRIORITY_COLORS[notif.priority],
                              }}>
                                {notif.priority}
                              </span>
                            </div>
                            <div style={{
                              color: '#cbd5e1', fontSize: 12, marginTop: 4,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {notif.description}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, color: '#64748b', fontSize: 10 }}>
                              <Clock size={10} />
                              {timeAgo(notif.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div style={{
                    padding: '12px 20px', borderTop: '1px solid rgba(148,163,184,0.1)',
                    textAlign: 'center',
                  }}>
                    <button
                      onClick={() => { setShowNotifications(false); navigate('/reports') }}
                      style={{
                        background: 'none', border: 'none', color: '#818cf8',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      View All Reports →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Outlet />
          </div>
        </div>
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}
