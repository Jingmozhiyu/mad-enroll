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
import {getServerSession} from "@/lib/auth/session.server";
import {backendFetchTasks} from "@/lib/api/server";
import Link from "next/link";

export function MonitorClientPage(props: MonitorClientPageProps) {
    const monitor = useMonitorClientPage(props)

    const serviceMode = props.serviceMode

    return (
        <div className="page-fade-enter grid gap-6">
            <SearchOverlay {...monitor.searchOverlayProps}/>

            <section className="px-2 pb-1 md:px-4">
                {monitor.showAuth ? (
                    <MonitorAuthCard {...monitor.authCardProps}/>
                ) : (
                    <MonitorPageHeader {...monitor.headerProps}/>
                )}



                {serviceMode === 'OFFSEASON' ? (
                    <section className="mx-auto grid max-w-2xl gap-4 px-4 py-16 text-center">
                        <h1 className="text-3xl font-semibold text-[var(--color-ink)] md:text-4xl">Seat alerts are on a
                            semester break</h1>
                        <p className="text-base leading-7 text-[var(--color-ink-soft)]">
                            Thanks for using MadEnroll this semester. Check back here for the next enrollment period.
                        </p>
                        <Link className="button-secondary justify-self-center" href="/">Back to home</Link>
                    </section>)
                    :
                    monitor.showTrackedSections ? (
                    <>
                        <div className="mt-4 text-center text-sm text-[var(--color-ink-soft)]" role="status">
                            {monitor.termStatus.loading ? 'Loading available terms…'
                                : monitor.termStatus.error ? <>
                                    <span>{monitor.termStatus.error}</span>{' '}
                                    <button type="button" className="underline underline-offset-4"
                                            onClick={monitor.termStatus.retry}>Retry terms
                                    </button>
                                </> : monitor.termStatus.empty ? 'No terms are currently open for subscriptions.' : null}
                        </div>
                        <div className="surface-divider mt-6 h-px w-full"/>
                        <div className="pt-6 text-center">
                            <span className="text-base font-bold text-[var(--color-ink-soft)] md:text-2xl">
                                Tracking {monitor.trackedSectionCount} Section{monitor.trackedSectionCount === 1 ? '' : 's'}
                            </span>
                        </div>
                    </>
                ) : null}
            </section>


            {serviceMode === "OFFSEASON" ? null :
                monitor.showTrackedSections ? (
                    <section className="grid gap-4">
                        <MonitorTaskList {...monitor.taskListProps}/>
                    </section>
                ) : null
            }
        </div>
    )
}
