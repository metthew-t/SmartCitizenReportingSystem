import React, { useState } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { DEPARTMENTS } from '../store/demoData'
import {
  LayoutDashboard, FileText, Map, Users, Settings, LogOut,
  ChevronDown, Bell, Menu, X, Building2
} from 'lucide-react'

export default function DashboardLayout() {
  const { logout, department, setDepartment, user, role } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [showDeptSwitcher, setShowDeptSwitcher] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/reports', label: 'Reports', icon: FileText },
    { path: '/departments', label: 'Departments', icon: Building2 },
    { path: '/map', label: 'GIS Map', icon: Map },
    { path: '/settings', label: 'Settings', icon: Settings },
  ]

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
                background: department ? `${department.color}22` : 'rgba(99,102,241,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>
                {department?.icon || '🏛️'}
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
          {!sidebarCollapsed && department && (
            <button
              onClick={() => setShowDeptSwitcher(!showDeptSwitcher)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 10,
                border: '1px solid rgba(148,163,184,0.1)',
                background: `${department.color}11`,
                color: '#e2e8f0', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: 12, transition: 'all 0.2s',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {department.nameEn}
              </span>
              <ChevronDown size={14} color="#64748b" style={{
                transform: showDeptSwitcher ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.2s',
              }} />
            </button>
          )}

          {/* Department switcher dropdown */}
          {showDeptSwitcher && !sidebarCollapsed && (
            <div style={{
              marginTop: 4, maxHeight: 200, overflowY: 'auto',
              borderRadius: 10, border: '1px solid rgba(148,163,184,0.1)',
              background: '#1e293b',
            }}>
              {DEPARTMENTS.map(d => (
                <button
                  key={d.id}
                  onClick={() => {
                    setDepartment(d)
                    setShowDeptSwitcher(false)
                  }}
                  style={{
                    width: '100%', padding: '7px 12px', border: 'none',
                    background: d.id === department?.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                    color: '#e2e8f0', cursor: 'pointer', textAlign: 'left',
                    fontSize: 11, display: 'flex', alignItems: 'center', gap: 8,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                  onMouseLeave={e => {
                    if (d.id !== department?.id) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <span style={{ fontSize: 14 }}>{d.icon}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.nameEn}
                  </span>
                </button>
              ))}
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
                  padding: sidebarCollapsed ? '10px 12px' : '10px 16px',
                  borderRadius: 12, marginBottom: 6,
                  background: active ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(236,72,153,0.15))' : 'transparent',
                  color: active ? '#818cf8' : '#94a3b8',
                  border: `1px solid ${active ? 'rgba(99,102,241,0.25)' : 'transparent'}`,
                  textDecoration: 'none', fontSize: 13, fontWeight: active ? 600 : 500,
                  transition: 'all 0.3s',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'rgba(99,102,241,0.08)'
                    e.currentTarget.style.color = '#e2e8f0'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#94a3b8'
                  }
                }}
              >
                <Icon size={18} />
                {!sidebarCollapsed && item.label}
              </Link>
            )
          })}
        </nav>

        {/* User info + logout */}
        <div style={{
          padding: sidebarCollapsed ? '12px' : '16px 20px',
          borderTop: '1px solid rgba(148,163,184,0.08)',
        }}>
          {!sidebarCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 13, fontWeight: 700, flexShrink: 0,
              }}>
                {user?.name?.[0] || 'U'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}>
                  {user?.name || 'Demo User'}
                </div>
                <div style={{ color: '#64748b', fontSize: 10, textTransform: 'capitalize' }}>
                  {role?.replace('_', ' ') || 'Officer'}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '10px 12px', borderRadius: 10,
              border: 'none', background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(249,115,22,0.15))',
              color: '#f87171', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              transition: 'all 0.3s',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.8), rgba(249,115,22,0.8))'
              e.currentTarget.style.color = 'white'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(239,68,68,0.4)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(249,115,22,0.15))'
              e.currentTarget.style.color = '#f87171'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <LogOut size={16} />
            {!sidebarCollapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{
          height: 56, padding: '0 24px',
          background: 'rgba(30,41,59,0.6)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(148,163,184,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 600, margin: 0 }}>
              {department?.icon} {department?.nameEn || 'Dashboard'}
            </h2>
            <p style={{ color: '#64748b', fontSize: 11, margin: 0 }}>
              {department?.name}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={{
              position: 'relative', background: 'none', border: 'none',
              color: '#94a3b8', cursor: 'pointer', padding: 8, borderRadius: 8,
            }}>
              <Bell size={18} />
              <span style={{
                position: 'absolute', top: 4, right: 4, width: 8, height: 8,
                borderRadius: '50%', background: '#ef4444',
              }} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24, background: '#0f172a' }}>
          <Outlet />
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.2); border-radius: 3px; }
      `}</style>
    </div>
  )
}
