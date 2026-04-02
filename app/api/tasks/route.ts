import { NextResponse } from 'next/server'
import { backendAddTask, backendDeleteTask, backendFetchTasks } from '@/lib/server-backend-api'
import { getServerSession } from '@/lib/server-session'

function unauthorized() {
  return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
}

function toErrorResponse(error: unknown, fallbackMessage: string) {
  const status =
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
      ? ((error as { status: number }).status)
      : 500

  const message = error instanceof Error ? error.message : fallbackMessage

  return NextResponse.json({ message }, { status })
}

export async function GET() {
  const { token } = await getServerSession()
  if (!token) {
    return unauthorized()
  }

  try {
    const tasks = await backendFetchTasks(token)
    return NextResponse.json(tasks)
  } catch (error) {
    return toErrorResponse(error, 'Failed to load tasks.')
  }
}

export async function POST(request: Request) {
  const { token } = await getServerSession()
  if (!token) {
    return unauthorized()
  }

  try {
    const { searchParams } = new URL(request.url)
    const sectionId = searchParams.get('sectionId') ?? ''
    const task = await backendAddTask(token, sectionId)
    return NextResponse.json(task)
  } catch (error) {
    return toErrorResponse(error, 'Failed to add task.')
  }
}

export async function DELETE(request: Request) {
  const { token } = await getServerSession()
  if (!token) {
    return unauthorized()
  }

  try {
    const { searchParams } = new URL(request.url)
    const sectionId = searchParams.get('sectionId') ?? ''
    await backendDeleteTask(token, sectionId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return toErrorResponse(error, 'Failed to delete task.')
  }
}
