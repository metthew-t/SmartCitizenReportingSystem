import { create } from 'zustand'
import { DemoDepartment } from './demoData'

interface AuthState {
  token: string | null
  user: any | null
  department: DemoDepartment | null
  role: 'citizen' | 'officer' | 'department_manager' | 'city_admin' | null
  login: (token: string, user: any, department: DemoDepartment, role: string) => void
  setDepartment: (department: DemoDepartment) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  department: null,
  role: null,
  login: (token, user, department, role) => set({ token, user, department, role: role as any }),
  setDepartment: (department) => set({ department }),
  logout: () => set({ token: null, user: null, department: null, role: null }),
}))
