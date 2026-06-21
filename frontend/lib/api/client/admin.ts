import {ADMIN_REQUEST_TIMEOUT, clientApi} from '@/lib/api/client/http'
import type {
    AlertDeadLetter,
    AlertDeliveryLog,
    AdminSubscription,
    AdminUserSubscriptions,
    MailDailyStat,
    SchedulerStatus,
    TestEmailPayload,
} from '@/lib/admin/types'

export async function fetchAdminSubscriptions() {
    const response = await clientApi.get<AdminUserSubscriptions[]>('/api/admin/subscriptions', {
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

export async function fetchAdminMailDeliveries() {
    const response = await clientApi.get<AlertDeliveryLog[]>('/api/admin/mail-deliveries', {
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
