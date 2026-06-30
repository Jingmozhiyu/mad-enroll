'use client'

import {Fragment} from 'react'
import {EmptyState} from '@/components/empty-state'
import {ProgressLink} from '@/components/navigation-progress'
import {
    CompactPanel,
    MiniPagination,
    SummaryMetric,
} from '@/components/admin/admin-sections'
import {
    formatCount,
    formatSnapshotTime,
    getDeadLetterSummary,
    getStatusTextClass,
    getSubscriptionState,
    getUserSubscriptionCounts,
    sortSubscriptionsByState,
} from '@/components/admin/admin-helpers'
import {useAdminDashboard} from '@/components/admin/use-admin-dashboard'
import {formatDateOnly, formatDateTime} from '@/lib/course/format'

export function AdminDashboardPage() {
    const {
        deadLetters,
        deadLettersPage,
        deadLettersTotalPages,
        emailHistoryPage,
        emailHistoryTotalPages,
        enabledSubscriptions,
        expandedUserIds,
        handleSendTestEmail,
        handleToggle,
        isLoggedIn,
        latestStat,
        latestWelcomeDeliverySummary,
        loadDashboard,
        loadSnapshot,
        loading,
        mailDeliveries,
        mailStatsPage,
        mailStatsTotalPages,
        pendingAdminSections,
        ready,
        schedulerStatus,
        sessionEmail,
        setDeadLettersPage,
        setEmailHistoryPage,
        setMailStatsPage,
        setTestEmailForm,
        setUsersPage,
        showQueuedCourseIds,
        snapshotLoading,
        sortedMailStats,
        sortedUsers,
        statusMessage,
        testEmailForm,
        testingEmail,
        togglingId,
        toggleExpandedUser,
        totalSubscriptions,
        totalUsers,
        usersPage,
        usersTotalPages,
        visibleDeadLetters,
        visibleMailDeliveries,
        visibleMailStats,
        visibleUsers,
    } = useAdminDashboard()

    return (
        <div className="grid gap-5">
            {!ready ? (
                <section className="surface-panel-strong rounded-[14px] px-5 py-8">
                    <p className="text-sm text-[var(--color-ink-soft)]">Loading session...</p>
                </section>
            ) : !isLoggedIn ? (
                <section className="surface-panel-strong rounded-[14px] px-5 py-8">
                    <EmptyState
                        description="This route does not redirect on its own. Use the monitor page to login, then return here if your account has admin permissions."
                        title="Login required"
                    />
                    <div className="mt-5 flex justify-center">
                        <ProgressLink className="button-primary min-w-[160px]" href="/monitor">
                            Go to Monitor
                        </ProgressLink>
                    </div>
                </section>
            ) : (
                <>
                    <div
                        className="hidden surface-panel-strong flex-col gap-2 rounded-[14px] px-4 py-4 md:flex-row md:items-center md:justify-between">
                        <p className="text-sm text-[var(--color-ink-soft)]">{statusMessage}</p>
                        <div className="flex items-center gap-4">
                            <p className="text-sm text-[var(--color-ink-soft)]">{sessionEmail}</p>
                            <button
                                className="button-secondary min-w-[108px]"
                                disabled={loading}
                                onClick={() => void loadDashboard('Dashboard refreshed.')}
                                type="button"
                            >
                                {loading
                                    ? pendingAdminSections > 0
                                        ? `Refreshing ${pendingAdminSections}...`
                                        : 'Refreshing...'
                                    : 'Refresh'}
                            </button>
                        </div>
                    </div>

                    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                            value={mailDeliveries.length}
                            detail={
                                latestStat
                                    ? `Sent ${latestStat.sentTotal} on ${formatDateOnly(latestStat.statsDate)}`
                                    : 'No daily stats yet'
                            }
                        />
                        <SummaryMetric
                            label="Dead Letters"
                            value={deadLetters.length}
                            detail={
                                latestStat
                                    ? `Dead ${latestStat.deadTotal} on ${formatDateOnly(latestStat.statsDate)}`
                                    : 'No dead-letter stats yet'
                            }
                        />
                    </section>

                    <section className="surface-panel-strong rounded-[14px] px-4 py-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                                <h2 className="text-base font-semibold text-[var(--color-ink)]">Snapshot</h2>
                                {!schedulerStatus ? (
                                    <p className="mt-2 text-sm text-[var(--color-ink-soft)]">No scheduler snapshot
                                        yet.</p>
                                ) : (
                                    <div
                                        className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--color-ink-soft)]">
                                        <span>Observed ({formatSnapshotTime(schedulerStatus.observedAt)})</span>
                                        <span>H {schedulerStatus.heartbeatIntervalMs} ms</span>
                                        <span>F {schedulerStatus.fetchIntervalMs} ms</span>
                                        <span>Active {schedulerStatus.activeCourseCount}</span>
                                        <span className="relative">
                        Queue {schedulerStatus.queueSize}
                                            {showQueuedCourseIds && schedulerStatus.queuedCourseIds.length > 0 ? (
                                                <div
                                                    className="surface-popover absolute left-0 top-[calc(100%+0.4rem)] z-10 min-w-[280px] max-w-[min(75vw,36rem)] rounded-xl px-3 py-2 text-xs leading-6 text-[var(--color-ink)]">
                                                    {schedulerStatus.queuedCourseIds.join(', ')}
                                                </div>
                                            ) : null}
                    </span>
                                        <span>Due {schedulerStatus.dueCourseCount}</span>
                                        <span>
                      LF {schedulerStatus.lastFetchedCourseId ?? 'N/A'} (
                                            {formatSnapshotTime(schedulerStatus.lastFetchFinishedAt)})
                    </span>
                                    </div>
                                )}
                            </div>
                            <button
                                className="button-secondary min-w-[132px]"
                                disabled={snapshotLoading}
                                onClick={() => void loadSnapshot('Snapshot refreshed.')}
                                type="button"
                            >
                                {snapshotLoading ? 'Refreshing...' : 'Refresh Snapshot'}
                            </button>
                        </div>
                    </section>

                    <section className="grid gap-4 md:grid-cols-2">
                        <CompactPanel title="Daily Stat">
                            <div className="text-sm text-[var(--color-ink-soft)]">
                                {sortedMailStats.length === 0 ? (
                                    <p>No daily stats yet.</p>
                                ) : (
                                    <div className="surface-inner overflow-hidden rounded-[18px]">
                                        <table className="w-full table-fixed text-left text-[11px] leading-4">
                                            <thead>
                                                <tr className="subtle-panel-divider border-b uppercase tracking-[0.04em] text-[var(--color-ink-soft)]">
                                                    <th className="w-[20%] px-2 py-2 font-semibold text-center">Date</th>
                                                    <th className="w-[20%] px-2 py-2 font-semibold text-center">Total</th>
                                                    <th className="w-[15%] px-2 py-2 font-semibold text-center">Open</th>
                                                    <th className="w-[15%] px-2 py-2 font-semibold text-center">Waitlist</th>
                                                    <th className="w-[15%] px-2 py-2 font-semibold text-center">Welcome</th>
                                                    <th className="w-[15%] px-2 py-2 font-semibold text-center">Dead</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {visibleMailStats.map((stat) => (
                                                    <tr
                                                        key={stat.id}
                                                        className="subtle-panel-divider border-b last:border-b-0"
                                                    >
                                                        <td className="px-2 py-2 font-medium text-center text-[var(--color-ink)]">
                                                            {stat.statsDate}
                                                        </td>
                                                        <td className="px-2 py-2 text-center">{stat.sentTotal}</td>
                                                        <td className="px-2 py-2 text-center">{stat.sentOpen}</td>
                                                        <td className="px-2 py-2 text-center">{stat.sentWaitlist}</td>
                                                        <td className="px-2 py-2 text-center">{stat.sentWelcome}</td>
                                                        <td className="px-2 py-2 text-center">{stat.deadTotal}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            <MiniPagination
                                currentPage={mailStatsPage}
                                onPageChange={setMailStatsPage}
                                totalPages={mailStatsTotalPages}
                            />
                        </CompactPanel>

                        <CompactPanel title="Email History">
                            <div className="grid gap-3 text-sm text-[var(--color-ink-soft)]">
                                {mailDeliveries.length === 0 ? (
                                    <p>No deliveries yet.</p>
                                ) : (
                                    visibleMailDeliveries.map((delivery) => (
                                        <div
                                            key={delivery.id}
                                            className="subtle-panel-divider grid gap-1 border-b pb-3 last:border-b-0 last:pb-0"
                                        >
                                            <p className="font-medium text-[var(--color-ink)]">
                                                {delivery.courseDisplayName} · {delivery.alertType}
                                            </p>
                                            <p>{delivery.recipientEmail}</p>
                                            <p>{formatDateTime(delivery.sentAt)}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                            <MiniPagination
                                currentPage={emailHistoryPage}
                                onPageChange={setEmailHistoryPage}
                                totalPages={emailHistoryTotalPages}
                            />
                        </CompactPanel>
                    </section>

                    <section className="surface-panel-strong rounded-[14px] px-4 py-4">
                        <div className="subtle-panel-divider border-b pb-3">
                            <h2 className="text-base font-semibold text-[var(--color-ink)]">Users</h2>
                        </div>

                        {sortedUsers.length === 0 ? (
                            <div className="pt-4">
                                <EmptyState
                                    description="No admin subscription data is available yet, or your account does not have the required permissions."
                                    title="Nothing to show"
                                />
                            </div>
                        ) : (
                            <>
                                <div className="mt-4 overflow-x-auto">
                                    <table className="min-w-full border-collapse text-sm">
                                        <thead>
                                            <tr className="subtle-panel-divider border-b text-left text-xs uppercase tracking-[0.08em] text-[var(--color-ink-soft)]">
                                                <th className="px-3 py-3 text-center font-semibold">Email</th>
                                                <th className="px-3 py-3 text-center font-semibold">Subscribed</th>
                                                <th className="px-3 py-3 text-center font-semibold text-[var(--color-mmj)]">
                                                    Open
                                                </th>
                                                <th className="px-3 py-3 text-center font-semibold text-[var(--color-monori)]">
                                                    Waitlist
                                                </th>
                                                <th className="px-3 py-3 text-center font-semibold text-[var(--color-airi)]">
                                                    Closed
                                                </th>
                                                <th className="px-3 py-3 text-center font-semibold text-[var(--color-haruka)]">
                                                    Disabled
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {visibleUsers.map((row) => {
                                                const counts = getUserSubscriptionCounts(row.subscriptions)
                                                const sortedSubscriptions = sortSubscriptionsByState(row.subscriptions)
                                                const activeCount = counts.open + counts.waitlist + counts.closed
                                                const isExpanded = expandedUserIds.includes(row.userId)

                                                return (
                                                    <Fragment key={row.userId}>
                                                        <tr className="subtle-panel-divider border-b text-sm text-[var(--color-ink-soft)]">
                                                            <td className="px-3 py-3 font-medium text-center text-[var(--color-ink)]">
                                                                {row.email}
                                                            </td>
                                                            <td className="px-3 py-3 text-center">
                                                                <button
                                                                    className="bg-transparent p-0 underline underline-offset-4 transition hover:text-[var(--color-ink)]"
                                                                    onClick={() => toggleExpandedUser(row.userId)}
                                                                    type="button"
                                                                >
                                                                    {activeCount}/{row.subscriptions.length} Enabled
                                                                </button>
                                                            </td>
                                                            <td className="px-3 py-3 text-center text-[var(--color-mmj)]">
                                                                {counts.open}
                                                            </td>
                                                            <td className="px-3 py-3 text-center text-[var(--color-monori)]">
                                                                {counts.waitlist}
                                                            </td>
                                                            <td className="px-3 py-3 text-center text-[var(--color-airi)]">
                                                                {counts.closed}
                                                            </td>
                                                            <td className="px-3 py-3 text-center text-[var(--color-haruka)]">
                                                                {counts.disabled}
                                                            </td>
                                                        </tr>
                                                        {isExpanded ? (
                                                            <tr className="subtle-panel-divider border-b">
                                                                <td className="px-3 py-4" colSpan={6}>
                                                                    <div
                                                                        className="surface-inner overflow-x-auto rounded-[18px] px-3 py-3">
                                                                        <table
                                                                            className="min-w-full border-collapse text-sm">
                                                                            <thead>
                                                                                <tr className="subtle-panel-divider border-b text-left text-xs uppercase tracking-[0.08em] text-[var(--color-ink-soft)]">
                                                                                    <th className="px-3 py-2 font-semibold">Course</th>
                                                                                    <th className="px-3 py-2 text-center font-semibold">Section</th>
                                                                                    <th className="px-3 py-2 text-center font-semibold">Status</th>
                                                                                    <th className="px-3 py-2 text-center font-semibold text-[var(--color-mmj)]">
                                                                                        Open Seats
                                                                                    </th>
                                                                                    <th className="px-3 py-2 text-center font-semibold text-[var(--color-mmj)]">
                                                                                        Capacity
                                                                                    </th>
                                                                                    <th className="px-3 py-2 text-center font-semibold text-[var(--color-monori)]">
                                                                                        Waitlist Seats
                                                                                    </th>
                                                                                    <th className="px-3 py-2 text-center font-semibold text-[var(--color-monori)]">
                                                                                        Waitlist Capacity
                                                                                    </th>
                                                                                    <th className="px-3 py-2 text-center font-semibold">Action</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {sortedSubscriptions.map((subscription) => {
                                                                                    const state = getSubscriptionState(subscription)
                                                                                    const isSaving = togglingId === subscription.subscriptionId

                                                                                    return (
                                                                                        <tr
                                                                                            key={subscription.subscriptionId}
                                                                                            className="subtle-panel-divider border-b text-[var(--color-ink-soft)] last:border-b-0"
                                                                                        >
                                                                                            <td className="px-3 py-2 text-[var(--color-ink)]">
                                                                                                {subscription.courseDisplayName}
                                                                                            </td>
                                                                                            <td className="px-3 py-2 text-center">
                                                                                                {subscription.sectionId}
                                                                                            </td>
                                                                                            <td
                                                                                                className={[
                                                                                                    'px-3 py-2 text-center font-medium',
                                                                                                    getStatusTextClass(state),
                                                                                                ].join(' ')}
                                                                                            >
                                                                                                {state}
                                                                                            </td>
                                                                                            <td className="px-3 py-2 text-center text-[var(--color-mmj)]">
                                                                                                {formatCount(subscription.openSeats)}
                                                                                            </td>
                                                                                            <td className="px-3 py-2 text-center text-[var(--color-mmj)]">
                                                                                                {formatCount(subscription.capacity)}
                                                                                            </td>
                                                                                            <td className="px-3 py-2 text-center text-[var(--color-monori)]">
                                                                                                {formatCount(subscription.waitlistSeats)}
                                                                                            </td>
                                                                                            <td className="px-3 py-2 text-center text-[var(--color-monori)]">
                                                                                                {formatCount(subscription.waitlistCapacity)}
                                                                                            </td>
                                                                                            <td className="px-3 py-2 text-center">
                                                                                                <button
                                                                                                    className="bg-transparent p-0 text-sm font-medium text-[var(--color-ink)] underline underline-offset-4 transition hover:text-[var(--color-deep-teal)] disabled:cursor-not-allowed disabled:opacity-50"
                                                                                                    disabled={isSaving}
                                                                                                    onClick={() =>
                                                                                                        void handleToggle(
                                                                                                            subscription.subscriptionId,
                                                                                                            !subscription.enabled,
                                                                                                        )
                                                                                                    }
                                                                                                    type="button"
                                                                                                >
                                                                                                    {isSaving
                                                                                                        ? 'Saving...'
                                                                                                        : subscription.enabled
                                                                                                            ? 'Disable'
                                                                                                            : 'Enable'}
                                                                                                </button>
                                                                                            </td>
                                                                                        </tr>
                                                                                    )
                                                                                })}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ) : null}
                                                    </Fragment>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <MiniPagination
                                    currentPage={usersPage}
                                    onPageChange={setUsersPage}
                                    totalPages={usersTotalPages}
                                />
                            </>
                        )}
                    </section>

                    <section className="grid gap-4 md:grid-cols-2">
                        <CompactPanel title="Test Email">
                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="grid gap-1.5">
                                    <span className="text-sm text-[var(--color-ink-soft)]">Recipient email</span>
                                    <input
                                        className="input-shell h-11"
                                        name="recipient-email"
                                        onChange={(event) =>
                                            setTestEmailForm((current) => ({
                                                ...current,
                                                recipientEmail: event.target.value,
                                            }))
                                        }
                                        placeholder="admin@example.com"
                                        value={testEmailForm.recipientEmail}
                                    />
                                </label>

                                <label className="grid gap-1.5">
                                    <span className="text-sm text-[var(--color-ink-soft)]">Alert type</span>
                                    <input
                                        className="input-shell h-11"
                                        name="alert-type"
                                        onChange={(event) =>
                                            setTestEmailForm((current) => ({
                                                ...current,
                                                alertType: event.target.value,
                                            }))
                                        }
                                        placeholder="OPEN / WAITLIST / WELCOME"
                                        value={testEmailForm.alertType}
                                    />
                                </label>

                                <label className="grid gap-1.5">
                                    <span className="text-sm text-[var(--color-ink-soft)]">Section ID</span>
                                    <input
                                        className="input-shell h-11"
                                        name="section-id"
                                        onChange={(event) =>
                                            setTestEmailForm((current) => ({
                                                ...current,
                                                sectionId: event.target.value,
                                            }))
                                        }
                                        value={testEmailForm.sectionId}
                                    />
                                </label>

                                <label className="grid gap-1.5">
                                    <span className="text-sm text-[var(--color-ink-soft)]">Course name</span>
                                    <input
                                        className="input-shell h-11"
                                        name="course-display-name"
                                        onChange={(event) =>
                                            setTestEmailForm((current) => ({
                                                ...current,
                                                courseDisplayName: event.target.value,
                                            }))
                                        }
                                        value={testEmailForm.courseDisplayName}
                                    />
                                </label>
                            </div>

                            <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                                <label className="grid min-w-[132px] gap-1.5">
                                    <span className="text-sm text-[var(--color-ink-soft)]">termId</span>
                                    <input
                                        className="input-shell h-11"
                                        inputMode="numeric"
                                        name="term-id"
                                        onChange={(event) =>
                                            setTestEmailForm((current) => ({
                                                ...current,
                                                termId: event.target.value,
                                            }))
                                        }
                                        placeholder="1272"
                                        value={testEmailForm.termId}
                                    />
                                </label>
                                <button
                                    className="button-primary min-w-[144px]"
                                    disabled={testingEmail}
                                    onClick={() => void handleSendTestEmail()}
                                    type="button"
                                >
                                    {testingEmail ? 'Sending...' : 'Test Email'}
                                </button>
                            </div>
                        </CompactPanel>

                        <CompactPanel title="Failed Alert Events">
                            <div className="grid gap-2 text-sm text-[var(--color-ink-soft)]">
                                {deadLetters.length === 0 ? (
                                    <p>No failed alert events yet.</p>
                                ) : (
                                    visibleDeadLetters.map((entry, index) => {
                                        const summary = getDeadLetterSummary(entry)

                                        return (
                                            <div
                                                key={entry.id ?? `${summary.title}-${index}`}
                                                className="subtle-panel-divider grid gap-1 border-b pb-2 last:border-b-0 last:pb-0"
                                            >
                                                <p className="font-medium text-[var(--color-ink)]">{summary.title}</p>
                                                <p>{summary.subtitle}</p>
                                                <p>{summary.detail}</p>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                            <MiniPagination
                                currentPage={deadLettersPage}
                                onPageChange={setDeadLettersPage}
                                totalPages={deadLettersTotalPages}
                            />
                        </CompactPanel>
                    </section>
                </>
            )}
        </div>
    )
}
