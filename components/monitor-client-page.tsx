'use client'

import { startTransition, useCallback, useEffect, useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { SearchOverlay } from '@/components/search-overlay'
import { StatusBadge } from '@/components/status-badge'
import { useAuth } from '@/components/providers'
import {
  addTask,
  deleteTask,
  fetchTasks,
  getErrorMessage,
  isUnauthorizedError,
  searchCourse,
} from '@/lib/api'
import { getMeetingSummary, sortTasks } from '@/lib/format'
import type { Task } from '@/lib/types'

const initialAuthForm = {
  email: '',
  password: '',
}

export function MonitorClientPage() {
  const { ready, session, isLoggedIn, login, register, logout } = useAuth()
  const [authForm, setAuthForm] = useState(initialAuthForm)
  const [tasks, setTasks] = useState<Task[]>([])
  const [statusMessage, setStatusMessage] = useState('Please login to view your tasks.')
  const [searchMessage, setSearchMessage] = useState('Search for a course to view sections.')
  const [searchValue, setSearchValue] = useState('')
  const [searchResults, setSearchResults] = useState<Task[]>([])
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [addingSectionId, setAddingSectionId] = useState<string | null>(null)
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null)

  const loadTasks = useCallback(
    async (message?: string) => {
      if (!isLoggedIn) {
        setTasks([])
        setStatusMessage('Please login to view your tasks.')
        return
      }

      try {
        setBusyAction('load')
        const nextTasks = sortTasks(await fetchTasks())
        setTasks(nextTasks)
        setStatusMessage(
          message ??
            (nextTasks.length === 0
              ? 'No active subscriptions yet. Open search to add your first course.'
              : `Loaded ${nextTasks.length} task${nextTasks.length > 1 ? 's' : ''}.`),
        )
      } catch (error) {
        setTasks([])
        if (isUnauthorizedError(error)) {
          logout()
          setStatusMessage('Session expired. Please login again.')
        } else {
          setStatusMessage(getErrorMessage(error, 'Failed to load tasks.'))
        }
      } finally {
        setBusyAction(null)
      }
    },
    [isLoggedIn, logout],
  )

  useEffect(() => {
    if (!ready) {
      return
    }

    if (!isLoggedIn) {
      setTasks([])
      setSearchResults([])
      setIsSearchOpen(false)
      setStatusMessage('Please login to view your tasks.')
      return
    }

    void loadTasks()
  }, [isLoggedIn, loadTasks, ready])

  function updateAuthField(name: 'email' | 'password', value: string) {
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
      await register(payload)
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
      const nextSession = await login(payload)
      setStatusMessage(`Welcome back, ${nextSession.email}.`)
      await loadTasks()
    } catch (error) {
      setStatusMessage(getErrorMessage(error, 'Login failed.'))
    } finally {
      setBusyAction(null)
    }
  }

  function handleLogout() {
    logout()
    setAuthForm(initialAuthForm)
    setTasks([])
    setSearchResults([])
    setSearchValue('')
    setSearchMessage('Search for a course to view sections.')
    setIsSearchOpen(false)
    setStatusMessage('Please login to view your tasks.')
  }

  async function handleSearch() {
    const query = searchValue.trim()

    if (!query) {
      setSearchMessage('Please enter a course name before searching.')
      return
    }

    try {
      setBusyAction('search')
      const nextResults = sortTasks(await searchCourse(query))
      setSearchResults(nextResults)
      setSearchMessage(
        nextResults.length === 0
          ? `No sections found for "${query}".`
          : `Found ${nextResults.length} section${nextResults.length > 1 ? 's' : ''} for "${query}".`,
      )
    } catch (error) {
      if (isUnauthorizedError(error)) {
        handleLogout()
      }
      setSearchResults([])
      setSearchMessage(getErrorMessage(error, 'Search failed.'))
    } finally {
      setBusyAction(null)
    }
  }

  async function handleAdd(sectionId: string) {
    try {
      setAddingSectionId(sectionId)
      await addTask(sectionId)
      startTransition(() => {
        setIsSearchOpen(false)
      })
      setSearchResults([])
      setSearchValue('')
      setSearchMessage('Search for a course to view sections.')
      await loadTasks(`Section ${sectionId} added to your monitor list.`)
    } catch (error) {
      setSearchMessage(getErrorMessage(error, 'Add request failed.'))
    } finally {
      setAddingSectionId(null)
    }
  }

  async function handleDelete(sectionId: string) {
    try {
      setDeletingSectionId(sectionId)
      await deleteTask(sectionId)
      await loadTasks(`Section ${sectionId} has been removed from your active tasks.`)
    } catch (error) {
      setStatusMessage(getErrorMessage(error, 'Delete failed.'))
    } finally {
      setDeletingSectionId(null)
    }
  }

  return (
    <div className="grid gap-6">
      <SearchOverlay
        addingSectionId={addingSectionId}
        isSearching={busyAction === 'search'}
        onAdd={handleAdd}
        onClose={() => setIsSearchOpen(false)}
        onSearchValueChange={setSearchValue}
        onSubmit={handleSearch}
        open={isSearchOpen}
        results={searchResults}
        searchMessage={searchMessage}
        searchValue={searchValue}
      />

      <section className="glass-card px-6 py-8 md:px-8 md:py-9">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow">Monitor</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--color-ink)] md:text-5xl">
              Search sections, add subscriptions, and track them from one main page.
            </h1>
            <p className="mt-4 text-base leading-7 text-[var(--color-ink-soft)] md:text-lg">
              Search opens as a focused overlay above this page, so you can inspect
              course sections, add one with a single API call, and drop back into your
              task list without losing context.
            </p>
          </div>

          {isLoggedIn ? (
            <div className="flex flex-wrap items-center justify-end gap-3 md:max-w-[320px]">
              <span className="pill w-full justify-center md:w-auto">{session?.email}</span>
              <button className="button-primary min-w-[144px]" onClick={() => setIsSearchOpen(true)} type="button">
                Search Course
              </button>
              <button className="button-ghost min-w-[120px]" onClick={handleLogout} type="button">
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {!ready ? (
        <section className="glass-card px-6 py-10">
          <p className="text-sm text-[var(--color-ink-soft)]">Loading session...</p>
        </section>
      ) : !isLoggedIn ? (
        <section className="glass-card px-6 py-8 md:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
            <div className="space-y-4">
              <div>
                <p className="eyebrow">Authentication</p>
                <h2 className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">
                  Login or register to see your course tasks.
                </h2>
              </div>
              <p className="text-sm leading-7 text-[var(--color-ink-soft)]">
                The monitor homepage becomes your task dashboard after login. Until then,
                this page stays focused on account access only, matching your requested
                flow.
              </p>
              <p className="text-sm leading-7 text-[var(--color-ink-soft)]">{statusMessage}</p>
            </div>

            <div className="rounded-[28px] border border-[rgba(154,238,222,0.22)] bg-white/75 p-5 shadow-[0_18px_40px_rgba(50,90,81,0.08)]">
              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-[var(--color-ink-soft)]">Email</span>
                  <input
                    className="input-shell"
                    onChange={(event) => updateAuthField('email', event.target.value)}
                    placeholder="you@example.com"
                    type="email"
                    value={authForm.email}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-[var(--color-ink-soft)]">
                    Password
                  </span>
                  <input
                    className="input-shell"
                    onChange={(event) => updateAuthField('password', event.target.value)}
                    placeholder="Minimum 6 characters"
                    type="password"
                    value={authForm.password}
                  />
                </label>

                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    className="button-primary min-w-[128px]"
                    disabled={busyAction !== null}
                    onClick={handleLogin}
                    type="button"
                  >
                    {busyAction === 'login' ? 'Logging in...' : 'Login'}
                  </button>
                  <button
                    className="button-secondary min-w-[128px]"
                    disabled={busyAction !== null}
                    onClick={handleRegister}
                    type="button"
                  >
                    {busyAction === 'register' ? 'Registering...' : 'Register'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="glass-card px-6 py-6 md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="eyebrow">Active Tasks</p>
                <h2 className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">
                  Your current subscriptions
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="pill">{tasks.length} tasks</span>
                <button
                  className="button-soft min-w-[120px]"
                  disabled={busyAction === 'load'}
                  onClick={() => void loadTasks()}
                  type="button"
                >
                  {busyAction === 'load' ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-[var(--color-ink-soft)]">{statusMessage}</p>
          </section>

          <section className="grid gap-4">
            {tasks.length === 0 ? (
              <div className="glass-card px-6 py-8">
                <EmptyState
                  description="You do not have any active tasks yet. Open the search overlay above, look up a course, and add a section to begin monitoring."
                  title="No active tasks"
                />
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {tasks.map((task) => (
                  <article key={`${task.sectionId}-${task.id ?? 'task'}`} className="glass-card px-5 py-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-2xl font-semibold text-[var(--color-ink)]">
                          {task.courseDisplayName}
                        </h3>
                        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                          Section {task.sectionId} · Course {task.courseId}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="pill">{task.enabled ? 'Enabled' : 'Disabled'}</span>
                        <StatusBadge status={task.status} />
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 rounded-[24px] border border-[rgba(154,238,222,0.2)] bg-white/70 px-4 py-4 text-sm leading-7 text-[var(--color-ink-soft)]">
                      <p>
                        <span className="font-semibold text-[var(--color-ink)]">Schedule:</span>{' '}
                        {getMeetingSummary(task.meetingInfo)}
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--color-ink)]">Subject:</span>{' '}
                        {task.subjectCode} {task.catalogNumber}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap justify-end gap-3">
                      <button
                        className="button-danger min-w-[128px]"
                        disabled={deletingSectionId === task.sectionId}
                        onClick={() => handleDelete(task.sectionId)}
                        type="button"
                      >
                        {deletingSectionId === task.sectionId ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
