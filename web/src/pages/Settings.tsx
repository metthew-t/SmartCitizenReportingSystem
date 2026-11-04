import React, { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useLanguageStore, Language } from '../store/languageStore'
import { Settings as SettingsIcon, User, Bell, Globe, Shield, Database, Camera, Edit2, Check, X, Lock } from 'lucide-react'

const API = 'https://smartcitizenreportingsystem.onrender.com/api/v1'

// Light theme for department_manager and officer
interface SettingsTheme {
  isLight: boolean
  pageBg: string
  textPrimary: string
  textSecondary: string
  cardBg: string
  cardBorder: string
  cardHeaderBg: string
  cardHeaderText: string
  cardHeaderBorder: string
  inputBg: string
  inputBorder: string
  inputText: string
  inputDisabledBg: string
  inputDisabledText: string
  rowBorder: string
  accent: string
  accentLight: string
  accentText: string
  toggleOnBg: string
  iconAccent: string
}

function getTheme(role: string | null | undefined): SettingsTheme {
  if (role === 'department_manager') {
    return {
      isLight: true,
      pageBg: 'transparent',
      textPrimary: '#1A202C',
      textSecondary: '#4A5568',
      cardBg: '#FFFFFF',
      cardBorder: 'rgba(26,54,93,0.12)',
      cardHeaderBg: '#F7FAFF',
      cardHeaderText: '#1A365D',
      cardHeaderBorder: 'rgba(26,54,93,0.1)',
      inputBg: '#F7FAFF',
      inputBorder: 'rgba(43,108,176,0.25)',
      inputText: '#1A202C',
      inputDisabledBg: '#EEF2F7',
      inputDisabledText: '#6B7280',
      rowBorder: 'rgba(26,54,93,0.07)',
      accent: '#2B6CB0',
      accentLight: 'rgba(43,108,176,0.1)',
      accentText: '#2B6CB0',
      toggleOnBg: '#2B6CB0',
      iconAccent: '#2B6CB0',
    }
  }
  if (role === 'officer') {
    return {
      isLight: true,
      pageBg: 'transparent',
      textPrimary: '#1A202C',
      textSecondary: '#4A5568',
      cardBg: '#FFFFFF',
      cardBorder: 'rgba(21,128,61,0.12)',
      cardHeaderBg: '#F7FFF9',
      cardHeaderText: '#14532D',
      cardHeaderBorder: 'rgba(21,128,61,0.1)',
      inputBg: '#F7FFF9',
      inputBorder: 'rgba(22,163,74,0.25)',
      inputText: '#1A202C',
      inputDisabledBg: '#EEFAF2',
      inputDisabledText: '#6B7280',
      rowBorder: 'rgba(21,128,61,0.07)',
      accent: '#16A34A',
      accentLight: 'rgba(22,163,74,0.1)',
      accentText: '#16A34A',
      toggleOnBg: '#16A34A',
      iconAccent: '#16A34A',
    }
  }
  // Dark theme (default, admin, super_admin, mayor)
  return {
    isLight: false,
    pageBg: 'transparent',
    textPrimary: '#e2e8f0',
    textSecondary: '#94a3b8',
    cardBg: 'rgba(30,41,59,0.6)',
    cardBorder: 'rgba(148,163,184,0.08)',
    cardHeaderBg: 'transparent',
    cardHeaderText: '#e2e8f0',
    cardHeaderBorder: 'rgba(148,163,184,0.08)',
    inputBg: 'rgba(15,23,42,0.5)',
    inputBorder: 'rgba(148,163,184,0.2)',
    inputText: '#e2e8f0',
    inputDisabledBg: 'rgba(15,23,42,0.2)',
    inputDisabledText: '#64748b',
    rowBorder: 'rgba(148,163,184,0.04)',
    accent: '#6366f1',
    accentLight: 'rgba(99,102,241,0.15)',
    accentText: '#a5b4fc',
    toggleOnBg: '#10b981',
    iconAccent: '#6366f1',
  }
}

