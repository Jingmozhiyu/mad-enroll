'use client'

import {
    MonitorPageHeader,
    MonitorTaskList,
} from '@/components/monitor/monitor-sections'
import {MonitorAuthOverlay} from '@/components/monitor/monitor-auth-overlay'
import {MonitorPreview} from '@/components/monitor/monitor-preview'
import {SearchOverlay} from '@/components/monitor/search-overlay'
import {
    useMonitorClientPage,
    type MonitorClientPageProps,
} from '@/components/monitor/use-monitor-client-page'
import Link from 'next/link'

export function MonitorClientPage(props: MonitorClientPageProps) {
    const monitor = useMonitorClientPage(props)
    const {isLoggedIn, ready} = monitor.headerProps
    const isOffseason = props.serviceMode === 'OFFSEASON'
    const showsRealAlerts = ready && isLoggedIn && !isOffseason
    const alertCount = monitor.taskListProps.tasks.length

    return (
        <div className="grid gap-6">
            <SearchOverlay {...monitor.searchOverlayProps}/>
            <MonitorAuthOverlay {...monitor.authOverlayProps} authCardProps={monitor.authCardProps}/>

            <section className="px-2 pb-1 md:px-4">
                <MonitorPageHeader {...monitor.headerProps}/>

                {showsRealAlerts && monitor.termStatus.error ? (
                    <div className="mt-4 text-center text-sm text-[var(--color-ink-soft)]" role="alert">
                        <span>{monitor.termStatus.error}</span>{' '}
                        <button type="button" className="underline underline-offset-4"
                                onClick={monitor.termStatus.retry}>Retry terms
                        </button>
                    </div>
                ) : null}
                <div className="surface-divider mt-6 h-px w-full"/>
                {showsRealAlerts ? (
                    <div className="pt-6 text-center">
                        <span className="text-base font-bold text-[var(--color-ink-soft)] md:text-2xl">
                            {alertCount} Active Alert{alertCount === 1 ? '' : 's'}
                        </span>
                    </div>
                ) : null}
            </section>

            <section className="grid gap-4">
                {showsRealAlerts ? (
                    <MonitorTaskList {...monitor.taskListProps}/>
                ) : isOffseason ? (
                    <MonitorPreview>
                        <h2 className="text-2xl font-semibold text-[var(--color-ink)] md:text-3xl">
                            Seat alerts are on a semester break
                        </h2>
                        <p className="text-base leading-7 text-[var(--color-ink-soft)]">
                            Thanks for using MadEnroll this semester. Check back here for the next enrollment period.
                        </p>
                        <Link className="button-secondary" href="/">Back to home</Link>
                    </MonitorPreview>
                ) : !ready ? (
                    <MonitorPreview/>
                ) : (
                    <MonitorPreview>
                        <h2 className="text-2xl font-semibold text-[var(--color-ink)] md:text-3xl">
                            Log in to see your alerts
                        </h2>
                        <p className="text-base leading-7 text-[var(--color-ink-soft)]">
                            Add the sections you want, and we&apos;ll email you when a seat opens.
                        </p>
                        <button className="button-primary min-w-[140px]" onClick={monitor.headerProps.onOpenAuth}
                                type="button">
                            Log in
                        </button>
                    </MonitorPreview>
                )}
            </section>
        </div>
    )
}
