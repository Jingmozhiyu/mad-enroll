import {MonitorClientPage} from '@/components/monitor/monitor-client-page'
import Link from 'next/link'
import {backendFetchTasks} from '@/lib/api/server/tasks'
import {getServerSession} from '@/lib/auth/session.server'

type MonitorPageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getAuthErrorMessage(value: string | string[] | undefined) {
    return typeof value === 'string' && value.trim() ? value : undefined
}

export default async function MonitorPage({searchParams}: MonitorPageProps) {
    const serviceMode = process.env.MONITOR_SERVICE_MODE
    if (serviceMode === 'OFFSEASON') {
        return <section className="mx-auto grid max-w-2xl gap-4 px-4 py-16 text-center">
            <h1 className="text-3xl font-semibold text-[var(--color-ink)] md:text-4xl">Seat alerts are on a semester break</h1>
            <p className="text-base leading-7 text-[var(--color-ink-soft)]">
                Thanks for using MadEnroll this semester. Check back here for the next enrollment period.
            </p>
            <Link className="button-secondary justify-self-center" href="/">Back to home</Link>
        </section>
    }
    if (serviceMode !== 'RUNNING') {
        throw new Error('MONITOR_SERVICE_MODE must be RUNNING or OFFSEASON.')
    }
    const {session, token} = await getServerSession()
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

    return <MonitorClientPage initialTasks={initialTasks}/>
}
