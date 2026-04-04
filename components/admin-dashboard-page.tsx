'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { ProgressLink } from '@/components/navigation-progress'
import { StatusBadge } from '@/components/status-badge'
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
import {
  formatDateTime,
  getMeetingSummary,
  getSeatsSummary,
} from '@/lib/format'
import type {
  AdminUserSubscriptions,
  AlertDeadLetter,
  AlertDeliveryLog,
  MailDailyStat,
  SchedulerStatus,
  TestEmailPayload,
} from '@/lib/types'

const initialTestEmailForm: Required<TestEmailPayload> = {
  recipientEmail: '',
  alertType: 'OPEN',
  sectionId: '99999',
  courseDisplayName: 'TEST COURSE',
}

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
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testEmailForm, setTestEmailForm] =
    useState<Required<TestEmailPayload>>(initialTestEmailForm)

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
        ] =
          await Promise.all([
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
        setStatusMessage(
          message ??
            `Loaded ${nextSubscriptions.length} user record${
              nextSubscriptions.length === 1 ? '' : 's'
            }, ${nextDeliveries.length} deliveries, and ${nextDeadLetters.length} dead letters.`,
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

      if (testEmailForm.recipientEmail.trim()) {
        payload.recipientEmail = testEmailForm.recipientEmail.trim()
      }
      if (testEmailForm.alertType.trim()) {
        payload.alertType = testEmailForm.alertType.trim()
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

  return (
    <div className="grid gap-6">
      <section className="glass-card px-6 py-8 md:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow">Hidden Admin</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--color-ink)] md:text-5xl">
              Internal dashboard for subscriptions, mail logs, and manual email testing.
            </h1>
            <p className="mt-4 text-base leading-7 text-[var(--color-ink-soft)] md:text-lg">
              This route stays out of public navigation, but if an authorized admin opens
              it directly, it exposes subscription controls plus mail delivery telemetry
              from the updated backend API.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {session?.email ? <span className="pill">{session.email}</span> : null}
            <button
              className="button-soft min-w-[120px]"
              disabled={loading}
              onClick={() => void loadDashboard()}
              type="button"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <p className="mt-4 text-sm leading-7 text-[var(--color-ink-soft)]">{statusMessage}</p>
      </section>

      {!ready ? (
        <section className="glass-card px-6 py-10">
          <p className="text-sm text-[var(--color-ink-soft)]">Loading session...</p>
        </section>
      ) : !isLoggedIn ? (
        <section className="glass-card px-6 py-8">
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
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="glass-card px-5 py-5">
              <p className="eyebrow">Users</p>
              <p className="mt-3 text-4xl font-semibold text-[var(--color-ink)]">{totalUsers}</p>
            </div>
            <div className="glass-card px-5 py-5">
              <p className="eyebrow">Subscriptions</p>
              <p className="mt-3 text-4xl font-semibold text-[var(--color-ink)]">
                {totalSubscriptions}
              </p>
              <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
                {enabledSubscriptions} enabled
              </p>
            </div>
            <div className="glass-card px-5 py-5">
              <p className="eyebrow">Deliveries</p>
              <p className="mt-3 text-4xl font-semibold text-[var(--color-ink)]">
                {mailDeliveries.length}
              </p>
              <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
                {latestStat ? `${latestStat.sentTotal} sent on ${latestStat.statsDate}` : 'No daily stats yet'}
              </p>
            </div>
            <div className="glass-card px-5 py-5">
              <p className="eyebrow">Dead Letters</p>
              <p className="mt-3 text-4xl font-semibold text-[var(--color-ink)]">
                {deadLetters.length}
              </p>
              <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
                {latestStat ? `${latestStat.deadTotal} recorded on ${latestStat.statsDate}` : 'No dead-letter stats yet'}
              </p>
            </div>
            <div className="glass-card px-5 py-5">
              <p className="eyebrow">Scheduler</p>
              <p className="mt-3 text-4xl font-semibold text-[var(--color-ink)]">
                {schedulerStatus?.queueSize ?? 0}
              </p>
              <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
                {schedulerStatus
                  ? `${schedulerStatus.dueCourseCount} due · ${schedulerStatus.activeCourseCount} active`
                  : 'No scheduler snapshot yet'}
              </p>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
            <div className="glass-card px-5 py-5 md:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">Subscriptions</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                    User subscription records
                  </h2>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                {subscriptions.length === 0 ? (
                  <EmptyState
                    description="No admin subscription data is available yet, or your account does not have the required permissions."
                    title="Nothing to show"
                  />
                ) : (
                  subscriptions.map((row) => (
                    <article
                      key={row.userId}
                      className="rounded-[28px] border border-[rgba(154,238,222,0.22)] bg-white/75 px-4 py-4 shadow-[0_18px_40px_rgba(50,90,81,0.08)]"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                            {row.email}
                          </h3>
                          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                            Role {row.role} · {row.subscriptions.length} subscriptions
                          </p>
                        </div>
                        <span className="pill">{row.userId.slice(0, 8)}</span>
                      </div>

                      <div className="mt-4 grid gap-3">
                        {row.subscriptions.map((subscription) => {
                          const meetingSummary = getMeetingSummary(subscription.meetingInfo)

                          return (
                            <div
                              key={subscription.subscriptionId}
                              className="rounded-[22px] border border-[rgba(154,238,222,0.18)] bg-white/70 px-4 py-4"
                            >
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <h4 className="text-base font-semibold text-[var(--color-ink)]">
                                    {subscription.courseDisplayName}
                                  </h4>
                                  <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                                    Section {subscription.sectionId}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="pill">
                                    {subscription.enabled ? 'Enabled' : 'Disabled'}
                                  </span>
                                  <StatusBadge status={subscription.status} />
                                </div>
                              </div>

                              <div className="mt-3 space-y-2 text-sm leading-7 text-[var(--color-ink-soft)]">
                                {meetingSummary ? <p>{meetingSummary}</p> : null}
                                <p>{getSeatsSummary(subscription)}</p>
                              </div>

                              <div className="mt-4 flex flex-wrap justify-end gap-3">
                                <button
                                  className="button-secondary min-w-[120px]"
                                  disabled={
                                    togglingId === subscription.subscriptionId ||
                                    subscription.enabled
                                  }
                                  onClick={() =>
                                    handleToggle(subscription.subscriptionId, true)
                                  }
                                  type="button"
                                >
                                  {togglingId === subscription.subscriptionId &&
                                  !subscription.enabled
                                    ? 'Saving...'
                                    : 'Enable'}
                                </button>
                                <button
                                  className="button-danger min-w-[120px]"
                                  disabled={
                                    togglingId === subscription.subscriptionId ||
                                    !subscription.enabled
                                  }
                                  onClick={() =>
                                    handleToggle(subscription.subscriptionId, false)
                                  }
                                  type="button"
                                >
                                  {togglingId === subscription.subscriptionId &&
                                  subscription.enabled
                                    ? 'Saving...'
                                    : 'Disable'}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>

            <div className="grid gap-4">
              <section className="glass-card px-5 py-5 md:px-6">
                <p className="eyebrow">Test Email</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                  Queue a manual email
                </h2>

                <div className="mt-5 grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-[var(--color-ink-soft)]">
                      Recipient email
                    </span>
                    <input
                      className="input-shell"
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

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-[var(--color-ink-soft)]">
                      Alert type
                    </span>
                    <select
                      className="input-shell"
                      onChange={(event) =>
                        setTestEmailForm((current) => ({
                          ...current,
                          alertType: event.target.value,
                        }))
                      }
                      value={testEmailForm.alertType}
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="WAITLIST">WAITLIST</option>
                      <option value="WELCOME">WELCOME</option>
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-[var(--color-ink-soft)]">
                      Section ID
                    </span>
                    <input
                      className="input-shell"
                      onChange={(event) =>
                        setTestEmailForm((current) => ({
                          ...current,
                          sectionId: event.target.value,
                        }))
                      }
                      value={testEmailForm.sectionId}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-[var(--color-ink-soft)]">
                      Course display name
                    </span>
                    <input
                      className="input-shell"
                      onChange={(event) =>
                        setTestEmailForm((current) => ({
                          ...current,
                          courseDisplayName: event.target.value,
                        }))
                      }
                      value={testEmailForm.courseDisplayName}
                    />
                  </label>

                  <div className="flex justify-end">
                    <button
                      className="button-primary min-w-[160px]"
                      disabled={testingEmail}
                      onClick={() => void handleSendTestEmail()}
                      type="button"
                    >
                      {testingEmail ? 'Queueing...' : 'Send Test Email'}
                    </button>
                  </div>
                </div>
              </section>

              <section className="glass-card px-5 py-5 md:px-6">
                <p className="eyebrow">Mail Stats</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                  Daily persisted statistics
                </h2>

                <div className="mt-5 grid gap-3">
                  {mailStats.length === 0 ? (
                    <EmptyState
                      description="No persisted daily mail stats are available yet."
                      title="No stats"
                    />
                  ) : (
                    [...mailStats]
                      .sort((left, right) => right.statsDate.localeCompare(left.statsDate))
                      .slice(0, 6)
                      .map((stat) => (
                        <div
                          key={stat.id}
                          className="rounded-[22px] border border-[rgba(154,238,222,0.18)] bg-white/70 px-4 py-4 text-sm text-[var(--color-ink-soft)]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold text-[var(--color-ink)]">
                              {stat.statsDate}
                            </span>
                            <span className="pill">Sent {stat.sentTotal}</span>
                          </div>
                          <p className="mt-3 leading-7">
                            OPEN {stat.sentOpen} · WAITLIST {stat.sentWaitlist} · WELCOME{' '}
                            {stat.sentWelcome} · Manual {stat.sentManualTest}
                          </p>
                          <p className="leading-7">
                            Dead total {stat.deadTotal} · OPEN {stat.deadOpen} · WAITLIST{' '}
                            {stat.deadWaitlist} · WELCOME {stat.deadWelcome}
                          </p>
                        </div>
                      ))
                  )}
                </div>
              </section>

              <section className="glass-card px-5 py-5 md:px-6">
                <p className="eyebrow">Scheduler Status</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                  Operational snapshot
                </h2>

                <div className="mt-5 grid gap-3">
                  {!schedulerStatus ? (
                    <EmptyState
                      description="No scheduler snapshot is available yet."
                      title="No scheduler data"
                    />
                  ) : (
                    <div className="rounded-[22px] border border-[rgba(154,238,222,0.18)] bg-white/70 px-4 py-4 text-sm text-[var(--color-ink-soft)]">
                      <p>
                        <span className="font-semibold text-[var(--color-ink)]">Observed:</span>{' '}
                        {formatDateTime(schedulerStatus.observedAt)}
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--color-ink)]">Heartbeat:</span>{' '}
                        {schedulerStatus.heartbeatIntervalMs} ms
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--color-ink)]">Fetch interval:</span>{' '}
                        {schedulerStatus.fetchIntervalMs} ms
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--color-ink)]">Queue:</span>{' '}
                        {schedulerStatus.queueSize} queued · {schedulerStatus.dueCourseCount} due
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--color-ink)]">Last fetched course:</span>{' '}
                        {schedulerStatus.lastFetchedCourseId ?? 'N/A'}
                      </p>
                      {schedulerStatus.lastFetchFinishedAt ? (
                        <p>
                          <span className="font-semibold text-[var(--color-ink)]">Last fetch finished:</span>{' '}
                          {formatDateTime(schedulerStatus.lastFetchFinishedAt)}
                        </p>
                      ) : null}
                      {schedulerStatus.queuedCourseIds.length > 0 ? (
                        <p className="leading-7">
                          <span className="font-semibold text-[var(--color-ink)]">Queued course IDs:</span>{' '}
                          {schedulerStatus.queuedCourseIds.join(', ')}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <section className="glass-card px-5 py-5 md:px-6">
              <p className="eyebrow">Mail Deliveries</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                Recent successful deliveries
              </h2>

              <div className="mt-5 grid gap-3">
                {mailDeliveries.length === 0 ? (
                  <EmptyState
                    description="No successful deliveries have been recorded yet."
                    title="No deliveries"
                  />
                ) : (
                  mailDeliveries.slice(0, 8).map((delivery) => (
                    <article
                      key={delivery.id}
                      className="rounded-[22px] border border-[rgba(154,238,222,0.18)] bg-white/70 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-[var(--color-ink)]">
                            {delivery.courseDisplayName}
                          </h3>
                          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                            {delivery.recipientEmail}
                          </p>
                        </div>
                        <StatusBadge status={delivery.alertType} />
                      </div>
                      <div className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">
                        <p>Section {delivery.sectionId}</p>
                        <p>{formatDateTime(delivery.sentAt)}</p>
                        <p>{delivery.manualTest ? 'Manual test email' : delivery.sourceQueue}</p>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="glass-card px-5 py-5 md:px-6">
              <p className="eyebrow">Dead Letters</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                Failed alert events
              </h2>

              <div className="mt-5 grid gap-3">
                {deadLetters.length === 0 ? (
                  <EmptyState
                    description="No dead-letter events have been recorded yet."
                    title="No dead letters"
                  />
                ) : (
                  deadLetters.slice(0, 8).map((entry, index) => {
                    const summary = getDeadLetterSummary(entry)

                    return (
                      <article
                        key={entry.id ?? `${summary.title}-${index}`}
                        className="rounded-[22px] border border-[rgba(154,238,222,0.18)] bg-white/70 px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold text-[var(--color-ink)]">
                              {summary.title}
                            </h3>
                            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                              {summary.subtitle}
                            </p>
                          </div>
                          {typeof entry.alertType === 'string' ? (
                            <StatusBadge status={entry.alertType} />
                          ) : null}
                        </div>
                        <div className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">
                          <p>{summary.detail}</p>
                          {typeof entry.sourceQueue === 'string' ? (
                            <p>{entry.sourceQueue}</p>
                          ) : null}
                        </div>
                      </article>
                    )
                  })
                )}
              </div>
            </section>
          </section>
        </>
      )}
    </div>
  )
}
