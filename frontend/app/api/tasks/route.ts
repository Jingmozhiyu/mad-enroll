import {NextResponse} from 'next/server'
import {backendAddTask, backendDeleteTask, backendFetchTasks} from '@/lib/api/server/tasks'
import {getServerSession} from '@/lib/auth/session.server'
import {jsonError, unauthorizedResponse} from '@/lib/api/server/responses'

export async function GET() {
    const {token} = await getServerSession()
    if (!token) {
        return unauthorizedResponse()
    }

    try {
        const tasks = await backendFetchTasks(token)
        return NextResponse.json(tasks)
    } catch (error) {
        return jsonError(error, 'Failed to load tasks.')
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
        const task = await backendAddTask(token, docId)
        return NextResponse.json(task)
    } catch (error) {
        return jsonError(error, 'Failed to add task.')
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
        await backendDeleteTask(token, docId)
        return NextResponse.json({ok: true})
    } catch (error) {
        return jsonError(error, 'Failed to delete task.')
    }
}