export default function Settings() {
  const { user, departmentName, role, token, updateUser } = useAuthStore()
  const { language, setLanguage, t } = useLanguageStore()
  // Subscribe to language so component re-renders on language change
  void language
  const th = getTheme(role)
  const [photoUrl, setPhotoUrl] = useState(user?.profile_photo_url || '')
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [langMsg, setLangMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Profile edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Fetch fresh profile data on load from backend
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) return
      try {
        const res = await fetch(`${API}/auth/me/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          const rawPhone = data.phone_number || ''
          const rawEmail = data.email || ''
          const freshPhone = rawPhone.includes('@') ? '' : rawPhone
          const freshEmail = rawEmail || (rawPhone.includes('@') ? rawPhone : '')
          const freshName = data.full_name || freshEmail || freshPhone || 'User'
          setProfileForm({
            fullName: freshName,
            phone: freshPhone,
            email: freshEmail,
          })
          updateUser({
            name: freshName,
            phone: freshPhone,
            email: freshEmail,
            profile_photo_url: data.profile_photo_url || null,
          })
          if (data.profile_photo_url) {
            setPhotoUrl(data.profile_photo_url)
          }
        }
      } catch (_) {}
    }
    fetchMe()
  }, [token])

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMsg(null)

    try {
      const payload: any = {
        full_name: profileForm.fullName,
        phone_number: profileForm.phone,
      }
      // Only city admin, super admin, or mayor can update email for themselves
      if (role === 'city_admin' || role === 'super_admin' || role === 'mayor') {
        payload.email = profileForm.email
      }

      const res = await fetch(`${API}/auth/me/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok) {
        setProfileMsg({ type: 'success', text: 'Profile updated successfully!' })
        setIsEditingProfile(false)
        updateUser({
          name: data.full_name || profileForm.fullName,
          phone: data.phone_number || profileForm.phone,
          email: data.email || profileForm.email,
        })
      } else {
        setProfileMsg({ type: 'error', text: data.error || 'Failed to update profile.' })
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Network error updating profile.' })
    } finally {
      setSavingProfile(false)
      setTimeout(() => setProfileMsg(null), 4000)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    background: th.inputBg,
    border: `1px solid ${th.inputBorder}`,
    borderRadius: 8,
    color: th.inputText,
    outline: 'none',
    fontSize: 13,
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 720 }}>
      <h2 style={{ color: th.textPrimary, fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>
        {t('settings_title')}
      </h2>
      <p style={{ color: th.textSecondary, fontSize: 13, margin: '0 0 24px' }}>
        {t('settings_subtitle')}
      </p>

      {/* Profile section */}
      <SettingsCard
        title={t('profile')}
        icon={<User size={18} color={th.iconAccent} />}
        th={th}
        action={
          !isEditingProfile ? (
            <button
              onClick={() => {
                const cleanPhone = user?.phone && !user.phone.includes('@') ? user.phone : ''
                const cleanEmail = user?.email || (user?.phone?.includes('@') ? user.phone : '')
                setProfileForm({
                  fullName: user?.name || '',
                  phone: cleanPhone,
                  email: cleanEmail,
                })
                setIsEditingProfile(true)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: th.accentLight,
                border: `1px solid ${th.accent}40`,
                color: th.accentText, padding: '6px 12px', borderRadius: 8,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = `${th.accent}25`}
              onMouseLeave={e => e.currentTarget.style.background = th.accentLight}
            >
              <Edit2 size={13} /> {t('edit_profile')}
            </button>
          ) : null
        }
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
              background: `linear-gradient(135deg, ${th.accent}, ${th.accent}99)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `3px solid ${th.accent}40`,
            }}>
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 28, fontWeight: 700, color: 'white' }}>
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 28, height: 28, borderRadius: '50%',
                background: th.accent, border: `2px solid ${th.isLight ? '#F0F2F5' : '#1e293b'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Camera size={14} color="white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
          </div>
          <div>
            <div style={{ color: th.textPrimary, fontWeight: 600, fontSize: 16 }}>{user?.name || 'N/A'}</div>
            <div style={{ color: th.textSecondary, fontSize: 12 }}>{role?.replace('_', ' ').toUpperCase() || 'OFFICER'}</div>
            {uploadMsg && <div style={{ color: uploadMsg.includes('updated') ? '#10b981' : '#ef4444', fontSize: 12, marginTop: 4 }}>{uploadMsg}</div>}
          </div>
        </div>

        {profileMsg && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600,
            background: profileMsg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${profileMsg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: profileMsg.type === 'success' ? '#10b981' : '#ef4444',
          }}>
            {profileMsg.text}
          </div>
        )}

        {!isEditingProfile ? (
          <div>
            <SettingsRow label={t('full_name')} value={user?.name || 'N/A'} th={th} />
            <SettingsRow label={t('phone_number')} value={user?.phone && !user.phone.includes('@') ? user.phone : t('not_provided')} th={th} />
            <SettingsRow label={t('email')} value={user?.email || (user?.phone?.includes('@') ? user.phone : t('not_provided'))} th={th} />
            <SettingsRow label={t('department')} value={departmentName || t('not_assigned')} th={th} />
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', color: th.textSecondary, fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{t('full_name')}</label>
              <input
                type="text"
                value={profileForm.fullName}
                onChange={e => setProfileForm({ ...profileForm, fullName: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ color: th.textSecondary, fontSize: 12, fontWeight: 600 }}>{t('phone_number')}</label>
                <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>{t('editable')}</span>
              </div>
              <input
                type="text"
                placeholder="09xxxxxxxx"
                value={profileForm.phone}
                onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ color: th.textSecondary, fontSize: 12, fontWeight: 600 }}>Email Address</label>
                {role === 'city_admin' || role === 'super_admin' || role === 'mayor' ? (
                  <span style={{ fontSize: 10, color: th.accent, fontWeight: 600 }}>Admin Editable</span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>
                    <Lock size={10} /> Managed by Admin / Manager
                  </span>
                )}
              </div>
              <input
                type="email"
                disabled={role !== 'city_admin' && role !== 'super_admin' && role !== 'mayor'}
                value={profileForm.email}
                onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                style={{
                  ...inputStyle,
                  background: role === 'city_admin' || role === 'super_admin' || role === 'mayor' ? th.inputBg : th.inputDisabledBg,
                  color: role === 'city_admin' || role === 'super_admin' || role === 'mayor' ? th.inputText : th.inputDisabledText,
                  cursor: role === 'city_admin' || role === 'super_admin' || role === 'mayor' ? 'text' : 'not-allowed',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: `1px solid ${th.cardBorder}`,
                  background: 'transparent', color: th.textSecondary, fontSize: 13, cursor: 'pointer',
                }}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 18px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white', fontSize: 13, fontWeight: 600, cursor: savingProfile ? 'not-allowed' : 'pointer',
                  opacity: savingProfile ? 0.6 : 1,
                }}
              >
                <Check size={14} /> {savingProfile ? t('saving') : t('save_changes')}
              </button>
            </div>
          </form>
        )}
      </SettingsCard>

      {/* Notifications */}
      <SettingsCard title={t('notifications')} icon={<Bell size={18} color="#f59e0b" />} th={th}>
        <SettingsToggle label={t('push_notifications')} defaultValue={true} th={th} />
        <SettingsToggle label={t('email_notifications')} defaultValue={false} th={th} />
        <SettingsToggle label={t('critical_alert_sound')} defaultValue={true} th={th} />
      </SettingsCard>

      {/* Language */}
      <SettingsCard title={t('language')} icon={<Globe size={18} color="#10b981" />} th={th}>
        {langMsg && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13, fontWeight: 600,
            background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Check size={16} /> {langMsg}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { code: 'om' as Language, name: 'Afaan Oromo', localName: 'Afaan Oromoo', flag: '🌳' },
            { code: 'am' as Language, name: 'Amharic', localName: 'አማርኛ', flag: '🇪🇹' },
            { code: 'en' as Language, name: 'English', localName: 'English (US)', flag: '🌐' },
          ].map(lang => {
            const isSelected = language === lang.code
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setLanguage(lang.code)
                  setLangMsg(
                    lang.code === 'om'
                      ? 'Afaan gara Afaan Oromootti jijjiirameera'
                      : lang.code === 'am'
                        ? 'ቋንቋ ወደ አማርኛ ተቀይሯል'
                        : 'Language updated to English'
                  )
                  setTimeout(() => setLangMsg(''), 3500)
                }}
                style={{
                  flex: '1 1 180px', padding: '14px', borderRadius: 12, cursor: 'pointer',
                  background: isSelected ? (th.isLight ? th.accentLight : 'rgba(99,102,241,0.2)') : (th.isLight ? '#F9FAFB' : 'rgba(15,23,42,0.5)'),
                  border: isSelected ? `2px solid ${th.accent}` : `1px solid ${th.cardBorder}`,
                  color: isSelected ? th.accentText : th.textSecondary, textAlign: 'center',
                  transition: 'all 0.2s', position: 'relative',
                  boxShadow: isSelected ? `0 0 16px ${th.accent}25` : 'none',
                }}
              >
                {isSelected && (
                  <span style={{
                    position: 'absolute', top: 8, right: 8,
                    background: th.accent, color: 'white', borderRadius: '50%',
                    width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
                <span style={{ fontSize: 22 }}>{lang.flag}</span>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6, color: isSelected ? th.accentText : th.textPrimary }}>
                  {lang.name}
                </div>
                <div style={{ fontSize: 11, color: isSelected ? th.accentText : th.textSecondary, marginTop: 2 }}>
                  {lang.localName}
                </div>
              </button>
            )
          })}
        </div>
      </SettingsCard>

      {/* System info */}
      <SettingsCard title={t('system_info')} icon={<Database size={18} color={th.textSecondary} />} th={th}>
        <SettingsRow label={t('version')} value="1.0.0" th={th} />
      </SettingsCard>
    </div>
  )
}

