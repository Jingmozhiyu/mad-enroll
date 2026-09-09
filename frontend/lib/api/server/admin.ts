import 'server-only'
import type {Broadcast, BroadcastDraft, BroadcastDelivery} from '@/lib/admin/types'

import {backendRequest} from '@/lib/api/server/http'

export function backendFetchBroadcasts(token: string, page: number) {
    return backendRequest<PageResponse<Broadcast>>(`/api/admin/broadcasts?page=${page}`, {}, token)
}
export function backendCreateBroadcast(token: string, payload: BroadcastDraft) {
    return backendRequest<Broadcast>('/api/admin/broadcasts', {method: 'POST', body: JSON.stringify(payload)}, token)
}
export function backendFetchBroadcast(token: string, id: string) {
    return backendRequest<Broadcast>(`/api/admin/broadcasts/${encodeURIComponent(id)}`, {}, token)
}
export function backendBroadcastRecipients(token: string, id: string, page: number) {
    return backendRequest<PageResponse<BroadcastDelivery>>(`/api/admin/broadcasts/${encodeURIComponent(id)}/recipients?page=${page}`, {}, token)
}
export function backendSendBroadcast(token: string, id: string) {
    return backendRequest<Broadcast>(`/api/admin/broadcasts/${encodeURIComponent(id)}/send`, {method: 'POST'}, token)
}
export function backendBroadcastTestEmail(token: string, id: string, recipientEmail: string) {
    return backendRequest<string>(`/api/admin/broadcasts/${encodeURIComponent(id)}/test-email`,
        {method: 'POST', body: JSON.stringify({recipientEmail})}, token)
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

export async function backendFetchAdminTerms(token: string) {
    return backendRequest<AcademicTerm[]>('/api/admin/terms', {method: 'GET'}, token)
}

export async function backendCreateAdminTerm(token: string, payload: Pick<AcademicTerm, 'code' | 'label'>) {
    return backendRequest<AcademicTerm>('/api/admin/terms', {
        method: 'POST',
        body: JSON.stringify(payload),
    }, token)
}

export async function backendUpdateAdminTerm(token: string, code: string, status: TermStatus) {
    return backendRequest<TermUpdateResult>(`/api/admin/terms/${encodeURIComponent(code)}`, {
        method: 'PATCH',
        body: JSON.stringify({status}),
    }, token)
}

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
