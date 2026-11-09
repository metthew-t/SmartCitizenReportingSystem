import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Reports from './pages/Reports'
import Departments from './pages/Departments'
import MapView from './pages/MapView'
import Settings from './pages/Settings'
import ReportDetails from './pages/ReportDetails'
import AdminUsers from './pages/AdminUsers'
import DeptChat from './pages/DeptChat'
import OfficialReports from './pages/OfficialReports'
import MayorCommandCenter from './pages/MayorCommandCenter'
import AuditLogs from './pages/AuditLogs'
import { useAuthStore } from './store/authStore'
import { Building2, KeyRound, ShieldAlert, Check, X as CloseIcon } from 'lucide-react'
import PublicDashboard from './pages/PublicDashboard'
import { startKeepAlive } from './keepAlive'
import { validatePasswordRules, isStrongPassword } from './utils/passwordPolicy'
import { Colors, Styles } from './theme'

const API = 'https://smartcitizenreportingsystem.onrender.com/api/v1'

// Department list for officer registration (names must match backend exactly)
const DEPT_NAMES = [
  'Galmeessa Siivilii', 'Waajjira Invastimantii', 'Bulchiinsaa fi Nageenya',
  'Waajjira Hojjataa fi Hawaasummaa', 'Waajjira Aadaa fi Turiizimii',
  'Waajjira Milishaa', 'Waajjira Dargaggoo fi Ispoortii',
  'Waajjira Karoora/Pilaanii fi Misoomaa', 'Qajeelcha Poolisii',
  'Buusaa Gonofaa', 'Abbaa Taayitaa Eegumsa Naannoo',
  'Abbaa Taayitaa Konistiraakshinii', 'Koomishinii Turizimii',
  'Waajjira Lafaa', 'Waajjira Fayyaa', 'Waajjira Abbaa Alangaa',
  'Waajjira Saayinsii fi Teeknoloojii', "Waajjira Bishaan Dhugaatii fi Dhangala'aa",
  'Giddu-gala Tajaajilaa', 'Waldaa Hojii Gamtaa', 'Waajjira Albuuda',
  "Waajjira Dhimma Dubartootaa fi Daa'immanii", 'Mana Qopheessaa',
  'Waajjira Galii', 'Ejansii Geejjibaa', 'Waajjira Kantiibaa',
  'Waajjira PSMQN', 'Waajjira Kominikeeshinii', 'Waajjira Daldala',
  'Waajjira Qonnaa', 'Waajjira Maallaqaa', 'Waajjira Carraa Hojii Uumuu fi Ogummaa',
  'Waajjira Barnoota'
]

// Start background keep-alive pings to prevent Render cold starts
startKeepAlive()

