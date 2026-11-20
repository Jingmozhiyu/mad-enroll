'use client'

import {CompactPanel, MiniPagination} from '@/components/admin/admin-sections'
import {formatSnapshotTime, getDeadLetterSummary} from '@/components/admin/admin-helpers'
import type {AdminDashboard} from '@/components/admin/use-admin-dashboard'
import {formatDateTime} from '@/lib/course/format'

const ALERT_TYPES = ['OPEN', 'WAITLIST', 'WELCOME'] as const

/** Email history, daily counters, failed alert events and the manual test email. */
export function AdminMailTab({dashboard}: {dashboard: AdminDashboard}) {
    const {
        deadLetters,
        deadLettersPage,
        deadLettersTotalPages,
        emailHistoryLoading,
        emailHistoryPage,
        emailHistoryTotalPages,
        handleEmailHistoryPageChange,
        handleSendTestEmail,
        mailDeliveries,
        mailStatsPage,
        mailStatsTotalPages,
        sessionEmail,
        setDeadLettersPage,
        setMailStatsPage,
        setTestEmailForm,
        sortedMailStats,
        testEmailForm,
        testingEmail,
        visibleDeadLetters,
        visibleMailStats,
    } = dashboard

    function updateTestEmail(field: keyof typeof testEmailForm, value: string) {
        setTestEmailForm((current) => ({...current, [field]: value}))
    }

    return (
        // Two independent columns, so the short email history does not leave a gap beside the stat table.
        <div className="grid items-start gap-5 md:grid-cols-2">
            <div className="grid gap-5">
                <CompactPanel title="Email History">
                    <div className="grid gap-3 text-sm text-[var(--color-ink-soft)]">
                        {mailDeliveries.length === 0 ? (
                            <p>No deliveries yet.</p>
                        ) : (
                            mailDeliveries.map((delivery) => (
                                <div
                                    key={delivery.id}
                                    className="subtle-panel-divider grid gap-1 border-b pb-3 last:border-b-0 last:pb-0"
                                >
                                    <p className="font-medium text-[var(--color-ink)]">
                                        {delivery.courseDisplayName} · {delivery.alertType}
                                        {delivery.manualTest ? ' · test' : ''}
                                    </p>
                                    <p>{delivery.recipientEmail}</p>
                                    <p>{formatDateTime(delivery.sentAt)}</p>
                                </div>
                            ))
                        )}
                    </div>
                    <MiniPagination
                        currentPage={emailHistoryPage}
                        disabled={emailHistoryLoading}
                        onPageChange={handleEmailHistoryPageChange}
                        totalPages={emailHistoryTotalPages}
                    />
                </CompactPanel>
                <CompactPanel title="Test Email">
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="grid gap-1.5">
                            <span className="text-sm text-[var(--color-ink-soft)]">Recipient email</span>
                            <input
                                className="input-shell h-11"
                                name="recipient-email"
                                onChange={(event) => updateTestEmail('recipientEmail', event.target.value)}
                                placeholder={sessionEmail ?? 'Your admin email'}
                                type="email"
                                value={testEmailForm.recipientEmail}
                            />
                        </label>

                        <label className="grid gap-1.5">
                            <span className="text-sm text-[var(--color-ink-soft)]">Alert type</span>
                            <select
                                className="input-shell h-11"
                                name="alert-type"
                                onChange={(event) => updateTestEmail('alertType', event.target.value)}
                                value={testEmailForm.alertType}
                            >
                                {ALERT_TYPES.map((type) => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </label>

                        <label className="grid gap-1.5">
                            <span className="text-sm text-[var(--color-ink-soft)]">Section ID</span>
                            <input
                                className="input-shell h-11"
                                name="section-id"
                                onChange={(event) => updateTestEmail('sectionId', event.target.value)}
                                value={testEmailForm.sectionId}
                            />
                        </label>

                        <label className="grid gap-1.5">
                            <span className="text-sm text-[var(--color-ink-soft)]">Course name</span>
                            <input
                                className="input-shell h-11"
                                name="course-display-name"
                                onChange={(event) => updateTestEmail('courseDisplayName', event.target.value)}
                                value={testEmailForm.courseDisplayName}
                            />
                        </label>
                    </div>

                    <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                        <label className="grid min-w-[132px] gap-1.5">
                            <span className="text-sm text-[var(--color-ink-soft)]">termCode</span>
                            <input
                                className="input-shell h-11"
                                inputMode="numeric"
                                name="term-id"
                                onChange={(event) => updateTestEmail('termCode', event.target.value)}
                                placeholder="1272"
                                value={testEmailForm.termCode}
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
            </div>
            <div className="grid gap-5">
                <CompactPanel title="Daily Stat">
                    {sortedMailStats.length === 0 ? (
                        <p className="text-sm text-[var(--color-ink-soft)]">No daily stats yet.</p>
                    ) : (
                        <div className="surface-inner overflow-hidden rounded-[18px]">
                            <table className="w-full table-fixed text-left text-xs leading-4 tabular-nums">
                                <thead>
                                    <tr className="subtle-panel-divider border-b uppercase tracking-[0.04em] text-[var(--color-ink-soft)]">
                                        <th className="w-[24%] px-2 py-2 text-center font-semibold">Date (UTC)</th>
                                        <th className="px-2 py-2 text-center font-semibold">Total</th>
                                        <th className="px-2 py-2 text-center font-semibold text-[var(--color-mmj)]">Open</th>
                                        <th className="px-2 py-2 text-center font-semibold text-[var(--color-monori)]">Waitlist</th>
                                        <th className="px-2 py-2 text-center font-semibold text-[var(--color-haruka)]">Welcome</th>
                                        <th className="px-2 py-2 text-center font-semibold text-[var(--color-airi)]">Dead</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[var(--color-ink-soft)]">
                                    {visibleMailStats.map((stat) => (
                                        <tr key={stat.id} className="subtle-panel-divider border-b last:border-b-0">
                                            <td className="px-2 py-2 text-center font-medium text-[var(--color-ink)]">{stat.statsDate}</td>
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
                    <MiniPagination
                        currentPage={mailStatsPage}
                        onPageChange={setMailStatsPage}
                        totalPages={mailStatsTotalPages}
                    />
                </CompactPanel>
                <CompactPanel title="Failed Alert Events">
                    <div className="grid gap-2 text-sm text-[var(--color-ink-soft)]">
                        {deadLetters.length === 0 ? (
                            <p>No failed alert events yet.</p>
                        ) : (
                            visibleDeadLetters.map((entry) => {
                                const summary = getDeadLetterSummary(entry)
                                return (
                                    <div
                                        key={entry.id}
                                        className="subtle-panel-divider grid gap-1 border-b pb-2 last:border-b-0 last:pb-0"
                                    >
                                        <p className="font-medium text-[var(--color-ink)]">{summary.title}</p>
                                        <p>{summary.subtitle} · {formatSnapshotTime(entry.createdAt)}</p>
                                        <p className="break-words">{summary.detail}</p>
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
            </div>
        </div>
    )
}
