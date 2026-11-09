import React, { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useLanguageStore, Language } from '../store/languageStore'
import { Settings as SettingsIcon, User, Bell, Globe, Shield, Database, Camera, Edit2, Check, X, Lock, KeyRound, ShieldCheck, Trash2 } from 'lucide-react'
import { validatePasswordRules, isStrongPassword } from '../utils/passwordPolicy'

const API = 'https://smartcitizenreportingsystem.onrender.com/api/v1'

export default function Settings() {
  const { user, departmentName, role, token, updateUser } = useAuthStore()
  const { language, setLanguage, t } = useLanguageStore()
  // Subscribe to language state so component re-renders when language changes
  void language
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

  // Password change state
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  const passwordRules = validatePasswordRules(newPassword)
  const isPasswordValid = isStrongPassword(newPassword) && newPassword === confirmPassword && oldPassword.length > 0

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMsg(null)
    if (!oldPassword) {
      setPasswordMsg({ type: 'error', text: 'Current password is required.' })
      return
    }
    if (!isStrongPassword(newPassword)) {
      setPasswordMsg({ type: 'error', text: 'Password must meet all 5 government security requirements.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' })
      return
    }

    setSavingPassword(true)
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
        setPasswordMsg({ type: 'success', text: data.message || 'Password updated successfully!' })
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPasswordMsg({ type: 'error', text: data.error || 'Failed to change password.' })
      }
    } catch {
      setPasswordMsg({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setSavingPassword(false)
    }
  }

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

    if (file.size > 5 * 1024 * 1024) {
      setUploadMsg('File exceeds maximum 5MB size limit.')
      return
    }

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
        const newUrl = data.photo_url || ''
        setPhotoUrl(newUrl)
        updateUser({ profile_photo_url: newUrl })
        setUploadMsg('Profile photo updated successfully!')
        setTimeout(() => setUploadMsg(''), 4000)
      } else {
        setUploadMsg(data.error || 'Upload failed.')
      }
    } catch {
      setUploadMsg('Network error.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleRemovePhoto = async () => {
    if (!confirm('Are you sure you want to remove your official profile photo?')) return
    setUploading(true)
    setUploadMsg('')
    try {
      const res = await fetch(`${API}/auth/upload-photo/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        setPhotoUrl('')
        updateUser({ profile_photo_url: null })
        setUploadMsg('Profile photo removed.')
        setTimeout(() => setUploadMsg(''), 4000)
      } else {
        setUploadMsg('Failed to remove photo.')
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

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 720 }}>
      <h2 style={{ color: '#0F172A', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>
        {t('settings_title')}
      </h2>
      <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 24px' }}>
        {t('settings_subtitle')}
      </p>

      {/* Profile section */}
      <SettingsCard
        title={t('profile')}
        icon={<User size={18} color="#1D70B8" />}
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
                background: 'rgba(29,112,184,0.15)', border: '1px solid rgba(29,112,184,0.3)',
                color: '#93c5fd', padding: '6px 12px', borderRadius: 8,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
            >
              <Edit2 size={13} /> {t('edit_profile')}
            </button>
          ) : null
        }
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24, flexWrap: 'wrap', padding: '16px 20px', background: '#F8FAFC', borderRadius: 16, border: '1px solid #E2E8F0' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 88, height: 88, borderRadius: '50%', overflow: 'hidden',
              background: 'linear-gradient(135deg, #1D70B8, #0F2942)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '3px solid #FFFFFF',
              boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
            }}>
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setPhotoUrl('')} />
              ) : (
                <span style={{ fontSize: 32, fontWeight: 800, color: '#FFFFFF' }}>
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Upload New Photo"
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 32, height: 32, borderRadius: '50%',
                background: '#1D70B8', border: '2px solid #FFFFFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: uploading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                color: 'white',
              }}
            >
              <Camera size={16} />
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoUpload} style={{ display: 'none' }} />
          </div>

          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ color: '#0F172A', fontWeight: 800, fontSize: 18 }}>{user?.name || 'Government Official'}</span>
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: '#EFF6FF', color: '#1D70B8', border: '1px solid #BFDBFE'
              }}>
                {role === 'mayor' ? '👑 Executive Mayor' : role === 'super_admin' ? '🛡️ Super Administrator' : role === 'city_admin' ? '🏛️ City Administrator' : role === 'department_manager' ? '👔 Department Manager' : '👮 Field Officer'}
              </span>
            </div>

            <p style={{ color: '#64748B', fontSize: 12, margin: '6px 0 12px', lineHeight: 1.5 }}>
              Official government identification picture. Supported formats: JPG, PNG, WEBP (Max 5MB).
            </p>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  padding: '7px 16px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #1D70B8, #0D5C99)',
                  color: 'white', fontSize: 12, fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 2px 6px rgba(29,112,184,0.3)',
                }}
              >
                <Camera size={14} /> {uploading ? 'Processing...' : 'Upload New Photo'}
              </button>

              {photoUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={uploading}
                  style={{
                    padding: '7px 14px', borderRadius: 8, border: '1px solid #CBD5E1',
                    background: '#FFFFFF', color: '#DC2626', fontSize: 12, fontWeight: 600,
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Trash2 size={13} /> Remove
                </button>
              )}
            </div>

            {uploadMsg && (
              <div style={{
                color: uploadMsg.includes('success') || uploadMsg.includes('updated') || uploadMsg.includes('removed') ? '#059669' : '#DC2626',
                fontSize: 12, fontWeight: 600, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6
              }}>
                <Check size={14} /> {uploadMsg}
              </div>
            )}
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
            <SettingsRow label={t('full_name')} value={user?.name || 'N/A'} />
            <SettingsRow label={t('phone_number')} value={user?.phone && !user.phone.includes('@') ? user.phone : t('not_provided')} />
            <SettingsRow label={t('email')} value={user?.email || (user?.phone?.includes('@') ? user.phone : t('not_provided'))} />
            <SettingsRow label={t('department')} value={departmentName || t('not_assigned')} />
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', color: '#334155', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{t('full_name')}</label>
              <input
                type="text"
                value={profileForm.fullName}
                onChange={e => setProfileForm({ ...profileForm, fullName: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', outline: 'none' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ color: '#334155', fontSize: 12, fontWeight: 600 }}>{t('phone_number')}</label>
                <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>{t('editable')}</span>
              </div>
              <input
                type="text"
                placeholder="09xxxxxxxx"
                value={profileForm.phone}
                onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', outline: 'none' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ color: '#334155', fontSize: 12, fontWeight: 600 }}>Email Address</label>
                {role === 'city_admin' || role === 'super_admin' || role === 'mayor' ? (
                  <span style={{ fontSize: 10, color: '#1D70B8', fontWeight: 600 }}>Admin Editable</span>
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
                  width: '100%', padding: '10px 12px',
                  background: role === 'city_admin' || role === 'super_admin' || role === 'mayor' ? '#FFFFFF' : '#F1F5F9',
                  border: '1px solid #CBD5E1', borderRadius: 8,
                  color: role === 'city_admin' || role === 'super_admin' || role === 'mayor' ? '#0F172A' : '#64748B',
                  cursor: role === 'city_admin' || role === 'super_admin' || role === 'mayor' ? 'text' : 'not-allowed',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(29,112,184,0.25)',
                  background: 'transparent', color: '#475569', fontSize: 13, cursor: 'pointer',
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
      <SettingsCard title={t('notifications')} icon={<Bell size={18} color="#f59e0b" />}>
        <SettingsToggle label={t('push_notifications')} defaultValue={true} />
        <SettingsToggle label={t('email_notifications')} defaultValue={false} />
        <SettingsToggle label={t('critical_alert_sound')} defaultValue={true} />
      </SettingsCard>

      {/* Language */}
      <SettingsCard title={t('language')} icon={<Globe size={18} color="#10b981" />}>
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
                  background: isSelected ? '#EFF6FF' : '#FFFFFF',
                  border: isSelected ? '2px solid #1D70B8' : '1px solid #CBD5E1',
                  color: isSelected ? '#1D70B8' : '#0F172A', textAlign: 'center',
                  transition: 'all 0.2s', position: 'relative',
                  boxShadow: isSelected ? '0 2px 10px rgba(29,112,184,0.18)' : '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                {isSelected && (
                  <span style={{
                    position: 'absolute', top: 8, right: 8,
                    background: '#1D70B8', color: 'white', borderRadius: '50%',
                    width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
                <span style={{ fontSize: 22 }}>{lang.flag}</span>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6, color: isSelected ? '#1D70B8' : '#0F172A' }}>
                  {lang.name}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: isSelected ? '#1E40AF' : '#475569', marginTop: 2 }}>
                  {lang.localName}
                </div>
              </button>
            )
          })}
        </div>
      </SettingsCard>

      {/* Security & Password (Government 12-char Standard) */}
      <SettingsCard title="Security & Password Protection" icon={<ShieldCheck size={18} color="#10b981" />}>
        {passwordMsg && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600,
            background: passwordMsg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${passwordMsg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: passwordMsg.type === 'success' ? '#10b981' : '#f87171',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {passwordMsg.type === 'success' ? <Check size={16} /> : <X size={16} />}
            {passwordMsg.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', color: '#334155', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
              Current Password
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              style={{
                width: '100%', maxWidth: 420, padding: '10px 14px', borderRadius: 8,
                background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', fontSize: 14, outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#334155', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
              New Password (12+ Characters Government Standard)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              style={{
                width: '100%', maxWidth: 420, padding: '10px 14px', borderRadius: 8,
                background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', fontSize: 14, outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          {newPassword && (
            <div style={{
              maxWidth: 420, background: '#F8FAFC', border: '1px solid #E2E8F0',
              borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4
            }}>
              {passwordRules.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: r.valid ? '#059669' : '#64748B' }}>
                  <Check size={12} color={r.valid ? '#059669' : '#94A3B8'} />
                  <span>{r.label}</span>
                </div>
              ))}
            </div>
          )}

          <div>
            <label style={{ display: 'block', color: '#334155', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              style={{
                width: '100%', maxWidth: 420, padding: '10px 14px', borderRadius: 8,
                background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', fontSize: 14, outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={savingPassword || !isPasswordValid}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 8, border: 'none',
                background: isPasswordValid ? 'linear-gradient(135deg, #10b981, #059669)' : '#334155',
                color: isPasswordValid ? 'white' : '#94a3b8', fontSize: 13, fontWeight: 600,
                cursor: isPasswordValid && !savingPassword ? 'pointer' : 'not-allowed',
                boxShadow: isPasswordValid ? '0 2px 8px rgba(16,185,129,0.3)' : 'none'
              }}
            >
              <KeyRound size={15} />
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </SettingsCard>

      {/* System info */}
      <SettingsCard title={t('system_info')} icon={<Database size={18} color="#64748b" />}>
        <SettingsRow label={t('version')} value="1.0.0" />
      </SettingsCard>
    </div>
  )
}

function SettingsCard({ title, icon, action, children }: { title: string, icon: any, action?: React.ReactNode, children: React.ReactNode }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0', borderRadius: 16,
      marginBottom: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
    }}>
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {icon}
          <h3 style={{ color: '#0F172A', fontSize: 15, fontWeight: 600, margin: 0 }}>{title}</h3>
        </div>
        {action}
      </div>
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  )
}

function SettingsRow({ label, value }: { label: string, value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
      <span style={{ color: '#64748B', fontSize: 13 }}>{label}</span>
      <span style={{ color: '#0F172A', fontSize: 13, fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function SettingsToggle({ label, defaultValue }: { label: string, defaultValue: boolean }) {
  const [isOn, setIsOn] = React.useState(defaultValue)
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
      <span style={{ color: '#0F172A', fontSize: 13 }}>{label}</span>
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