function Login() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const token = useAuthStore(state => state.token)
  const role = useAuthStore(state => state.role)
  const login = useAuthStore(state => state.login)
  const navigate = useNavigate()
  const location = useLocation()
  const isExpired = new URLSearchParams(location.search).get('expired') === '1'

  useEffect(() => {
    if (token) {
      if (role === 'mayor') {
        navigate('/mayor', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    }
  }, [token, role, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!phone || !password) { setError('Email/Phone and password are required'); return }
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, password })
      })
      if (res.ok) {
        const data = await res.json()
        // Fetch user profile to get department info
        const meRes = await fetch(`${API}/auth/me/`, {
          headers: { 'Authorization': `Bearer ${data.access}` }
        })
        const me = meRes.ok ? await meRes.json() : null
        const rawPhone = me?.phone_number || ''
        const rawEmail = me?.email || ''
        const cleanPhone = rawPhone.includes('@') ? '' : (rawPhone || (phone.includes('@') ? '' : phone))
        const cleanEmail = rawEmail || (rawPhone.includes('@') ? rawPhone : (phone.includes('@') ? phone : ''))
        const cleanName = me?.full_name || cleanEmail || cleanPhone || 'User'

        const isMayor = Boolean(me?.is_mayor)
        const isSuperAdmin = Boolean(me?.is_super_admin && !isMayor)
        const isCityAdmin = Boolean(me?.is_city_admin && !isSuperAdmin && !isMayor)
        const role = isMayor ? 'mayor' : (isSuperAdmin ? 'super_admin' : (isCityAdmin ? 'city_admin' : (me?.is_department_manager ? 'department_manager' : 'officer')))
        const deptName = isMayor ? 'Office of the Mayor' : (isSuperAdmin ? 'System Administration' : (me?.department_name || (isCityAdmin ? 'City Administration' : null)))

        const mustChange = Boolean(data.must_change_password || me?.must_change_password)

        login(data.access, {
          id: me?.id || null,
          phone: cleanPhone,
          email: cleanEmail,
          name: cleanName,
          profile_photo_url: me?.profile_photo_url || null,
          department_name: isMayor ? 'Waajjira Kantiibaa' : (isSuperAdmin ? 'System Administration' : me?.department_name || (isCityAdmin ? 'City Administration' : null)),
          is_city_admin: isCityAdmin,
          is_super_admin: isSuperAdmin,
          is_mayor: isMayor,
          must_change_password: mustChange,
        }, deptName, role, mustChange)

        if (role === 'mayor') {
          navigate('/mayor')
        } else {
          navigate('/dashboard')
        }
      } else {
        setError('Invalid email/phone number or password.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(145deg, ${Colors.navy} 0%, ${Colors.govBlue} 50%, ${Colors.teal} 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: 20,
    }}>
      {/* Subtle background pattern */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)', top: '-8%', right: '5%' }} />
        <div style={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', bottom: '-8%', left: '5%' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 460 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 72, height: 72, borderRadius: 18,
            background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)',
            marginBottom: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <Building2 size={36} color="white" strokeWidth={2} />
          </div>
          <h1 style={{ color: 'white', fontSize: 26, fontWeight: 800, margin: '0 0 6px', letterSpacing: -0.5 }}>
            Adama Smart Citizen
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: 0, fontWeight: 500 }}>
            City Administration Dashboard
          </p>
        </div>

        {/* Main Card */}
        <div style={{
          background: Colors.surface,
          borderRadius: 20, padding: 32,
          boxShadow: '0 24px 64px rgba(15,23,42,0.2)',
          border: `1px solid ${Colors.border}`,
        }}>
          <h3 style={{ color: Colors.textPrimary, fontSize: 20, fontWeight: 700, margin: '0 0 4px', letterSpacing: -0.3 }}>
            Welcome Back
          </h3>
          <p style={{ color: Colors.textSecondary, fontSize: 13, margin: '0 0 24px' }}>
            Sign in with your email or phone number
          </p>

          {isExpired && (
            <div className="alert-warning" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span>⏱️</span>
              <span><strong>Session expired</strong> — 15 minutes of inactivity. Please sign in again.</span>
            </div>
          )}

          {error && (
            <div className="alert-danger" style={{ marginBottom: 16, fontSize: 13 }}>{error}</div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <GovInput label="Email or Phone Number" value={phone} onChange={setPhone} placeholder="admin@adama.gov.et or 09xxxxxxxx" />
            <GovInput label="Password" value={password} onChange={setPassword} placeholder="••••••••" type="password" />

            <button type="submit" disabled={loading} style={{
              ...Styles.btnPrimary,
              width: '100%',
              height: 48,
              marginTop: 8,
              fontSize: 15,
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 20, fontWeight: 500 }}>
          Adama City Administration · All 33 Departments
        </p>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button onClick={() => navigate('/public')} style={{
            background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.7)', fontSize: 13,
            cursor: 'pointer', fontWeight: 600,
            textDecoration: 'underline', textUnderlineOffset: 3,
          }}>
            View Public Transparency Dashboard →
          </button>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', color: Colors.textSecondary, fontSize: 12, fontWeight: 600, marginBottom: 6 }
const inputStyle: React.CSSProperties = { ...Styles.input }

function GovInput({ label, value, onChange, placeholder, type = 'text' }: {
  label: string, value: string, onChange: (v: string) => void, placeholder: string, type?: string
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={inputStyle}
        onFocus={e => { e.currentTarget.style.borderColor = Colors.govBlue; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(29,112,184,0.15)` }}
        onBlur={e => { e.currentTarget.style.borderColor = Colors.border; e.currentTarget.style.boxShadow = 'none' }}
      />
    </div>
  )
}

// Keep old Input name as alias for backward compatibility
const Input = GovInput

function ForcedPasswordChangeModal() {
  const token = useAuthStore(state => state.token)
  const setMustChangePassword = useAuthStore(state => state.setMustChangePassword)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const rules = validatePasswordRules(newPassword)
  const isValid = isStrongPassword(newPassword) && newPassword === confirmPassword && oldPassword.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!oldPassword) {
      setError('Current temporary password is required.')
      return
    }
    if (!isStrongPassword(newPassword)) {
      setError('Password must meet all 5 government security requirements (minimum 12 characters).')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/change-password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
      })
      const data = await res.json()
      if (res.ok) {
        setMustChangePassword(false)
      } else {
        setError(data.error || 'Failed to update password. Please check your current password.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(15, 23, 42, 0.88)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        background: '#1e293b', border: '1px solid rgba(245, 158, 11, 0.4)',
        borderRadius: 20, padding: 32, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)', color: '#f8fafc'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24'
          }}>
            <ShieldAlert size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: '#f8fafc' }}>
              Mandatory Password Change
            </h2>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
              Government Cyber-Security Standard Enforcement
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#fcd34d', lineHeight: 1.5
        }}>
          🛡️ <strong>Initial Login Security Policy:</strong> Your account was provisioned by municipal administration. To comply with Adama City and national government cybersecurity standards, you are <strong>required to establish a private 12-character strong password</strong> before accessing the portal.
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
              Current / Temporary Password
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              placeholder="Enter password assigned by admin"
              required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1px solid rgba(148, 163, 184, 0.2)', background: 'rgba(15, 23, 42, 0.6)',
                color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
              New Strong Password (12+ Characters)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new 12+ character password"
              required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1px solid rgba(148, 163, 184, 0.2)', background: 'rgba(15, 23, 42, 0.6)',
                color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Real-time 5-point strong password checklist */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(148, 163, 184, 0.15)',
            borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
              Security Policy Requirements
            </div>
            {rules.map(rule => (
              <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: rule.valid ? '#4ade80' : '#94a3b8' }}>
                {rule.valid ? <Check size={14} color="#4ade80" /> : <CloseIcon size={14} color="#ef4444" />}
                <span>{rule.label}</span>
              </div>
            ))}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password"
              required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1px solid rgba(148, 163, 184, 0.2)', background: 'rgba(15, 23, 42, 0.6)',
                color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box'
              }}
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <span style={{ fontSize: 12, color: '#ef4444', display: 'block', marginTop: 4 }}>
                Passwords do not match
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={!isValid || loading}
            style={{
              width: '100%', padding: 14, borderRadius: 12, border: 'none',
              background: isValid ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#334155',
              color: isValid ? '#000' : '#94a3b8', fontSize: 15, fontWeight: 700,
              cursor: isValid && !loading ? 'pointer' : 'not-allowed', marginTop: 8,
              transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: isValid ? '0 4px 20px rgba(245, 158, 11, 0.3)' : 'none'
            }}
          >
            <KeyRound size={18} />
            {loading ? 'Securing Account...' : 'Set Strong Password & Enter Portal'}
          </button>
        </form>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(state => state.token)
  const mustChangePassword = useAuthStore(state => state.mustChangePassword)
  if (!token) return <Navigate to="/" replace />
  return (
    <>
      {mustChangePassword && <ForcedPasswordChangeModal />}
      {children}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/public" element={<PublicDashboard />} />
        <Route element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/mayor" element={<MayorCommandCenter />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:id" element={<ReportDetails />} />
          <Route path="/official-reports" element={<OfficialReports />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/users" element={<AdminUsers />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/dept-chat" element={<DeptChat />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
