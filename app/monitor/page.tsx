import { MonitorClientPage } from '@/components/monitor-client-page'
import { backendFetchTasks } from '@/lib/server-backend-api'
import { getServerSession } from '@/lib/server-session'

export default async function MonitorPage() {
  const { session, token } = await getServerSession()

  if (!session || !token) {
    return <MonitorClientPage initialTasks={[]} />
  }

  let initialTasks = [] as Awaited<ReturnType<typeof backendFetchTasks>>

  try {
    initialTasks = await backendFetchTasks(token)
  } catch {
    initialTasks = []
  }

  return <MonitorClientPage initialTasks={initialTasks} />
}
