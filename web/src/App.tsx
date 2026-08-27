import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Reports from './pages/Reports'
import Departments from './pages/Departments'
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

  const [loginError, setLoginError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    const dept = selectedDept || DEPARTMENTS[0]
    try {
      const res = await fetch('https://smartcitizenreportingsystem.onrender.com/api/v1/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone || '0911000001', password: password || 'admin123' })
      })
      if (res.ok) {
        const data = await res.json()
        login(data.access, { phone: phone || '0911000001', name: 'Department User' }, dept, role)
        navigate('/dashboard')
      } else {
        setLoginError('Invalid credentials. Please try again.')
      }
    } catch (err) {
      setLoginError('Network error. Backend may be starting up, please try again in a moment.')
    }
  }

  const handleDemoLogin = (dept: DemoDepartment) => {
    // For demo login, use a mock token (works with AllowAny endpoints)
    login('demo-token-123', { phone: '0911000001', name: 'Demo User' }, dept, 'department_manager')
    navigate('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.3) 100%), url(/adama_bg.jpg)',
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
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)',
          top: '-10%', right: '-5%', animation: 'float 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)',
          bottom: '-10%', left: '-5%', animation: 'float 10s ease-in-out infinite reverse',
        }} />
        <div style={{
          position: 'absolute', width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
          top: '30%', left: '20%', animation: 'float 12s ease-in-out infinite',
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
          <h1 style={{ color: '#0f172a', fontSize: 28, fontWeight: 800, margin: '0 0 8px', textShadow: '0 2px 10px rgba(255,255,255,0.8)' }}>
            Adama Smart Citizen Reporting
          </h1>
          <p style={{ color: '#334155', fontSize: 15, margin: 0, fontWeight: 500, textShadow: '0 1px 4px rgba(255,255,255,0.8)' }}>
            City Administration Dashboard — Select your department to continue
          </p>
        </div>

        {/* Main card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(24px)',
          borderRadius: 24,
          border: '1px solid rgba(203, 213, 225, 0.5)',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08), inset 0 0 20px rgba(255,255,255,0.5)',
          overflow: 'hidden',
        }}>
          {/* Two-column layout */}
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {/* Left: Quick department selection grid */}
            <div style={{
              flex: '1 1 520px',
              padding: 32,
              borderRight: '1px solid rgba(203,213,225,0.4)',
            }}>
              <h3 style={{ color: '#0f172a', fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
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
                    border: '1px solid rgba(203,213,225,0.6)', background: 'rgba(241,245,249,0.8)',
                    color: '#0f172a', fontSize: 13, outline: 'none', boxSizing: 'border-box',
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
                      border: '1px solid rgba(203,213,225,0.4)',
                      background: selectedDept?.id === dept.id
                        ? 'rgba(99,102,241,0.1)'
                        : 'rgba(255,255,255,0.5)',
                      color: '#334155', cursor: 'pointer', textAlign: 'left',
                      fontSize: 12, transition: 'all 0.2s',
                      width: '100%',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(99,102,241,0.05)'
                      e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = selectedDept?.id === dept.id
                        ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.5)'
                      e.currentTarget.style.borderColor = 'rgba(203,213,225,0.4)'
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
                        color: '#0f172a'
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
              <h3 style={{ color: '#0f172a', fontSize: 16, fontWeight: 600, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                <LogIn size={18} color="#10b981" />
                Sign In
              </h3>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Phone */}
                <div>
                  <label style={{ display: 'block', color: '#475569', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0911000001"
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: '1px solid rgba(203,213,225,0.6)', background: 'rgba(241,245,249,0.8)',
                      color: '#0f172a', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Password */}
                <div>
                  <label style={{ display: 'block', color: '#475569', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="demo1234"
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: '1px solid rgba(203,213,225,0.6)', background: 'rgba(241,245,249,0.8)',
                      color: '#0f172a', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Department selector */}
                <div>
                  <label style={{ display: 'block', color: '#475569', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    Department
                  </label>
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 10,
                        border: '1px solid rgba(203,213,225,0.6)', background: 'rgba(241,245,249,0.8)',
                        color: selectedDept ? '#0f172a' : '#64748b', fontSize: 13,
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
                        background: 'white', border: '1px solid rgba(203,213,225,0.6)',
                        borderRadius: 10, marginTop: 4, maxHeight: 200, overflowY: 'auto',
                        zIndex: 50, boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      }}>
                        {DEPARTMENTS.map(d => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => { setSelectedDept(d); setShowDeptDropdown(false) }}
                            style={{
                              width: '100%', padding: '8px 14px', border: 'none',
                              background: 'transparent', color: '#0f172a', cursor: 'pointer',
                              textAlign: 'left', fontSize: 12,
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
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
                  <label style={{ display: 'block', color: '#475569', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: '1px solid rgba(203,213,225,0.6)', background: 'rgba(241,245,249,0.8)',
                      color: '#0f172a', fontSize: 13, outline: 'none',
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
                    width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6)',
                    backgroundSize: '200% 200%',
                    color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                    marginTop: 8, transition: 'all 0.3s ease',
                    boxShadow: '0 8px 25px rgba(236,72,153,0.4)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(236,72,153,0.6)'
                    e.currentTarget.style.backgroundPosition = '100% 50%'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(236,72,153,0.4)'
                    e.currentTarget.style.backgroundPosition = '0% 50%'
                  }}
                >
                  Sign In
                </button>
              </form>

              {/* Demo credentials */}
              <div style={{
                marginTop: 24, padding: 16, borderRadius: 12,
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.2)',
              }}>
                <p style={{ color: '#059669', fontSize: 12, fontWeight: 700, margin: '0 0 8px' }}>
                  🔑 Demo Credentials
                </p>
                <p style={{ color: '#475569', fontSize: 11, margin: '0 0 4px' }}>
                  Citizen: <code style={{ color: '#0f172a', fontWeight: 600 }}>0911000001</code> / <code style={{ color: '#0f172a', fontWeight: 600 }}>demo1234</code>
                </p>
                <p style={{ color: '#475569', fontSize: 11, margin: '0 0 4px' }}>
                  Admin: <code style={{ color: '#0f172a', fontWeight: 600 }}>0911000002</code> / <code style={{ color: '#0f172a', fontWeight: 600 }}>admin1234</code>
                </p>
                <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>
                  Officer: <code style={{ color: '#0f172a', fontWeight: 600 }}>0911000100</code> / <code style={{ color: '#0f172a', fontWeight: 600 }}>officer1234</code>
                </p>
              </div>
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#64748b', fontSize: 12, marginTop: 24, fontWeight: 500 }}>
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
          <Route path="/departments" element={<Departments />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
