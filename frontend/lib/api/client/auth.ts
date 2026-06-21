import {clientApi} from '@/lib/api/client/http'
import type {AuthPayload, ClientSession} from '@/lib/auth/types'

export async function fetchSession() {
    const response = await clientApi.get<ClientSession | null>('/api/session')
    return response.data
}

export async function registerUser(payload: AuthPayload) {
    await clientApi.post('/api/session/register', payload)
}

export async function loginUser(payload: AuthPayload) {
    const response = await clientApi.post<ClientSession>('/api/session/login', payload)
    return response.data
}

export async function logoutUser() {
    await clientApi.post('/api/session/logout')
}
