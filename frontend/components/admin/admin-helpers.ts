import {formatDateOnly} from '@/lib/course/format'
import type {AdminSubscription, AlertDeadLetter} from '@/lib/admin/types'

export type AdminSubscriptionState = 'open' | 'waitlist' | 'closed' | 'disabled'

const DISPLAY_TIME_ZONE = 'America/Chicago'

export function getDeadLetterSummary(entry: AlertDeadLetter) {
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
