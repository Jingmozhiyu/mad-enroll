import { NextResponse } from 'next/server'
import { backendSendAdminTestEmail } from '@/lib/server-backend-api'
import { getServerSession } from '@/lib/server-session'
import type { TestEmailPayload } from '@/lib/types'

export async function POST(request: Request) {
  const { token } = await getServerSession()
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const payload = (await request.json()) as TestEmailPayload
  await backendSendAdminTestEmail(token, payload)
  return NextResponse.json({ ok: true })
}
