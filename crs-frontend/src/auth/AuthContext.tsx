import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { LoginResponse } from '../types/auth'

export const TOKEN_KEY = 'crs_token'
export const USER_KEY = 'crs_user'

export interface AuthUser {
  username: string
  role: 'ADMIN' | 'STUDENT'
  userId: number
}

interface AuthContextValue {
  user: AuthUser | null
  login: (data: LoginResponse) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    const savedUser = localStorage.getItem(USER_KEY)
    if (token && savedUser) {
      try { return JSON.parse(savedUser) as AuthUser }
      catch { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY) }
    }
    return null
  })
  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user && localStorage.getItem(TOKEN_KEY)),
    login: (data) => {
      const nextUser: AuthUser = { username: data.username, role: data.role, userId: data.userId }
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
      setUser(nextUser)
    },
    logout: () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); setUser(null) },
  }), [user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth phải được dùng bên trong AuthProvider')
  return context
}
