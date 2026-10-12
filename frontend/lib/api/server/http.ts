import 'server-only'

import {headers} from 'next/headers'
import type {ApiEnvelope} from '@/lib/api/types'

const API_BASE_URL =
    process.env.API_BASE_URL ?? 'https://api.madenroll.com/'

/**
 * Forwards the browser's IP to the backend for IP-based rate limits. Without it, every user
 * shares Vercel's egress IPs. The backend trusts X-Client-IP only with the shared secret.
 */
async function clientIpHeaders(): Promise<Record<string, string>> {
    const secret = process.env.BFF_SHARED_SECRET?.trim()
    if (!secret) {
        return {}
    }
    try {
        const incoming = await headers()
        const clientIp =
            incoming.get('x-real-ip')?.trim() ||
            incoming.get('x-forwarded-for')?.split(',')[0]?.trim()
        return clientIp ? {'X-Client-IP': clientIp, 'X-BFF-Secret': secret} : {}
    } catch {
        // Outside a request scope (e.g. build time) there is no client to forward.
        return {}
    }
}

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
            ...(await clientIpHeaders()),
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
