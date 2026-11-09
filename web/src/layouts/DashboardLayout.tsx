import React, { useState, useEffect, useRef } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useLanguageStore } from '../store/languageStore'
import SessionTimeoutManager from '../components/SessionTimeoutManager'
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

  // ── Unified Government Design System Theme ──────────────────────────────
  // All roles use the same navy/govBlue palette matching the mobile app.
  // Mayor retains gold for distinction (command authority).
  const GOV_NAVY   = '#0A1628'
  const GOV_BLUE   = '#1D70B8'
  const GOV_BLUE2  = '#0D5C99'
  const BORDER_DIM = 'rgba(29,112,184,0.18)'

  const THEMES = {
    mayor: {
      id: 'mayor',
      appBg: `linear-gradient(160deg, ${GOV_NAVY} 0%, #0D1020 60%, #070C18 100%)`,
      sidebarBg: `linear-gradient(180deg, ${GOV_NAVY} 0%, #060C1A 100%)`,
      headerBg: `rgba(10,22,40,0.94)`,
      borderColor: 'rgba(245,158,11,0.25)',
      brandGradient: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(180,83,9,0.25))',
      brandShadow: '0 0 20px rgba(245,158,11,0.25)',
      brandIconColor: '#fbbf24',
      brandSubtitle: 'Office of the Executive Mayor',
      badgeBg: 'rgba(245,158,11,0.08)',
      badgeBorder: 'rgba(245,158,11,0.3)',
      badgeColor: '#fbbf24',
      navText: '#94a3b8',
      activeNavBg: 'linear-gradient(90deg, rgba(245,158,11,0.18) 0%, transparent 100%)',
      activeNavText: '#fbbf24',
      activeNavBorder: `3px solid #f59e0b`,
      activeNavGlow: 'inset 0 0 12px rgba(245,158,11,0.08)',
      hoverNavBg: 'rgba(245,158,11,0.06)',
      hoverNavText: '#fef3c7',
      accentColor: '#f59e0b',
      profileAvatarBg: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
      profileAvatarShadow: '0 0 16px rgba(245,158,11,0.35)',
      roleTitle: 'Executive Mayor',
      notifBtnBg: 'rgba(245,158,11,0.1)',
      notifBtnBorder: 'rgba(245,158,11,0.2)',
      notifBtnColor: '#fbbf24',
      dropdownBg: '#0D1020',
    },
    department_manager: {
      id: 'department_manager',
      appBg: '#F8FAFC',
      sidebarBg: `linear-gradient(180deg, #0F2942 0%, #0A1628 100%)`,
      headerBg: '#FFFFFF',
      borderColor: '#E2E8F0',
      brandGradient: `linear-gradient(135deg, ${GOV_BLUE}30, ${GOV_BLUE2}30)`,
      brandShadow: `0 0 20px ${GOV_BLUE}25`,
      brandIconColor: '#93c5fd',
      brandSubtitle: 'Municipal Sector Command',
      badgeBg: `${GOV_BLUE}10`,
      badgeBorder: `${GOV_BLUE}30`,
      badgeColor: '#93c5fd',
      navText: '#94a3b8',
      activeNavBg: `linear-gradient(90deg, ${GOV_BLUE}25 0%, transparent 100%)`,
      activeNavText: '#93c5fd',
      activeNavBorder: `3px solid ${GOV_BLUE}`,
      activeNavGlow: `inset 0 0 12px ${GOV_BLUE}0C`,
      hoverNavBg: `${GOV_BLUE}12`,
      hoverNavText: '#ffffff',
      accentColor: GOV_BLUE,
      profileAvatarBg: `linear-gradient(135deg, ${GOV_BLUE} 0%, ${GOV_BLUE2} 100%)`,
      profileAvatarShadow: `0 0 16px ${GOV_BLUE}35`,
      roleTitle: 'Sector Director',
      notifBtnBg: '#F1F5F9',
      notifBtnBorder: '#E2E8F0',
      notifBtnColor: '#475569',
      dropdownBg: '#FFFFFF',
    },
    officer: {
      id: 'officer',
      appBg: '#F8FAFC',
      sidebarBg: `linear-gradient(180deg, #0F2942 0%, #0A1628 100%)`,
      headerBg: '#FFFFFF',
      borderColor: '#E2E8F0',
      brandGradient: `linear-gradient(135deg, ${GOV_BLUE}30, #10b98130)`,
      brandShadow: `0 0 20px ${GOV_BLUE}20`,
      brandIconColor: '#6ee7b7',
      brandSubtitle: 'Field Operations & Dispatch',
      badgeBg: `${GOV_BLUE}10`,
      badgeBorder: `${GOV_BLUE}30`,
      badgeColor: '#93c5fd',
      navText: '#94a3b8',
      activeNavBg: `linear-gradient(90deg, ${GOV_BLUE}25 0%, transparent 100%)`,
      activeNavText: '#93c5fd',
      activeNavBorder: `3px solid ${GOV_BLUE}`,
      activeNavGlow: `inset 0 0 12px ${GOV_BLUE}0C`,
      hoverNavBg: `${GOV_BLUE}12`,
      hoverNavText: '#ffffff',
      accentColor: GOV_BLUE,
      profileAvatarBg: `linear-gradient(135deg, ${GOV_BLUE} 0%, #10b981 100%)`,
      profileAvatarShadow: `0 0 16px ${GOV_BLUE}30`,
      roleTitle: 'Field Officer',
      notifBtnBg: '#F1F5F9',
      notifBtnBorder: '#E2E8F0',
      notifBtnColor: '#475569',
      dropdownBg: '#FFFFFF',
    },
    city_admin: {
      id: 'city_admin',
      appBg: '#F8FAFC',
      sidebarBg: `linear-gradient(180deg, #0F2942 0%, #0A1628 100%)`,
      headerBg: '#FFFFFF',
      borderColor: '#E2E8F0',
      brandGradient: `linear-gradient(135deg, ${GOV_BLUE}30, ${GOV_NAVY}80)`,
      brandShadow: `0 0 20px ${GOV_BLUE}20`,
      brandIconColor: '#93c5fd',
      brandSubtitle: 'City Operations Administration',
      badgeBg: 'rgba(29, 112, 184, 0.12)',
      badgeBorder: 'rgba(29, 112, 184, 0.35)',
      badgeColor: '#1D70B8',
      navText: '#CBD5E1',
      activeNavBg: `linear-gradient(90deg, ${GOV_BLUE}25 0%, transparent 100%)`,
      activeNavText: '#93c5fd',
      activeNavBorder: `3px solid ${GOV_BLUE}`,
      activeNavGlow: `inset 0 0 12px ${GOV_BLUE}0C`,
      hoverNavBg: `${GOV_BLUE}12`,
      hoverNavText: '#ffffff',
      accentColor: GOV_BLUE,
      profileAvatarBg: `linear-gradient(135deg, ${GOV_BLUE} 0%, #0D5C99 100%)`,
      profileAvatarShadow: `0 0 14px ${GOV_BLUE}28`,
      roleTitle: 'City Administrator',
      notifBtnBg: '#F1F5F9',
      notifBtnBorder: '#E2E8F0',
      notifBtnColor: '#475569',
      dropdownBg: '#FFFFFF',
    },
    super_admin: {
      id: 'super_admin',
      appBg: '#F8FAFC',
      sidebarBg: `linear-gradient(180deg, #0F2942 0%, #0A1628 100%)`,
      headerBg: '#FFFFFF',
      borderColor: '#E2E8F0',
      brandGradient: `linear-gradient(135deg, rgba(245,158,11,0.25), ${GOV_NAVY}80)`,
      brandShadow: `0 0 20px rgba(245,158,11,0.25)`,
      brandIconColor: '#fbbf24',
      brandSubtitle: 'System Governance & Security',
      badgeBg: 'rgba(245, 158, 11, 0.12)',
      badgeBorder: 'rgba(245, 158, 11, 0.35)',
      badgeColor: '#fbbf24',
      navText: '#CBD5E1',
      activeNavBg: `linear-gradient(90deg, rgba(245,158,11,0.18) 0%, transparent 100%)`,
      activeNavText: '#fbbf24',
      activeNavBorder: `3px solid #f59e0b`,
      activeNavGlow: `inset 0 0 12px rgba(245,158,11,0.08)`,
      hoverNavBg: `rgba(245,158,11,0.08)`,
      hoverNavText: '#ffffff',
      accentColor: '#f59e0b',
      profileAvatarBg: `linear-gradient(135deg, #f59e0b 0%, #d97706 100%)`,
      profileAvatarShadow: `0 0 14px rgba(245,158,11,0.35)`,
      roleTitle: 'Super Administrator',
      notifBtnBg: '#F1F5F9',
      notifBtnBorder: '#E2E8F0',
      notifBtnColor: '#475569',
      dropdownBg: '#FFFFFF',
    },
    default: {
      id: 'default',
      appBg: '#F8FAFC',
      sidebarBg: `linear-gradient(180deg, #0F2942 0%, #0A1628 100%)`,
      headerBg: '#FFFFFF',
      borderColor: '#E2E8F0',
      brandGradient: `linear-gradient(135deg, ${GOV_BLUE}30, ${GOV_NAVY}80)`,
      brandShadow: `0 0 20px ${GOV_BLUE}20`,
      brandIconColor: '#93c5fd',
      brandSubtitle: 'City Administration',
      badgeBg: `${GOV_BLUE}10`,
      badgeBorder: `${GOV_BLUE}25`,
      badgeColor: '#93c5fd',
      navText: '#94a3b8',
      activeNavBg: `linear-gradient(90deg, ${GOV_BLUE}25 0%, transparent 100%)`,
      activeNavText: '#93c5fd',
      activeNavBorder: `3px solid ${GOV_BLUE}`,
      activeNavGlow: `inset 0 0 12px ${GOV_BLUE}0C`,
      hoverNavBg: `${GOV_BLUE}12`,
      hoverNavText: '#ffffff',
      accentColor: GOV_BLUE,
      profileAvatarBg: `linear-gradient(135deg, ${GOV_BLUE} 0%, #10b981 100%)`,
      profileAvatarShadow: `0 0 14px ${GOV_BLUE}28`,
      roleTitle: role === 'super_admin' ? 'Super Administrator' : 'City Administrator',
      notifBtnBg: '#F1F5F9',
      notifBtnBorder: '#E2E8F0',
      notifBtnColor: '#475569',
      dropdownBg: '#FFFFFF',
    }
  }

  const theme = role === 'mayor'
    ? THEMES.mayor
    : role === 'super_admin'
    ? THEMES.super_admin
    : role === 'city_admin'
    ? THEMES.city_admin
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

  const isMayor = role === 'mayor' || location.pathname === '/mayor'

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: isMayor ? 'linear-gradient(160deg, #0A1628 0%, #0D1020 60%, #070C18 100%)' : '#F8FAFC',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: isMayor ? '#F1F5F9' : '#0F172A',
    }}>
      <SessionTimeoutManager />
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
                <Crown size={14} color="#fbbf24" />
              ) : role === 'super_admin' ? (
                <ShieldCheck size={14} color="#f59e0b" />
              ) : role === 'city_admin' ? (
                <Building2 size={14} color="#1D70B8" />
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
                overflow: 'hidden',
              }}>
                {user?.profile_photo_url ? (
                  <img
                    src={user.profile_photo_url}
                    alt={user.name || 'User'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  user?.name?.charAt(0)?.toUpperCase() || 'A'
                )}
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
          height: 64, background: isMayor ? theme.headerBg : '#FFFFFF',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${isMayor ? theme.borderColor : '#E2E8F0'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', flexShrink: 0, zIndex: 50,
          boxShadow: isMayor ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div>
            {/* Contextual role identifier */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: theme.accentColor, boxShadow: `0 0 8px ${theme.accentColor}`
              }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: isMayor ? '#94a3b8' : '#64748B', letterSpacing: 0.5 }}>
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
                      <h3 style={{ color: isMayor ? '#e2e8f0' : '#0F172A', fontSize: 15, fontWeight: 700, margin: 0 }}>Notifications</h3>
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
                                  <span style={{ color: isUnread ? (isMayor ? '#ffffff' : '#0F172A') : '#64748B', fontSize: 12, fontWeight: isUnread ? 800 : 600 }}>
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
                                color: isUnread ? (isMayor ? '#f1f5f9' : '#0F172A') : '#64748B', fontSize: 12, marginTop: 4,
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

        {/* Page Content — dark navy background matching mobile */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '24px',
          background: isMayor ? theme.appBg : '#F8FAFC',
          color: isMayor ? '#F1F5F9' : '#0F172A',
        }}>
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
