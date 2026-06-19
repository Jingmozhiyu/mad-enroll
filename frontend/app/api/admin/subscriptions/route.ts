import { NextResponse } from 'next/server'
import { backendFetchAdminSubscriptions } from '@/lib/server-backend-api'
import { getServerSession } from '@/lib/server-session'

export async function GET() {
  const { token } = await getServerSession()
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const data = await backendFetchAdminSubscriptions(token)
  return NextResponse.json(data)
}
