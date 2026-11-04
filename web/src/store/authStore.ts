import { create } from 'zustand'

interface AuthState {
  token: string | null
  user: any | null
  departmentName: string | null
  role: 'citizen' | 'officer' | 'department_manager' | 'city_admin' | 'super_admin' | 'mayor' | null
  login: (token: string, user: any, departmentName: string | null, role: string) => void
  updateUser: (fields: any) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  departmentName: null,
  role: null,
  login: (token, user, departmentName, role) => set({ token, user, departmentName, role: role as any }),
  updateUser: (fields) => set((state) => ({ user: state.user ? { ...state.user, ...fields } : null })),
  logout: () => set({ token: null, user: null, departmentName: null, role: null }),
}))
