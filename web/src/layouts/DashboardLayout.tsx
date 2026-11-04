import React, { useState, useEffect, useRef } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useLanguageStore } from '../store/languageStore'
import {
  LayoutDashboard, FileText, Map, Users, Settings, LogOut,
  Bell, Menu, X, Building2, ShieldCheck, Clock, AlertTriangle, MessageSquare, ScrollText, Crown, ShieldAlert
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
  const { t, language } = useLanguageStore()
  // Subscribe to language state so sidebar nav labels re-render on language change
  void language
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const notifRef = useRef<HTMLDivElement>(null)

  const getStorageKey = () => `viewed_cases_${user?.id || 'default'}`

  // Persistent record of viewed case IDs
  const [viewedIds, setViewedIds] = useState<number[]>(() => {
    try {
      const key = `viewed_cases_${useAuthStore.getState().user?.id || 'default'}`
      return JSON.parse(localStorage.getItem(key) || '[]')
    } catch {
      return []
    }
  })

  // Listen to custom event when cases are viewed anywhere (e.g. in ReportDetails)
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const key = getStorageKey()
        const stored = JSON.parse(localStorage.getItem(key) || '[]')
        setViewedIds(stored)
      } catch {}
    }
    window.addEventListener('cases_viewed_updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener('cases_viewed_updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [user?.id])

  // Recalculate unread count: strictly reports that have NOT been viewed
  useEffect(() => {
    const unread = notifications.filter(n => !viewedIds.includes(n.id))
    setUnreadCount(unread.length)
  }, [notifications, viewedIds])

  const markAsViewed = (id: number) => {
    try {
      const key = getStorageKey()
      const current: number[] = JSON.parse(localStorage.getItem(key) || '[]')
      if (!current.includes(id)) {
        current.push(id)
        localStorage.setItem(key, JSON.stringify(current))
        setViewedIds([...current])
        window.dispatchEvent(new Event('cases_viewed_updated'))
      }
    } catch {}
  }

  const markAllAsViewed = () => {
    try {
      const key = getStorageKey()
      const current: number[] = JSON.parse(localStorage.getItem(key) || '[]')
      const allIds = notifications.map(n => n.id)
      const merged = Array.from(new Set([...current, ...allIds]))
      localStorage.setItem(key, JSON.stringify(merged))
      setViewedIds(merged)
      setUnreadCount(0)
      window.dispatchEvent(new Event('cases_viewed_updated'))
    } catch {}
  }

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
        }
      } catch (err) {
        console.error('Failed to fetch notifications', err)
      }
    }
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 15000)
    return () => clearInterval(interval)
  }, [token])

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
  }

  // Redirect mayor from /dashboard to /mayor
  useEffect(() => {
    if (role === 'mayor' && location.pathname === '/dashboard') {
      navigate('/mayor', { replace: true })
    }
  }, [role, location.pathname, navigate])

  // Bespoke world-class themes by role
  const THEMES = {
    mayor: {
      id: 'mayor',
      appBg: 'radial-gradient(ellipse at 50% -15%, #1a1713 0%, #0d0e13 45%, #050608 100%)',
      sidebarBg: 'linear-gradient(180deg, #13141a 0%, #07080b 100%)',
      headerBg: 'rgba(9, 10, 14, 0.88)',
      borderColor: 'rgba(245, 158, 11, 0.22)',
      brandGradient: 'linear-gradient(135deg, rgba(245,158,11,0.35), rgba(180,83,9,0.35))',
      brandShadow: '0 0 25px rgba(245,158,11,0.3)',
      brandIconColor: '#fbbf24',
      brandSubtitle: 'Office of the Executive Mayor',
      badgeBg: 'rgba(245,158,11,0.08)',
      badgeBorder: 'rgba(245,158,11,0.28)',
      badgeColor: '#fbbf24',
      navText: '#a3a3a3',
      activeNavBg: 'linear-gradient(90deg, rgba(245,158,11,0.22) 0%, rgba(245,158,11,0.02) 100%)',
      activeNavText: '#fbbf24',
      activeNavBorder: '3px solid #f59e0b',
      activeNavGlow: 'inset 0 0 15px rgba(245,158,11,0.1)',
      hoverNavBg: 'rgba(245,158,11,0.08)',
      hoverNavText: '#fef08a',
      accentColor: '#f59e0b',
      profileAvatarBg: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
      profileAvatarShadow: '0 0 20px rgba(245,158,11,0.4)',
      roleTitle: 'Executive Mayor',
      notifBtnBg: 'rgba(245,158,11,0.12)',
      notifBtnBorder: 'rgba(245,158,11,0.25)',
      notifBtnColor: '#fbbf24',
      dropdownBg: '#111218',
    },
    department_manager: {
      id: 'department_manager',
      appBg: 'radial-gradient(ellipse at 50% -15%, #0c1c38 0%, #061022 45%, #020712 100%)',
      sidebarBg: 'linear-gradient(180deg, #09172e 0%, #040a17 100%)',
      headerBg: 'rgba(6, 16, 34, 0.88)',
      borderColor: 'rgba(59, 130, 246, 0.22)',
      brandGradient: 'linear-gradient(135deg, rgba(59,130,246,0.35), rgba(29,78,216,0.35))',
      brandShadow: '0 0 25px rgba(59,130,246,0.3)',
      brandIconColor: '#93c5fd',
      brandSubtitle: 'Municipal Sector Command',
      badgeBg: 'rgba(59,130,246,0.08)',
      badgeBorder: 'rgba(59,130,246,0.28)',
      badgeColor: '#93c5fd',
      navText: '#94a3b8',
      activeNavBg: 'linear-gradient(90deg, rgba(59,130,246,0.22) 0%, rgba(59,130,246,0.02) 100%)',
      activeNavText: '#93c5fd',
      activeNavBorder: '3px solid #3b82f6',
      activeNavGlow: 'inset 0 0 15px rgba(59,130,246,0.1)',
      hoverNavBg: 'rgba(59,130,246,0.08)',
      hoverNavText: '#dbeafe',
      accentColor: '#3b82f6',
      profileAvatarBg: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
      profileAvatarShadow: '0 0 20px rgba(59,130,246,0.4)',
      roleTitle: 'Sector Director',
      notifBtnBg: 'rgba(59,130,246,0.12)',
      notifBtnBorder: 'rgba(59,130,246,0.25)',
      notifBtnColor: '#93c5fd',
      dropdownBg: '#09162c',
    },
    officer: {
      id: 'officer',
      appBg: 'radial-gradient(ellipse at 50% -15%, #08211b 0%, #051310 45%, #020706 100%)',
      sidebarBg: 'linear-gradient(180deg, #061914 0%, #030a08 100%)',
      headerBg: 'rgba(5, 17, 14, 0.88)',
      borderColor: 'rgba(16, 185, 129, 0.22)',
      brandGradient: 'linear-gradient(135deg, rgba(16,185,129,0.35), rgba(4,120,87,0.35))',
      brandShadow: '0 0 25px rgba(16,185,129,0.3)',
      brandIconColor: '#6ee7b7',
      brandSubtitle: 'Field Operations & Dispatch',
      badgeBg: 'rgba(16,185,129,0.08)',
      badgeBorder: 'rgba(16,185,129,0.28)',
      badgeColor: '#6ee7b7',
      navText: '#94a3b8',
      activeNavBg: 'linear-gradient(90deg, rgba(16,185,129,0.22) 0%, rgba(16,185,129,0.02) 100%)',
      activeNavText: '#6ee7b7',
      activeNavBorder: '3px solid #10b981',
      activeNavGlow: 'inset 0 0 15px rgba(16,185,129,0.1)',
      hoverNavBg: 'rgba(16,185,129,0.08)',
      hoverNavText: '#d1fae5',
      accentColor: '#10b981',
      profileAvatarBg: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      profileAvatarShadow: '0 0 20px rgba(16,185,129,0.4)',
      roleTitle: 'Field Officer',
      notifBtnBg: 'rgba(16,185,129,0.12)',
      notifBtnBorder: 'rgba(16,185,129,0.25)',
      notifBtnColor: '#6ee7b7',
      dropdownBg: '#081714',
    },
    default: {
      id: 'default',
      appBg: '#0f172a',
      sidebarBg: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
      headerBg: 'rgba(15,23,42,0.8)',
      borderColor: 'rgba(148,163,184,0.08)',
      brandGradient: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))',
      brandShadow: '0 0 20px rgba(99,102,241,0.2)',
      brandIconColor: '#a5b4fc',
      brandSubtitle: 'City Administration',
      badgeBg: 'rgba(255,255,255,0.03)',
      badgeBorder: 'rgba(148,163,184,0.1)',
      badgeColor: '#e2e8f0',
      navText: '#94a3b8',
      activeNavBg: 'linear-gradient(90deg, rgba(99,102,241,0.15) 0%, transparent 100%)',
      activeNavText: '#a5b4fc',
      activeNavBorder: '3px solid #818cf8',
      activeNavGlow: 'none',
      hoverNavBg: 'rgba(255,255,255,0.03)',
      hoverNavText: '#e2e8f0',
      accentColor: '#6366f1',
      profileAvatarBg: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
      profileAvatarShadow: '0 0 15px rgba(16,185,129,0.3)',
      roleTitle: role === 'super_admin' ? 'Super Administrator' : 'City Administrator',
      notifBtnBg: 'rgba(255,255,255,0.05)',
      notifBtnBorder: 'transparent',
      notifBtnColor: '#94a3b8',
      dropdownBg: '#1e293b',
    }
  }

  const theme = role === 'mayor'
    ? THEMES.mayor
    : role === 'department_manager'
    ? THEMES.department_manager
    : role === 'officer'
    ? THEMES.officer
    : THEMES.default // Admins and Super Admins retain original dark slate theme

  // Build navigation items
  let navItems: { path: string; label: string; icon: any }[] = []

  if (role === 'mayor') {
    // Mayor: ONLY Mayor Command Center and Settings
    navItems = [
      { path: '/mayor', label: t('mayor_command_center') || 'Mayor Command Center', icon: Crown },
      { path: '/settings', label: t('settings') || 'Settings', icon: Settings },
    ]
  } else {
    const baseNavItems = [
      { path: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
      { path: '/reports', label: t('reports'), icon: FileText },
      ...(role !== 'super_admin' ? [{ path: '/official-reports', label: t('official_reports'), icon: ScrollText }] : []),
      { path: '/map', label: t('gis_map'), icon: Map },
    ]
    navItems = [...baseNavItems]
    // Mayor Command Center: ONLY for mayor (already handled above). NOT for super_admin or city_admin.
    if (role === 'super_admin' || role === 'city_admin' || role === 'department_manager') {
      navItems.push({ path: '/departments', label: t('departments'), icon: Building2 })
    }
    if (role === 'officer' || role === 'department_manager' || role === 'super_admin' || role === 'city_admin') {
      navItems.push({ path: '/dept-chat', label: t('dept_chat'), icon: MessageSquare })
    }
    if (role === 'super_admin' || role === 'city_admin' || role === 'department_manager') {
      navItems.push({ path: '/users', label: t('user_management'), icon: Users })
    }
    if (role === 'super_admin') {
      navItems.push({ path: '/audit-logs', label: t('audit_logs') || 'Audit Logs', icon: ShieldAlert })
    }
    navItems.push({ path: '/settings', label: t('settings'), icon: Settings })
  }

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
      background: theme.appBg,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: '#e2e8f0',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarCollapsed ? 72 : 264,
        background: theme.sidebarBg,
        borderRight: `1px solid ${theme.borderColor}`,
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.3s ease',
        flexShrink: 0,
      }}>
        {/* Logo & Department */}
        <div style={{
          padding: sidebarCollapsed ? '16px 12px' : '20px 20px',
          borderBottom: `1px solid ${theme.borderColor}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sidebarCollapsed ? 0 : 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: theme.brandGradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, boxShadow: theme.brandShadow,
              }}>
                {role === 'mayor' ? (
                  <Crown size={22} color={theme.brandIconColor} strokeWidth={2.2} />
                ) : role === 'officer' ? (
                  <ShieldCheck size={20} color={theme.brandIconColor} />
                ) : (
                  <Building2 size={20} color={theme.brandIconColor} />
                )}
              </div>
              {!sidebarCollapsed && (
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'white', fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: -0.3 }}>
                    Adama Smart
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 500 }}>
                    {theme.brandSubtitle}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#94a3b8', padding: 4,
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
                border: `1px solid ${theme.badgeBorder}`,
                background: theme.badgeBg,
                color: theme.badgeColor,
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 12,
              }}
            >
              {role === 'mayor' ? (
                <Crown size={14} color={theme.brandIconColor} />
              ) : role === 'super_admin' ? (
                <ShieldCheck size={14} color="#f59e0b" />
              ) : role === 'city_admin' ? (
                <ShieldCheck size={14} color="#10b981" />
              ) : role === 'officer' ? (
                <ShieldCheck size={14} color={theme.brandIconColor} />
              ) : (
                <Building2 size={14} color={theme.brandIconColor} />
              )}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>
                {role === 'mayor' ? 'Office of the Mayor' : role === 'super_admin' ? 'Super Admin' : role === 'city_admin' ? 'City Admin' : departmentName || 'Loading...'}
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
                  background: active ? theme.activeNavBg : 'transparent',
                  color: active ? theme.activeNavText : theme.navText,
                  textDecoration: 'none', transition: 'all 0.2s',
                  borderLeft: active ? theme.activeNavBorder : '3px solid transparent',
                  boxShadow: active ? theme.activeNavGlow : 'none',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.color = theme.hoverNavText
                    e.currentTarget.style.background = theme.hoverNavBg
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.color = theme.navText
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <Icon size={18} />
                {!sidebarCollapsed && <span style={{ fontSize: 13, fontWeight: active ? 700 : 500 }}>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User Profile & Logout */}
        <div style={{
          padding: sidebarCollapsed ? '16px 12px' : '20px 20px',
          borderTop: `1px solid ${theme.borderColor}`,
        }}>
          {!sidebarCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: theme.profileAvatarBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 800, fontSize: 14,
                boxShadow: theme.profileAvatarShadow,
                flexShrink: 0,
              }}>
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name || 'Loading...'}
                </div>
                <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>
                  {theme.roleTitle}
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
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
          >
            <LogOut size={16} />
            {!sidebarCollapsed && <span style={{ fontSize: 13, fontWeight: 600 }}>{t('sign_out')}</span>}
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
          height: 64, background: theme.headerBg,
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${theme.borderColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', flexShrink: 0, zIndex: 50,
        }}>
          <div>
            {/* Contextual role identifier */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: theme.accentColor, boxShadow: `0 0 8px ${theme.accentColor}`
              }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5 }}>
                {theme.brandSubtitle.toUpperCase()}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }} ref={notifRef}>
            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={handleBellClick}
                style={{
                  background: showNotifications ? theme.activeNavBg : theme.notifBtnBg,
                  border: `1px solid ${showNotifications ? theme.accentColor : theme.notifBtnBorder}`,
                  width: 40, height: 40, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: showNotifications ? theme.activeNavText : theme.notifBtnColor,
                  cursor: 'pointer', position: 'relative',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = theme.activeNavBg
                  e.currentTarget.style.color = theme.activeNavText
                }}
                onMouseLeave={e => {
                  if (!showNotifications) {
                    e.currentTarget.style.background = theme.notifBtnBg
                    e.currentTarget.style.color = theme.notifBtnColor
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
                  background: theme.dropdownBg, border: `1px solid ${theme.borderColor}`,
                  borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                  zIndex: 100, overflow: 'hidden',
                }}>
                  {/* Header */}
                  <div style={{
                    padding: '16px 20px', borderBottom: `1px solid ${theme.borderColor}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <h3 style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 700, margin: 0 }}>Notifications</h3>
                      <p style={{ color: '#64748b', fontSize: 11, margin: '2px 0 0' }}>
                        {unreadCount > 0 ? `${unreadCount} new case${unreadCount > 1 ? 's' : ''}` : 'All cases viewed'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {unreadCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            markAllAsViewed()
                          }}
                          style={{
                            background: theme.activeNavBg, border: `1px solid ${theme.accentColor}40`,
                            color: theme.activeNavText, fontSize: 11, fontWeight: 600, padding: '4px 10px',
                            borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = `${theme.accentColor}30`}
                          onMouseLeave={e => e.currentTarget.style.background = theme.activeNavBg}
                        >
                          Mark all read
                        </button>
                      )}
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: unreadCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(148,163,184,0.1)',
                        color: unreadCount > 0 ? '#ef4444' : '#94a3b8',
                      }}>
                        {unreadCount > 0 ? `${unreadCount} new` : `${notifications.length} total`}
                      </span>
                    </div>
                  </div>

                  {/* Notification Items */}
                  <div style={{ maxHeight: 370, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                        No notifications yet
                      </div>
                    ) : notifications.map((notif) => {
                      const isUnread = !viewedIds.includes(notif.id)
                      return (
                        <div
                          key={notif.id}
                          onClick={() => {
                            markAsViewed(notif.id)
                            setShowNotifications(false)
                            navigate(`/reports/${notif.id}`)
                          }}
                          style={{
                            padding: '14px 20px', cursor: 'pointer',
                            borderBottom: '1px solid rgba(148,163,184,0.06)',
                            background: isUnread ? `${theme.accentColor}12` : 'transparent',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = isUnread ? `${theme.accentColor}20` : 'rgba(255,255,255,0.03)'}
                          onMouseLeave={e => e.currentTarget.style.background = isUnread ? `${theme.accentColor}12` : 'transparent'}
                        >
                          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                              background: `${PRIORITY_COLORS[notif.priority] || theme.accentColor}15`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {notif.priority === 'CRITICAL' ? (
                                <AlertTriangle size={16} color="#ef4444" />
                              ) : (
                                <FileText size={16} color={PRIORITY_COLORS[notif.priority] || theme.accentColor} />
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ color: isUnread ? '#ffffff' : '#94a3b8', fontSize: 12, fontWeight: isUnread ? 800 : 600 }}>
                                    {notif.case_number}
                                  </span>
                                  {isUnread && (
                                    <span style={{
                                      padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 700,
                                      background: theme.accentColor, color: '#000000',
                                    }}>
                                      NEW
                                    </span>
                                  )}
                                </div>
                                <span style={{
                                  padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600,
                                  background: `${PRIORITY_COLORS[notif.priority]}20`,
                                  color: PRIORITY_COLORS[notif.priority],
                                }}>
                                  {notif.priority}
                                </span>
                              </div>
                              <div style={{
                                color: isUnread ? '#f1f5f9' : '#94a3b8', fontSize: 12, marginTop: 4,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                fontWeight: isUnread ? 600 : 400,
                              }}>
                                {notif.description}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, color: '#64748b', fontSize: 10 }}>
                                <Clock size={10} />
                                {timeAgo(notif.created_at)}
                                {isUnread ? (
                                  <span style={{ color: theme.activeNavText, marginLeft: 6, fontWeight: 600 }}>• Unread</span>
                                ) : (
                                  <span style={{ color: '#475569', marginLeft: 6 }}>• Viewed</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Footer */}
                  <div style={{
                    padding: '12px 20px', borderTop: `1px solid ${theme.borderColor}`,
                    textAlign: 'center',
                  }}>
                    <button
                      onClick={() => { setShowNotifications(false); navigate(role === 'mayor' ? '/mayor' : '/reports') }}
                      style={{
                        background: 'none', border: 'none', color: theme.activeNavText,
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      {role === 'mayor' ? 'View Mayor Command Center →' : 'View All Reports →'}
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
