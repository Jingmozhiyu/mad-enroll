import {NextResponse} from 'next/server'
import {backendFetchBroadcast} from '@/lib/api/server/admin'
import {getServerSession} from '@/lib/auth/session.server'
import {jsonError, unauthorizedResponse} from '@/lib/api/server/responses'

export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
    const {token} = await getServerSession()
    if (!token) return unauthorizedResponse()
    try { return NextResponse.json(await backendFetchBroadcast(token, (await params).id)) }
    catch (error) { return jsonError(error, 'Failed to load broadcast.') }
}
