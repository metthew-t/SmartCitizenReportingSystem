import React, { useState } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  LayoutDashboard, FileText, Map, Users, Settings, LogOut,
  Bell, Menu, X, Building2, ShieldCheck
} from 'lucide-react'

export default function DashboardLayout() {
  const { logout, departmentName, user, role } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
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
                background: 'rgba(99,102,241,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Building2 size={20} color="#818cf8" />
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
                  color: active ? '#818cf8' : '#94a3b8',
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
        minWidth: 0, // important for flex children to not overflow
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button style={{
              background: 'rgba(255,255,255,0.05)', border: 'none',
              width: 36, height: 36, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#94a3b8', cursor: 'pointer', position: 'relative',
            }}>
              <Bell size={18} />
              <span style={{
                position: 'absolute', top: 8, right: 8, width: 8, height: 8,
                background: '#ef4444', borderRadius: '50%', border: '2px solid #0f172a'
              }} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
