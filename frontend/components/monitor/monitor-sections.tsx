import type {RefObject} from 'react'
import {EmptyState} from '@/components/empty-state'
import {getMeetingLocationSummary, getMeetingSummary} from '@/lib/course/format'
import type {Subscription} from '@/lib/course/types'

type MonitorAuthForm = {
    email: string
    password: string
}

type MonitorAuthCardProps = {
    authForm: MonitorAuthForm
    busyAction: string | null
    onFieldChange: (name: keyof MonitorAuthForm, value: string) => void
    onGoogleLogin: () => void
    onLogin: () => void
    onRegister: () => void
    authMessage: string
}

type MonitorPageHeaderProps = {
    isLoggedIn: boolean
    onOpenAuth: () => void
    onLogout: () => void
    onOpenSearch: () => void
    searchDisabled: boolean
    ready: boolean
    searchTriggerRef: RefObject<HTMLButtonElement | null>
    sessionEmail?: string
}

type MonitorTaskListProps = {
    canSearch: boolean
    deleteError: {docId: string, message: string} | null
    deletingDocId: string | null
    loadError: string
    onRetryLoad: () => void
    termsLoading: boolean
    onDelete: (docId: string) => void
    tasks: Subscription[]
}

type StatusBadgeProps = {
    status: string
}

const statusClassMap: Record<string, string> = {
    OPEN: 'status-open',
    WAITLIST: 'status-waitlist',
    WAITLISTED: 'status-waitlist',
    WELCOME: 'status-welcome',
    CLOSED: 'status-closed',
}

function GoogleMarkIcon() {
    return (
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 18 18">
            <path
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.58 2.68-3.9 2.68-6.62Z"
                fill="#4285F4"
            />
            <path
                d="M9 18c2.43 0 4.46-.8 5.95-2.18l-2.92-2.26c-.81.54-1.84.86-3.03.86-2.33 0-4.3-1.57-5-3.68H1.98V13c1.48 2.94 4.53 5 7.02 5Z"
                fill="#34A853"
            />
            <path
                d="M4 10.74A5.4 5.4 0 0 1 3.72 9c0-.6.1-1.19.28-1.74V4.92H1.98A9 9 0 0 0 1 9c0 1.45.35 2.82.98 4l2.02-2.26Z"
                fill="#FBBC05"
            />
            <path
                d="M9 3.58c1.32 0 2.5.45 3.42 1.33l2.56-2.56C13.45.92 11.42 0 9 0 5.5 0 2.45 2.06.98 4.92L4 7.26c.7-2.11 2.67-3.68 5-3.68Z"
                fill="#EA4335"
            />
        </svg>
    )
}

function SearchTriggerHint() {
    return (
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[var(--search-trigger-hint-text)]">
            Enter
            <svg aria-hidden="true" className="h-[0.8em] w-[0.8em]" fill="none" viewBox="0 0 16 16">
                <circle cx="6.75" cy="6.75" r="5" stroke="currentColor" strokeWidth="2"/>
                <path d="m10.5 10.5 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2"/>
            </svg>
        </span>
    )
}

export function StatusBadge({status}: StatusBadgeProps) {
    const normalized = status?.toUpperCase?.() || 'UNKNOWN'
    const statusClass = statusClassMap[normalized] ?? 'status-unknown'
    const displayLabel = normalized === 'WAITLISTED' ? 'WAITLIST' : normalized

    return (
        <span
            className={`monitor-status-badge inline-flex min-w-[96px] items-center justify-center rounded-xl px-2.5 py-2 text-sm tracking-[0.02em] ${statusClass}`}
        >
            {displayLabel}
        </span>
    )
}

export function MonitorAuthCard({
                                    authForm,
                                    busyAction,
                                    onFieldChange,
                                    onGoogleLogin,
                                    onLogin,
                                    onRegister,
                                    authMessage,
                                }: MonitorAuthCardProps) {
    return (
        <div className="monitor-auth-stack">
            <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); onLogin() }}>
                    <input
                        autoComplete="email"
                        aria-label="Email"
                        className="input-shell monitor-auth-input h-12"
                        id="monitor-email"
                        name="email"
                        onChange={(event) => onFieldChange('email', event.target.value)}
                        placeholder="Email"
                        type="email"
                        value={authForm.email}
                    />
                    <input
                        autoComplete="current-password"
                        aria-label="Password"
                        className="input-shell monitor-auth-input h-12"
                        id="monitor-password"
                        name="password"
                        onChange={(event) => onFieldChange('password', event.target.value)}
                        placeholder="Password"
                        type="password"
                        value={authForm.password}
                    />

                    <div className="monitor-auth-actions">
                        <button
                            className="button-secondary h-11 w-full"
                            disabled={busyAction !== null}
                            onClick={onRegister}
                            type="button"
                        >
                            {busyAction === 'register' ? 'Registering...' : 'Register'}
                        </button>
                        <button
                            className="button-primary h-11 w-full"
                            disabled={busyAction !== null}
                            type="submit"
                        >
                            {busyAction === 'login' ? 'Logging in...' : 'Log in'}
                        </button>
                    </div>

                    <div className="auth-divider" role="presentation">
                        <span>Other Options</span>
                    </div>

                    <button
                        className="button-google monitor-auth-google h-11 w-full"
                        disabled={busyAction !== null}
                        onClick={onGoogleLogin}
                        type="button"
                    >
                        <span className="button-google-mark">
                            <GoogleMarkIcon/>
                        </span>
                        <span>
                            {busyAction === 'google-login' ? 'Redirecting to Google...' : 'Continue with Google'}
                        </span>
                    </button>
            </form>
            {authMessage ? (
                <p className="text-sm leading-6 text-[var(--color-ink-soft)]" role="status">{authMessage}</p>
            ) : null}
            <p className="text-xs text-center leading-5 text-[var(--color-ink-soft)]">
                Google sign-in requests your email address only.
            </p>
        </div>
    )
}

