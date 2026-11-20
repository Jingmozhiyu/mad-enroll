'use client'

import {useState, type ReactNode} from 'react'
import {AdminMailChart} from '@/components/admin/admin-mail-chart'
import {CompactPanel, SummaryMetric} from '@/components/admin/admin-sections'
import {formatDurationMs, formatSnapshotTime} from '@/components/admin/admin-helpers'
import type {AdminDashboard} from '@/components/admin/use-admin-dashboard'
import {formatDateOnly} from '@/lib/course/format'

/** One label/value pair of the scheduler snapshot. */
function SnapshotItem({label, children}: {label: string; children: ReactNode}) {
    return (
        <div className="grid gap-0.5">
            <dt className="text-xs text-[var(--color-ink-muted)]">{label}</dt>
            <dd className="text-sm tabular-nums text-[var(--color-ink)]">{children}</dd>
        </div>
    )
}

/** Key numbers, scheduler throughput and health, and the daily email trend. */
export function AdminOverviewTab({dashboard}: {dashboard: AdminDashboard}) {
    const {
        enabledSubscriptions,
        latestStat,
        latestWelcomeDeliverySummary,
        loadSnapshot,
        mailStatsLoadedOn,
        recentDeadLetters,
        schedulerStatus,
        snapshotLoading,
        sortedMailStats,
        totalDeadLetters,
        totalDeliveries,
        totalSubscriptions,
        totalUsers,
    } = dashboard
    const [showQueuedCourseIds, setShowQueuedCourseIds] = useState(false)

    return (
        <div className="grid gap-5">
            <section className="surface-panel-strong overflow-hidden rounded-[14px]">
                <dl className="grid grid-cols-2 xl:grid-cols-4">
                    <SummaryMetric
                        label="Users"
                        value={totalUsers}
                        detail={latestWelcomeDeliverySummary ?? 'No recent welcome deliveries'}
                    />
                    <SummaryMetric
                        label="Subscriptions"
                        value={totalSubscriptions}
                        detail={`${enabledSubscriptions} enabled`}
                    />
                    <SummaryMetric
                        label="Deliveries"
                        value={totalDeliveries}
                        detail={
                            latestStat
                                ? `Sent ${latestStat.sentTotal} on ${formatDateOnly(latestStat.statsDate)}`
                                : 'No daily stats yet'
                        }
                    />
                    <SummaryMetric
                        label="Dead Letters"
                        value={totalDeadLetters}
                        detail={`Dead ${recentDeadLetters.length} in last 7 days`}
                        // Pink flags recent failures; with none it stays as muted as the other details.
                        detailClassName={recentDeadLetters.length > 0 ? 'font-semibold text-[var(--color-location)]' : undefined}
                    />
                </dl>
            </section>

            <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
                <CompactPanel title="Scheduler">
                    {!schedulerStatus ? (
                        <p className="text-sm text-[var(--color-ink-soft)]">No scheduler snapshot yet.</p>
                    ) : (
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <dl className="grid grid-cols-2 gap-x-5 gap-y-3">
                                    <SnapshotItem label="Fetch rate">{schedulerStatus.fetchesPerMinute.toFixed(1)} / min</SnapshotItem>
                                    <SnapshotItem label="Avg revisit">{formatDurationMs(schedulerStatus.avgRevisitMs)}</SnapshotItem>
                                    <SnapshotItem label="Avg queue wait">{formatDurationMs(schedulerStatus.avgQueueWaitMs)}</SnapshotItem>
                                    <SnapshotItem label="Max queue wait">{formatDurationMs(schedulerStatus.maxQueueWaitMs)}</SnapshotItem>
                                </dl>
                            </div>
                            <div className="subtle-panel-divider grid gap-2 border-t pt-4">
                                <dl className="grid grid-cols-2 gap-x-5 gap-y-3">
                                    <SnapshotItem label="Queue">
                                        {schedulerStatus.queuedCourseIds.length > 0 ? (
                                            <button
                                                aria-expanded={showQueuedCourseIds}
                                                className="bg-transparent p-0 underline underline-offset-4 transition hover:text-[var(--color-deep-teal)]"
                                                onClick={() => setShowQueuedCourseIds((current) => !current)}
                                                type="button"
                                            >
                                                {schedulerStatus.queueSize} courses
                                            </button>
                                        ) : (
                                            `${schedulerStatus.queueSize} courses`
                                        )}
                                    </SnapshotItem>
                                    <SnapshotItem label="Queue head waiting">{formatDurationMs(schedulerStatus.oldestQueuedWaitMs)}</SnapshotItem>
                                    <SnapshotItem label="Active courses">{schedulerStatus.activeCourseCount}</SnapshotItem>
                                    <SnapshotItem label="Due now">{schedulerStatus.dueCourseCount}</SnapshotItem>
                                    <SnapshotItem label="Fetch interval">{schedulerStatus.fetchIntervalMs.toLocaleString('en-US')} ms</SnapshotItem>
                                    <SnapshotItem label="Heartbeat">{schedulerStatus.heartbeatIntervalMs.toLocaleString('en-US')} ms</SnapshotItem>
                                    <div className="col-span-2">
                                        <SnapshotItem label="Last fetch">
                                            {schedulerStatus.lastFetchedCourseId
                                                ? `Course ${schedulerStatus.lastFetchedCourseId} at ${formatSnapshotTime(schedulerStatus.lastFetchFinishedAt)}`
                                                : 'None yet'}
                                        </SnapshotItem>
                                    </div>
                                    {showQueuedCourseIds ? (
                                        <p className="surface-inner col-span-2 rounded-[12px] px-3 py-2 text-xs leading-6 text-[var(--color-ink)]">
                                            {schedulerStatus.queuedCourseIds.join(', ')}
                                        </p>
                                    ) : null}
                                </dl>
                            </div>
                        </div>
                    )}
                    <div className="mt-auto flex justify-end pt-4">
                        <button
                            className="bg-transparent p-0 text-sm text-[var(--color-ink-soft)] underline underline-offset-4 transition hover:text-[var(--color-ink)] disabled:cursor-default disabled:opacity-60"
                            disabled={snapshotLoading}
                            onClick={() => void loadSnapshot('Snapshot refreshed.')}
                            type="button"
                        >
                            {snapshotLoading ? 'Refreshing...' : 'Refresh snapshot'}
                        </button>
                    </div>
                </CompactPanel>

                <CompactPanel title="Daily Email">
                    {sortedMailStats.length === 0 ? (
                        <p className="text-sm text-[var(--color-ink-soft)]">No daily stats yet.</p>
                    ) : (
                        <AdminMailChart endDate={mailStatsLoadedOn} stats={sortedMailStats}/>
                    )}
                </CompactPanel>
            </section>
        </div>
    )
}
