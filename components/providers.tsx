'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { loginUser, registerUser } from '@/lib/api'
import { clearStoredSession, getStoredSession, setStoredSession } from '@/lib/storage'
import type { AuthPayload, UserSession } from '@/lib/types'

type AuthContextValue = {
  ready: boolean
  session: UserSession | null
  isLoggedIn: boolean
  login: (payload: AuthPayload) => Promise<UserSession>
  register: (payload: AuthPayload) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function Providers({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<UserSession | null>(null)

  useEffect(() => {
    // Hydration is the point where browser storage becomes available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(getStoredSession())
    setReady(true)
  }, [])

  async function handleLogin(payload: AuthPayload) {
    const nextSession = await loginUser(payload)
    setStoredSession(nextSession)
    setSession(nextSession)
    return nextSession
  }

  async function handleRegister(payload: AuthPayload) {
    await registerUser(payload)
  }

  function handleLogout() {
    clearStoredSession()
    setSession(null)
  }

  return (
    <AuthContext.Provider
      value={{
        ready,
        session,
        isLoggedIn: Boolean(session?.token),
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside Providers.')
  }

  return context
}
