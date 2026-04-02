'use client'

import { startTransition, useCallback, useEffect, useState, type KeyboardEvent } from 'react'
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

type MonitorClientPageProps = {
  initialTasks?: Task[]
}

function getActiveTasks(tasks: Task[]) {
  return sortTasks(tasks.filter((task) => task.enabled !== false))
}

export function MonitorClientPage({ initialTasks = [] }: MonitorClientPageProps) {
  const { ready, session, isLoggedIn, login, register, logout } = useAuth()
  const activeInitialTasks = getActiveTasks(initialTasks)
  const [authForm, setAuthForm] = useState(initialAuthForm)
  const [tasks, setTasks] = useState<Task[]>(activeInitialTasks)
  const [statusMessage, setStatusMessage] = useState(
    activeInitialTasks.length > 0
      ? `Loaded ${activeInitialTasks.length} task${activeInitialTasks.length > 1 ? 's' : ''}.`
      : 'Please login to view your tasks.',
  )
  const [searchMessage, setSearchMessage] = useState('Search for a course to view sections.')
  const [searchValue, setSearchValue] = useState('')
  const [searchResults, setSearchResults] = useState<Task[]>([])
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [addingSectionId, setAddingSectionId] = useState<string | null>(null)
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null)

  function applyTasks(nextTasks: Task[], message?: string) {
    const sortedTasks = getActiveTasks(nextTasks)
    setTasks(sortedTasks)
    setStatusMessage(
      message ??
        (sortedTasks.length === 0
          ? 'No active subscriptions yet. Open search to add your first course.'
          : `Loaded ${sortedTasks.length} task${sortedTasks.length > 1 ? 's' : ''}.`),
    )
  }

  const loadTasks = useCallback(
    async (message?: string) => {
      if (!isLoggedIn) {
        setTasks([])
        setStatusMessage('Please login to view your tasks.')
        return
      }

      try {
        setBusyAction('load')
        applyTasks(await fetchTasks(), message)
      } catch (error) {
        setTasks([])
        if (isUnauthorizedError(error)) {
          void logout()
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

    if (initialTasks.length === 0) {
      void loadTasks()
    }
  }, [initialTasks.length, isLoggedIn, loadTasks, ready])

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
      const nextTasks = await fetchTasks()
      applyTasks(nextTasks, `Welcome back, ${nextSession.email}.`)
    } catch (error) {
      setStatusMessage(getErrorMessage(error, 'Login failed.'))
    } finally {
      setBusyAction(null)
    }
  }

  async function handleLogout() {
    await logout()
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
        await handleLogout()
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
      setTasks((current) =>
        current.filter((task) => task.sectionId !== sectionId),
      )
      setStatusMessage(`Section ${sectionId} has been removed from your active tasks.`)
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

      <section className="px-2 pb-1 md:px-4">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
          <div className="flex flex-col gap-5">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-ink)] md:text-4xl">
              My Subscriptions
            </h1>
            {ready && isLoggedIn ? (
              <p className="text-sm font-medium tracking-[0.04em] text-[var(--color-ink-soft)] md:text-base">
                Add courses to get Email Notification!!
              </p>
            ) : (
              <p className="text-sm leading-7 text-[var(--color-ink-soft)]">{statusMessage}</p>
            )}
          </div>

          <div className="flex flex-col items-center justify-start gap-2 lg:-mt-3">
            {ready && isLoggedIn ? (
              <>
                <input
                  className="search-trigger-shell min-w-[320px] max-w-[420px]"
                  onClick={() => setIsSearchOpen(true)}
                  onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      setIsSearchOpen(true)
                    }
                  }}
                  placeholder="Keep an eye on which course?"
                  readOnly
                  value=""
                />
                <p className="monitor-header-accent text-center text-md">
                  Press Enter to search...
                </p>
              </>
            ) : null}
          </div>

          <div className="lg:min-w-[340px]">
            {!ready ? (
              <p className="text-sm leading-7 text-[var(--color-ink-soft)] lg:text-right">Loading session...</p>
            ) : isLoggedIn ? (
              <div className="flex flex-col items-end gap-0.5 text-right">
                <span className="monitor-email-label">{session?.email}</span>
                <button
                  className="logout-text-link"
                  onClick={() => void handleLogout()}
                  type="button"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="grid gap-4 rounded-[24px] border border-[rgba(154,238,222,0.22)] bg-white/75 p-4 shadow-[0_18px_40px_rgba(50,90,81,0.08)]">
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    className="input-shell"
                    onChange={(event) => updateAuthField('email', event.target.value)}
                    placeholder="Email"
                    type="email"
                    value={authForm.email}
                  />
                  <input
                    className="input-shell"
                    onChange={(event) => updateAuthField('password', event.target.value)}
                    placeholder="Password"
                    type="password"
                    value={authForm.password}
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    className="button-secondary h-11 min-w-[128px]"
                    disabled={busyAction !== null}
                    onClick={handleRegister}
                    type="button"
                  >
                    {busyAction === 'register' ? 'Registering...' : 'Register'}
                  </button>
                  <button
                    className="button-primary h-11 min-w-[128px]"
                    disabled={busyAction !== null}
                    onClick={handleLogin}
                    type="button"
                  >
                    {busyAction === 'login' ? 'Logging in...' : 'Login'}
                  </button>
                  <button
                    className="button-ghost h-11 min-w-[120px]"
                    disabled={!session}
                    onClick={() => void handleLogout()}
                    type="button"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {ready && isLoggedIn ? (
          <>
            <div className="mt-6 h-px w-full bg-[rgba(154,238,222,0.3)]" />
            <div className="pt-4 text-center">
              <span className="text-base font-bold text-[var(--color-ink-soft)] md:text-xl">
                {tasks.length} tasks
              </span>
            </div>
          </>
        ) : null}
      </section>

      {ready && isLoggedIn ? (
        <section className="grid gap-4">
          {tasks.length === 0 ? (
            <div className="glass-card px-6 py-8">
              <EmptyState
                description="You do not have any active tasks yet. Open the search overlay above, look up a course, and add a section to begin monitoring."
                title="No active tasks"
              />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tasks.map((task) => (
                <article
                  key={`${task.sectionId}-${task.id ?? 'task'}`}
                  className="glass-card flex h-full flex-col px-5 py-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-2xl font-semibold text-[var(--color-ink)]">
                        {task.courseDisplayName}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                        Section {task.sectionId}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={task.status} />
                    </div>
                  </div>

                  <div className="mt-5 grid content-start gap-3 rounded-[24px] border border-[rgba(154,238,222,0.2)] bg-white/70 px-4 py-4 text-sm leading-7 text-[var(--color-ink-soft)]">
                    <p>
                      <span className="font-semibold text-[#6ccb20]">Open Seats</span>{' '}
                      {task.openSeats ?? '?'} / {task.capacity ?? '?'}
                    </p>
                    <p>
                      <span className="font-semibold text-[#ffcdac]">Waitlist Seats</span>{' '}
                      {task.waitlistSeats ?? '?'} / {task.waitlistCapacity ?? '?'}
                    </p>
                    <p>
                      <span className="font-semibold text-[var(--color-ink)]">Schedule:</span>{' '}
                      {getMeetingSummary(task.meetingInfo)}
                    </p>
                  </div>

                  <div className="mt-auto flex flex-wrap justify-end gap-3 pt-4">
                    <button
                      className="button-danger min-w-[112px] rounded-[14px]"
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
      ) : null}
    </div>
  )
}
