import { MonitorClientPage } from '@/components/monitor-client-page'
import { backendFetchTasks } from '@/lib/server-backend-api'
import { getServerSession } from '@/lib/server-session'

type MonitorPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getAuthErrorMessage(value: string | string[] | undefined) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

export default async function MonitorPage({ searchParams }: MonitorPageProps) {
  const { session, token } = await getServerSession()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const initialStatusMessage = getAuthErrorMessage(resolvedSearchParams?.authError)

  if (!session || !token) {
    return (
      <MonitorClientPage
        initialStatusMessage={initialStatusMessage}
        initialTasks={[]}
      />
    )
  }

  let initialTasks = [] as Awaited<ReturnType<typeof backendFetchTasks>>

  try {
    initialTasks = await backendFetchTasks(token)
  } catch {
    initialTasks = []
  }

  return <MonitorClientPage initialTasks={initialTasks} />
}
