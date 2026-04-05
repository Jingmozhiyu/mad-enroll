'use client'

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { EmptyState } from '@/components/empty-state'
import { SearchOverlay } from '@/components/search-overlay'
import { StatusBadge } from '@/components/status-badge'
import { useAuth } from '@/components/providers'
import {
  COURSE_SEARCH_FAILURE_MESSAGE,
  COURSE_SEARCH_NOT_FOUND_MESSAGE,
  COURSE_SELECTION_MESSAGE,
  SECTION_SELECTION_MESSAGE,
  getCourseSearchValidationMessage,
  normalizeCourseSearchQuery,
} from '@/lib/course-search'
import {
  addTask,
  deleteTask,
  fetchTasks,
  getErrorMessage,
  isUnauthorizedError,
  searchCourses,
  searchSections,
} from '@/lib/api'
import { getMeetingLocationSummary, getMeetingSummary, sortTasks } from '@/lib/format'
import {
  DEFAULT_TASK_SEARCH_TERM_KEY,
  TASK_SEARCH_TERM_OPTIONS,
  type TaskSearchTermKey,
} from '@/lib/task-search-terms'
import type { SearchCourseHit, Task } from '@/lib/types'

const initialAuthForm = {
  email: '',
  password: '',
}

type MonitorClientPageProps = {
  initialTasks?: Task[]
}

type SearchStage = 'courses' | 'sections'

const COURSE_RESULTS_PER_BACKEND_PAGE = 50
const COURSE_RESULTS_PER_UI_PAGE = 10
const UI_PAGES_PER_BACKEND_PAGE =
  COURSE_RESULTS_PER_BACKEND_PAGE / COURSE_RESULTS_PER_UI_PAGE
const INITIAL_SEARCH_MESSAGE = 'Search for a course to view sections.'

