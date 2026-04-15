import 'server-only'

import { createHmac, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { backendLogin, backendRegister } from '@/lib/server-backend-api'
import type { AuthPayload } from '@/lib/types'

const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo'
const GOOGLE_STATE_COOKIE = 'madenroll_google_oauth_state'

type CookieStore = Awaited<ReturnType<typeof cookies>>

type GoogleOAuthConfig = {
  clientId: string
  clientSecret: string
  passwordSecret: string
}

type GoogleTokenResponse = {
  access_token?: string
  error?: string
  error_description?: string
}

type GoogleUserInfoResponse = {
  sub?: string
  email?: string
  email_verified?: boolean | string
}

function getErrorStatus(error: unknown) {
  return typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
    ? (error as { status: number }).status
    : null
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallbackMessage
}

function getGoogleOAuthConfig(): GoogleOAuthConfig {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()
  const passwordSecret = process.env.GOOGLE_LOGIN_BACKEND_PASSWORD_SECRET?.trim()

  if (!clientId || !clientSecret || !passwordSecret) {
    throw new Error('Google login is not configured on this deployment yet.')
  }

  return {
    clientId,
    clientSecret,
    passwordSecret,
  }
}

function getRequestOrigin(request: Request) {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')

  if (forwardedHost && forwardedProto) {
    return `${forwardedProto}://${forwardedHost}`
  }

  return new URL(request.url).origin
}

export function buildMonitorRedirectUrl(request: Request, authError?: string) {
  const redirectUrl = new URL('/monitor', getRequestOrigin(request))

  if (authError) {
    redirectUrl.searchParams.set('authError', authError)
  }

  return redirectUrl
}

export function getGoogleOAuthRedirectUri(request: Request) {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ??
    `${getRequestOrigin(request)}/api/session/google/callback`
}

export function createGoogleOAuthState() {
  return randomBytes(24).toString('hex')
}

export function setGoogleOAuthStateCookie(store: CookieStore, state: string) {
  store.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  })
}

export function readGoogleOAuthStateCookie(store: CookieStore) {
  return store.get(GOOGLE_STATE_COOKIE)?.value ?? null
}

export function clearGoogleOAuthStateCookie(store: CookieStore) {
  store.set(GOOGLE_STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export function buildGoogleAuthorizationUrl(request: Request, state: string) {
  const { clientId } = getGoogleOAuthConfig()
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT)

  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', getGoogleOAuthRedirectUri(request))
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email')
  url.searchParams.set('access_type', 'online')
  url.searchParams.set('include_granted_scopes', 'true')
  url.searchParams.set('prompt', 'select_account')
  url.searchParams.set('state', state)

  return url
}

async function exchangeGoogleCode(request: Request, code: string) {
  const { clientId, clientSecret } = getGoogleOAuthConfig()
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getGoogleOAuthRedirectUri(request),
    grant_type: 'authorization_code',
  })

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    cache: 'no-store',
  })

  const data = (await response.json().catch(() => null)) as GoogleTokenResponse | null

  if (!response.ok || !data?.access_token) {
    const message = data?.error_description || data?.error || 'Google token exchange failed.'
    throw new Error(message)
  }

  return data.access_token
}

async function fetchGoogleUserInfo(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })

  const data = (await response.json().catch(() => null)) as GoogleUserInfoResponse | null

  if (!response.ok) {
    throw new Error('Failed to read your Google account email.')
  }

  const email = data?.email?.trim().toLowerCase()
  const sub = data?.sub?.trim()
  const emailVerified = data?.email_verified === true || data?.email_verified === 'true'

  if (!email || !sub) {
    throw new Error('Google did not return a usable email address.')
  }

  if (!emailVerified) {
    throw new Error('Your Google email must be verified before you can sign in.')
  }

  return { email, sub }
}

function buildGoogleBackfillPassword(email: string, sub: string) {
  const { passwordSecret } = getGoogleOAuthConfig()
  return createHmac('sha256', passwordSecret)
    .update(`google:${sub}:${email}`)
    .digest('hex')
}

function buildGoogleAuthPayload(email: string, sub: string): AuthPayload {
  return {
    email,
    password: buildGoogleBackfillPassword(email, sub),
  }
}

export async function authenticateWithGoogle(request: Request, code: string) {
  const accessToken = await exchangeGoogleCode(request, code)
  const googleUser = await fetchGoogleUserInfo(accessToken)
  const payload = buildGoogleAuthPayload(googleUser.email, googleUser.sub)

  try {
    return await backendLogin(payload)
  } catch (loginError) {
    const loginStatus = getErrorStatus(loginError)

    if (loginStatus && loginStatus !== 400 && loginStatus !== 401 && loginStatus !== 404) {
      throw loginError
    }
  }

  try {
    await backendRegister(payload)
  } catch (registerError) {
    const registerMessage = getErrorMessage(registerError, 'Register failed.')

    if (/exist|already|duplicate|registered|taken/i.test(registerMessage)) {
      throw new Error(
        'This email already has a password-based account. Please login with email and password.',
      )
    }

    throw registerError
  }

  return backendLogin(payload)
}

export function getGoogleAuthFailureMessage(error: unknown) {
  return getErrorMessage(error, 'Google login failed.')
}
