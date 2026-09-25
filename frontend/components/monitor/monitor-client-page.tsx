'use client'

import {
    MonitorPageHeader,
    MonitorTaskList,
} from '@/components/monitor/monitor-sections'
import {MonitorAuthOverlay} from '@/components/monitor/monitor-auth-overlay'
import {SearchOverlay} from '@/components/monitor/search-overlay'
import {
    useMonitorClientPage,
    type MonitorClientPageProps,
} from '@/components/monitor/use-monitor-client-page'
import Link from 'next/link'

export function MonitorClientPage(props: MonitorClientPageProps) {
    const monitor = useMonitorClientPage(props)

    const serviceMode = props.serviceMode

    return (
        <div className="grid gap-6">
            <SearchOverlay {...monitor.searchOverlayProps}/>
            <MonitorAuthOverlay {...monitor.authOverlayProps} authCardProps={monitor.authCardProps}/>

            <section className="px-2 pb-1 md:px-4">
                <MonitorPageHeader {...monitor.headerProps}/>

                {serviceMode === 'OFFSEASON' ? (
                    <section className="mx-auto grid max-w-2xl gap-4 px-4 py-16 text-center">
                        <h2 className="text-3xl font-semibold text-[var(--color-ink)] md:text-4xl">
                            Seat alerts are on a semester break
                        </h2>
                        <p className="text-base leading-7 text-[var(--color-ink-soft)]">
                            Thanks for using MadEnroll this semester. Check back here for the next enrollment period.
                        </p>
                        <Link className="button-secondary justify-self-center" href="/">Back to home</Link>
                    </section>
                ) : (
                    <>
                        {monitor.headerProps.isLoggedIn && monitor.termStatus.error ? (
                            <div className="mt-4 text-center text-sm text-[var(--color-ink-soft)]" role="alert">
                                <span>{monitor.termStatus.error}</span>{' '}
                                <button type="button" className="underline underline-offset-4"
                                        onClick={monitor.termStatus.retry}>Retry terms
                                </button>
                            </div>
                        ) : null}
                        <div className="surface-divider mt-6 h-px w-full"/>
                        <div className="pt-6 text-center">
                            <span className="text-base font-bold text-[var(--color-ink-soft)] md:text-2xl">
                                Tracking {monitor.trackedSectionCount} Section{monitor.trackedSectionCount === 1 ? '' : 's'}
                            </span>
                        </div>
                    </>
                )}
            </section>


            {serviceMode === 'OFFSEASON' ? null : (
                <section className="grid gap-4">
                    <MonitorTaskList {...monitor.taskListProps}/>
                </section>
            )}
        </div>
    )
}
