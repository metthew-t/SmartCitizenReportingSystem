import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface UserProfile {
  id: number | null
  phone: string
  email: string
  name: string
  profile_photo_url: string | null
  department_name: string | null
  is_city_admin: boolean
  is_super_admin: boolean
  is_mayor: boolean
}

interface AuthState {
  token: string | null
  user: UserProfile | null
  departmentName: string | null
  role: 'citizen' | 'officer' | 'department_manager' | 'city_admin' | 'super_admin' | 'mayor' | null
  login: (token: string, user: any, departmentName: string | null, role: string) => void
  updateUser: (fields: any) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      departmentName: null,
      role: null,
      login: (token, user, departmentName, role) =>
        set({
          token,
          user,
          departmentName,
          role: role as any,
        }),
      updateUser: (fields) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...fields } : null,
        })),
      logout: () =>
        set({
          token: null,
          user: null,
          departmentName: null,
          role: null,
        }),
    }),
    {
      name: 'adama_smart_auth_session',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
