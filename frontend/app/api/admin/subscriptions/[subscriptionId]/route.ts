import { NextResponse } from 'next/server'
import { backendPatchAdminSubscription } from '@/lib/server-backend-api'
import { getServerSession } from '@/lib/server-session'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ subscriptionId: string }> },
) {
  const { token } = await getServerSession()
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { subscriptionId } = await params
  const { searchParams } = new URL(request.url)
  const enabled = searchParams.get('enabled') === 'true'
  const data = await backendPatchAdminSubscription(token, subscriptionId, enabled)
  return NextResponse.json(data)
}
