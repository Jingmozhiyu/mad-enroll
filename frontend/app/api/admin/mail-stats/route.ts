import {NextResponse} from 'next/server'
import {backendFetchAdminMailStats} from '@/lib/api/server/admin'
import {getServerSession} from '@/lib/auth/session.server'
import {jsonError, unauthorizedResponse} from '@/lib/api/server/responses'

export async function GET() {
    const {token} = await getServerSession()
    if (!token) {
        return unauthorizedResponse()
    }

    try {
        const data = await backendFetchAdminMailStats(token)
        return NextResponse.json(data)
    } catch (error) {
        return jsonError(error, 'Failed to load mail stats.')
    }
}
