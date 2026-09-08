import {NextResponse} from 'next/server'
import {backendCreateAdminTerm, backendFetchAdminTerms} from '@/lib/api/server/admin'
import {getServerSession} from '@/lib/auth/session.server'
import {jsonError, unauthorizedResponse} from '@/lib/api/server/responses'

export async function GET() {
    const {token} = await getServerSession()
    if (!token) return unauthorizedResponse()

    try {
        return NextResponse.json(await backendFetchAdminTerms(token))
    } catch (error) {
        return jsonError(error, 'Failed to load terms.')
    }
}

export async function POST(request: Request) {
    const {token} = await getServerSession()
    if (!token) return unauthorizedResponse()

    try {
        const {code, label} = await request.json()
        return NextResponse.json(await backendCreateAdminTerm(token, {code, label}))
    } catch (error) {
        return jsonError(error, 'Failed to create term.')
    }
}
