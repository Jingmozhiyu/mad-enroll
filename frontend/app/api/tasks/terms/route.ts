import {NextResponse} from 'next/server'
import {backendFetchSearchTerms} from '@/lib/api/server/tasks'
import {getServerSession} from '@/lib/auth/session.server'
import {jsonError, unauthorizedResponse} from '@/lib/api/server/responses'

export async function GET() {
    const {token} = await getServerSession()
    if (!token) return unauthorizedResponse()
    try {
        return NextResponse.json(await backendFetchSearchTerms(token), {headers: {'Cache-Control': 'no-store'}})
    } catch (error) {
        return jsonError(error, 'Failed to load available terms.')
    }
}