export function MonitorPageHeader({
                                      isLoggedIn,
                                      onOpenAuth,
                                      onLogout,
                                      onOpenSearch,
                                      searchDisabled,
                                      ready,
                                      searchTriggerRef,
                                      sessionEmail,
                                  }: MonitorPageHeaderProps) {
    return (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)_minmax(0,1fr)]">
            <div className="col-start-1 row-start-1 lg:col-auto lg:row-auto mb-3">
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] md:text-4xl">
                    Seat <span className="brand-accent-gradient">Alerts</span>
                </h1>
            </div>

            <div className="col-span-2 row-start-2 min-w-0 lg:col-auto lg:row-auto flex justify-center">
                {ready ? (
                    <button
                        aria-haspopup="dialog"
                        ref={searchTriggerRef}
                        className="search-trigger-shell w-4/5"
                        onClick={isLoggedIn ? onOpenSearch : onOpenAuth}
                        disabled={searchDisabled}
                        type="button"
                    >
                        <span className="min-w-0 truncate text-[var(--search-trigger-text-muted)]">
                            Search courses...
                        </span>
                        <SearchTriggerHint/>
                    </button>
                ) : null}
            </div>

            <div className="col-start-2 row-start-1 justify-self-end lg:col-auto lg:row-auto lg:justify-self-end">
                {!ready ? (
                    <p className="text-sm leading-7 text-[var(--color-ink-soft)] md:text-right">
                        Loading session...
                    </p>
                ) : isLoggedIn ? (
                    <div className="flex flex-col items-end gap-0.5 text-right">
                        <span className="monitor-email-label max-w-[42vw] truncate md:max-w-none">{sessionEmail}</span>
                        <button className="logout-text-link" onClick={onLogout} type="button">
                            Log out
                        </button>
                    </div>
                ) : (
                    <button className="login-text-link" onClick={onOpenAuth} type="button">
                        Log in..
                    </button>
                )}
            </div>
        </div>
    )
}

export function MonitorTaskList({
                                    canSearch,
                                    deleteError,
                                    deletingDocId,
                                    loadError,
                                    onRetryLoad,
                                    termsLoading,
                                    onDelete,
                                    tasks,
                                }: MonitorTaskListProps) {
    if (loadError) {
        return (
            <div className="px-5 py-10 text-center" role="alert">
                <h2 className="text-2xl font-semibold text-[var(--color-ink)]">Couldn&apos;t load your alerts</h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--color-ink-soft)]">
                    {loadError} Your alerts are still active.
                </p>
                <button className="button-secondary mt-5" onClick={onRetryLoad} type="button">Retry</button>
            </div>
        )
    }

    if (tasks.length === 0) {
        return (
            <EmptyState
                bordered={false}
                description={termsLoading
                    ? 'Your alerts will appear here.'
                    : canSearch
                        ? 'Search for a course first!'
                        : 'New alerts are unavailable right now.'}
                title="Your watchlist is empty."
            />
        )
    }

    return (
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
                                <p className="mt-1 text-md text-[var(--color-ink-soft)]">
                                    Section {task.sectionId}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge status={task.status}/>
                            </div>
                        </div>

                        <dl className="mt-5 mb-4 grid gap-3 border-t border-[var(--surface-divider)] pt-4 text-md leading-6 text-[var(--color-ink-soft)]">
                            <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-start gap-1.5">
                                <dt className="font-semibold text-[var(--color-open)]">Open seats</dt>
                                <dd className="min-w-0 leading-7">{task.openSeats ?? '?'} / {task.capacity ?? '?'}</dd>
                            </div>
                            <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-start gap-1.5">
                                <dt className="font-semibold text-[var(--color-waitlist)]">Waitlist spots</dt>
                                <dd className="min-w-0 leading-7">{task.waitlistSeats ?? '?'} / {task.waitlistCapacity ?? '?'}</dd>
                            </div>
                            {meetingSummary ? (
                                <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-start gap-1.5">
                                    <dt className="font-semibold text-[var(--color-schedule)]">Schedule</dt>
                                    <dd className="min-w-0 leading-7">{meetingSummary}</dd>
                                </div>
                            ) : null}
                            {meetingLocationSummary ? (
                                <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-start gap-1.5">
                                    <dt className="font-semibold text-[var(--color-location)]">Location</dt>
                                    <dd className="min-w-0 leading-7">{meetingLocationSummary}</dd>
                                </div>
                            ) : null}
                        </dl>

                        <div className="mt-auto flex flex-wrap items-center justify-end gap-3 border-t border-[var(--surface-divider)] pt-4">
                            {deleteError?.docId === task.docId ? (
                                <p className="mr-auto text-sm text-[#9b365e]" role="alert">
                                    {deleteError.message}
                                </p>
                            ) : null}
                            <button
                                className="min-w-[112px] rounded-[14px] px-3 py-0 text-[var(--action-link-subtle)] transition hover:text-[var(--action-link-subtle-hover)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55"
                                disabled={deletingDocId === task.docId}
                                onClick={() => onDelete(task.docId)}
                                type="button"
                            >
                                {deletingDocId === task.docId ? 'Removing...' : 'Remove Alert'}
                            </button>
                        </div>
                    </article>
                )
            })}
        </div>
    )
}
