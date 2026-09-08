import {NextResponse} from 'next/server'
import {backendUpdateAdminTerm} from '@/lib/api/server/admin'
import {getServerSession} from '@/lib/auth/session.server'
import {jsonError, unauthorizedResponse} from '@/lib/api/server/responses'

export async function PATCH(
    request: Request,
    {params}: {params: Promise<{termCode: string}>},
) {
    const {token} = await getServerSession()
    if (!token) return unauthorizedResponse()

    try {
        const {termCode} = await params
        const {status} = await request.json()
        return NextResponse.json(await backendUpdateAdminTerm(token, termCode, status))
    } catch (error) {
        return jsonError(error, 'Failed to update term.')
    }
}
