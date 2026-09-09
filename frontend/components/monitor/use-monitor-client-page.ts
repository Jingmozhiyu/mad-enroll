'use client'

import {
    startTransition,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import {useAuth} from '@/components/providers'
import {
    addTask,
    deleteTask,
    fetchTasks,
    fetchSearchTerms,
    searchCourses,
    searchSections,
} from '@/lib/api/client/tasks'
import {getErrorMessage, isUnauthorizedError} from '@/lib/api/client/http'
import {
    COURSE_SEARCH_FAILURE_MESSAGE,
    COURSE_SEARCH_NOT_FOUND_MESSAGE,
    COURSE_SELECTION_MESSAGE,
    SECTION_SELECTION_MESSAGE,
    getCourseSearchValidationMessage,
    normalizeCourseSearchQuery,
} from '@/lib/course/search'
import {sortTasks} from '@/lib/course/format'
import type {SearchCourseHit, SearchTerm, Task} from '@/lib/course/types'

const initialAuthForm = {
    email: '',
    password: '',
}

export type MonitorClientPageProps = {
    initialTasks?: Task[]
    initialStatusMessage?: string
}

type SearchStage = 'courses' | 'sections'

const COURSE_RESULTS_PER_BACKEND_PAGE = 50
const COURSE_RESULTS_PER_UI_PAGE = 10
const UI_PAGES_PER_BACKEND_PAGE =
    COURSE_RESULTS_PER_BACKEND_PAGE / COURSE_RESULTS_PER_UI_PAGE
const INITIAL_SEARCH_MESSAGE = 'Search for a course to view sections.'
const DEFAULT_SIGN_IN_STATUS_MESSAGE = 'Sign in to view and manage your seat alerts.'

function getActiveTasks(tasks: Task[]) {
    return sortTasks(tasks.filter((task) => task.enabled !== false))
}

function upsertTask(tasks: Task[], nextTask: Task) {
    return getActiveTasks([
        ...tasks.filter((task) => task.docId !== nextTask.docId),
        nextTask,
    ])
}

export function useMonitorClientPage({
                                         initialTasks = [],
                                         initialStatusMessage,
                                     }: MonitorClientPageProps) {
    const {ready, session, isLoggedIn, login, register, logout} = useAuth()
    const activeInitialTasks = getActiveTasks(initialTasks)
    const searchTriggerRef = useRef<HTMLButtonElement | null>(null)
    const hasInitializedSearchFocus = useRef(false)
    const hasConsumedInitialStatusMessage = useRef(!initialStatusMessage)
    const previousLoggedIn = useRef(isLoggedIn)
    const previousSearchOpen = useRef(false)
    const [authForm, setAuthForm] = useState(initialAuthForm)
    const [tasks, setTasks] = useState<Task[]>(activeInitialTasks)
    const [statusMessage, setStatusMessage] = useState(
        initialStatusMessage ??
        (activeInitialTasks.length > 0
            ? `Loaded ${activeInitialTasks.length} monitored section${activeInitialTasks.length > 1 ? 's' : ''}.`
            : DEFAULT_SIGN_IN_STATUS_MESSAGE),
    )
    const [searchMessage, setSearchMessage] = useState(INITIAL_SEARCH_MESSAGE)
    const [searchValue, setSearchValue] = useState('')
    const [selectedTermId, setSelectedTermId] = useState('')
    const [termOptions, setTermOptions] = useState<SearchTerm[]>([])
    const [termsLoading, setTermsLoading] = useState(true)
    const [termsError, setTermsError] = useState('')
    const [termRefreshVersion, setTermRefreshVersion] = useState(0)
    const searchRequestId = useRef(0)
    const [searchedTermId, setSearchedTermId] = useState('')
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
        setBusyAction(null)
        setSearchedTermId('')
        setSearchMessage(INITIAL_SEARCH_MESSAGE)
        setSearchValue('')
        setSelectedTermId('')
        searchRequestId.current++
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
        searchRequestId.current++
        setBusyAction(null)
        setSearchedTermId('')
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

    useEffect(() => {
        if (!ready || !isLoggedIn) {
            setTermOptions([])
            setTermsError('')
            return
        }
        let active = true
        setTermsLoading(true)
        setTermsError('')
        resetSearchResultsForTermChange()
        void fetchSearchTerms().then(terms => {
            if (!active) return
            setTermOptions(terms)
            setSelectedTermId(current => {
                if (terms.some(term => term.code === current)) return current
                const defaults = terms.filter(term => term.isDefault)
                return defaults.length === 1 ? defaults[0].code : ''
            })
        }).catch(error => {
            if (!active) return
            setTermOptions([])
            setSelectedTermId('')
            setTermsError(getErrorMessage(error, 'Failed to load available terms.'))
        }).finally(() => { if (active) setTermsLoading(false) })
        return () => { active = false }
    }, [ready, isLoggedIn, termRefreshVersion])

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
                setStatusMessage(DEFAULT_SIGN_IN_STATUS_MESSAGE)
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
            if (hasConsumedInitialStatusMessage.current) {
                setStatusMessage(DEFAULT_SIGN_IN_STATUS_MESSAGE)
            } else {
                hasConsumedInitialStatusMessage.current = true
            }
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

        return {email, password}
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
        setStatusMessage(DEFAULT_SIGN_IN_STATUS_MESSAGE)
    }

    function handleGoogleLogin() {
        setBusyAction('google-login')
        window.location.assign('/api/session/google')
    }

    async function runCourseSearch(targetPage = 1, force = false) {
        if (busyAction === 'search-courses' || busyAction === 'search-sections' || addingDocId) return
        if (termsLoading || termsError || !termOptions.some(term => term.code === selectedTermId)) {
            setSearchMessage('Choose an available term before searching.')
            return
        }
        const requestId = ++searchRequestId.current
        const query = normalizeCourseSearchQuery(searchValue)
        const validationMessage = getCourseSearchValidationMessage(query)

        if (validationMessage) {
            setSearchMessage(validationMessage)
            return
        }

        const backendPage = Math.ceil(targetPage / UI_PAGES_PER_BACKEND_PAGE)
        const isNewQuery = query !== searchedQuery || selectedTermId !== searchedTermId
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
                selectedTermId,
                backendPage,
            )

            if (requestId !== searchRequestId.current) return

            if (backendPage > 1 && nextResults.length === 0) {
                setHasMoreCoursePages(false)
                setSearchMessage(COURSE_SELECTION_MESSAGE)
                return
            }

            setSearchedQuery(query)
            setSearchedTermId(selectedTermId)
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
                    ? {[backendPage]: nextResults}
                    : {
                        ...current,
                        [backendPage]: nextResults,
                    },
            )
        } catch (error) {
            if (requestId !== searchRequestId.current) return
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
            if (requestId === searchRequestId.current) {
                setBusyAction(null)
                finishSearchStageTransition()
            }
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
        if (searchedTermId === selectedTermId && courseSearchPages[backendPage]) {
            setCurrentCoursePage(page)
            return
        }

        if (!hasMoreCoursePages) {
            return
        }

        await runCourseSearch(page)
    }

    async function handleOpenSections(course: SearchCourseHit) {
        if (busyAction === 'search-courses' || busyAction === 'search-sections' || addingDocId) return
        if (termsLoading || termsError || !selectedTermId || searchedTermId !== selectedTermId) return
        const requestId = ++searchRequestId.current
        try {
            setBusyAction('search-sections')
            setIsSearchStageTransitioning(true)
            const nextResults = sortTasks(
                await searchSections(
                    selectedTermId,
                    course.subjectId,
                    course.courseId,
                ),
            )
            if (requestId !== searchRequestId.current) return
            setSelectedCourse(course)
            setSectionResults(nextResults)
            setSearchStage('sections')
            setSearchMessage(
                nextResults.length === 0 ? COURSE_SEARCH_NOT_FOUND_MESSAGE : SECTION_SELECTION_MESSAGE,
            )
        } catch (error) {
            if (requestId !== searchRequestId.current) return
            if (isUnauthorizedError(error)) {
                await handleLogout()
            }
            setSelectedCourse(course)
            setSectionResults([])
            setSearchStage('sections')
            setSearchMessage(getErrorMessage(error, COURSE_SEARCH_FAILURE_MESSAGE))
        } finally {
            if (requestId === searchRequestId.current) {
                setBusyAction(null)
                finishSearchStageTransition()
            }
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
            setSectionResults((current) =>
                current.map((section) =>
                    section.docId === docId
                        ? {
                            ...section,
                            ...nextTask,
                            enabled: nextTask.enabled ?? true,
                            id: nextTask.id ?? section.id,
                        }
                        : section,
                ),
            )
            startTransition(() => {
                setTasks((current) => upsertTask(current, nextTask))
            })
            setSearchMessage(`Section ${nextTask.sectionId} added. You can keep adding more sections.`)
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

    return {
        authCardProps: {
            authForm,
            busyAction,
            onFieldChange: updateAuthField,
            onGoogleLogin: handleGoogleLogin,
            onLogin: () => void handleLogin(),
            onRegister: () => void handleRegister(),
            statusMessage,
        },
        headerProps: {
            isLoggedIn,
            onLogout: () => void handleLogout(),
            onOpenSearch: () => { setIsSearchOpen(true); setTermRefreshVersion(value => value + 1) },
            searchDisabled: termsLoading || !!termsError || termOptions.length === 0,
            ready,
            searchTriggerRef,
            sessionEmail: session?.email,
            statusMessage,
        },
        searchOverlayProps: {
            addingDocId,
            coursePage: currentCoursePage,
            courseResults: visibleCourseResults,
            courseTotalPages: totalCoursePages,
            isLoadingSections: busyAction === 'search-sections',
            isSearchingCourses: busyAction === 'search-courses',
            isTransitioning: isSearchStageTransitioning,
            onAdd: handleAdd,
            onBackToCourses: handleBackToCourses,
            onClose: () => setIsSearchOpen(false),
            onCoursePageChange: (page: number) => void handleCoursePageChange(page),
            onOpenSections: (course: SearchCourseHit) => void handleOpenSections(course),
            onSearchValueChange: setSearchValue,
            onTermChange: (termId: string) => {
                if (addingDocId || !termOptions.some(term => term.code === termId)) return
                setSelectedTermId(termId)
                resetSearchResultsForTermChange()
            },
            onSubmit: () => void runCourseSearch(1, true),
            open: isSearchOpen,
            searchMessage,
            searchStage,
            searchValue,
            selectedCourse,
            selectedTermId,
            sectionResults,
            termOptions,
            termsLoading,
            termsError,
            onRetryTerms: () => setTermRefreshVersion(value => value + 1),
        },
        termStatus: {loading: termsLoading, error: termsError, empty: termOptions.length === 0,
            retry: () => setTermRefreshVersion(value => value + 1)},
        showAuth: ready && !isLoggedIn,
        showTrackedSections: ready && isLoggedIn,
        taskListProps: {
            canSearch: !termsLoading && !termsError && termOptions.length > 0,
            deletingDocId,
            onDelete: (docId: string, sectionId: string) => void handleDelete(docId, sectionId),
            tasks,
        },
        trackedSectionCount: tasks.length,
    }
}
