'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { fetchSession, loginUser, logoutUser, registerUser } from '@/lib/api'
import type { AuthPayload, ClientSession } from '@/lib/types'

type AuthContextValue = {
  ready: boolean
  session: ClientSession | null
  isLoggedIn: boolean
  login: (payload: AuthPayload) => Promise<ClientSession>
  register: (payload: AuthPayload) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function Providers({
  children,
  initialSession = null,
  initialSessionResolved = false,
}: {
  children: ReactNode
  initialSession?: ClientSession | null
  initialSessionResolved?: boolean
}) {
  const [ready, setReady] = useState(initialSessionResolved)
  const [session, setSession] = useState<ClientSession | null>(initialSession)

  useEffect(() => {
    if (initialSessionResolved) {
      return
    }

    let cancelled = false

    async function hydrateSession() {
      try {
        const nextSession = await fetchSession()
        if (!cancelled) {
          setSession(nextSession)
        }
      } finally {
        if (!cancelled) {
          setReady(true)
        }
      }
    }

    void hydrateSession()

    return () => {
      cancelled = true
    }
  }, [initialSessionResolved])

  async function handleLogin(payload: AuthPayload) {
    const nextSession = await loginUser(payload)
    setSession(nextSession)
    return nextSession
  }

  async function handleRegister(payload: AuthPayload) {
    await registerUser(payload)
  }

  async function handleLogout() {
    await logoutUser()
    setSession(null)
  }

  return (
    <AuthContext.Provider
      value={{
        ready,
        session,
        isLoggedIn: Boolean(session),
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
