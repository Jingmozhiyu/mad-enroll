'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
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
import { formatDateOnly } from '@/lib/format'
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
  recipientEmail: 'ygong68@wisc.edu',
  alertType: 'OPEN',
  sectionId: '31380',
  courseDisplayName: 'COMP SCI 640',
  termId: '1272',
}

const DISPLAY_TIME_ZONE = 'America/Chicago'

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
      (typeof entry.failedAt === 'string' && formatDateOnly(entry.failedAt)) ||
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

  if (normalizedStatus === 'WAITLIST' || normalizedStatus === 'WAITLISTED') {
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

  const normalizedValue = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`
  const date = new Date(normalizedValue)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date)
}

function formatCount(value?: number) {
  return typeof value === 'number' ? value : '-'
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
    <div className="surface-panel-strong rounded-2xl px-4 py-4">
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
  className = '',
  children,
}: {
  title: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={['surface-panel-strong flex h-full flex-col rounded-2xl px-4 py-4', className].join(' ')}
    >
      <h2 className="text-base font-semibold text-[var(--color-ink)]">{title}</h2>
      <div className="mt-4 flex flex-1 flex-col">{children}</div>
    </section>
  )
}

function MiniPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) {
    return null
  }

  const visiblePages = (() => {
    if (totalPages <= 4) {
      return Array.from({ length: totalPages }, (_, index) => index + 1)
    }

    if (currentPage <= 3) {
      return [1, 2, 3, totalPages]
    }

    if (currentPage >= totalPages - 2) {
      return [1, totalPages - 2, totalPages - 1, totalPages]
    }

    return [1, currentPage, totalPages]
  })()

  return (
    <div className="mt-auto flex flex-wrap items-center gap-3 pt-3 text-sm text-[var(--color-ink-soft)]">
      <button
        className="bg-transparent p-0 transition hover:text-[var(--color-ink)] disabled:opacity-40"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        ←
      </button>
      <div className="flex flex-wrap items-center gap-2">
        {visiblePages.map((page, index) => {
          const previousPage = visiblePages[index - 1]
          const showEllipsis = previousPage !== undefined && page - previousPage > 1

          return (
            <div key={page} className="flex items-center gap-2">
              {showEllipsis ? <span aria-hidden="true">...</span> : null}
              <button
                className={[
                  'bg-transparent p-0 transition hover:text-[var(--color-ink)]',
                  page === currentPage
                    ? 'font-semibold text-[var(--color-ink)] underline underline-offset-4'
                    : '',
                ].join(' ')}
                onClick={() => onPageChange(page)}
                type="button"
              >
                {page}
              </button>
            </div>
          )
        })}
      </div>
      <button
        className="bg-transparent p-0 transition hover:text-[var(--color-ink)] disabled:opacity-40"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        →
      </button>
      <label className="flex items-center gap-2">
        <span>Jump</span>
        <input
          aria-label="Jump to page"
          className="input-shell input-shell-compact h-8 rounded-[8px] px-2 py-0"
          inputMode="numeric"
          max={totalPages}
          min={1}
          name="jump-page"
          onKeyDown={(event) => {
            if (event.key !== 'Enter') {
              return
            }

            const nextPage = Number((event.currentTarget as HTMLInputElement).value)
            if (Number.isInteger(nextPage) && nextPage >= 1 && nextPage <= totalPages) {
              onPageChange(nextPage)
              ;(event.currentTarget as HTMLInputElement).value = ''
            }
          }}
          placeholder={`${currentPage}`}
          type="text"
        />
      </label>
    </div>
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
  const [emailHistoryPage, setEmailHistoryPage] = useState(1)
  const [mailStatsPage, setMailStatsPage] = useState(1)
  const [deadLettersPage, setDeadLettersPage] = useState(1)
  const [usersPage, setUsersPage] = useState(1)
  const [expandedUserIds, setExpandedUserIds] = useState<string[]>([])
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
    async (
      message?: string,
      options?: {
        preservePagination?: boolean
      },
    ) => {
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
          nextSubscriptionsResult,
          nextDeadLettersResult,
          nextDeliveriesResult,
          nextMailStatsResult,
          nextSchedulerStatusResult,
        ] = await Promise.allSettled([
          fetchAdminSubscriptions(),
          fetchAdminDeadLetters(),
          fetchAdminMailDeliveries(),
          fetchAdminMailStats(),
          fetchAdminSchedulerStatus(),
        ])

        const failedSections = [
          nextSubscriptionsResult.status === 'rejected' ? 'users' : null,
          nextDeadLettersResult.status === 'rejected' ? 'dead letters' : null,
          nextDeliveriesResult.status === 'rejected' ? 'deliveries' : null,
          nextMailStatsResult.status === 'rejected' ? 'daily stats' : null,
          nextSchedulerStatusResult.status === 'rejected' ? 'snapshot' : null,
        ].filter((value): value is string => Boolean(value))
        const unauthorized =
          nextSubscriptionsResult.status === 'rejected' &&
          isUnauthorizedError(nextSubscriptionsResult.reason)

        setSubscriptions((current) =>
          nextSubscriptionsResult.status === 'fulfilled' ? nextSubscriptionsResult.value : current,
        )
        setDeadLetters((current) =>
          nextDeadLettersResult.status === 'fulfilled' ? nextDeadLettersResult.value : current,
        )
        setMailDeliveries((current) =>
          nextDeliveriesResult.status === 'fulfilled' ? nextDeliveriesResult.value : current,
        )
        setMailStats((current) =>
          nextMailStatsResult.status === 'fulfilled' ? nextMailStatsResult.value : current,
        )
        setSchedulerStatus((current) =>
          nextSchedulerStatusResult.status === 'fulfilled'
            ? nextSchedulerStatusResult.value
            : current,
        )
        setShowQueuedCourseIds(false)
        if (!options?.preservePagination) {
          setEmailHistoryPage(1)
          setMailStatsPage(1)
          setDeadLettersPage(1)
          setUsersPage(1)
          setExpandedUserIds([])
        }

        if (unauthorized) {
          setStatusMessage('Admin access is required for this route.')
        } else if (failedSections.length > 0) {
          setStatusMessage(`Loaded partial admin data. Failed to refresh ${failedSections.join(', ')}.`)
        } else {
          const nextSubscriptions =
            nextSubscriptionsResult.status === 'fulfilled' ? nextSubscriptionsResult.value : []
          const nextDeliveries =
            nextDeliveriesResult.status === 'fulfilled' ? nextDeliveriesResult.value : []
          const nextDeadLetters =
            nextDeadLettersResult.status === 'fulfilled' ? nextDeadLettersResult.value : []
          setStatusMessage(
            message ??
              `Loaded ${nextSubscriptions.length} users, ${nextDeliveries.length} deliveries, and ${nextDeadLetters.length} dead letters.`,
          )
        }
      } catch (error) {
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
      await loadDashboard(`Subscription ${enabled ? 'enabled' : 'disabled'} successfully.`, {
        preservePagination: true,
      })
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
      if (!/^\d{4}$/.test(testEmailForm.termId.trim())) {
        setStatusMessage('termId is required and must be a 4-digit UW term id.')
        return
      }
      payload.termId = testEmailForm.termId.trim()

      await sendAdminTestEmail(payload)
      setStatusMessage('Manual test email has been queued successfully.')
      await loadDashboard()
    } catch (error) {
      setStatusMessage(getErrorMessage(error, 'Failed to enqueue test email.'))
    } finally {
      setTestingEmail(false)
    }
  }

  function toggleExpandedUser(userId: string) {
    setExpandedUserIds((current) =>
      current.includes(userId)
        ? current.filter((currentUserId) => currentUserId !== userId)
        : [...current, userId],
    )
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
  const latestWelcomeDeliverySummary = useMemo(() => {
    const latestWelcomeStat = [...mailStats]
      .filter((stat) => stat.sentWelcome > 0)
      .sort((left, right) => right.statsDate.localeCompare(left.statsDate))[0]

    if (!latestWelcomeStat) {
      return null
    }

    return `${latestWelcomeStat.sentWelcome} new registered on ${formatDateOnly(latestWelcomeStat.statsDate)}`
  }, [mailStats])
  const sortedMailStats = useMemo(
    () => [...mailStats].sort((left, right) => right.statsDate.localeCompare(left.statsDate)),
    [mailStats],
  )
  const emailHistoryPageSize = 3
  const mailStatsPageSize = 7
  const deadLettersPageSize = 3
  const usersPageSize = 20
  const emailHistoryTotalPages = Math.max(
    1,
    Math.ceil(mailDeliveries.length / emailHistoryPageSize),
  )
  const mailStatsTotalPages = Math.max(1, Math.ceil(sortedMailStats.length / mailStatsPageSize))
  const deadLettersTotalPages = Math.max(
    1,
    Math.ceil(deadLetters.length / deadLettersPageSize),
  )
  const usersTotalPages = Math.max(1, Math.ceil(sortedUsers.length / usersPageSize))
  const visibleMailDeliveries = mailDeliveries.slice(
    (emailHistoryPage - 1) * emailHistoryPageSize,
    emailHistoryPage * emailHistoryPageSize,
  )
  const visibleMailStats = sortedMailStats.slice(
    (mailStatsPage - 1) * mailStatsPageSize,
    mailStatsPage * mailStatsPageSize,
  )
  const visibleDeadLetters = deadLetters.slice(
    (deadLettersPage - 1) * deadLettersPageSize,
    deadLettersPage * deadLettersPageSize,
  )
  const visibleUsers = sortedUsers.slice(
    (usersPage - 1) * usersPageSize,
    usersPage * usersPageSize,
  )

  return (
    <div className="grid gap-5">
      {!ready ? (
        <section className="surface-panel-strong rounded-2xl px-5 py-8">
          <p className="text-sm text-[var(--color-ink-soft)]">Loading session...</p>
        </section>
      ) : !isLoggedIn ? (
        <section className="surface-panel-strong rounded-2xl px-5 py-8">
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
          <div className="hidden surface-panel-strong flex-col gap-2 rounded-2xl px-4 py-4 md:flex-row md:items-center md:justify-between">
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

          <section className="surface-panel-strong rounded-2xl px-4 py-4">
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
                        Queue {schedulerStatus.queueSize}
                      {showQueuedCourseIds && schedulerStatus.queuedCourseIds.length > 0 ? (
                        <div className="surface-popover absolute left-0 top-[calc(100%+0.4rem)] z-10 min-w-[280px] max-w-[min(75vw,36rem)] rounded-xl px-3 py-2 text-xs leading-6 text-[var(--color-ink)]">
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

          <section className="surface-panel-strong rounded-2xl px-4 py-4">
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
                                <div className="surface-inner overflow-x-auto rounded-[18px] px-3 py-3">
                                  <table className="min-w-full border-collapse text-sm">
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
