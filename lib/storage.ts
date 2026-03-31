import type { UserSession } from '@/lib/types'

const TOKEN_KEY = 'uwcm_jwt_token'
const USER_EMAIL_KEY = 'uwcm_user_email'
const USER_ID_KEY = 'uwcm_user_id'

export function getStoredSession(): UserSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  const token = window.localStorage.getItem(TOKEN_KEY)
  const email = window.localStorage.getItem(USER_EMAIL_KEY)
  const userId = window.localStorage.getItem(USER_ID_KEY)

  if (!token || !email || !userId) {
    return null
  }

  return { token, email, userId }
}

export function setStoredSession(session: UserSession) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(TOKEN_KEY, session.token)
  window.localStorage.setItem(USER_EMAIL_KEY, session.email)
  window.localStorage.setItem(USER_ID_KEY, session.userId)
}

export function clearStoredSession() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(USER_EMAIL_KEY)
  window.localStorage.removeItem(USER_ID_KEY)
}

export function getStoredToken() {
  return getStoredSession()?.token ?? null
}
