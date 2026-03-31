'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { StatusBadge } from '@/components/status-badge'
import { useAuth } from '@/components/providers'
import {
  fetchAdminSubscriptions,
  getErrorMessage,
  isUnauthorizedError,
  patchAdminSubscription,
} from '@/lib/api'
import { getMeetingSummary, getSeatsSummary } from '@/lib/format'
import type { AdminUserSubscriptions } from '@/lib/types'

export function AdminDashboardPage() {
  const { ready, isLoggedIn, session, logout } = useAuth()
  const [rows, setRows] = useState<AdminUserSubscriptions[]>([])
  const [statusMessage, setStatusMessage] = useState(
    'Login on the monitor page to access admin data.',
  )
  const [loading, setLoading] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const loadDashboard = useCallback(
    async (message?: string) => {
      if (!isLoggedIn) {
        setRows([])
        setStatusMessage('Login on the monitor page to access admin data.')
        return
      }

      try {
        setLoading(true)
        const nextRows = await fetchAdminSubscriptions()
        setRows(nextRows)
        setStatusMessage(
          message ??
            (nextRows.length === 0
              ? 'No admin subscriptions available.'
              : `Loaded ${nextRows.length} user record${nextRows.length > 1 ? 's' : ''}.`),
        )
      } catch (error) {
        setRows([])
        if (isUnauthorizedError(error)) {
          setStatusMessage('Admin access is required for this route.')
        } else {
          setStatusMessage(getErrorMessage(error, 'Failed to load admin subscriptions.'))
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
        logout()
      }
      setStatusMessage(getErrorMessage(error, 'Failed to update subscription.'))
    } finally {
      setTogglingId(null)
    }
  }

  const totalUsers = rows.length
  const totalSubscriptions = rows.reduce(
    (count, row) => count + row.subscriptions.length,
    0,
  )
  const enabledSubscriptions = rows.reduce(
    (count, row) =>
      count + row.subscriptions.filter((subscription) => subscription.enabled).length,
    0,
  )

  return (
    <div className="grid gap-6">
      <section className="glass-card px-6 py-8 md:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow">Admin</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--color-ink)] md:text-5xl">
              Subscription dashboard without auto redirect.
            </h1>
            <p className="mt-4 text-base leading-7 text-[var(--color-ink-soft)] md:text-lg">
              This page stays independently reachable and uses the same palette as the
              rest of the app, but it keeps its own denser dashboard layout for
              administrative review.
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
            <Link className="button-primary min-w-[160px]" href="/monitor">
              Go to Monitor
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="glass-card px-5 py-5">
              <p className="eyebrow">Users</p>
              <p className="mt-3 text-4xl font-semibold text-[var(--color-ink)]">
                {totalUsers}
              </p>
            </div>
            <div className="glass-card px-5 py-5">
              <p className="eyebrow">Subscriptions</p>
              <p className="mt-3 text-4xl font-semibold text-[var(--color-ink)]">
                {totalSubscriptions}
              </p>
            </div>
            <div className="glass-card px-5 py-5">
              <p className="eyebrow">Enabled</p>
              <p className="mt-3 text-4xl font-semibold text-[var(--color-ink)]">
                {enabledSubscriptions}
              </p>
            </div>
          </section>

          <section className="grid gap-4">
            {rows.length === 0 ? (
              <div className="glass-card px-6 py-8">
                <EmptyState
                  description="No admin data is available yet, or your account may not have the required permissions."
                  title="Nothing to show"
                />
              </div>
            ) : (
              rows.map((row) => (
                <article key={row.userId} className="glass-card px-5 py-5 md:px-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-[var(--color-ink)]">
                        {row.email}
                      </h2>
                      <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                        Role {row.role} · {row.subscriptions.length} subscriptions
                      </p>
                    </div>
                    <span className="pill">{row.userId.slice(0, 8)}</span>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    {row.subscriptions.map((subscription) => (
                      <div
                        key={subscription.subscriptionId}
                        className="rounded-[28px] border border-[rgba(154,238,222,0.22)] bg-white/75 px-4 py-4 shadow-[0_18px_40px_rgba(50,90,81,0.08)]"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                              {subscription.courseDisplayName}
                            </h3>
                            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                              Section {subscription.sectionId}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="pill">
                              {subscription.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                            <StatusBadge status={subscription.status} />
                          </div>
                        </div>

                        <div className="mt-4 space-y-2 text-sm leading-7 text-[var(--color-ink-soft)]">
                          <p>{getMeetingSummary(subscription.meetingInfo)}</p>
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
                            {togglingId === subscription.subscriptionId && !subscription.enabled
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
                            {togglingId === subscription.subscriptionId && subscription.enabled
                              ? 'Saving...'
                              : 'Disable'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))
            )}
          </section>
        </>
      )}
    </div>
  )
}
