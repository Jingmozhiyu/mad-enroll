import {NextResponse} from 'next/server'
import {cookies} from 'next/headers'
import {
    buildGoogleAuthorizationUrl,
    buildMonitorRedirectUrl,
    createGoogleOAuthState,
    getGoogleAuthFailureMessage,
    setGoogleOAuthStateCookie,
} from '@/lib/auth/google'

export async function GET(request: Request) {
    try {
        const state = createGoogleOAuthState()
        const store = await cookies()

        setGoogleOAuthStateCookie(store, state)

        return NextResponse.redirect(buildGoogleAuthorizationUrl(request, state))
    } catch (error) {
        return NextResponse.redirect(
            buildMonitorRedirectUrl(request, getGoogleAuthFailureMessage(error)),
        )
    }
}
