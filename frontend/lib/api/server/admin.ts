import 'server-only'

import {backendRequest} from '@/lib/api/server/http'
import type {
    AlertDeadLetter,
    AlertDeliveryLog,
    AdminSubscription,
    AdminUserSubscriptions,
    MailDailyStat,
    SchedulerStatus,
    TestEmailPayload,
} from '@/lib/admin/types'

export async function backendFetchAdminSubscriptions(token: string) {
    return backendRequest<AdminUserSubscriptions[]>('/api/admin/subscriptions', {method: 'GET'}, token)
}

export async function backendPatchAdminSubscription(
    token: string,
    subscriptionId: string,
    enabled: boolean,
) {
    const path = `/api/admin/subscriptions/${subscriptionId}?enabled=${String(enabled)}`
    return backendRequest<AdminSubscription>(path, {method: 'PATCH'}, token)
}

export async function backendFetchAdminDeadLetters(token: string) {
    return backendRequest<AlertDeadLetter[]>('/api/admin/dead-letters', {method: 'GET'}, token)
}

export async function backendFetchAdminMailDeliveries(token: string) {
    return backendRequest<AlertDeliveryLog[]>('/api/admin/mail-deliveries', {method: 'GET'}, token)
}

export async function backendFetchAdminMailStats(token: string) {
    return backendRequest<MailDailyStat[]>('/api/admin/mail-stats', {method: 'GET'}, token)
}

export async function backendFetchAdminSchedulerStatus(token: string) {
    return backendRequest<SchedulerStatus>('/api/admin/scheduler-status', {method: 'GET'}, token)
}

export async function backendSendAdminTestEmail(token: string, payload: TestEmailPayload) {
    await backendRequest<null>('/api/admin/test-email', {
        method: 'POST',
        body: JSON.stringify(payload),
    }, token)
}
