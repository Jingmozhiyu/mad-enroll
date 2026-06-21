import {NextResponse} from 'next/server'
import {backendFetchAdminSchedulerStatus} from '@/lib/api/server/admin'
import {getServerSession} from '@/lib/auth/session.server'
import {jsonError, unauthorizedResponse} from '@/lib/api/server/responses'

export async function GET() {
    const {token} = await getServerSession()
    if (!token) {
        return unauthorizedResponse()
    }

    try {
        const data = await backendFetchAdminSchedulerStatus(token)
        return NextResponse.json(data)
    } catch (error) {
        return jsonError(error, 'Failed to load scheduler status.')
    }
}
