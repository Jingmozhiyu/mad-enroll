import {NextResponse} from 'next/server'
import {cookies} from 'next/headers'
import {setAuthSessionCookies} from '@/lib/auth/session'
import {backendLogin} from '@/lib/api/server/auth'
import {jsonError} from '@/lib/api/server/responses'
import type {AuthPayload, ClientSession} from '@/lib/auth/types'

export async function POST(request: Request) {
    try {
        const payload = (await request.json()) as AuthPayload
        const nextSession = await backendLogin(payload)
        const store = await cookies()
        setAuthSessionCookies(store, nextSession)

        const publicSession: ClientSession = {
            email: nextSession.email,
            userId: nextSession.userId,
        }

        return NextResponse.json(publicSession)
    } catch (error) {
        return jsonError(error, 'Login failed.')
    }
}
