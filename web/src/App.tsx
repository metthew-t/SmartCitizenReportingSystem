import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Reports from './pages/Reports'
import Departments from './pages/Departments'
import MapView from './pages/MapView'
import Settings from './pages/Settings'
import ReportDetails from './pages/ReportDetails'
import AdminUsers from './pages/AdminUsers'
import DeptChat from './pages/DeptChat'
import { useAuthStore } from './store/authStore'
import { Building2, LogIn } from 'lucide-react'
import PublicDashboard from './pages/PublicDashboard'

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

function Login() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore(state => state.login)
  const navigate = useNavigate()

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
        login(data.access, {
          id: me?.id || null,
          phone: phone,
          name: me?.full_name || phone,
          department_name: me?.department_name || null,
          is_city_admin: me?.is_city_admin || false,
        }, me?.department_name || (me?.is_city_admin ? 'City Administration' : null), me?.is_city_admin ? 'city_admin' : (me?.is_department_manager ? 'department_manager' : 'officer'))
        navigate('/dashboard')
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: 20,
    }}>
      {/* Background orbs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)', top: '-10%', right: '-5%', animation: 'float 8s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)', bottom: '-10%', left: '-5%', animation: 'float 10s ease-in-out infinite reverse' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 480 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 72, height: 72, borderRadius: 20,
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)',
            marginBottom: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <Building2 size={36} color="white" />
          </div>
          <h1 style={{ color: 'white', fontSize: 28, fontWeight: 800, margin: '0 0 8px' }}>
            Adama Smart Citizen
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: 0 }}>
            City Administration Dashboard
          </p>
        </div>

        {/* Main Card */}
        <div style={{
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(24px)',
          borderRadius: 24, padding: 32,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}>
          <h3 style={{ color: '#0f172a', fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>
            Welcome Back
          </h3>
          <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 24px' }}>
            Sign in with your email or phone number
          </p>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 16,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#dc2626', fontSize: 13,
            }}>{error}</div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input label="Email or Phone Number" value={phone} onChange={setPhone} placeholder="admin@adama.gov.et or 09xxxxxxxx" />
            <Input label="Password" value={password} onChange={setPassword} placeholder="••••••••" type="password" />

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: 14, borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white', fontSize: 16, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
              marginTop: 8, transition: 'all 0.3s ease',
              boxShadow: '0 8px 25px rgba(99,102,241,0.4)',
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Please wait...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 24 }}>
          Built for Adama City Administration — All 33 Departments
        </p>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={() => navigate('/public')} style={{
            background: 'none', border: 'none', color: '#38bdf8', fontSize: 14, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline'
          }}>
            View Public Transparency Dashboard
          </button>
        </div>
      </div>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      `}</style>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', color: '#475569', fontSize: 12, fontWeight: 600, marginBottom: 6 }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1px solid #e2e8f0', background: '#f8fafc',
  color: '#0f172a', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}

function Input({ label, value, onChange, placeholder, type = 'text' }: {
  label: string, value: string, onChange: (v: string) => void, placeholder: string, type?: string
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={inputStyle}
        onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
        onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
      />
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
        <Route path="/public" element={<PublicDashboard />} />
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
          <Route path="/users" element={<AdminUsers />} />
          <Route path="/dept-chat" element={<DeptChat />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
