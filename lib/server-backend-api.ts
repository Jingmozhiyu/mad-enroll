import 'server-only'

import type {
  AlertDeadLetter,
  AlertDeliveryLog,
  AdminSubscription,
  AdminUserSubscriptions,
  ApiEnvelope,
  AuthPayload,
  MailDailyStat,
  Task,
  TestEmailPayload,
  UserSession,
} from '@/lib/types'

const API_BASE_URL =
  process.env.API_BASE_URL ?? 'https://madenroll.duckdns.org/'

async function backendRequest<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
) {
  const response = await fetch(new URL(path, API_BASE_URL), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  })

  const text = await response.text()
  let parsed: ApiEnvelope<T> | null = null

  try {
    parsed = text ? (JSON.parse(text) as ApiEnvelope<T>) : null
  } catch {
    parsed = null
  }

  if (!response.ok) {
    const message =
      (parsed && typeof parsed.msg === 'string' && parsed.msg) ||
      text ||
      `Request failed with ${response.status}.`
    const error = new Error(message) as Error & { status?: number }
    error.status = response.status
    throw error
  }

  if (!parsed) {
    throw new Error('Empty API response.')
  }

  return parsed.data
}

export async function backendRegister(payload: AuthPayload) {
  await backendRequest<null>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function backendLogin(payload: AuthPayload) {
  return backendRequest<UserSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function backendFetchTasks(token: string) {
  return backendRequest<Task[]>('/api/tasks', { method: 'GET' }, token)
}

export async function backendSearchCourse(token: string, courseName: string) {
  const path = `/api/tasks/search?courseName=${encodeURIComponent(courseName)}`
  return backendRequest<Task[]>(path, { method: 'GET' }, token)
}

export async function backendAddTask(token: string, sectionId: string) {
  const path = `/api/tasks?sectionId=${encodeURIComponent(sectionId)}`
  return backendRequest<Task>(path, { method: 'POST' }, token)
}

export async function backendDeleteTask(token: string, sectionId: string) {
  const path = `/api/tasks?sectionId=${encodeURIComponent(sectionId)}`
  await backendRequest<null>(path, { method: 'DELETE' }, token)
}

export async function backendFetchAdminSubscriptions(token: string) {
  return backendRequest<AdminUserSubscriptions[]>('/api/admin/subscriptions', { method: 'GET' }, token)
}

export async function backendPatchAdminSubscription(
  token: string,
  subscriptionId: string,
  enabled: boolean,
) {
  const path = `/api/admin/subscriptions/${subscriptionId}?enabled=${String(enabled)}`
  return backendRequest<AdminSubscription>(path, { method: 'PATCH' }, token)
}

export async function backendFetchAdminDeadLetters(token: string) {
  return backendRequest<AlertDeadLetter[]>('/api/admin/dead-letters', { method: 'GET' }, token)
}

export async function backendFetchAdminMailDeliveries(token: string) {
  return backendRequest<AlertDeliveryLog[]>('/api/admin/mail-deliveries', { method: 'GET' }, token)
}

export async function backendFetchAdminMailStats(token: string) {
  return backendRequest<MailDailyStat[]>('/api/admin/mail-stats', { method: 'GET' }, token)
}

export async function backendSendAdminTestEmail(token: string, payload: TestEmailPayload) {
  await backendRequest<null>('/api/admin/test-email', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token)
}
