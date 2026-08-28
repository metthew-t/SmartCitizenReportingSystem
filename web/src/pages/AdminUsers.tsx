import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { Trash2, User, Building2, Shield, Search } from 'lucide-react'

const API = 'https://smartcitizenreportingsystem.onrender.com/api/v1'

interface UserData {
  id: number
  phone_number: string
  full_name: string | null
  national_id: string | null
  is_citizen: boolean
  is_officer: boolean
  is_city_admin: boolean
  department_name: string | null
  date_joined: string
}

export default function AdminUsers() {
  const { token, role } = useAuthStore()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<'ALL' | 'CITIZEN' | 'OFFICER' | 'ADMIN'>('ALL')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API}/users/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setUsers(await res.json())
      } else {
        setError('Failed to fetch users')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
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

  if (role !== 'city_admin') {
    return <div style={{ color: 'red' }}>Access Denied. You must be a City Admin to view this page.</div>
  }

  const filteredUsers = users.filter(u => {
    const searchMatch = 
      (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone_number || '').includes(searchQuery) ||
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
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>View and manage all system users.</p>
        </div>
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
              placeholder="Search by name, phone or department..."
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
                <th style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>Phone</th>
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
                      {user.phone_number}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {user.is_city_admin && <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: 10, fontWeight: 600 }}><Shield size={10} style={{ display: 'inline', marginRight: 2 }} /> ADMIN</span>}
                        {user.is_officer && <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.1)', color: '#818cf8', fontSize: 10, fontWeight: 600 }}><Building2 size={10} style={{ display: 'inline', marginRight: 2 }} /> OFFICER</span>}
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
    </div>
  )
}
