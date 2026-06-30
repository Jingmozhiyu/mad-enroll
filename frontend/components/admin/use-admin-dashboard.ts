'use client'

import {useCallback, useEffect, useMemo, useState} from 'react'
import {useAuth} from '@/components/providers'
import {
    fetchAdminDeadLetters,
    fetchAdminMailDeliveries,
    fetchAdminMailStats,
    fetchAdminSchedulerStatus,
    fetchAdminSubscriptions,
    patchAdminSubscription,
    sendAdminTestEmail,
} from '@/lib/api/client/admin'
import {getErrorMessage, isUnauthorizedError} from '@/lib/api/client/http'
import {formatDateOnly} from '@/lib/course/format'
import type {
    AdminUserSubscriptions,
    AlertDeadLetter,
    AlertDeliveryLog,
    MailDailyStat,
    SchedulerStatus,
    TestEmailPayload,
} from '@/lib/admin/types'

const initialTestEmailForm: Required<TestEmailPayload> = {
    recipientEmail: 'ygong68@wisc.edu',
    alertType: 'OPEN',
    sectionId: '31380',
    courseDisplayName: 'COMP SCI 640',
    termId: '1272',
}

export function useAdminDashboard() {
    const {ready, isLoggedIn, session, logout} = useAuth()
    const [subscriptions, setSubscriptions] = useState<AdminUserSubscriptions[]>([])
    const [deadLetters, setDeadLetters] = useState<AlertDeadLetter[]>([])
    const [mailDeliveries, setMailDeliveries] = useState<AlertDeliveryLog[]>([])
    const [mailStats, setMailStats] = useState<MailDailyStat[]>([])
    const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null)
    const [statusMessage, setStatusMessage] = useState(
        'Login on the monitor page to access admin data.',
    )
    const [loading, setLoading] = useState(false)
    const [pendingAdminSections, setPendingAdminSections] = useState(0)
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
                async function loadAdminSection<T>(
                    label: string,
                    load: () => Promise<T>,
                    apply: (value: T) => void,
                ) {
                    try {
                        const value = await load()
                        apply(value)
                        setStatusMessage(`Loaded ${label}.`)
                        return {label, status: 'fulfilled' as const, value}
                    } catch (reason) {
                        return {label, status: 'rejected' as const, reason}
                    } finally {
                        setPendingAdminSections((current) => Math.max(0, current - 1))
                    }
                }

                const adminRequestCount = 5
                let loadedSubscriptions: AdminUserSubscriptions[] = []
                let loadedDeliveries: AlertDeliveryLog[] = []
                let loadedDeadLetters: AlertDeadLetter[] = []

                setLoading(true)
                setPendingAdminSections(adminRequestCount)

                const results = await Promise.all(
                    [
                        loadAdminSection('users', fetchAdminSubscriptions, (value) => {
                            loadedSubscriptions = value
                            setSubscriptions(value)
                        }),
                        loadAdminSection('dead letters', fetchAdminDeadLetters, (value) => {
                            loadedDeadLetters = value
                            setDeadLetters(value)
                        }),
                        loadAdminSection('deliveries', fetchAdminMailDeliveries, (value) => {
                            loadedDeliveries = value
                            setMailDeliveries(value)
                        }),
                        loadAdminSection('daily stats', fetchAdminMailStats, setMailStats),
                        loadAdminSection('snapshot', fetchAdminSchedulerStatus, setSchedulerStatus),
                    ],
                )

                const failedSections = results
                    .filter((result) => result.status === 'rejected')
                    .map((result) => result.label)
                const unauthorized = results.some(
                    (result) => result.status === 'rejected' && isUnauthorizedError(result.reason),
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
                    setStatusMessage(
                        message ??
                        `Loaded ${loadedSubscriptions.length} users, ${loadedDeliveries.length} deliveries, and ${loadedDeadLetters.length} dead letters.`,
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
                setPendingAdminSections(0)
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

    return {
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
        sessionEmail: session?.email,
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
    }
}
