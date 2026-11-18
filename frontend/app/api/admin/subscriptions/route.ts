import {NextRequest, NextResponse} from 'next/server'
import {backendFetchAdminSubscriptions} from '@/lib/api/server/admin'
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
        // The backend validates sort and direction (400 for unknown values).
        const sort = request.nextUrl.searchParams.get('sort') ?? 'email'
        const direction = request.nextUrl.searchParams.get('direction') ?? 'asc'
        const data = await backendFetchAdminSubscriptions(token, page, sort, direction)
        return NextResponse.json(data)
    } catch (error) {
        return jsonError(error, 'Failed to load admin subscriptions.')
    }
}
