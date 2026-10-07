import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { Trash2, User, Building2, Shield, Search, Plus, X } from 'lucide-react'

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
  const [filterRole, setFilterRole] = useState<'ALL' | 'CITIZEN' | 'OFFICER' | 'ADMIN'>('ALL')
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    department_name: '',
    is_manager: false,
    is_city_admin: false,
  })

  useEffect(() => {
    fetchUsers()
    if (role === 'city_admin') {
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
    setCreating(true)
    
    try {
      const payload = { ...formData }
      // Department managers can't assign departments or admin roles
      if (role === 'department_manager') {
        payload.is_manager = false
        payload.is_city_admin = false
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
        setFormData({ email: '', password: '', full_name: '', department_name: '', is_manager: false, is_city_admin: false })
      } else {
        alert('Error: ' + JSON.stringify(data))
      }
    } catch (err) {
      alert('Network error')
    } finally {
      setCreating(false)
    }
  }

  if (role !== 'city_admin' && role !== 'department_manager') {
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
      (filterRole === 'OFFICER' && u.is_officer) ||
      (filterRole === 'ADMIN' && u.is_city_admin)

    return searchMatch && roleMatch
  })

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>User Management</h2>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
            {role === 'city_admin' ? 'View and manage all system users.' : 'Manage officers in your department.'}
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#6366f1', color: 'white', border: 'none',
            padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
            transition: 'background 0.2s'
          }}
        >
          <Plus size={18} />
          Add {role === 'city_admin' ? 'Official' : 'Officer'}
        </button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}

      <div style={{
        background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16,
        overflow: 'hidden'
      }}>
        {/* Toolbar */}
        <div style={{ padding: 16, borderBottom: '1px solid rgba(148,163,184,0.08)', display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(15,23,42,0.4)', borderRadius: 10,
            padding: '8px 12px', border: '1px solid rgba(148,163,184,0.08)',
            flex: 1, maxWidth: 300,
          }}>
            <Search size={16} color="#64748b" />
            <input 
              type="text" 
              placeholder="Search by name, contact or department..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent', border: 'none', color: '#e2e8f0',
                fontSize: 13, outline: 'none', width: '100%',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {(['ALL', 'CITIZEN', 'OFFICER', 'ADMIN'] as const).map(r => (
              <button
                key={r}
                onClick={() => setFilterRole(r)}
                style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: filterRole === r ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: filterRole === r ? '#818cf8' : '#94a3b8',
                  border: filterRole === r ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {r.charAt(0) + r.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                <th style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>Name</th>
                <th style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>Contact</th>
                <th style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>Role</th>
                <th style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>Department</th>
                <th style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>Date Joined</th>
                <th style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12, fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>Loading users...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>No users found.</td></tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid rgba(148,163,184,0.04)', transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,23,42,0.4)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', color: '#e2e8f0', fontSize: 13, fontWeight: 500 }}>
                      {user.full_name || 'N/A'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13 }}>
                      {user.email || user.phone_number || '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {user.is_city_admin && <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: 10, fontWeight: 600 }}><Shield size={10} style={{ display: 'inline', marginRight: 2 }} /> ADMIN</span>}
                        {user.is_department_manager && <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(236,72,153,0.1)', color: '#ec4899', fontSize: 10, fontWeight: 600 }}><Building2 size={10} style={{ display: 'inline', marginRight: 2 }} /> MANAGER</span>}
                        {user.is_officer && !user.is_department_manager && !user.is_city_admin && <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.1)', color: '#818cf8', fontSize: 10, fontWeight: 600 }}><Building2 size={10} style={{ display: 'inline', marginRight: 2 }} /> OFFICER</span>}
                        {user.is_citizen && <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontSize: 10, fontWeight: 600 }}><User size={10} style={{ display: 'inline', marginRight: 2 }} /> CITIZEN</span>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13 }}>
                      {user.department_name || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13 }}>
                      {new Date(user.date_joined).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
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
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#1e293b', border: '1px solid rgba(148,163,184,0.1)',
            borderRadius: 16, width: '100%', maxWidth: 400, padding: 24,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 18 }}>
                Add New {role === 'city_admin' ? 'Official' : 'Officer'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Full Name</label>
                <input 
                  type="text" required
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, color: '#e2e8f0', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Email Address</label>
                <input 
                  type="email" required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, color: '#e2e8f0', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Password</label>
                <input 
                  type="password" required minLength={6}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, color: '#e2e8f0', outline: 'none' }}
                />
              </div>

              {role === 'city_admin' && (
                <>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Department</label>
                    <select 
                      value={formData.department_name}
                      onChange={e => setFormData({...formData, department_name: e.target.value})}
                      style={{ width: '100%', padding: '10px 12px', background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, color: '#e2e8f0', outline: 'none' }}
                    >
                      <option value="">None (City Admin)</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e2e8f0', fontSize: 14 }}>
                      <input 
                        type="checkbox" 
                        checked={formData.is_manager}
                        onChange={e => setFormData({...formData, is_manager: e.target.checked})}
                      />
                      Is Manager
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e2e8f0', fontSize: 14 }}>
                      <input 
                        type="checkbox" 
                        checked={formData.is_city_admin}
                        onChange={e => setFormData({...formData, is_city_admin: e.target.checked})}
                      />
                      Is City Admin
                    </label>
                  </div>
                </>
              )}

              <button 
                type="submit" disabled={creating}
                style={{
                  marginTop: 8, padding: 12, background: '#6366f1', color: 'white',
                  border: 'none', borderRadius: 8, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer'
                }}
              >
                {creating ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
