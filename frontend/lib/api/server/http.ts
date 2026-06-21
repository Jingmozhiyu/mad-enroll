import 'server-only'

import type {ApiEnvelope} from '@/lib/api/types'

const API_BASE_URL =
    process.env.API_BASE_URL ?? 'https://api.madenroll.com/'

export async function backendRequest<T>(
    path: string,
    init: RequestInit = {},
    token?: string,
) {
    const response = await fetch(new URL(path, API_BASE_URL), {
        ...init,
        headers: {
            Accept: 'application/json',
            ...(init.body ? {'Content-Type': 'application/json'} : {}),
            ...(token ? {Authorization: `Bearer ${token}`} : {}),
            ...(init.headers ?? {}),
        },
        cache: 'no-store',
    })

    const text = await response.text()
    let parsed: ApiEnvelope<T> | null = null

    try {
        parsed = text ? (JSON.parse(text) as ApiEnvelope<T>) : null
    } catch {
        parsed = null
    }

    if (!response.ok) {
        const message =
            (parsed && typeof parsed.msg === 'string' && parsed.msg) ||
            text ||
            `Request failed with ${response.status}.`
        const error = new Error(message) as Error & { status?: number }
        error.status = response.status
        throw error
    }

    if (!parsed) {
        throw new Error('Empty API response.')
    }

    return parsed.data
}
