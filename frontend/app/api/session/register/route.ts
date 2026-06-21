import {NextResponse} from 'next/server'
import {backendRegister} from '@/lib/api/server/auth'
import {jsonError} from '@/lib/api/server/responses'
import type {AuthPayload} from '@/lib/auth/types'

export async function POST(request: Request) {
    try {
        const payload = (await request.json()) as AuthPayload
        await backendRegister(payload)
        return NextResponse.json({ok: true})
    } catch (error) {
        return jsonError(error, 'Register failed.')
    }
}