function getActiveTasks(tasks: Task[]) {
  return sortTasks(tasks.filter((task) => task.enabled !== false))
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 text-[rgba(52,95,131,0.76)]"
      fill="none"
      viewBox="0 0 20 20"
    >
      <circle cx="8.5" cy="8.5" r="4.75" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m12.2 12.2 4.1 4.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

export function MonitorClientPage({ initialTasks = [] }: MonitorClientPageProps) {
  const { ready, session, isLoggedIn, login, register, logout } = useAuth()
  const activeInitialTasks = getActiveTasks(initialTasks)
  const searchTriggerRef = useRef<HTMLButtonElement | null>(null)
  const hasInitializedSearchFocus = useRef(false)
  const previousLoggedIn = useRef(isLoggedIn)
  const previousSearchOpen = useRef(false)
  const [authForm, setAuthForm] = useState(initialAuthForm)
  const [tasks, setTasks] = useState<Task[]>(activeInitialTasks)
  const [statusMessage, setStatusMessage] = useState(
    activeInitialTasks.length > 0
      ? `Loaded ${activeInitialTasks.length} monitored section${activeInitialTasks.length > 1 ? 's' : ''}.`
      : 'Sign in to view and manage your seat alerts.',
  )
  const [searchMessage, setSearchMessage] = useState(INITIAL_SEARCH_MESSAGE)
  const [searchValue, setSearchValue] = useState('')
  const [selectedTermKey, setSelectedTermKey] =
    useState<TaskSearchTermKey>(DEFAULT_TASK_SEARCH_TERM_KEY)
  const [searchedQuery, setSearchedQuery] = useState('')
  const [searchStage, setSearchStage] = useState<SearchStage>('courses')
  const [courseSearchPages, setCourseSearchPages] = useState<Record<number, SearchCourseHit[]>>(
    {},
  )
  const [hasMoreCoursePages, setHasMoreCoursePages] = useState(false)
  const [currentCoursePage, setCurrentCoursePage] = useState(1)
  const [selectedCourse, setSelectedCourse] = useState<SearchCourseHit | null>(null)
  const [sectionResults, setSectionResults] = useState<Task[]>([])
  const [isSearchStageTransitioning, setIsSearchStageTransitioning] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [addingDocId, setAddingDocId] = useState<string | null>(null)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)

  const highestLoadedBackendPage = useMemo(() => {
    const loadedPages = Object.keys(courseSearchPages)
      .map((page) => Number(page))
      .filter((page) => Number.isFinite(page) && page > 0)

    return loadedPages.length > 0 ? Math.max(...loadedPages) : 0
  }, [courseSearchPages])

  const highestLoadedCourseResults =
    highestLoadedBackendPage > 0 ? courseSearchPages[highestLoadedBackendPage] ?? [] : []
  const knownCoursePages =
    highestLoadedBackendPage > 0
      ? (highestLoadedBackendPage - 1) * UI_PAGES_PER_BACKEND_PAGE +
        Math.ceil(highestLoadedCourseResults.length / COURSE_RESULTS_PER_UI_PAGE)
      : 0
  const totalCoursePages = knownCoursePages + (hasMoreCoursePages ? 1 : 0)
  const currentCourseBackendPage = Math.ceil(currentCoursePage / UI_PAGES_PER_BACKEND_PAGE)
  const currentCourseChunk = courseSearchPages[currentCourseBackendPage] ?? []
  const currentCourseChunkPageIndex =
    (currentCoursePage - 1) % UI_PAGES_PER_BACKEND_PAGE
  const visibleCourseResults = currentCourseChunk.slice(
    currentCourseChunkPageIndex * COURSE_RESULTS_PER_UI_PAGE,
    (currentCourseChunkPageIndex + 1) * COURSE_RESULTS_PER_UI_PAGE,
  )

  function resetSearchFlow() {
    setSearchMessage(INITIAL_SEARCH_MESSAGE)
    setSearchValue('')
    setSelectedTermKey(DEFAULT_TASK_SEARCH_TERM_KEY)
    setSearchedQuery('')
    setSearchStage('courses')
    setCourseSearchPages({})
    setHasMoreCoursePages(false)
    setCurrentCoursePage(1)
    setSelectedCourse(null)
    setSectionResults([])
    setIsSearchStageTransitioning(false)
  }

  function finishSearchStageTransition() {
    window.requestAnimationFrame(() => {
      setIsSearchStageTransitioning(false)
    })
  }

  function resetSearchResultsForTermChange(nextMessage = INITIAL_SEARCH_MESSAGE) {
    setSearchMessage(nextMessage)
    setSearchedQuery('')
    setSearchStage('courses')
    setCourseSearchPages({})
    setHasMoreCoursePages(false)
    setCurrentCoursePage(1)
    setSelectedCourse(null)
    setSectionResults([])
    setIsSearchStageTransitioning(false)
  }

  function applyTasks(nextTasks: Task[], message?: string) {
    const sortedTasks = getActiveTasks(nextTasks)
    setTasks(sortedTasks)
    setStatusMessage(
      message ??
        (sortedTasks.length === 0
          ? 'No alerts yet. Search for a course or section to start tracking seat openings.'
          : `Loaded ${sortedTasks.length} monitored section${sortedTasks.length > 1 ? 's' : ''}.`),
    )
  }

  const loadTasks = useCallback(
    async (message?: string) => {
      if (!isLoggedIn) {
        setTasks([])
        setStatusMessage('Sign in to view and manage your seat alerts.')
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
          setStatusMessage(getErrorMessage(error, 'Failed to load monitored courses.'))
        }
      } finally {
        setBusyAction(null)
      }
    },
    [isLoggedIn, logout],
  )

  const focusSearchTrigger = useCallback(() => {
    window.requestAnimationFrame(() => {
      searchTriggerRef.current?.focus()
    })
  }, [])

  useEffect(() => {
    if (!ready) {
      return
    }

    if (!isLoggedIn) {
      setTasks([])
      resetSearchFlow()
      setIsSearchOpen(false)
      setStatusMessage('Sign in to view and manage your seat alerts.')
      return
    }

    if (initialTasks.length === 0) {
      void loadTasks()
    }
  }, [initialTasks.length, isLoggedIn, loadTasks, ready])

  useEffect(() => {
    if (!ready || !isLoggedIn || isSearchOpen) {
      previousLoggedIn.current = isLoggedIn
      previousSearchOpen.current = isSearchOpen
      return
    }

    const shouldFocusInitially = !hasInitializedSearchFocus.current
    const justLoggedIn = !previousLoggedIn.current && isLoggedIn
    const justClosedSearch = previousSearchOpen.current && !isSearchOpen

    if (shouldFocusInitially || justLoggedIn || justClosedSearch) {
      focusSearchTrigger()
      hasInitializedSearchFocus.current = true
    }

    previousLoggedIn.current = isLoggedIn
    previousSearchOpen.current = isSearchOpen
  }, [focusSearchTrigger, isLoggedIn, isSearchOpen, ready])

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
    resetSearchFlow()
    setIsSearchOpen(false)
    setStatusMessage('Sign in to view and manage your seat alerts.')
  }

  async function runCourseSearch(targetPage = 1, force = false) {
    const query = normalizeCourseSearchQuery(searchValue)
    const validationMessage = getCourseSearchValidationMessage(query)

    if (validationMessage) {
      setSearchMessage(validationMessage)
      return
    }

    const backendPage = Math.ceil(targetPage / UI_PAGES_PER_BACKEND_PAGE)
    const isNewQuery = query !== searchedQuery
    const cachedResults = !isNewQuery && !force ? courseSearchPages[backendPage] : undefined

    if (cachedResults) {
      setCurrentCoursePage(targetPage)
      setSearchStage('courses')
      setSelectedCourse(null)
      setSectionResults([])
      setSearchMessage(
        cachedResults.length === 0 ? COURSE_SEARCH_NOT_FOUND_MESSAGE : COURSE_SELECTION_MESSAGE,
      )
      return
    }

    try {
      setBusyAction('search-courses')
      setIsSearchStageTransitioning(true)
      const nextResults = await searchCourses(
        query,
        selectedTermKey,
        backendPage,
      )

      if (backendPage > 1 && nextResults.length === 0) {
        setHasMoreCoursePages(false)
        setSearchMessage(COURSE_SELECTION_MESSAGE)
        return
      }

      setSearchedQuery(query)
      setCurrentCoursePage(targetPage)
      setSearchStage('courses')
      setSelectedCourse(null)
      setSectionResults([])
      setHasMoreCoursePages(nextResults.length === COURSE_RESULTS_PER_BACKEND_PAGE)
      setSearchMessage(
        nextResults.length === 0 ? COURSE_SEARCH_NOT_FOUND_MESSAGE : COURSE_SELECTION_MESSAGE,
      )
      setCourseSearchPages((current) =>
        isNewQuery || force
          ? { [backendPage]: nextResults }
          : {
              ...current,
              [backendPage]: nextResults,
            },
      )
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await handleLogout()
      }
      setCourseSearchPages({})
      setHasMoreCoursePages(false)
      setCurrentCoursePage(1)
      setSelectedCourse(null)
      setSectionResults([])
      setSearchMessage(getErrorMessage(error, COURSE_SEARCH_FAILURE_MESSAGE))
    } finally {
      setBusyAction(null)
      finishSearchStageTransition()
    }
  }

  async function handleCoursePageChange(page: number) {
    if (page < 1) {
      return
    }

    const query = searchedQuery || normalizeCourseSearchQuery(searchValue)
    if (!query) {
      return
    }

    const backendPage = Math.ceil(page / UI_PAGES_PER_BACKEND_PAGE)
    if (courseSearchPages[backendPage]) {
      setCurrentCoursePage(page)
      return
    }

    if (!hasMoreCoursePages) {
      return
    }

    await runCourseSearch(page)
  }

  async function handleOpenSections(course: SearchCourseHit) {
    try {
      setBusyAction('search-sections')
      setIsSearchStageTransitioning(true)
      const nextResults = sortTasks(
        await searchSections(
          selectedTermKey,
          course.subjectId,
          course.courseId,
        ),
      )
      setSelectedCourse(course)
      setSectionResults(nextResults)
      setSearchStage('sections')
      setSearchMessage(
        nextResults.length === 0 ? COURSE_SEARCH_NOT_FOUND_MESSAGE : SECTION_SELECTION_MESSAGE,
      )
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await handleLogout()
      }
      setSelectedCourse(course)
      setSectionResults([])
      setSearchStage('sections')
      setSearchMessage(getErrorMessage(error, COURSE_SEARCH_FAILURE_MESSAGE))
    } finally {
      setBusyAction(null)
      finishSearchStageTransition()
    }
  }

  function handleBackToCourses() {
    setIsSearchStageTransitioning(true)
    window.requestAnimationFrame(() => {
      setSearchStage('courses')
      setSelectedCourse(null)
      setSectionResults([])
      setSearchMessage(
        visibleCourseResults.length > 0 || knownCoursePages > 0
          ? COURSE_SELECTION_MESSAGE
          : INITIAL_SEARCH_MESSAGE,
      )
      finishSearchStageTransition()
    })
  }

  async function handleAdd(docId: string) {
    try {
      setAddingDocId(docId)
      const nextTask = await addTask(docId)
      startTransition(() => {
        setIsSearchOpen(false)
      })
      resetSearchFlow()
      await loadTasks(`Section ${nextTask.sectionId} added to your monitor list.`)
    } catch (error) {
      setSearchMessage(getErrorMessage(error, 'Add request failed.'))
    } finally {
      setAddingDocId(null)
    }
  }

  async function handleDelete(docId: string, sectionId: string) {
    try {
      setDeletingDocId(docId)
      await deleteTask(docId)
      setTasks((current) => current.filter((task) => task.docId !== docId))
      setStatusMessage(`Section ${sectionId} has been removed from your active tasks.`)
    } catch (error) {
      setStatusMessage(getErrorMessage(error, 'Delete failed.'))
    } finally {
      setDeletingDocId(null)
    }
  }

  return (
    <div className="page-fade-enter grid gap-6">
      <SearchOverlay
        addingDocId={addingDocId}
        coursePage={currentCoursePage}
        courseResults={visibleCourseResults}
        courseTotalPages={totalCoursePages}
        isLoadingSections={busyAction === 'search-sections'}
        isSearchingCourses={busyAction === 'search-courses'}
        isTransitioning={isSearchStageTransitioning}
        onAdd={handleAdd}
        onBackToCourses={handleBackToCourses}
        onClose={() => setIsSearchOpen(false)}
        onCoursePageChange={(page) => void handleCoursePageChange(page)}
        onOpenSections={(course) => void handleOpenSections(course)}
        onSearchValueChange={setSearchValue}
        onTermChange={(termKey) => {
          setSelectedTermKey(termKey)
          resetSearchResultsForTermChange()
        }}
        onSubmit={() => void runCourseSearch(1, true)}
        open={isSearchOpen}
        searchMessage={searchMessage}
        searchStage={searchStage}
        searchValue={searchValue}
        selectedTermKey={selectedTermKey}
        sectionResults={sectionResults}
        selectedCourse={selectedCourse}
        termOptions={TASK_SEARCH_TERM_OPTIONS}
      />

      <section className="px-2 pb-1 md:px-4">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-ink)] md:text-4xl">
              Seat Alerts
            </h1>
            {ready && isLoggedIn ? (
              <p className="text-sm font-medium tracking-[0.04em] text-[var(--color-ink-soft)] md:text-base">
                Track courses and sections by email.
              </p>
            ) : (
              <p className="text-sm leading-7 text-[var(--color-ink-soft)]">{statusMessage}</p>
            )}
          </div>

          <div className="flex flex-col items-center justify-start gap-2 lg:-mt-3">
            {ready && isLoggedIn ? (
              <button
                aria-haspopup="dialog"
                ref={searchTriggerRef}
                className="search-trigger-shell w-full min-w-[320px] max-w-[420px]"
                onClick={() => setIsSearchOpen(true)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <SearchIcon />
                  <span className="truncate text-[rgba(52,95,131,0.52)]">
                    Search courses...
                  </span>
                </span>
                <span className="rounded-full border border-[rgba(153,205,255,0.36)] bg-white/55 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[rgba(52,95,131,0.58)]">
                  Enter
                </span>
              </button>
            ) : null}
          </div>

          <div className="lg:min-w-[340px]">
            {!ready ? (
              <p className="text-sm leading-7 text-[var(--color-ink-soft)] lg:text-right">
                Loading session...
              </p>
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
                Tracking {tasks.length} Section{tasks.length === 1 ? '' : 's'}
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
                description="No alerts yet. Search for a course or section to start tracking seat openings."
                title="No alerts yet"
              />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tasks.map((task) => {
                const meetingSummary = getMeetingSummary(task.meetingInfo)
                const meetingLocationSummary = getMeetingLocationSummary(task.meetingInfo)

                return (
                  <article
                    key={task.docId}
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

                    <div style={{lineHeight:"1.8"}} className="mt-5 grid content-start gap-1 rounded-[24px] border border-[rgba(154,238,222,0.2)] bg-white/70 px-4 py-4  text-sm leading-7 text-[var(--color-ink-soft)]">
                      <p>
                        <span className="font-semibold text-[var(--color-open)]">Open Seats Available:</span>{' '}
                        {task.openSeats ?? '?'} / {task.capacity ?? '?'}
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--color-waitlist)]">
                          Waitlist Seats Available:
                        </span>{' '}
                        {task.waitlistSeats ?? '?'} / {task.waitlistCapacity ?? '?'}
                      </p>
                      {meetingSummary ? (
                        <p>
                          <span className="font-semibold text-[var(--color-schedule)]">Schedule</span>{' '}
                          {meetingSummary}
                        </p>
                      ) : null}
                      {meetingLocationSummary ? (
                        <p>
                          <span className="font-semibold text-[var(--color-location)]">Location</span>{' '}
                          {meetingLocationSummary}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-auto flex flex-wrap justify-end gap-3 pt-4">
                      <button
                        className="min-w-[112px] rounded-[14px] px-3 py-0 text-[rgba(52,95,131,0.88)] transition hover:text-[rgba(36,89,127,0.96)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55"
                        disabled={deletingDocId === task.docId}
                        onClick={() => void handleDelete(task.docId, task.sectionId)}
                        type="button"
                      >
                        {deletingDocId === task.docId ? 'Removing...' : 'Remove Alert'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}
