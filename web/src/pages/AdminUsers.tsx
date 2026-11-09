import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { Trash2, User, Building2, Shield, Search, Plus, X, KeyRound, Edit2, Phone, Mail, Crown, Sparkles, Check, ShieldAlert } from 'lucide-react'
import { validatePasswordRules, isStrongPassword, generateStrongPassword } from '../utils/passwordPolicy'

const API = 'https://smartcitizenreportingsystem.onrender.com/api/v1'

interface UserData {
  id: number
  phone_number: string | null
  email: string | null
  full_name: string | null
  national_id: string | null
  is_citizen: boolean
  is_officer: boolean
  is_department_manager: boolean
  is_city_admin: boolean
  is_super_admin: boolean
  is_mayor: boolean
  is_active?: boolean
  department_name: string | null
  date_joined: string
}

export default function AdminUsers() {
  const { token, role } = useAuthStore()
  const [users, setUsers] = useState<UserData[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<'ALL' | 'CITIZEN' | 'OFFICER' | 'MANAGER' | 'ADMIN' | 'SUPER_ADMIN' | 'MAYOR'>('ALL')
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    phone_number: '',
    password: '',
    full_name: '',
    department_name: '',
    is_manager: false,
    is_city_admin: false,
    is_super_admin: false,
    is_mayor: false,
  })

  // Edit User modal state
  const [editModal, setEditModal] = useState<{ show: boolean, user: UserData | null }>({ show: false, user: null })
  const [editFormData, setEditFormData] = useState({ full_name: '', email: '', phone_number: '' })
  const [updatingUser, setUpdatingUser] = useState(false)

  // Reset Password modal state
  const [resetModal, setResetModal] = useState<{show: boolean, userId: number | null, userName: string}>({show: false, userId: null, userName: ''})
  const [resetPassword, setResetPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const handleToggleActive = async (targetUser: UserData) => {
    const currentActive = targetUser.is_active !== false
    const newActive = !currentActive
    const actionLabel = newActive ? 'activate' : 'deactivate'
    if (!window.confirm(`Are you sure you want to ${actionLabel} account for ${targetUser.full_name || targetUser.email || targetUser.phone_number}? ${newActive ? 'The user will be granted access to sign in.' : 'The user will be immediately blocked from signing in.'}`)) {
      return
    }

    setTogglingId(targetUser.id)
    try {
      const res = await fetch(`${API}/users/${targetUser.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: newActive })
      })
      if (res.ok) {
        const updated = await res.json()
        setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, is_active: updated.is_active } : u))
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || `Failed to ${actionLabel} user.`)
      }
    } catch {
      alert(`Network error attempting to ${actionLabel} user.`)
    } finally {
      setTogglingId(null)
    }
  }

  useEffect(() => {
    fetchUsers()
    if (role === 'city_admin' || role === 'super_admin') {
      fetchDepartments()
    }
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API}/users/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(Array.isArray(data) ? data : (data.results || []))
      } else {
        setError('Failed to fetch users')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API}/departments/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setDepartments(Array.isArray(data) ? data : (data.results || []))
      }
    } catch (err) {}
  }

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return

    try {
      const res = await fetch(`${API}/users/${userId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId))
      } else {
        alert('Failed to delete user.')
      }
    } catch (err) {
      alert('Error deleting user.')
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isStrongPassword(formData.password)) {
      alert('Government Security Standard: Password must be at least 12 characters and contain uppercase, lowercase, digit, and special character.')
      return
    }
    setCreating(true)
    
    try {
      const payload = { ...formData }
      // Department managers can't assign departments or admin roles
      if (role === 'department_manager') {
        payload.is_manager = false
        payload.is_city_admin = false
        payload.is_super_admin = false
        payload.is_mayor = false
      }
      // Only super admin can create city admins, super admins, or mayors
      if (role !== 'super_admin') {
        payload.is_city_admin = false
        payload.is_super_admin = false
        payload.is_mayor = false
      }

      const res = await fetch(`${API}/auth/officer-register/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })
      
      const data = await res.json()
      
      if (res.ok) {
        alert('User created successfully!')
        setShowModal(false)
        fetchUsers() // Refresh list
        setFormData({ email: '', phone_number: '', password: '', full_name: '', department_name: '', is_manager: false, is_city_admin: false, is_super_admin: false, is_mayor: false })
      } else {
        alert('Error: ' + JSON.stringify(data))
      }
    } catch (err) {
      alert('Network error')
    } finally {
      setCreating(false)
    }
  }

  const openEditModal = (u: UserData) => {
    setEditModal({ show: true, user: u })
    setEditFormData({
      full_name: u.full_name || '',
      email: u.email || '',
      phone_number: u.phone_number || '',
    })
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editModal.user) return
    setUpdatingUser(true)

    try {
      const res = await fetch(`${API}/users/${editModal.user.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: editFormData.full_name,
          email: editFormData.email,
          phone_number: editFormData.phone_number,
        })
      })

      const data = await res.json()
      if (res.ok) {
        alert('User details updated successfully!')
        setEditModal({ show: false, user: null })
        setUsers(users.map(u => u.id === data.id ? { ...u, ...data } : u))
      } else {
        alert('Failed to update: ' + (data.error || JSON.stringify(data)))
      }
    } catch {
      alert('Network error updating user.')
    } finally {
      setUpdatingUser(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetModal.userId || !resetPassword) {
      alert('Password is required.')
      return
    }
    if (!isStrongPassword(resetPassword)) {
      alert('Government Security Standard: Password must be at least 12 characters and contain uppercase, lowercase, digit, and special character.')
      return
    }
    setResetting(true)
    try {
      const res = await fetch(`${API}/auth/admin-reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ user_id: resetModal.userId, new_password: resetPassword })
      })
      const data = await res.json()
      if (res.ok) {
        alert(data.message || 'Password reset successfully!')
        setResetModal({show: false, userId: null, userName: ''})
        setResetPassword('')
      } else {
        alert(data.error || 'Failed to reset password.')
      }
    } catch {
      alert('Network error.')
    } finally {
      setResetting(false)
    }
  }

  if (role !== 'super_admin' && role !== 'city_admin' && role !== 'department_manager' && role !== 'mayor') {
    return <div style={{ color: 'red' }}>Access Denied. You must be an Admin or Department Manager to view this page.</div>
  }

  const filteredUsers = users.filter(u => {
    const searchMatch = 
      (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone_number || '').includes(searchQuery) ||
      (u.email || '').includes(searchQuery) ||
      (u.department_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    
    const roleMatch = filterRole === 'ALL' ||
      (filterRole === 'CITIZEN' && u.is_citizen) ||
      (filterRole === 'OFFICER' && u.is_officer && !u.is_department_manager && !u.is_city_admin) ||
      (filterRole === 'MANAGER' && u.is_department_manager) ||
      (filterRole === 'ADMIN' && u.is_city_admin && !u.is_super_admin && !u.is_mayor) ||
      (filterRole === 'SUPER_ADMIN' && u.is_super_admin) ||
      (filterRole === 'MAYOR' && u.is_mayor)

    return searchMatch && roleMatch
  })

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ color: '#0F172A', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>User Management</h2>
          <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>
            {role === 'super_admin' ? 'Full system user management. Create and manage all users including City Admins.' : role === 'city_admin' ? 'View and manage all system users.' : role === 'mayor' ? 'Read-only view of all system users. No administrative actions available.' : 'Manage officers in your department.'}
          </p>
        </div>
        {role !== 'mayor' && (
          <button 
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#1D70B8', color: 'white', border: 'none',
              padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
              transition: 'background 0.2s'
            }}
          >
            <Plus size={18} />
            Add {role === 'city_admin' || role === 'super_admin' ? 'Official' : 'Officer'}
          </button>
        )}
      </div>

      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}

      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0', borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        {/* Toolbar */}
        <div style={{ padding: 16, borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#F8FAFC', borderRadius: 10,
            padding: '8px 12px', border: '1px solid #CBD5E1',
            flex: 1, maxWidth: 300,
          }}>
            <Search size={16} color="#64748b" />
            <input 
              type="text" 
              placeholder="Search by name, contact or department..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent', border: 'none', color: '#0F172A',
                fontSize: 13, outline: 'none', width: '100%',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['ALL', 'CITIZEN', 'OFFICER', 'MANAGER', 'ADMIN', ...(role === 'super_admin' ? ['MAYOR', 'SUPER_ADMIN'] : [])] as const).map(r => (
              <button
                key={r}
                onClick={() => setFilterRole(r as any)}
                style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: filterRole === r ? 'rgba(29,112,184,0.12)' : 'transparent',
                  color: filterRole === r ? '#1D70B8' : '#64748B',
                  border: filterRole === r ? '1px solid rgba(29,112,184,0.3)' : '1px solid transparent',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {r === 'SUPER_ADMIN' ? 'Super Admin' : r === 'MAYOR' ? 'Mayor' : r.charAt(0) + r.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 16px', color: '#64748B', fontSize: 12, fontWeight: 600 }}>Name</th>
                <th style={{ padding: '12px 16px', color: '#64748B', fontSize: 12, fontWeight: 600 }}>Contact</th>
                <th style={{ padding: '12px 16px', color: '#64748B', fontSize: 12, fontWeight: 600 }}>Role</th>
                <th style={{ padding: '12px 16px', color: '#64748B', fontSize: 12, fontWeight: 600 }}>Department</th>
                <th style={{ padding: '12px 16px', color: '#64748B', fontSize: 12, fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', color: '#64748B', fontSize: 12, fontWeight: 600 }}>Date Joined</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontSize: 12, fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#64748B' }}>Loading users...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#64748B' }}>No users found.</td></tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', color: '#0F172A', fontSize: 13, fontWeight: 600 }}>
                      {user.full_name || 'N/A'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: 13 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {user.email && (
                          <span style={{ color: '#0F172A', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Mail size={11} color="#1D70B8" /> {user.email}
                          </span>
                        )}
                        {user.phone_number && (
                          <span style={{ color: '#475569', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Phone size={10} color="#10b981" /> {user.phone_number}
                          </span>
                        )}
                        {!user.email && !user.phone_number && '-'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {user.is_mayor && <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(234,179,8,0.15)', color: '#eab308', fontSize: 10, fontWeight: 700 }}><Crown size={10} style={{ display: 'inline', marginRight: 2 }} /> MAYOR</span>}
                        {user.is_super_admin && <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontSize: 10, fontWeight: 600 }}><Shield size={10} style={{ display: 'inline', marginRight: 2 }} /> SUPER ADMIN</span>}
                        {user.is_city_admin && !user.is_super_admin && <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: 10, fontWeight: 600 }}><Shield size={10} style={{ display: 'inline', marginRight: 2 }} /> ADMIN</span>}
                        {user.is_department_manager && <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(236,72,153,0.1)', color: '#ec4899', fontSize: 10, fontWeight: 600 }}><Building2 size={10} style={{ display: 'inline', marginRight: 2 }} /> MANAGER</span>}
                        {user.is_officer && !user.is_department_manager && !user.is_city_admin && <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(29,112,184,0.1)', color: '#1D70B8', fontSize: 10, fontWeight: 700 }}><Building2 size={10} style={{ display: 'inline', marginRight: 2 }} /> OFFICER</span>}
                        {user.is_citizen && <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontSize: 10, fontWeight: 600 }}><User size={10} style={{ display: 'inline', marginRight: 2 }} /> CITIZEN</span>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#0F172A', fontSize: 13, fontWeight: 500 }}>
                      {user.department_name || '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                        background: user.is_active !== false ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        color: user.is_active !== false ? '#34d399' : '#f87171',
                        border: `1px solid ${user.is_active !== false ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                      }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: user.is_active !== false ? '#10b981' : '#ef4444'
                        }} />
                        {user.is_active !== false ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: 13, fontWeight: 500 }}>
                      {new Date(user.date_joined).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {/* Mayor is read-only — no actions. Only super_admin can manage admin/super_admin/mayor accounts */}
                      {role !== 'mayor' && (role === 'super_admin' || (!user.is_super_admin && !user.is_city_admin && !user.is_mayor)) && (
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={togglingId === user.id}
                          title={user.is_active !== false ? 'Deactivate user (block login)' : 'Activate user (allow login)'}
                          style={{
                            background: user.is_active !== false ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                            border: `1px solid ${user.is_active !== false ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
                            color: user.is_active !== false ? '#f87171' : '#34d399',
                            cursor: togglingId === user.id ? 'not-allowed' : 'pointer',
                            padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            transition: 'all 0.2s',
                          }}
                        >
                          {togglingId === user.id ? '...' : user.is_active !== false ? 'Deactivate' : 'Activate'}
                        </button>
                        <button 
                          onClick={() => openEditModal(user)}
                          title="Edit User Details"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#3b82f6', padding: 6, borderRadius: 6,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => setResetModal({show: true, userId: user.id, userName: user.full_name || user.email || 'User'})}
                          title="Reset Password"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#f59e0b', padding: 6, borderRadius: 6,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <KeyRound size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          title="Delete User"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#ef4444', padding: 6, borderRadius: 6,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: 16
        }}>
          <div style={{
            background: '#FFFFFF', border: '1px solid #E2E8F0',
            borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)', overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '18px 24px', borderBottom: '1px solid #E2E8F0',
              background: '#F8FAFC'
            }}>
              <h3 style={{ margin: 0, color: '#0F172A', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={18} color="#93c5fd" />
                Add New {role === 'city_admin' || role === 'super_admin' ? 'Official' : 'Officer'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="create-user-form" onSubmit={handleCreateUser} style={{
              display: 'flex', flexDirection: 'column', gap: 14,
              padding: '20px 24px', overflowY: 'auto', flex: 1
            }}>
              <div>
                <label style={{ display: 'block', color: '#334155', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Full Name</label>
                <input 
                  type="text" required
                  placeholder="e.g. Abebe Bikila"
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#334155', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Email Address</label>
                <input 
                  type="email" required
                  placeholder="official@adama.gov.et"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#334155', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Phone Number</label>
                <input 
                  type="text"
                  placeholder="09xxxxxxxx (receives login SMS)"
                  value={formData.phone_number}
                  onChange={e => setFormData({...formData, phone_number: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ color: '#334155', fontSize: 12, fontWeight: 600 }}>Initial Temporary Password (Min 12 Characters)</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, password: generateStrongPassword() })}
                    style={{
                      background: 'rgba(29,112,184,0.1)', border: '1px solid rgba(29,112,184,0.3)',
                      color: '#1D70B8', fontSize: 11, padding: '4px 10px', borderRadius: 6,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600
                    }}
                  >
                    <Sparkles size={12} color="#93c5fd" /> Auto-Generate
                  </button>
                </div>
                <input 
                  type="text" required minLength={12}
                  value={formData.password}
                  placeholder="Click Auto-Generate or enter 12+ char password"
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>

              {/* Centered Directing Text Banner - Positioned in the Middle */}
              <div style={{
                margin: '6px 0',
                padding: '12px 16px',
                borderRadius: 12,
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#fcd34d',
                fontSize: 12,
                lineHeight: 1.5,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#fbbf24' }}>
                  <ShieldAlert size={16} />
                  <span>Mandatory First-Login Password Change</span>
                </div>
                <div style={{ color: '#1E293B', fontSize: 11.5 }}>
                  The user will receive an SMS notification and will be <strong>directed to change their temporary password</strong> immediately upon first logging into the system.
                </div>
              </div>

              {(role === 'city_admin' || role === 'super_admin') && (
                <>
                  <div>
                    <label style={{ display: 'block', color: '#334155', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Department</label>
                    <select 
                      value={formData.department_name}
                      onChange={e => setFormData({...formData, department_name: e.target.value})}
                      style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', outline: 'none', boxSizing: 'border-box' }}
                    >
                      <option value="">None (City Admin / Super Admin)</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1E293B', fontSize: 13, cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={formData.is_manager}
                        onChange={e => setFormData({...formData, is_manager: e.target.checked})}
                      />
                      Is Manager
                    </label>
                    {role === 'super_admin' && (
                      <>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1E293B', fontSize: 13, cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={formData.is_city_admin && !formData.is_super_admin && !formData.is_mayor}
                            onChange={e => setFormData({
                              ...formData,
                              is_city_admin: e.target.checked,
                              is_super_admin: false,
                              is_mayor: false
                            })}
                          />
                          Is City Admin
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1D70B8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={formData.is_super_admin}
                            onChange={e => setFormData({
                              ...formData,
                              is_super_admin: e.target.checked,
                              is_city_admin: e.target.checked,
                              is_mayor: false
                            })}
                          />
                          Is Super Admin
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#eab308', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={formData.is_mayor}
                            onChange={e => setFormData({
                              ...formData,
                              is_mayor: e.target.checked,
                              is_super_admin: false,
                              is_city_admin: false,
                              is_manager: e.target.checked,
                              department_name: e.target.checked ? 'Waajjira Kantiibaa' : formData.department_name
                            })}
                          />
                          <Crown size={14} style={{ display: 'inline' }} /> Is Mayor
                        </label>
                      </>
                    )}
                  </div>
                </>
              )}
            </form>

            {/* Footer - ALL BUTTONS ALWAYS VISIBLE */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 12,
              padding: '16px 24px', borderTop: '1px solid #E2E8F0',
              background: '#F8FAFC'
            }}>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                style={{
                  padding: '10px 18px', background: '#FFFFFF',
                  border: '1px solid #CBD5E1', color: '#475569',
                  borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="create-user-form"
                disabled={creating}
                style={{
                  padding: '10px 22px', background: 'linear-gradient(135deg, #1D70B8, #0F2942)',
                  border: 'none', color: '#ffffff', borderRadius: 8, fontWeight: 700, fontSize: 13,
                  cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(99,102,241,0.35)'
                }}
              >
                {creating ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal.show && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: 16
        }}>
          <div style={{
            background: '#FFFFFF', border: '1px solid #E2E8F0',
            borderRadius: 20, width: '100%', maxWidth: 440, maxHeight: '90vh',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)', overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '18px 24px', borderBottom: '1px solid #E2E8F0',
              background: '#F8FAFC'
            }}>
              <h3 style={{ color: '#0F172A', margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <KeyRound size={18} color="#f59e0b" />
                Reset Password for {resetModal.userName}
              </h3>
              <button onClick={() => { setResetModal({show: false, userId: null, userName: ''}); setResetPassword(''); }} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ color: '#334155', fontSize: 12, fontWeight: 600 }}>New 12+ Character Password</label>
                <button
                  type="button"
                  onClick={() => setResetPassword(generateStrongPassword())}
                  style={{
                    background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                    color: '#fbbf24', fontSize: 11, padding: '4px 10px', borderRadius: 6,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600
                  }}
                >
                  <Sparkles size={12} color="#f59e0b" /> Auto-Generate
                </button>
              </div>

              <input
                type="text"
                placeholder="Enter or auto-generate strong password"
                value={resetPassword}
                onChange={e => setResetPassword(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                  background: '#FFFFFF', border: '1px solid #CBD5E1',
                  color: '#0F172A', fontSize: 13, outline: 'none', marginBottom: 12, fontFamily: 'monospace'
                }}
              />

              {resetPassword && (
                <div style={{
                  background: '#F8FAFC', border: '1px solid #E2E8F0',
                  borderRadius: 8, padding: '10px 12px', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6
                }}>
                  {validatePasswordRules(resetPassword).map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: r.valid ? '#4ade80' : '#94a3b8' }}>
                      <Check size={12} color={r.valid ? '#4ade80' : '#64748b'} />
                      <span>{r.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Centered Directing Text Banner - Positioned in the Middle */}
              <div style={{
                margin: '10px 0',
                padding: '12px 16px',
                borderRadius: 12,
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#fcd34d',
                fontSize: 12,
                lineHeight: 1.5,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#fbbf24' }}>
                  <ShieldAlert size={16} />
                  <span>Password Reset Directive</span>
                </div>
                <div style={{ color: '#1E293B', fontSize: 11.5 }}>
                  User will receive an SMS notification and will be <strong>forced to establish a new password upon next login</strong>.
                </div>
              </div>
            </div>

            {/* Footer - ALL BUTTONS ALWAYS VISIBLE */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 12,
              padding: '16px 24px', borderTop: '1px solid #E2E8F0',
              background: '#F8FAFC'
            }}>
              <button
                type="button"
                onClick={() => { setResetModal({show: false, userId: null, userName: ''}); setResetPassword(''); }}
                style={{
                  padding: '10px 18px', background: '#FFFFFF',
                  border: '1px solid #CBD5E1', color: '#475569',
                  borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetting || !isStrongPassword(resetPassword)}
                style={{
                  padding: '10px 22px',
                  background: isStrongPassword(resetPassword) ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#334155',
                  color: isStrongPassword(resetPassword) ? '#0f172a' : '#94a3b8',
                  border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13,
                  cursor: resetting || !isStrongPassword(resetPassword) ? 'not-allowed' : 'pointer',
                  opacity: resetting ? 0.6 : 1,
                  boxShadow: isStrongPassword(resetPassword) ? '0 4px 14px rgba(245,158,11,0.35)' : 'none'
                }}
              >
                {resetting ? 'Resetting...' : 'Reset & Require Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editModal.show && editModal.user && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#FFFFFF', border: '1px solid #E2E8F0',
            borderRadius: 16, width: '100%', maxWidth: 420, padding: 24,
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: '#0F172A', fontSize: 18 }}>
                Edit {editModal.user.full_name || 'User'}
              </h3>
              <button onClick={() => setEditModal({ show: false, user: null })} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', color: '#334155', fontSize: 12, marginBottom: 4 }}>Full Name</label>
                <input 
                  type="text" required
                  value={editFormData.full_name}
                  onChange={e => setEditFormData({...editFormData, full_name: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', outline: 'none' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ color: '#334155', fontSize: 12 }}>Email Address</label>
                  <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>Editable</span>
                </div>
                <input 
                  type="email" required
                  value={editFormData.email}
                  onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', outline: 'none' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ color: '#334155', fontSize: 12 }}>Phone Number</label>
                  <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>Editable</span>
                </div>
                <input 
                  type="text"
                  placeholder="09xxxxxxxx"
                  value={editFormData.phone_number}
                  onChange={e => setEditFormData({...editFormData, phone_number: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button 
                  type="button" 
                  onClick={() => setEditModal({ show: false, user: null })}
                  style={{ padding: '8px 16px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#475569', borderRadius: 8, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={updatingUser}
                  style={{
                    padding: '8px 18px', background: '#3b82f6', border: 'none', color: 'white',
                    borderRadius: 8, fontWeight: 600, cursor: updatingUser ? 'not-allowed' : 'pointer',
                    opacity: updatingUser ? 0.6 : 1,
                  }}
                >
                  {updatingUser ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
