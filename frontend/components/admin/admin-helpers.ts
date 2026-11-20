import type {AdminSubscription, AdminUserSort, AdminUserSubscriptions, AlertDeadLetter} from '@/lib/admin/types'

export type AdminSubscriptionState = 'open' | 'waitlist' | 'closed' | 'disabled'

const DISPLAY_TIME_ZONE = 'America/Chicago'

/** Formats a backend UTC timestamp as YY.MM.DD in Chicago time; sorting still uses the full timestamp. */
export function formatShortDate(value: string) {
    const date = new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`)
    if (Number.isNaN(date.getTime())) {
        return value
    }
    const parts = new Intl.DateTimeFormat('en-US', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        timeZone: DISPLAY_TIME_ZONE,
    }).formatToParts(date)
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
    return `${part('year')}.${part('month')}.${part('day')}`
}

export function getDeadLetterSummary(entry: AlertDeadLetter) {
    return {
        title: [entry.courseDisplayName, entry.alertType].filter(Boolean).join(' · ') || 'Failed alert event',
        subtitle: entry.recipientEmail || (entry.sectionId ? `Section ${entry.sectionId}` : 'No recipient info'),
        detail: entry.reason || 'No reason recorded',
    }
}

/** Parses a backend UTC timestamp, which may come without a zone suffix. */
export function parseUtcTimestamp(value: string) {
    return new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`)
}

export function getSubscriptionState(subscription: AdminSubscription): AdminSubscriptionState {
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

export function getStatusTextClass(state: AdminSubscriptionState) {
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

export function formatSnapshotTime(value?: string) {
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

/** A scheduler duration: "850 ms", "12.3 s" or "4m 05s"; "N/A" when there is no sample. */
export function formatDurationMs(value?: number | null) {
    if (value === null || value === undefined) {
        return 'N/A'
    }
    if (value < 1000) {
        return `${Math.round(value)} ms`
    }
    if (value < 60_000) {
        return `${(value / 1000).toFixed(1)} s`
    }
    const totalSeconds = Math.round(value / 1000)
    return `${Math.floor(totalSeconds / 60)}m ${String(totalSeconds % 60).padStart(2, '0')}s`
}

export function formatCount(value?: number) {
    return typeof value === 'number' ? value : '-'
}

export function sortSubscriptionsByState(subscriptions: AdminSubscription[]) {
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

export function getUserSubscriptionCounts(subscriptions: AdminSubscription[]) {
    return subscriptions.reduce(
        (counts, subscription) => {
            const state = getSubscriptionState(subscription)
            counts[state] += 1
            return counts
        },
        {open: 0, waitlist: 0, closed: 0, disabled: 0} as Record<AdminSubscriptionState, number>,
    )
}

/** Filters the users table can combine; each one narrows the list further. */
export type AdminUserFilter = 'enabled' | 'open' | 'admin'

/** One users-table row: the user with the per-state counts the table shows and sorts by. */
export type AdminUserRow = {
    user: AdminUserSubscriptions
    counts: Record<AdminSubscriptionState, number>
    /** Enabled subscriptions, whatever their section state. */
    enabledCount: number
}

function sortValue(row: AdminUserRow, field: AdminUserSort['field']) {
    if (field === 'email') {
        return row.user.email
    }
    if (field === 'registered') {
        // Backend timestamps share one fixed-width format, so they compare as strings.
        return row.user.registeredAt
    }
    if (field === 'subscribed') {
        return row.enabledCount
    }
    return row.counts[field]
}

/**
 * Builds the users-table rows from the whole user list: keeps users whose email contains the
 * query and who match every filter, then sorts by the chosen field. Ties are ordered by email.
 */
export function buildAdminUserRows(
    users: AdminUserSubscriptions[],
    query: string,
    filters: AdminUserFilter[],
    sort: AdminUserSort,
): AdminUserRow[] {
    const normalizedQuery = query.trim().toLowerCase()
    const sign = sort.direction === 'asc' ? 1 : -1
    return users
        .map((user) => {
            const counts = getUserSubscriptionCounts(user.subscriptions)
            return {user, counts, enabledCount: counts.open + counts.waitlist + counts.closed}
        })
        .filter((row) => !normalizedQuery || row.user.email.toLowerCase().includes(normalizedQuery))
        .filter((row) => filters.every((filter) => {
            if (filter === 'enabled') {
                return row.enabledCount > 0
            }
            if (filter === 'open') {
                return row.counts.open > 0
            }
            return row.user.role === 'ADMIN'
        }))
        .sort((left, right) => {
            const leftValue = sortValue(left, sort.field)
            const rightValue = sortValue(right, sort.field)
            const order = typeof leftValue === 'number' && typeof rightValue === 'number'
                ? leftValue - rightValue
                : String(leftValue).localeCompare(String(rightValue))
            return order !== 0 ? sign * order : left.user.email.localeCompare(right.user.email)
        })
}
