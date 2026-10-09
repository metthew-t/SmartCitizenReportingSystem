import React, { useState, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { Settings as SettingsIcon, User, Bell, Globe, Shield, Database, Camera } from 'lucide-react'

const API = 'https://smartcitizenreportingsystem.onrender.com/api/v1'

export default function Settings() {
  const { user, departmentName, role, token } = useAuthStore()
  const [photoUrl, setPhotoUrl] = useState(user?.profile_photo_url || '')
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadMsg('')
    const formData = new FormData()
    formData.append('photo', file)
    try {
      const res = await fetch(`${API}/auth/upload-photo/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        setPhotoUrl(data.photo_url || '')
        setUploadMsg('Photo updated!')
        setTimeout(() => setUploadMsg(''), 3000)
      } else {
        setUploadMsg(data.error || 'Upload failed.')
      }
    } catch {
      setUploadMsg('Network error.')
    } finally {
      setUploading(false)
    }
  }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '3px solid rgba(99,102,241,0.3)',
            }}>
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 28, fontWeight: 700, color: 'white' }}>
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 28, height: 28, borderRadius: '50%',
                background: '#6366f1', border: '2px solid #1e293b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Camera size={14} color="white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
          </div>
          <div>
            <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 15 }}>{user?.name || 'N/A'}</div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>{role?.replace('_', ' ').toUpperCase() || 'OFFICER'}</div>
            {uploadMsg && <div style={{ color: uploadMsg.includes('updated') ? '#10b981' : '#ef4444', fontSize: 12, marginTop: 4 }}>{uploadMsg}</div>}
          </div>
        </div>
        <SettingsRow label="Phone Number" value={user?.phone || 'N/A'} />
        <SettingsRow label="Email" value={user?.email || 'N/A'} />
        <SettingsRow label="Department" value={departmentName || 'Not assigned'} />
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
        <SettingsRow label="Version" value="1.0.0" />
      </SettingsCard>
    </div>
  )
}

function SettingsCard({ title, icon, children }: { title: string, icon: any, children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16,
      marginBottom: 16, overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid rgba(148,163,184,0.08)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {icon}
        <h3 style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 600, margin: 0 }}>{title}</h3>
      </div>
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  )
}

function SettingsRow({ label, value }: { label: string, value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148,163,184,0.04)' }}>
      <span style={{ color: '#94a3b8', fontSize: 13 }}>{label}</span>
      <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function SettingsToggle({ label, defaultValue }: { label: string, defaultValue: boolean }) {
  const [isOn, setIsOn] = React.useState(defaultValue)
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(148,163,184,0.04)' }}>
      <span style={{ color: '#e2e8f0', fontSize: 13 }}>{label}</span>
      <button
        onClick={() => setIsOn(!isOn)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: isOn ? '#10b981' : 'rgba(148,163,184,0.2)',
          position: 'relative', transition: 'background 0.2s',
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: 'white',
          position: 'absolute', top: 3, left: isOn ? 23 : 3, transition: 'left 0.2s',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }} />
      </button>
    </div>
  )
}
