import axios from 'axios'
import { normalizeCourseSearchErrorMessage } from '@/lib/course-search'
import type {
  AlertDeadLetter,
  AlertDeliveryLog,
  AdminSubscription,
  AdminUserSubscriptions,
  AuthPayload,
  ClientSession,
  FeedbackPayload,
  MailDailyStat,
  SchedulerStatus,
  SearchCourseHit,
  Task,
  TestEmailPayload,
} from '@/lib/types'

const api = axios.create({
  baseURL: '',
  timeout: 20000,
  withCredentials: true,
})

export function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data
    const responseMessage =
      typeof responseData === 'string'
        ? responseData.trim()
        : typeof responseData?.msg === 'string'
          ? responseData.msg
          : typeof responseData?.message === 'string'
            ? responseData.message
            : typeof responseData?.error === 'string'
              ? responseData.error
              : null

    if (responseMessage) {
      return normalizeCourseSearchErrorMessage(responseMessage, fallbackMessage)
    }

    if ((error.response?.status ?? 0) >= 500) {
      return fallbackMessage
    }

    return normalizeCourseSearchErrorMessage(error.message, fallbackMessage)
  }

  if (error instanceof Error) {
    return normalizeCourseSearchErrorMessage(error, fallbackMessage)
  }

  return fallbackMessage
}

export function isUnauthorizedError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 401
}

export async function fetchSession() {
  const response = await api.get<ClientSession | null>('/api/session')
  return response.data
}

export async function registerUser(payload: AuthPayload) {
  await api.post('/api/session/register', payload)
}

export async function loginUser(payload: AuthPayload) {
  const response = await api.post<ClientSession>('/api/session/login', payload)
  return response.data
}

export async function logoutUser() {
  await api.post('/api/session/logout')
}

export async function fetchTasks() {
  const response = await api.get<Task[]>('/api/tasks')
  return response.data
}

export async function searchCourses(courseName: string, termKey: string, page: number) {
  const response = await api.get<SearchCourseHit[]>('/api/tasks/search/courses', {
    params: { courseName, page, termKey },
  })

  return response.data
}

export async function searchSections(termKey: string, subjectId: string, courseId: string) {
  const response = await api.get<Task[]>('/api/tasks/search/sections', {
    params: { courseId, subjectId, termKey },
  })

  return response.data
}

export async function addTask(docId: string) {
  const response = await api.post<Task>('/api/tasks', null, {
    params: { docId },
  })

  return response.data
}

export async function deleteTask(docId: string) {
  await api.delete('/api/tasks', {
    params: { docId },
  })
}

export async function submitFeedback(payload: FeedbackPayload) {
  await api.post('/api/feedback', payload)
}

export async function fetchAdminSubscriptions() {
  const response = await api.get<AdminUserSubscriptions[]>('/api/admin/subscriptions')
  return response.data
}

export async function patchAdminSubscription(subscriptionId: string, enabled: boolean) {
  const response = await api.patch<AdminSubscription>(
    `/api/admin/subscriptions/${subscriptionId}`,
    null,
    {
      params: { enabled },
    },
  )

  return response.data
}

export async function fetchAdminDeadLetters() {
  const response = await api.get<AlertDeadLetter[]>('/api/admin/dead-letters')
  return response.data
}

export async function fetchAdminMailDeliveries() {
  const response = await api.get<AlertDeliveryLog[]>('/api/admin/mail-deliveries')
  return response.data
}

export async function fetchAdminMailStats() {
  const response = await api.get<MailDailyStat[]>('/api/admin/mail-stats')
  return response.data
}

export async function fetchAdminSchedulerStatus() {
  const response = await api.get<SchedulerStatus>('/api/admin/scheduler-status')
  return response.data
}

export async function sendAdminTestEmail(payload: TestEmailPayload) {
  await api.post('/api/admin/test-email', payload)
}
