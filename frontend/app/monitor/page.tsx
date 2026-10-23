import type {Metadata} from 'next'
import {MonitorClientPage} from '@/components/monitor/monitor-client-page'
import {backendFetchSubscriptions} from '@/lib/api/server/subscriptions'
import {getServerSession} from '@/lib/auth/session.server'
import {MONITOR_DESCRIPTION, MONITOR_TITLE} from '@/lib/seo'

export const metadata: Metadata = {
    title: MONITOR_TITLE,
    description: MONITOR_DESCRIPTION,
    alternates: {canonical: '/monitor'},
    openGraph: {title: MONITOR_TITLE, description: MONITOR_DESCRIPTION, url: '/monitor', siteName: 'MadEnroll'},
    twitter: {card: 'summary', title: MONITOR_TITLE, description: MONITOR_DESCRIPTION},
}

type MonitorPageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getAuthErrorMessage(value: string | string[] | undefined) {
    return typeof value === 'string' && value.trim() ? value : undefined
}

export default async function MonitorPage({searchParams}: MonitorPageProps) {

    const serviceMode = process.env.MONITOR_SERVICE_MODE

    const {session, token} = await getServerSession()
    const resolvedSearchParams = searchParams ? await searchParams : undefined
    const initialStatusMessage = getAuthErrorMessage(resolvedSearchParams?.authError)

    if (!session || !token) {
        return (
            <MonitorClientPage
                initialStatusMessage={initialStatusMessage}
                initialTasks={[]}
                serviceMode={serviceMode}
            />
        )
    }

    let initialTasks = [] as Awaited<ReturnType<typeof backendFetchSubscriptions>>

    try {
        initialTasks = await backendFetchSubscriptions(token)
    } catch {
        initialTasks = []
    }

    return <MonitorClientPage initialTasks={initialTasks} serviceMode={serviceMode}/>
}
