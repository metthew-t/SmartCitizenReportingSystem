import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Reports from './pages/Reports'
import MapView from './pages/MapView'
import Settings from './pages/Settings'
import ReportDetails from './pages/ReportDetails'
import { useAuthStore } from './store/authStore'
import { DEPARTMENTS, DemoDepartment } from './store/demoData'
import { Building2, Shield, ChevronDown, LogIn, Search } from 'lucide-react'

function Login() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [selectedDept, setSelectedDept] = useState<DemoDepartment | null>(null)
  const [role, setRole] = useState<string>('department_manager')
  const [showDeptDropdown, setShowDeptDropdown] = useState(false)
  const [deptSearch, setDeptSearch] = useState('')
  const login = useAuthStore(state => state.login)
  const navigate = useNavigate()

  const filteredDepts = DEPARTMENTS.filter(d =>
    d.name.toLowerCase().includes(deptSearch.toLowerCase()) ||
    d.nameEn.toLowerCase().includes(deptSearch.toLowerCase())
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const dept = selectedDept || DEPARTMENTS[0]
    login('demo-token-123', { phone: phone || '0911000001', name: 'Demo User' }, dept, role)
    navigate('/dashboard')
  }

  const handleDemoLogin = (dept: DemoDepartment) => {
    login('demo-token-123', { phone: '0911000001', name: 'Demo User' }, dept, 'department_manager')
    navigate('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%), url(/adama_bg.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: '20px',
    }}>
      {/* Animated background orbs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          top: '-10%', right: '-5%', animation: 'float 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
          bottom: '-5%', left: '-5%', animation: 'float 10s ease-in-out infinite reverse',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 960 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 72, height: 72, borderRadius: 20,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            marginBottom: 16, boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
          }}>
            <Building2 size={36} color="white" />
          </div>
          <h1 style={{ color: 'white', fontSize: 28, fontWeight: 800, margin: '0 0 8px' }}>
            Adama Smart Citizen Reporting
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 15, margin: 0 }}>
            City Administration Dashboard — Select your department to continue
          </p>
        </div>

        {/* Main card */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(24px)',
          borderRadius: 24,
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 0 40px rgba(59, 130, 246, 0.3), inset 0 0 20px rgba(255,255,255,0.05)',
          overflow: 'hidden',
        }}>
          {/* Two-column layout */}
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {/* Left: Quick department selection grid */}
            <div style={{
              flex: '1 1 520px',
              padding: 32,
              borderRight: '1px solid rgba(148,163,184,0.08)',
            }}>
              <h3 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={18} color="#6366f1" />
                Quick Department Login (Demo)
              </h3>

              {/* Search */}
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="Search departments..."
                  value={deptSearch}
                  onChange={e => setDeptSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px 8px 36px', borderRadius: 10,
                    border: '1px solid rgba(148,163,184,0.15)', background: 'rgba(15,23,42,0.5)',
                    color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Department grid */}
              <div style={{
                maxHeight: 380, overflowY: 'auto', display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                gap: 8, paddingRight: 4,
              }}>
                {filteredDepts.map(dept => (
                  <button
                    key={dept.id}
                    onClick={() => handleDemoLogin(dept)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.1)',
                      background: selectedDept?.id === dept.id
                        ? 'rgba(99,102,241,0.2)'
                        : 'rgba(15,23,42,0.4)',
                      color: '#e2e8f0', cursor: 'pointer', textAlign: 'left',
                      fontSize: 12, transition: 'all 0.2s',
                      width: '100%',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(99,102,241,0.15)'
                      e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = selectedDept?.id === dept.id
                        ? 'rgba(99,102,241,0.2)' : 'rgba(15,23,42,0.4)'
                      e.currentTarget.style.borderColor = 'rgba(148,163,184,0.1)'
                    }}
                  >
                    <span style={{
                      fontSize: 20, width: 36, height: 36, borderRadius: 8,
                      background: `${dept.color}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {dept.icon}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {dept.nameEn}
                      </div>
                      <div style={{
                        color: '#64748b', fontSize: 10, whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {dept.name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Manual login form */}
            <div style={{ flex: '1 1 300px', padding: 32 }}>
              <h3 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 600, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                <LogIn size={18} color="#10b981" />
                Sign In
              </h3>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Phone */}
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0911000001"
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.15)', background: 'rgba(15,23,42,0.5)',
                      color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Password */}
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="demo1234"
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.15)', background: 'rgba(15,23,42,0.5)',
                      color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Department selector */}
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
                    Department
                  </label>
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 10,
                        border: '1px solid rgba(148,163,184,0.15)', background: 'rgba(15,23,42,0.5)',
                        color: selectedDept ? 'white' : '#64748b', fontSize: 13,
                        cursor: 'pointer', textAlign: 'left', display: 'flex',
                        justifyContent: 'space-between', alignItems: 'center',
                      }}
                    >
                      <span>{selectedDept ? `${selectedDept.icon} ${selectedDept.nameEn}` : 'Select department...'}</span>
                      <ChevronDown size={16} color="#64748b" />
                    </button>
                    {showDeptDropdown && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        background: '#1e293b', border: '1px solid rgba(148,163,184,0.15)',
                        borderRadius: 10, marginTop: 4, maxHeight: 200, overflowY: 'auto',
                        zIndex: 50,
                      }}>
                        {DEPARTMENTS.map(d => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => { setSelectedDept(d); setShowDeptDropdown(false) }}
                            style={{
                              width: '100%', padding: '8px 14px', border: 'none',
                              background: 'transparent', color: '#e2e8f0', cursor: 'pointer',
                              textAlign: 'left', fontSize: 12,
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            {d.icon} {d.nameEn} — <span style={{ color: '#64748b' }}>{d.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.15)', background: 'rgba(15,23,42,0.5)',
                      color: 'white', fontSize: 13, outline: 'none',
                    }}
                  >
                    <option value="department_manager">Department Manager</option>
                    <option value="officer">Officer</option>
                    <option value="city_admin">City Administrator</option>
                  </select>
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                    marginTop: 8, transition: 'all 0.2s',
                    boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  Sign In
                </button>
              </form>

              {/* Demo credentials */}
              <div style={{
                marginTop: 24, padding: 16, borderRadius: 12,
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.15)',
              }}>
                <p style={{ color: '#10b981', fontSize: 12, fontWeight: 600, margin: '0 0 8px' }}>
                  🔑 Demo Credentials
                </p>
                <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 4px' }}>
                  Citizen: <code style={{ color: '#e2e8f0' }}>0911000001</code> / <code style={{ color: '#e2e8f0' }}>demo1234</code>
                </p>
                <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 4px' }}>
                  Admin: <code style={{ color: '#e2e8f0' }}>0911000002</code> / <code style={{ color: '#e2e8f0' }}>admin1234</code>
                </p>
                <p style={{ color: '#94a3b8', fontSize: 11, margin: 0 }}>
                  Officer: <code style={{ color: '#e2e8f0' }}>0911000100</code> / <code style={{ color: '#e2e8f0' }}>officer1234</code>
                </p>
              </div>
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 24 }}>
          Built for Adama City Administration, Ethiopia — All 33 Departments
        </p>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(3deg); }
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.2); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.4); }
      `}</style>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(state => state.token)
  if (!token) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:id" element={<ReportDetails />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
