import 'server-only'

import type {
  AlertDeadLetter,
  AlertDeliveryLog,
  AdminSubscription,
  AdminUserSubscriptions,
  ApiEnvelope,
  AuthPayload,
  FeedbackPayload,
  MailDailyStat,
  SchedulerStatus,
  SearchCourseHit,
  Task,
  TestEmailPayload,
  UserSession,
} from '@/lib/types'

const API_BASE_URL =
  process.env.API_BASE_URL ?? 'https://madenroll.duckdns.org/'
const FEEDBACK_API_PATH = process.env.FEEDBACK_API_PATH ?? '/api/feedback'

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

export async function backendSearchCourses(
  token: string,
  courseName: string,
  termId: string,
  page: number,
) {
  const path =
    `/api/tasks/search/courses?courseName=${encodeURIComponent(courseName)}` +
    `&termId=${encodeURIComponent(termId)}` +
    `&page=${encodeURIComponent(String(page))}`
  return backendRequest<SearchCourseHit[]>(path, { method: 'GET' }, token)
}

export async function backendSearchSections(
  token: string,
  termId: string,
  subjectId: string,
  courseId: string,
) {
  const path =
    `/api/tasks/search/sections?termId=${encodeURIComponent(termId)}` +
    `&subjectId=${encodeURIComponent(subjectId)}` +
    `&courseId=${encodeURIComponent(courseId)}`
  return backendRequest<Task[]>(path, { method: 'GET' }, token)
}

export async function backendSearchCourse(token: string, courseName: string) {
  return backendSearchCourses(token, courseName, '1272', 1)
}

export async function backendAddTask(token: string, docId: string) {
  const path = `/api/tasks?docId=${encodeURIComponent(docId)}`
  return backendRequest<Task>(path, { method: 'POST' }, token)
}

export async function backendDeleteTask(token: string, docId: string) {
  const path = `/api/tasks?docId=${encodeURIComponent(docId)}`
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

export async function backendFetchAdminSchedulerStatus(token: string) {
  return backendRequest<SchedulerStatus>('/api/admin/scheduler-status', { method: 'GET' }, token)
}

export async function backendSendAdminTestEmail(token: string, payload: TestEmailPayload) {
  await backendRequest<null>('/api/admin/test-email', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token)
}

export async function backendSubmitFeedback(payload: FeedbackPayload, token?: string) {
  const payloadCandidates = [
    { message: payload.message },
    { content: payload.message },
    { feedback: payload.message },
    { text: payload.message },
  ]

  let lastError: unknown = null

  for (const candidate of payloadCandidates) {
    try {
      await backendRequest<null>(FEEDBACK_API_PATH, {
        method: 'POST',
        body: JSON.stringify(candidate),
      }, token)
      return
    } catch (error) {
      const status =
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        typeof (error as { status?: unknown }).status === 'number'
          ? (error as { status: number }).status
          : 500

      lastError = error

      if (status !== 400 && status !== 422) {
        throw error
      }
    }
  }

  throw lastError ?? new Error('Failed to submit feedback.')
}
