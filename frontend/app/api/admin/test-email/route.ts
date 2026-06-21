import {NextResponse} from 'next/server'
import {backendSendAdminTestEmail} from '@/lib/api/server/admin'
import {getServerSession} from '@/lib/auth/session.server'
import {jsonError, unauthorizedResponse} from '@/lib/api/server/responses'
import type {TestEmailPayload} from '@/lib/admin/types'

export async function POST(request: Request) {
    const {token} = await getServerSession()
    if (!token) {
        return unauthorizedResponse()
    }

    try {
        const payload = (await request.json()) as TestEmailPayload
        await backendSendAdminTestEmail(token, payload)
        return NextResponse.json({ok: true})
    } catch (error) {
        return jsonError(error, 'Failed to send test email.')
    }
}
