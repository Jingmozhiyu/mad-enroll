import {NextRequest, NextResponse} from 'next/server'
import {backendFetchAdminMailDeliveries} from '@/lib/api/server/admin'
import {getServerSession} from '@/lib/auth/session.server'
import {jsonError, unauthorizedResponse} from '@/lib/api/server/responses'

export async function GET(request: NextRequest) {
    const {token} = await getServerSession()
    if (!token) {
        return unauthorizedResponse()
    }

    try {
        const requestedPage = Number(request.nextUrl.searchParams.get('page') ?? '1')
        const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
        const data = await backendFetchAdminMailDeliveries(token, page)
        return NextResponse.json(data)
    } catch (error) {
        return jsonError(error, 'Failed to load mail deliveries.')
    }
}
