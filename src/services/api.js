import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
const TASK_API_URL = '/api/tasks'
const TOKEN_KEY = 'uwcm_jwt_token'
const USER_EMAIL_KEY = 'uwcm_user_email'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)

  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export function getStoredUserEmail() {
  return localStorage.getItem(USER_EMAIL_KEY) || ''
}

export function hasStoredToken() {
  return Boolean(localStorage.getItem(TOKEN_KEY))
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_EMAIL_KEY)
}

function setStoredAuth(email, token) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_EMAIL_KEY, email)
}

export async function registerUser(payload) {
  await api.post('/auth/register', payload)
}

export async function loginUser(payload) {
  const response = await api.post('/auth/login', payload)
  const data = response.data?.data

  if (!data?.token) {
    throw new Error('Login failed: missing token.')
  }

  setStoredAuth(data.email, data.token)
  return data.email
}

export async function loadTasks() {
  const response = await api.get(TASK_API_URL)
  return response.data?.data || []
}

export async function addTask(courseName) {
  const response = await api.post(TASK_API_URL, null, {
    params: { courseName },
  })

  return response.data?.data || []
}

export async function toggleTask(id) {
  await api.patch(`${TASK_API_URL}/${id}/toggle`)
}

export async function deleteCourseByName(courseDisplayName) {
  await api.delete(TASK_API_URL, {
    params: { courseDisplayName },
  })
}
