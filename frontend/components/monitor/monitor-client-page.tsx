'use client'

import {
    MonitorAuthCard,
    MonitorPageHeader,
    MonitorTaskList,
} from '@/components/monitor/monitor-sections'
import {SearchOverlay} from '@/components/monitor/search-overlay'
import {
    useMonitorClientPage,
    type MonitorClientPageProps,
} from '@/components/monitor/use-monitor-client-page'

export function MonitorClientPage(props: MonitorClientPageProps) {
    const monitor = useMonitorClientPage(props)

    return (
        <div className="page-fade-enter grid gap-6">
            <SearchOverlay {...monitor.searchOverlayProps}/>

            <section className="px-2 pb-1 md:px-4">
                {monitor.showAuth ? (
                    <MonitorAuthCard {...monitor.authCardProps}/>
                ) : (
                    <MonitorPageHeader {...monitor.headerProps}/>
                )}

                {monitor.showTrackedSections ? (
                    <>
                        <div className="surface-divider mt-6 h-px w-full"/>
                        <div className="pt-6 text-center">
                            <span className="text-base font-bold text-[var(--color-ink-soft)] md:text-2xl">
                                Tracking {monitor.trackedSectionCount} Section{monitor.trackedSectionCount === 1 ? '' : 's'}
                            </span>
                        </div>
                    </>
                ) : null}
            </section>

            {monitor.showTrackedSections ? (
                <section className="grid gap-4">
                    <MonitorTaskList {...monitor.taskListProps}/>
                </section>
            ) : null}
        </div>
    )
}
