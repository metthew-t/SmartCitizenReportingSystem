import React from 'react'
import { useAuthStore } from '../store/authStore'
import { DEPARTMENTS } from '../store/demoData'
import { Settings as SettingsIcon, User, Bell, Globe, Shield, Database } from 'lucide-react'

export default function Settings() {
  const { user, department, role } = useAuthStore()

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 720 }}>
      <h2 style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>
        Settings
      </h2>
      <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 24px' }}>
        Manage your account and dashboard preferences
      </p>

      {/* Profile section */}
      <SettingsCard title="Profile" icon={<User size={18} color="#6366f1" />}>
        <SettingsRow label="Phone Number" value={user?.phone || '0911000001'} />
        <SettingsRow label="Name" value={user?.name || 'Demo User'} />
        <SettingsRow label="Role" value={role?.replace('_', ' ').toUpperCase() || 'OFFICER'} />
        <SettingsRow label="Department" value={department?.nameEn || 'Not assigned'} />
      </SettingsCard>

      {/* Notifications */}
      <SettingsCard title="Notifications" icon={<Bell size={18} color="#f59e0b" />}>
        <SettingsToggle label="Push Notifications" defaultValue={true} />
        <SettingsToggle label="Email Notifications" defaultValue={false} />
        <SettingsToggle label="Critical Alert Sound" defaultValue={true} />
      </SettingsCard>

      {/* Language */}
      <SettingsCard title="Language" icon={<Globe size={18} color="#10b981" />}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { code: 'om', name: 'Afaan Oromo', flag: '🟢' },
            { code: 'am', name: 'Amharic', flag: '🟡' },
            { code: 'en', name: 'English', flag: '🔵' },
          ].map(lang => (
            <button
              key={lang.code}
              style={{
                flex: 1, padding: '12px', borderRadius: 10, cursor: 'pointer',
                background: lang.code === 'en' ? 'rgba(99,102,241,0.15)' : 'rgba(15,23,42,0.4)',
                border: `1px solid ${lang.code === 'en' ? 'rgba(99,102,241,0.3)' : 'rgba(148,163,184,0.1)'}`,
                color: '#e2e8f0', textAlign: 'center',
              }}
            >
              <span style={{ fontSize: 18 }}>{lang.flag}</span>
              <div style={{ fontSize: 12, marginTop: 4 }}>{lang.name}</div>
            </button>
          ))}
        </div>
      </SettingsCard>

      {/* System info */}
      <SettingsCard title="System Info" icon={<Database size={18} color="#64748b" />}>
        <SettingsRow label="Version" value="1.0.0 (Demo Mode)" />
        <SettingsRow label="Departments" value={`${DEPARTMENTS.length} departments loaded`} />
        <SettingsRow label="API Status" value="⚠️ Offline (Demo Data)" />
        <SettingsRow label="Backend" value="Django REST Framework" />
      </SettingsCard>
    </div>
  )
}

function SettingsCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16,
      padding: 20, marginBottom: 16,
    }}>
      <h3 style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon} {title}
      </h3>
      {children}
    </div>
  )
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: '1px solid rgba(148,163,184,0.06)',
    }}>
      <span style={{ color: '#94a3b8', fontSize: 13 }}>{label}</span>
      <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function SettingsToggle({ label, defaultValue }: { label: string; defaultValue: boolean }) {
  const [on, setOn] = React.useState(defaultValue)
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: '1px solid rgba(148,163,184,0.06)',
    }}>
      <span style={{ color: '#94a3b8', fontSize: 13 }}>{label}</span>
      <button
        onClick={() => setOn(!on)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: on ? '#6366f1' : 'rgba(148,163,184,0.2)',
          position: 'relative', transition: 'background 0.2s',
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: 'white',
          position: 'absolute', top: 3,
          left: on ? 23 : 3, transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )
}
