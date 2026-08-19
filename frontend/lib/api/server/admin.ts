import 'server-only'

import {backendRequest} from '@/lib/api/server/http'
import type {
    AlertDeadLetter,
    AlertDeliveryLog,
    AdminSummary,
    AdminSubscription,
    AdminUserSubscriptions,
    MailDailyStat,
    PageResponse,
    SchedulerStatus,
    TestEmailPayload,
} from '@/lib/admin/types'

export async function backendFetchAdminSubscriptions(token: string, page: number) {
    return backendRequest<PageResponse<AdminUserSubscriptions>>(
        `/api/admin/subscriptions?page=${page}`,
        {method: 'GET'},
        token,
    )
}

export async function backendFetchAdminSummary(token: string) {
    return backendRequest<AdminSummary>('/api/admin/summary', {method: 'GET'}, token)
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

export async function backendFetchAdminMailDeliveries(token: string, page: number) {
    return backendRequest<PageResponse<AlertDeliveryLog>>(
        `/api/admin/mail-deliveries?page=${page}`,
        {method: 'GET'},
        token,
    )
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
