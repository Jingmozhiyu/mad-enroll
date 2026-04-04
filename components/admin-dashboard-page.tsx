'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { ProgressLink } from '@/components/navigation-progress'
import { useAuth } from '@/components/providers'
import {
  fetchAdminDeadLetters,
  fetchAdminMailDeliveries,
  fetchAdminMailStats,
  fetchAdminSchedulerStatus,
  fetchAdminSubscriptions,
  getErrorMessage,
  isUnauthorizedError,
  patchAdminSubscription,
  sendAdminTestEmail,
} from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type {
  AdminSubscription,
  AdminUserSubscriptions,
  AlertDeadLetter,
  AlertDeliveryLog,
  MailDailyStat,
  SchedulerStatus,
  TestEmailPayload,
} from '@/lib/types'

const initialTestEmailForm: Required<TestEmailPayload> = {
  recipientEmail: '',
  alertType: '',
  sectionId: '99999',
  courseDisplayName: 'TEST COURSE',
}

type AdminSubscriptionState = 'open' | 'waitlist' | 'closed' | 'disabled'

function getDeadLetterSummary(entry: AlertDeadLetter) {
  return {
    title:
      (typeof entry.courseDisplayName === 'string' && entry.courseDisplayName) ||
      (typeof entry.alertType === 'string' && entry.alertType) ||
      'Dead letter event',
    subtitle:
      (typeof entry.recipientEmail === 'string' && entry.recipientEmail) ||
      (typeof entry.sectionId === 'string' && `Section ${entry.sectionId}`) ||
      'No recipient info',
    detail:
      (typeof entry.deadLetterReason === 'string' && entry.deadLetterReason) ||
      (typeof entry.failedAt === 'string' && formatDateTime(entry.failedAt)) ||
      'Details unavailable',
  }
}

function getSubscriptionState(subscription: AdminSubscription): AdminSubscriptionState {
  if (!subscription.enabled) {
    return 'disabled'
  }

  const normalizedStatus = subscription.status.trim().toUpperCase()

  if (normalizedStatus === 'OPEN') {
    return 'open'
  }

  if (normalizedStatus === 'WAITLIST') {
    return 'waitlist'
  }

  return 'closed'
}

function getStatusTextClass(state: AdminSubscriptionState) {
  if (state === 'open') {
    return 'text-[var(--color-mmj)]'
  }

  if (state === 'waitlist') {
    return 'text-[var(--color-monori)]'
  }

  if (state === 'closed') {
    return 'text-[var(--color-airi)]'
  }

  return 'text-[var(--color-haruka)]'
}

function formatSnapshotTime(value?: string) {
  if (!value) {
    return 'N/A'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  }).format(date)
}

function sortSubscriptionsByState(subscriptions: AdminSubscription[]) {
  const order: Record<AdminSubscriptionState, number> = {
    open: 0,
    waitlist: 1,
    closed: 2,
    disabled: 3,
  }

  return [...subscriptions].sort((left, right) => {
    const leftState = getSubscriptionState(left)
    const rightState = getSubscriptionState(right)

    if (leftState !== rightState) {
      return order[leftState] - order[rightState]
    }

    if (left.courseDisplayName !== right.courseDisplayName) {
      return left.courseDisplayName.localeCompare(right.courseDisplayName)
    }

    return String(left.sectionId).localeCompare(String(right.sectionId))
  })
}

function getUserSubscriptionCounts(subscriptions: AdminSubscription[]) {
  return subscriptions.reduce(
    (counts, subscription) => {
      const state = getSubscriptionState(subscription)
      counts[state] += 1
      return counts
    },
    { open: 0, waitlist: 0, closed: 0, disabled: 0 } as Record<AdminSubscriptionState, number>,
  )
}

function SummaryMetric({
  label,
  value,
  detail,
}: {
  label: string
  value: number
  detail?: string
}) {
  return (
    <div className="rounded-2xl border border-[rgba(23,49,60,0.1)] bg-white/85 px-4 py-4">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
        {label}
      </p>
      <p className="mt-2 text-4xl font-semibold text-[var(--color-ink)]">{value}</p>
      {detail ? <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{detail}</p> : null}
    </div>
  )
}

