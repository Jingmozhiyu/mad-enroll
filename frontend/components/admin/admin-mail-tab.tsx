'use client'

import {useEffect, useState} from 'react'
import {CompactPanel, MiniPagination} from '@/components/admin/admin-sections'
import {formatSnapshotTime, getDeadLetterSummary} from '@/components/admin/admin-helpers'
import type {AdminDashboard} from '@/components/admin/use-admin-dashboard'
import {formatDateTime} from '@/lib/course/format'

const ALERT_TYPES = ['OPEN', 'WAITLIST', 'WELCOME'] as const
// One ruled row of the test email form; the line turns teal while its field has focus.
const TEST_EMAIL_ROW =
    'subtle-panel-divider grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3 border-b py-2.5 transition focus-within:border-[var(--color-miku)]'

/** Email history, daily counters, failed alert events and the manual test email. */
export function AdminMailTab({dashboard}: {dashboard: AdminDashboard}) {
    const {
        deadLetters,
        deadLettersPage,
        deadLettersTotalPages,
        emailHistoryLoading,
        emailHistoryPage,
        emailHistoryRecipient,
        emailHistoryTotalPages,
        handleEmailHistoryPageChange,
        handleSendTestEmail,
        mailDeliveries,
        mailStatsPage,
        mailStatsTotalPages,
        searchEmailHistory,
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

    const [recipientQuery, setRecipientQuery] = useState(emailHistoryRecipient)

    // Search once typing pauses, so each keystroke does not hit the backend.
    useEffect(() => {
        const timer = window.setTimeout(() => searchEmailHistory(recipientQuery), 300)
        return () => window.clearTimeout(timer)
    }, [recipientQuery, searchEmailHistory])

    function updateTestEmail(field: keyof typeof testEmailForm, value: string) {
        setTestEmailForm((current) => ({...current, [field]: value}))
    }

    return (
        // Two rows of paired panels; panels in a row stretch to the same height.
        <div className="grid gap-5 md:grid-cols-2">
                <CompactPanel
                    action={
                        <input
                            aria-label="Search email history by recipient"
                            className="input-shell h-9 w-full max-w-[14rem] text-sm"
                            name="email-history-search"
                            onChange={(event) => setRecipientQuery(event.target.value)}
                            placeholder="Search recipient"
                            type="search"
                            value={recipientQuery}
                        />
                    }
                    title="Email History"
                >
                    <div className="grid gap-2 mt-3 text-sm text-[var(--color-ink-soft)]">
                        {mailDeliveries.length === 0 ? (
                            <p>{emailHistoryRecipient ? `No deliveries to addresses containing "${emailHistoryRecipient}".` : 'No deliveries yet.'}</p>
                        ) : (
                            mailDeliveries.map((delivery) => (
                                <div
                                    key={delivery.id}
                                    className="subtle-panel-divider grid gap-0.5 border-b pb-2 last:border-b-0 last:pb-0"
                                >
                                    <p className="font-medium text-[var(--color-ink)]">
                                        {delivery.courseDisplayName} · {delivery.alertType}
                                        {delivery.manualTest ? ' · test' : ''}
                                    </p>
                                    <p className="flex justify-between gap-3">
                                        <span className="min-w-0 truncate">{delivery.recipientEmail}</span>
                                        <span className="shrink-0 tabular-nums">{formatDateTime(delivery.sentAt)}</span>
                                    </p>
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
                <CompactPanel title="Daily Stat">
                    {sortedMailStats.length === 0 ? (
                        <p className="text-sm text-[var(--color-ink-soft)]">No daily stats yet.</p>
                    ) : (
                        // Plain ruled rows; the taller rows bring the table close to the email history beside it.
                        <table className="w-full table-fixed text-left text-xs leading-4 tabular-nums">
                            <thead>
                                <tr className="subtle-panel-divider border-b uppercase tracking-[0.04em] text-[var(--color-ink-soft)]">
                                    <th className="w-[24%] px-2 py-[11px] text-center font-semibold">Date (UTC)</th>
                                    <th className="px-2 py-[11px] text-center font-semibold">Total</th>
                                    <th className="px-2 py-[11px] text-center font-semibold text-[var(--color-mmj)]">Open</th>
                                    <th className="px-2 py-[11px] text-center font-semibold text-[var(--color-monori)]">Waitlist</th>
                                    <th className="px-2 py-[11px] text-center font-semibold text-[var(--color-haruka)]">Welcome</th>
                                    <th className="px-2 py-[11px] text-center font-semibold text-[var(--color-airi)]">Dead</th>
                                </tr>
                            </thead>
                            <tbody className="text-[var(--color-ink-soft)]">
                                {visibleMailStats.map((stat) => (
                                    <tr key={stat.id} className="subtle-panel-divider border-b last:border-b-0">
                                        <td className="px-2 py-[11px] text-center font-medium text-[var(--color-ink)]">{stat.statsDate}</td>
                                        <td className="px-2 py-[11px] text-center">{stat.sentTotal}</td>
                                        <td className="px-2 py-[11px] text-center">{stat.sentOpen}</td>
                                        <td className="px-2 py-[11px] text-center">{stat.sentWaitlist}</td>
                                        <td className="px-2 py-[11px] text-center">{stat.sentWelcome}</td>
                                        <td className="px-2 py-[11px] text-center">{stat.deadTotal}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    <MiniPagination
                        currentPage={mailStatsPage}
                        onPageChange={setMailStatsPage}
                        totalPages={mailStatsTotalPages}
                    />
                </CompactPanel>
                <CompactPanel title="Test Email">
                    <div className="grid">
                        <label className={TEST_EMAIL_ROW}>
                            <span className="text-sm text-[var(--color-ink-soft)]">Recipient</span>
                            <input
                                className="field-plain text-sm"
                                name="recipient-email"
                                onChange={(event) => updateTestEmail('recipientEmail', event.target.value)}
                                placeholder={sessionEmail ?? 'Your admin email'}
                                type="email"
                                value={testEmailForm.recipientEmail}
                            />
                        </label>
                        <label className={TEST_EMAIL_ROW}>
                            <span className="text-sm text-[var(--color-ink-soft)]">Alert type</span>
                            <select
                                className="field-plain text-sm"
                                name="alert-type"
                                onChange={(event) => updateTestEmail('alertType', event.target.value)}
                                value={testEmailForm.alertType}
                            >
                                {ALERT_TYPES.map((type) => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </label>
                        <label className={TEST_EMAIL_ROW}>
                            <span className="text-sm text-[var(--color-ink-soft)]">Section ID</span>
                            <input
                                className="field-plain text-sm"
                                name="section-id"
                                onChange={(event) => updateTestEmail('sectionId', event.target.value)}
                                value={testEmailForm.sectionId}
                            />
                        </label>
                        <label className={TEST_EMAIL_ROW}>
                            <span className="text-sm text-[var(--color-ink-soft)]">Course name</span>
                            <input
                                className="field-plain text-sm"
                                name="course-display-name"
                                onChange={(event) => updateTestEmail('courseDisplayName', event.target.value)}
                                value={testEmailForm.courseDisplayName}
                            />
                        </label>
                        <label className={TEST_EMAIL_ROW}>
                            <span className="text-sm text-[var(--color-ink-soft)]">termCode</span>
                            <input
                                className="field-plain text-sm"
                                inputMode="numeric"
                                name="term-id"
                                onChange={(event) => updateTestEmail('termCode', event.target.value)}
                                placeholder="1272"
                                value={testEmailForm.termCode}
                            />
                        </label>
                    </div>
                    <div className="mt-auto flex justify-end pt-4">
                        <button
                            className="bg-transparent p-0 text-sm text-[var(--color-ink-soft)] underline underline-offset-4 transition hover:text-[var(--color-ink)] disabled:cursor-default disabled:opacity-60"
                            disabled={testingEmail}
                            onClick={() => void handleSendTestEmail()}
                            type="button"
                        >
                            {testingEmail ? 'Sending...' : 'Send test email'}
                        </button>
                    </div>
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
    )
}
