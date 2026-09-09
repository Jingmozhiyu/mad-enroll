import {NextRequest, NextResponse} from 'next/server'
import {backendBroadcastRecipients, backendSendBroadcast, backendBroadcastTestEmail} from '@/lib/api/server/admin'
import {getServerSession} from '@/lib/auth/session.server'
import {jsonError, unauthorizedResponse} from '@/lib/api/server/responses'

type Context = {params: Promise<{id: string; action: string}>}

export async function GET(request: NextRequest, {params}: Context) {
    const {token} = await getServerSession()
    if (!token) return unauthorizedResponse()
    const {id, action} = await params
    if (action !== 'recipients') return NextResponse.json({message: 'Not found.'}, {status: 404})
    try {
        const page = Number(request.nextUrl.searchParams.get('page') ?? '1')
        return NextResponse.json(await backendBroadcastRecipients(token, id, Number.isInteger(page) && page > 0 ? page : 1))
    } catch (error) { return jsonError(error, 'Failed to load recipients.') }
}
export async function POST(request: Request, {params}: Context) {
    const {token} = await getServerSession()
    if (!token) return unauthorizedResponse()
    const {id, action} = await params
    if (action !== 'send' && action !== 'test-email') return NextResponse.json({message: 'Not found.'}, {status: 404})
    try {
        if (action === 'test-email') {
            const payload = await request.json()
            if (typeof payload?.recipientEmail !== 'string')
                return NextResponse.json({message: 'Recipient email is required.'}, {status: 400})
            return NextResponse.json(await backendBroadcastTestEmail(token, id, payload.recipientEmail))
        }
        return NextResponse.json(await backendSendBroadcast(token, id))
    }
    catch (error) { return jsonError(error, 'Failed to queue broadcast.') }
}
