import {NextResponse} from 'next/server'
import {backendPatchAdminSubscription} from '@/lib/api/server/admin'
import {getServerSession} from '@/lib/auth/session.server'
import {jsonError, unauthorizedResponse} from '@/lib/api/server/responses'

export async function PATCH(
    request: Request,
    {params}: { params: Promise<{ subscriptionId: string }> },
) {
    const {token} = await getServerSession()
    if (!token) {
        return unauthorizedResponse()
    }

    try {
        const {subscriptionId} = await params
        const {searchParams} = new URL(request.url)
        const enabled = searchParams.get('enabled') === 'true'
        const data = await backendPatchAdminSubscription(token, subscriptionId, enabled)
        return NextResponse.json(data)
    } catch (error) {
        return jsonError(error, 'Failed to update admin subscription.')
    }
}