function SettingsCard({ title, icon, action, children, th }: { title: string, icon: any, action?: React.ReactNode, children: React.ReactNode, th: SettingsTheme }) {
  return (
    <div style={{
      background: th.cardBg,
      backdropFilter: th.isLight ? 'none' : 'blur(12px)',
      border: `1px solid ${th.cardBorder}`,
      borderRadius: 16,
      marginBottom: 16, overflow: 'hidden',
      boxShadow: th.isLight ? '0 2px 12px rgba(0,0,0,0.06)' : 'none',
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${th.cardHeaderBorder}`,
        background: th.cardHeaderBg,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {icon}
          <h3 style={{ color: th.cardHeaderText, fontSize: 15, fontWeight: 600, margin: 0 }}>{title}</h3>
        </div>
        {action}
      </div>
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  )
}

function SettingsRow({ label, value, th }: { label: string, value: string, th: SettingsTheme }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${th.rowBorder}` }}>
      <span style={{ color: th.textSecondary, fontSize: 13 }}>{label}</span>
      <span style={{ color: th.textPrimary, fontSize: 13, fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function SettingsToggle({ label, defaultValue, th }: { label: string, defaultValue: boolean, th: SettingsTheme }) {
  const [isOn, setIsOn] = React.useState(defaultValue)
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${th.rowBorder}` }}>
      <span style={{ color: th.textPrimary, fontSize: 13 }}>{label}</span>
      <button
        onClick={() => setIsOn(!isOn)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: isOn ? th.toggleOnBg : (th.isLight ? '#D1D5DB' : 'rgba(148,163,184,0.2)'),
          position: 'relative', transition: 'background 0.2s',
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: 'white',
          position: 'absolute', top: 3, left: isOn ? 23 : 3, transition: 'left 0.2s',
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
        }} />
      </button>
    </div>
  )
}