function CompactPanel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[rgba(23,49,60,0.1)] bg-white/85 px-4 py-4">
      <h2 className="text-base font-semibold text-[var(--color-ink)]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function AdminDashboardPage() {
  const { ready, isLoggedIn, session, logout } = useAuth()
  const [subscriptions, setSubscriptions] = useState<AdminUserSubscriptions[]>([])
  const [deadLetters, setDeadLetters] = useState<AlertDeadLetter[]>([])
  const [mailDeliveries, setMailDeliveries] = useState<AlertDeliveryLog[]>([])
  const [mailStats, setMailStats] = useState<MailDailyStat[]>([])
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null)
  const [statusMessage, setStatusMessage] = useState(
    'Login on the monitor page to access admin data.',
  )
  const [loading, setLoading] = useState(false)
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [showQueuedCourseIds, setShowQueuedCourseIds] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testEmailForm, setTestEmailForm] =
    useState<Required<TestEmailPayload>>(initialTestEmailForm)

  const loadSnapshot = useCallback(
    async (message?: string) => {
      if (!isLoggedIn) {
        setSchedulerStatus(null)
        return
      }

      try {
        setSnapshotLoading(true)
        const nextSchedulerStatus = await fetchAdminSchedulerStatus()
        setSchedulerStatus(nextSchedulerStatus)
        setShowQueuedCourseIds(false)
        if (message) {
          setStatusMessage(message)
        }
      } catch (error) {
        if (isUnauthorizedError(error)) {
          setStatusMessage('Admin access is required for this route.')
        } else {
          setStatusMessage(getErrorMessage(error, 'Failed to refresh snapshot.'))
        }
      } finally {
        setSnapshotLoading(false)
      }
    },
    [isLoggedIn],
  )

  const loadDashboard = useCallback(
    async (message?: string) => {
      if (!isLoggedIn) {
        setSubscriptions([])
        setDeadLetters([])
        setMailDeliveries([])
        setMailStats([])
        setSchedulerStatus(null)
        setStatusMessage('Login on the monitor page to access admin data.')
        return
      }

      try {
        setLoading(true)
        const [
          nextSubscriptions,
          nextDeadLetters,
          nextDeliveries,
          nextMailStats,
          nextSchedulerStatus,
        ] = await Promise.all([
          fetchAdminSubscriptions(),
          fetchAdminDeadLetters(),
          fetchAdminMailDeliveries(),
          fetchAdminMailStats(),
          fetchAdminSchedulerStatus(),
        ])

        setSubscriptions(nextSubscriptions)
        setDeadLetters(nextDeadLetters)
        setMailDeliveries(nextDeliveries)
        setMailStats(nextMailStats)
        setSchedulerStatus(nextSchedulerStatus)
        setShowQueuedCourseIds(false)
        setStatusMessage(
          message ??
            `Loaded ${nextSubscriptions.length} users, ${nextDeliveries.length} deliveries, and ${nextDeadLetters.length} dead letters.`,
        )
      } catch (error) {
        setSubscriptions([])
        setDeadLetters([])
        setMailDeliveries([])
        setMailStats([])
        setSchedulerStatus(null)
        if (isUnauthorizedError(error)) {
          setStatusMessage('Admin access is required for this route.')
        } else {
          setStatusMessage(getErrorMessage(error, 'Failed to load admin dashboard.'))
        }
      } finally {
        setLoading(false)
      }
    },
    [isLoggedIn],
  )

  useEffect(() => {
    if (!ready) {
      return
    }

    void loadDashboard()
  }, [loadDashboard, ready])

  async function handleToggle(subscriptionId: string, enabled: boolean) {
    try {
      setTogglingId(subscriptionId)
      await patchAdminSubscription(subscriptionId, enabled)
      await loadDashboard(`Subscription ${enabled ? 'enabled' : 'disabled'} successfully.`)
    } catch (error) {
      if (isUnauthorizedError(error)) {
        void logout()
      }
      setStatusMessage(getErrorMessage(error, 'Failed to update subscription.'))
    } finally {
      setTogglingId(null)
    }
  }

  async function handleSendTestEmail() {
    try {
      setTestingEmail(true)
      const payload: TestEmailPayload = {}
      const normalizedAlertType = testEmailForm.alertType.trim().toUpperCase()

      if (testEmailForm.recipientEmail.trim()) {
        payload.recipientEmail = testEmailForm.recipientEmail.trim()
      }
      if (
        normalizedAlertType &&
        !['OPEN', 'WAITLIST', 'WELCOME'].includes(normalizedAlertType)
      ) {
        setStatusMessage('Alert type must be OPEN, WAITLIST, or WELCOME.')
        return
      }
      if (normalizedAlertType) {
        payload.alertType = normalizedAlertType
      }
      if (testEmailForm.sectionId.trim()) {
        payload.sectionId = testEmailForm.sectionId.trim()
      }
      if (testEmailForm.courseDisplayName.trim()) {
        payload.courseDisplayName = testEmailForm.courseDisplayName.trim()
      }

      await sendAdminTestEmail(payload)
      setStatusMessage('Manual test email has been queued successfully.')
      await loadDashboard()
    } catch (error) {
      setStatusMessage(getErrorMessage(error, 'Failed to enqueue test email.'))
    } finally {
      setTestingEmail(false)
    }
  }

  const totalUsers = subscriptions.length
  const totalSubscriptions = subscriptions.reduce(
    (count, row) => count + row.subscriptions.length,
    0,
  )
  const enabledSubscriptions = subscriptions.reduce(
    (count, row) =>
      count + row.subscriptions.filter((subscription) => subscription.enabled).length,
    0,
  )
  const latestStat = useMemo(
    () =>
      [...mailStats].sort((left, right) => right.statsDate.localeCompare(left.statsDate))[0] ??
      null,
    [mailStats],
  )
  const sortedUsers = useMemo(
    () => [...subscriptions].sort((left, right) => left.email.localeCompare(right.email)),
    [subscriptions],
  )
  const sortedMailStats = useMemo(
    () => [...mailStats].sort((left, right) => right.statsDate.localeCompare(left.statsDate)),
    [mailStats],
  )

  return (
    <div className="grid gap-5">
      {!ready ? (
        <section className="rounded-2xl border border-[rgba(23,49,60,0.1)] bg-white/85 px-5 py-8">
          <p className="text-sm text-[var(--color-ink-soft)]">Loading session...</p>
        </section>
      ) : !isLoggedIn ? (
        <section className="rounded-2xl border border-[rgba(23,49,60,0.1)] bg-white/85 px-5 py-8">
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
          <div className="flex flex-col gap-2 rounded-2xl border border-[rgba(23,49,60,0.1)] bg-white/85 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-[var(--color-ink-soft)]">{statusMessage}</p>
            <div className="flex items-center gap-4">
              <p className="text-sm text-[var(--color-ink-soft)]">{session?.email}</p>
              <button
                className="button-secondary min-w-[108px]"
                disabled={loading}
                onClick={() => void loadDashboard('Dashboard refreshed.')}
                type="button"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryMetric label="Users" value={totalUsers} />
            <SummaryMetric
              label="Subscriptions"
              value={totalSubscriptions}
              detail={`${enabledSubscriptions} enabled`}
            />
            <SummaryMetric
              label="Deliveries"
              value={mailDeliveries.length}
              detail={latestStat ? `Sent ${latestStat.sentTotal} on ${latestStat.statsDate}` : 'No daily stats yet'}
            />
            <SummaryMetric
              label="Dead Letters"
              value={deadLetters.length}
              detail={latestStat ? `Dead ${latestStat.deadTotal} on ${latestStat.statsDate}` : 'No dead-letter stats yet'}
            />
          </section>

          <section className="rounded-2xl border border-[rgba(23,49,60,0.1)] bg-white/85 px-4 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-[var(--color-ink)]">Snapshot</h2>
                {!schedulerStatus ? (
                  <p className="mt-2 text-sm text-[var(--color-ink-soft)]">No scheduler snapshot yet.</p>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--color-ink-soft)]">
                    <span>Observed ({formatSnapshotTime(schedulerStatus.observedAt)})</span>
                    <span>H {schedulerStatus.heartbeatIntervalMs} ms</span>
                    <span>F {schedulerStatus.fetchIntervalMs} ms</span>
                    <span>Active {schedulerStatus.activeCourseCount}</span>
                    <span className="relative">
                      <button
                        className="bg-transparent p-0 text-sm text-[var(--color-ink-soft)] underline underline-offset-4 transition hover:text-[var(--color-ink)]"
                        onClick={() => setShowQueuedCourseIds((current) => !current)}
                        type="button"
                      >
                        Queue {schedulerStatus.queueSize}
                      </button>
                      {showQueuedCourseIds && schedulerStatus.queuedCourseIds.length > 0 ? (
                        <div className="absolute left-0 top-[calc(100%+0.4rem)] z-10 min-w-[280px] max-w-[min(75vw,36rem)] rounded-xl border border-[rgba(23,49,60,0.12)] bg-white px-3 py-2 text-xs leading-6 text-[var(--color-ink)] shadow-[0_12px_32px_rgba(23,49,60,0.12)]">
                          {schedulerStatus.queuedCourseIds.join(', ')}
                        </div>
                      ) : null}
                    </span>
                    <span>Due {schedulerStatus.dueCourseCount}</span>
                    <span>
                      LFF {schedulerStatus.lastFetchedCourseId ?? 'N/A'} (
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
            <CompactPanel title="Test Email">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm text-[var(--color-ink-soft)]">Recipient email</span>
                  <input
                    className="input-shell h-11"
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

              <div className="mt-3 flex justify-end">
                <button
                  className="button-primary min-w-[144px]"
                  disabled={testingEmail}
                  onClick={() => void handleSendTestEmail()}
                  type="button"
                >
                  {testingEmail ? 'Queueing...' : 'Queue Email'}
                </button>
              </div>
            </CompactPanel>

            <CompactPanel title="Queued Email">
              <div className="grid gap-2 text-sm text-[var(--color-ink-soft)]">
                {mailDeliveries.length === 0 ? (
                  <p>No deliveries yet.</p>
                ) : (
                  mailDeliveries.slice(0, 5).map((delivery) => (
                    <div
                      key={delivery.id}
                      className="grid gap-1 border-b border-[rgba(23,49,60,0.08)] pb-2 last:border-b-0 last:pb-0"
                    >
                      <p className="font-medium text-[var(--color-ink)]">
                        {delivery.courseDisplayName} · Section {delivery.sectionId}
                      </p>
                      <p>{delivery.recipientEmail}</p>
                      <p>{formatDateTime(delivery.sentAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </CompactPanel>

            <CompactPanel title="Daily Stat">
              <div className="grid gap-2 text-sm text-[var(--color-ink-soft)]">
                {sortedMailStats.length === 0 ? (
                  <p>No daily stats yet.</p>
                ) : (
                  sortedMailStats.slice(0, 5).map((stat) => (
                    <div
                      key={stat.id}
                      className="grid gap-1 border-b border-[rgba(23,49,60,0.08)] pb-2 last:border-b-0 last:pb-0"
                    >
                      <p className="font-medium text-[var(--color-ink)]">{stat.statsDate}</p>
                      <p>Sent {stat.sentTotal}</p>
                      <p>Dead {stat.deadTotal}</p>
                    </div>
                  ))
                )}
              </div>
            </CompactPanel>

            <CompactPanel title="Failed Alert Events">
              <div className="grid gap-2 text-sm text-[var(--color-ink-soft)]">
                {deadLetters.length === 0 ? (
                  <p>No failed alert events yet.</p>
                ) : (
                  deadLetters.slice(0, 5).map((entry, index) => {
                    const summary = getDeadLetterSummary(entry)

                    return (
                      <div
                        key={entry.id ?? `${summary.title}-${index}`}
                        className="grid gap-1 border-b border-[rgba(23,49,60,0.08)] pb-2 last:border-b-0 last:pb-0"
                      >
                        <p className="font-medium text-[var(--color-ink)]">{summary.title}</p>
                        <p>{summary.subtitle}</p>
                        <p>{summary.detail}</p>
                      </div>
                    )
                  })
                )}
              </div>
            </CompactPanel>
          </section>

          <section className="rounded-2xl border border-[rgba(23,49,60,0.1)] bg-white/85 px-4 py-4">
            <div className="border-b border-[rgba(23,49,60,0.08)] pb-3">
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
              <div className="divide-y divide-[rgba(23,49,60,0.08)]">
                {sortedUsers.map((row) => {
                  const counts = getUserSubscriptionCounts(row.subscriptions)
                  const sortedSubscriptions = sortSubscriptionsByState(row.subscriptions)
                  const activeCount = counts.open + counts.waitlist + counts.closed

                  return (
                    <details key={row.userId} className="group py-3">
                      <summary className="grid cursor-pointer gap-2 text-sm text-[var(--color-ink-soft)] marker:hidden md:grid-cols-[minmax(240px,1.3fr)_minmax(240px,1fr)] md:items-center md:justify-between">
                        <span className="font-medium text-[var(--color-ink)]">{row.email}</span>
                        <span className="flex flex-wrap gap-x-3 gap-y-1">
                          <span className="underline underline-offset-4">
                            {activeCount}/{row.subscriptions.length} subscribed course
                          </span>
                          <span className="text-[var(--color-mmj)]">open {counts.open}</span>
                          <span className="text-[var(--color-monori)]">waitlist {counts.waitlist}</span>
                          <span className="text-[var(--color-airi)]">closed {counts.closed}</span>
                          <span className="text-[var(--color-haruka)]">disabled {counts.disabled}</span>
                        </span>
                      </summary>

                      <div className="mt-3 border-t border-[rgba(23,49,60,0.08)] pt-3">
                        <div className="grid gap-2">
                          {sortedSubscriptions.map((subscription) => {
                            const state = getSubscriptionState(subscription)
                            const isSaving = togglingId === subscription.subscriptionId

                            return (
                              <div
                                key={subscription.subscriptionId}
                                className="grid gap-2 text-sm text-[var(--color-ink-soft)] md:grid-cols-[minmax(220px,1.5fr)_120px_120px_auto] md:items-center"
                              >
                                <span className="text-[var(--color-ink)]">
                                  {subscription.courseDisplayName}
                                </span>
                                <span>Section {subscription.sectionId}</span>
                                <span className={getStatusTextClass(state)}>{state}</span>
                                <div className="md:text-right">
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
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </details>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
