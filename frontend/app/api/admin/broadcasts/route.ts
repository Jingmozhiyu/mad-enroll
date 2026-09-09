import {NextRequest, NextResponse} from 'next/server'
import {backendCreateBroadcast, backendFetchBroadcasts} from '@/lib/api/server/admin'
import {getServerSession} from '@/lib/auth/session.server'
import {jsonError, unauthorizedResponse} from '@/lib/api/server/responses'

export async function GET(request: NextRequest) {
    const {token} = await getServerSession()
    if (!token) return unauthorizedResponse()
    try {
        const page = Number(request.nextUrl.searchParams.get('page') ?? '1')
        return NextResponse.json(await backendFetchBroadcasts(token, Number.isInteger(page) && page > 0 ? page : 1))
    } catch (error) { return jsonError(error, 'Failed to load broadcasts.') }
}
export async function POST(request: Request) {
    const {token} = await getServerSession()
    if (!token) return unauthorizedResponse()
    try {
        const {subject, body, audience, termCode} = await request.json()
        return NextResponse.json(await backendCreateBroadcast(token, {subject, body, audience, termCode}))
    } catch (error) { return jsonError(error, 'Failed to create broadcast.') }
}
