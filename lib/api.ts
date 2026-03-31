import axios from 'axios'
import { clearStoredSession, getStoredToken } from '@/lib/storage'
import type {
  AdminSubscription,
  AdminUserSubscriptions,
  ApiEnvelope,
  AuthPayload,
  Task,
  UserSession,
} from '@/lib/types'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://madenroll.duckdns.org/'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
})

api.interceptors.request.use((config) => {
  const token = getStoredToken()

  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

function unwrap<T>(response: { data: ApiEnvelope<T> }) {
  return response.data.data
}

export function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const responseMessage =
      typeof error.response?.data?.msg === 'string' ? error.response.data.msg : null

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

export function resetSession() {
  clearStoredSession()
}

export async function registerUser(payload: AuthPayload) {
  await api.post<ApiEnvelope<null>>('/auth/register', payload)
}

export async function loginUser(payload: AuthPayload) {
  const response = await api.post<ApiEnvelope<UserSession>>('/auth/login', payload)
  return unwrap(response)
}

export async function fetchTasks() {
  const response = await api.get<ApiEnvelope<Task[]>>('/api/tasks')
  return unwrap(response)
}

export async function searchCourse(courseName: string) {
  const response = await api.get<ApiEnvelope<Task[]>>('/api/tasks/search', {
    params: { courseName },
  })

  return unwrap(response)
}

export async function addTask(sectionId: string) {
  const response = await api.post<ApiEnvelope<Task>>('/api/tasks', null, {
    params: { sectionId },
  })

  return unwrap(response)
}

export async function deleteTask(sectionId: string) {
  await api.delete<ApiEnvelope<null>>('/api/tasks', {
    params: { sectionId },
  })
}

export async function fetchAdminSubscriptions() {
  const response = await api.get<ApiEnvelope<AdminUserSubscriptions[]>>(
    '/api/admin/subscriptions',
  )

  return unwrap(response)
}

export async function patchAdminSubscription(subscriptionId: string, enabled: boolean) {
  const response = await api.patch<ApiEnvelope<AdminSubscription>>(
    `/api/admin/subscriptions/${subscriptionId}`,
    null,
    {
      params: { enabled },
    },
  )

  return unwrap(response)
}
