import { useEffect, useState } from 'react'
import AuthPanel from '../components/AuthPanel'
import SearchPanel from '../components/SearchPanel'
import TaskTable from '../components/TaskTable'
import {
  addTask,
  clearStoredAuth,
  deleteCourseByName,
  getStoredUserEmail,
  hasStoredToken,
  loadTasks,
  loginUser,
  registerUser,
  toggleTask,
} from '../services/api'

const initialAuthForm = {
  email: '',
  password: '',
}

function sortTasks(tasks) {
  return [...tasks].sort((left, right) => {
    if (left.enabled !== right.enabled) {
      return left.enabled ? -1 : 1
    }

    if (left.courseDisplayName !== right.courseDisplayName) {
      return left.courseDisplayName.localeCompare(right.courseDisplayName)
    }

    return String(left.sectionId).localeCompare(String(right.sectionId))
  })
}

function MonitorPage() {
  const [authForm, setAuthForm] = useState(initialAuthForm)
  const [searchValue, setSearchValue] = useState('')
  const [tasks, setTasks] = useState([])
  const [statusMessage, setStatusMessage] = useState('Please login to view your tasks.')
  const [busyAction, setBusyAction] = useState(null)
  const [currentUser, setCurrentUser] = useState(getStoredUserEmail())
  const isLoggedIn = hasStoredToken()

  useEffect(() => {
    if (hasStoredToken()) {
      refreshTasks()
      return
    }

    setStatusMessage('Please login to view your tasks.')
  }, [])

  function updateAuthField(event) {
    const { name, value } = event.target
    setAuthForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function getValidatedAuthForm() {
    const email = authForm.email.trim()
    const password = authForm.password.trim()

    if (!email || !password) {
      throw new Error('Email and password are required.')
    }

    return { email, password }
  }

  async function handleRegister() {
    try {
      const payload = getValidatedAuthForm()
      setBusyAction('register')
      await registerUser(payload)
      setStatusMessage('Register success. Please login.')
    } catch (error) {
      setStatusMessage(getErrorMessage(error, 'Register failed.'))
    } finally {
      setBusyAction(null)
    }
  }

  async function handleLogin() {
    try {
      const payload = getValidatedAuthForm()
      setBusyAction('login')
      const email = await loginUser(payload)
      setCurrentUser(email)
      setStatusMessage('Login success. Tasks loaded.')
      await refreshTasks()
    } catch (error) {
      setStatusMessage(getErrorMessage(error, 'Login failed.'))
    } finally {
      setBusyAction(null)
    }
  }

  function handleLogout() {
    clearStoredAuth()
    setCurrentUser('')
    setTasks([])
    setStatusMessage('Please login to view your tasks.')
  }

  async function refreshTasks() {
    if (!hasStoredToken()) {
      setTasks([])
      setStatusMessage('Please login to view your tasks.')
      return
    }

    try {
      setBusyAction('load')
      const nextTasks = await loadTasks()
      setTasks(sortTasks(nextTasks))
      setCurrentUser(getStoredUserEmail())
      setStatusMessage(
        nextTasks.length === 0
          ? 'No active snipers. Add a course above.'
          : `Loaded ${nextTasks.length} task${nextTasks.length > 1 ? 's' : ''}.`,
      )
    } catch (error) {
      setTasks([])
      if (error.response?.status === 401) {
        clearStoredAuth()
        setCurrentUser('')
        setStatusMessage('Session expired. Please login again.')
      } else {
        setStatusMessage(getErrorMessage(error, 'Backend error. Is Spring Boot running?'))
      }
    } finally {
      setBusyAction(null)
    }
  }

  async function handleAddTask() {
    if (!hasStoredToken()) {
      setStatusMessage('Please login first.')
      return
    }

    const courseName = searchValue.trim()
    if (!courseName) {
      setStatusMessage('Please enter a course name or section id.')
      return
    }

    try {
      setBusyAction('add')
      const createdTasks = await addTask(courseName)
      setSearchValue('')
      setStatusMessage(`Sniper deployed. Found ${createdTasks.length} sections.`)
      await refreshTasks()
    } catch (error) {
      setStatusMessage(getErrorMessage(error, 'Search failed.'))
      setBusyAction(null)
    }
  }

  async function handleToggleTask(id) {
    try {
      await toggleTask(id)
      await refreshTasks()
    } catch {
      setStatusMessage('Failed to toggle status.')
      await refreshTasks()
    }
  }

  async function handleDeleteCourse(courseDisplayName) {
    const confirmed = window.confirm(
      `Are you sure you want to delete all sections for "${courseDisplayName}"?`,
    )

    if (!confirmed) {
      return
    }

    try {
      await deleteCourseByName(courseDisplayName)
      setStatusMessage(`Deleted ${courseDisplayName}.`)
      await refreshTasks()
    } catch {
      setStatusMessage('Delete failed.')
    }
  }

  return (
    <div className="monitor-page">
      <div className="monitor-page__intro">
        <p className="section-heading__eyebrow">Monitor Console</p>
        <h2>Separated UI blocks for auth, search, and task management.</h2>
        <p>
          This page keeps the existing backend flow but replaces global DOM operations
          with component state and a dedicated API service.
        </p>
      </div>

      <AuthPanel
        authForm={authForm}
        authStatusText={statusMessage}
        currentUserLabel={currentUser || 'Not logged in'}
        busyAction={busyAction}
        onChange={updateAuthField}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onLogout={handleLogout}
      />

      <SearchPanel
        searchValue={searchValue}
        totalCount={tasks.length}
        isLoggedIn={isLoggedIn}
        busyAction={busyAction}
        onSearchChange={(event) => setSearchValue(event.target.value)}
        onAdd={handleAddTask}
        onRefresh={refreshTasks}
      />

      <TaskTable
        tasks={tasks}
        isLoggedIn={isLoggedIn}
        statusMessage={statusMessage}
        onToggle={handleToggleTask}
        onDelete={handleDeleteCourse}
      />
    </div>
  )
}

function getErrorMessage(error, fallbackMessage) {
  return error.response?.data?.msg || error.message || fallbackMessage
}

export default MonitorPage
