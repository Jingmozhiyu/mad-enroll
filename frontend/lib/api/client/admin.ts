import {ADMIN_REQUEST_TIMEOUT, clientApi} from '@/lib/api/client/http'
import type {Broadcast, BroadcastDraft, BroadcastDelivery} from '@/lib/admin/types'

export async function fetchBroadcasts(page = 1) {
    return (await clientApi.get<PageResponse<Broadcast>>('/api/admin/broadcasts', {params: {page}, timeout: ADMIN_REQUEST_TIMEOUT})).data
}
export async function createBroadcast(payload: BroadcastDraft) {
    return (await clientApi.post<Broadcast>('/api/admin/broadcasts', payload, {timeout: ADMIN_REQUEST_TIMEOUT})).data
}
export async function fetchBroadcast(id: string) {
    return (await clientApi.get<Broadcast>(`/api/admin/broadcasts/${encodeURIComponent(id)}`, {timeout: ADMIN_REQUEST_TIMEOUT})).data
}
export async function fetchBroadcastRecipients(id: string, page = 1) {
    return (await clientApi.get<PageResponse<BroadcastDelivery>>(`/api/admin/broadcasts/${encodeURIComponent(id)}/recipients`,
        {params: {page}, timeout: ADMIN_REQUEST_TIMEOUT})).data
}
export async function sendBroadcast(id: string) {
    return (await clientApi.post<Broadcast>(`/api/admin/broadcasts/${encodeURIComponent(id)}/send`, null,
        {timeout: ADMIN_REQUEST_TIMEOUT})).data
}
export async function sendBroadcastTestEmail(id: string, recipientEmail: string) {
    return (await clientApi.post<string>(`/api/admin/broadcasts/${encodeURIComponent(id)}/test-email`, {recipientEmail},
        {timeout: ADMIN_REQUEST_TIMEOUT})).data
}
import type {
    AcademicTerm,
    TermStatus,
    TermUpdateResult,
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

export async function fetchAdminTerms() {
    const response = await clientApi.get<AcademicTerm[]>('/api/admin/terms', {
        timeout: ADMIN_REQUEST_TIMEOUT,
    })
    return response.data
}

export async function createAdminTerm(payload: Pick<AcademicTerm, 'code' | 'label'>) {
    const response = await clientApi.post<AcademicTerm>('/api/admin/terms', payload, {
        timeout: ADMIN_REQUEST_TIMEOUT,
    })
    return response.data
}

export async function updateAdminTerm(code: string, status: TermStatus) {
    const response = await clientApi.patch<TermUpdateResult>(
        `/api/admin/terms/${encodeURIComponent(code)}`, {status}, {timeout: ADMIN_REQUEST_TIMEOUT},
    )
    return response.data
}

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
