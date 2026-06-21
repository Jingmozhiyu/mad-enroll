import 'server-only'

import {backendRequest} from '@/lib/api/server/http'
import type {AuthPayload, UserSession} from '@/lib/auth/types'

export async function backendRegister(payload: AuthPayload) {
    await backendRequest<null>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export async function backendLogin(payload: AuthPayload) {
    return backendRequest<UserSession>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}
