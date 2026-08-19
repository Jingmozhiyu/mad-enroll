import {ADMIN_REQUEST_TIMEOUT, clientApi} from '@/lib/api/client/http'
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

export async function fetchAdminSubscriptions(page = 1) {
    const response = await clientApi.get<PageResponse<AdminUserSubscriptions>>('/api/admin/subscriptions', {
        params: {page},
        timeout: ADMIN_REQUEST_TIMEOUT,
    })
    return response.data
}

export async function fetchAdminSummary() {
    const response = await clientApi.get<AdminSummary>('/api/admin/summary', {
        timeout: ADMIN_REQUEST_TIMEOUT,
    })
    return response.data
}

export async function patchAdminSubscription(subscriptionId: string, enabled: boolean) {
    const response = await clientApi.patch<AdminSubscription>(
        `/api/admin/subscriptions/${subscriptionId}`,
        null,
        {
            params: {enabled},
        },
    )

    return response.data
}

export async function fetchAdminDeadLetters() {
    const response = await clientApi.get<AlertDeadLetter[]>('/api/admin/dead-letters', {
        timeout: ADMIN_REQUEST_TIMEOUT,
    })
    return response.data
}

export async function fetchAdminMailDeliveries(page = 1) {
    const response = await clientApi.get<PageResponse<AlertDeliveryLog>>('/api/admin/mail-deliveries', {
        params: {page},
        timeout: ADMIN_REQUEST_TIMEOUT,
    })
    return response.data
}

export async function fetchAdminMailStats() {
    const response = await clientApi.get<MailDailyStat[]>('/api/admin/mail-stats', {
        timeout: ADMIN_REQUEST_TIMEOUT,
    })
    return response.data
}

export async function fetchAdminSchedulerStatus() {
    const response = await clientApi.get<SchedulerStatus>('/api/admin/scheduler-status', {
        timeout: ADMIN_REQUEST_TIMEOUT,
    })
    return response.data
}

export async function sendAdminTestEmail(payload: TestEmailPayload) {
    await clientApi.post('/api/admin/test-email', payload)
}
