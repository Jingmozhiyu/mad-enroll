import {NextResponse} from 'next/server'
import {backendAddSubscription, backendDeleteSubscription, backendFetchSubscriptions} from '@/lib/api/server/subscriptions'
import {getServerSession} from '@/lib/auth/session.server'
import {jsonError, unauthorizedResponse} from '@/lib/api/server/responses'

export async function GET() {
    const {token} = await getServerSession()
    if (!token) {
        return unauthorizedResponse()
    }

    try {
        const tasks = await backendFetchSubscriptions(token)
        return NextResponse.json(tasks)
    } catch (error) {
        return jsonError(error, 'Failed to load subscriptions.')
    }
}

export async function POST(request: Request) {
    const {token} = await getServerSession()
    if (!token) {
        return unauthorizedResponse()
    }

    try {
        const {searchParams} = new URL(request.url)
        const docId = searchParams.get('docId') ?? ''
        const task = await backendAddSubscription(token, docId)
        return NextResponse.json(task)
    } catch (error) {
        return jsonError(error, 'Failed to add subscription.')
    }
}

export async function DELETE(request: Request) {
    const {token} = await getServerSession()
    if (!token) {
        return unauthorizedResponse()
    }

    try {
        const {searchParams} = new URL(request.url)
        const docId = searchParams.get('docId') ?? ''
        await backendDeleteSubscription(token, docId)
        return NextResponse.json({ok: true})
    } catch (error) {
        return jsonError(error, 'Failed to delete subscription.')
    }
}
