import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { setAuthSessionCookies } from '@/lib/auth/session'
import {
  authenticateWithGoogle,
  buildMonitorRedirectUrl,
  clearGoogleOAuthStateCookie,
  getGoogleAuthFailureMessage,
  readGoogleOAuthStateCookie,
} from '@/lib/server-google-auth'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')
  const providerError = requestUrl.searchParams.get('error')
  const store = await cookies()
  const storedState = readGoogleOAuthStateCookie(store)

  clearGoogleOAuthStateCookie(store)

  if (providerError) {
    return NextResponse.redirect(
      buildMonitorRedirectUrl(request, 'Google login was canceled or denied.'),
    )
  }

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      buildMonitorRedirectUrl(request, 'Google login could not be verified. Please try again.'),
    )
  }

  try {
    const session = await authenticateWithGoogle(request, code)

    setAuthSessionCookies(store, session)

    return NextResponse.redirect(buildMonitorRedirectUrl(request))
  } catch (error) {
    return NextResponse.redirect(
      buildMonitorRedirectUrl(request, getGoogleAuthFailureMessage(error)),
    )
  }
}
