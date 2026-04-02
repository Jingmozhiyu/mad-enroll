import axios from 'axios'
import type {
  AlertDeadLetter,
  AlertDeliveryLog,
  AdminSubscription,
  AdminUserSubscriptions,
  AuthPayload,
  ClientSession,
  MailDailyStat,
  SchedulerStatus,
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
    const responseMessage =
      typeof error.response?.data?.msg === 'string'
        ? error.response.data.msg
        : typeof error.response?.data?.message === 'string'
          ? error.response.data.message
          : null

    return responseMessage || error.message || fallbackMessage
  }

  if (error instanceof Error) {
    return error.message
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

export async function searchCourse(courseName: string) {
  const response = await api.get<Task[]>('/api/tasks/search', {
    params: { courseName },
  })

  return response.data
}

export async function addTask(sectionId: string) {
  const response = await api.post<Task>('/api/tasks', null, {
    params: { sectionId },
  })

  return response.data
}

export async function deleteTask(sectionId: string) {
  await api.delete('/api/tasks', {
    params: { sectionId },
  })
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
