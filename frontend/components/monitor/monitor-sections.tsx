import type {RefObject} from 'react'
import {EmptyState} from '@/components/empty-state'
import {getMeetingLocationSummary, getMeetingSummary} from '@/lib/course/format'
import type {Task} from '@/lib/course/types'

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
    statusMessage: string
}

type MonitorPageHeaderProps = {
    isLoggedIn: boolean
    onLogout: () => void
    onOpenSearch: () => void
    ready: boolean
    searchTriggerRef: RefObject<HTMLButtonElement | null>
    sessionEmail?: string
    statusMessage: string
}

type MonitorTaskListProps = {
    deletingDocId: string | null
    onDelete: (docId: string, sectionId: string) => void
    tasks: Task[]
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

function SearchIcon() {
    return (
        <svg
            aria-hidden="true"
            className="h-5 w-5 text-[var(--search-trigger-text)]"
            fill="none"
            viewBox="0 0 20 20"
        >
            <circle cx="8.5" cy="8.5" r="4.75" stroke="currentColor" strokeWidth="1.8"/>
            <path
                d="m12.2 12.2 4.1 4.1"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
            />
        </svg>
    )
}

export function StatusBadge({status}: StatusBadgeProps) {
    const normalized = status?.toUpperCase?.() || 'UNKNOWN'
    const statusClass = statusClassMap[normalized] ?? 'status-unknown'
    const displayLabel = normalized === 'WAITLISTED' ? 'WAITLIST' : normalized

    return (
        <span
            className={`inline-flex min-w-[96px] items-center justify-center rounded-xl px-2.5 py-2 text-sm font-bold tracking-[0.02em] ${statusClass}`}
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
                                    statusMessage,
                                }: MonitorAuthCardProps) {
    return (
        <div className="mx-auto grid w-full max-w-[540px] gap-6 pt-4 text-center md:pt-8">
            <div className="flex flex-col gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-ink)] md:text-4xl">
                    Seat Alerts
                </h1>
                <p className="text-sm leading-7 text-[var(--color-ink-soft)] md:text-base">
                    {statusMessage}
                </p>
            </div>

            <div className="surface-panel monitor-auth-card grid gap-4 rounded-[16px] p-5 md:p-6">
                <div className="monitor-auth-stack">
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
                            onClick={onLogin}
                            type="button"
                        >
                            {busyAction === 'login' ? 'Logging in...' : 'Login'}
                        </button>
                    </div>

                    <div className="auth-divider" role="presentation">
                        <span>OR</span>
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
                </div>

                <p className="text-center text-sm leading-6 text-[var(--color-ink-soft)]">
                    Google login only requests your verified email address.
                </p>
            </div>
        </div>
    )
}

export function MonitorPageHeader({
                                      isLoggedIn,
                                      onLogout,
                                      onOpenSearch,
                                      ready,
                                      searchTriggerRef,
                                      sessionEmail,
                                      statusMessage,
                                  }: MonitorPageHeaderProps) {
    return (
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
                        onClick={onOpenSearch}
                        type="button"
                    >
                        <span className="flex min-w-0 items-center gap-3">
                            <SearchIcon/>
                            <span className="truncate text-[var(--search-trigger-text-muted)]">
                                Search courses...
                            </span>
                        </span>
                        <span className="rounded-full border border-[var(--search-trigger-hint-border)] bg-[var(--search-trigger-hint-background)] px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--search-trigger-hint-text)]">
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
                        <span className="monitor-email-label">{sessionEmail}</span>
                        <button
                            className="logout-text-link"
                            onClick={onLogout}
                            type="button"
                        >
                            Logout
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    )
}

export function MonitorTaskList({
                                    deletingDocId,
                                    onDelete,
                                    tasks,
                                }: MonitorTaskListProps) {
    if (tasks.length === 0) {
        return (
            <EmptyState
                description="No alerts yet. Search for a course or section to start tracking seat openings."
                title="No alerts yet"
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
                            <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-start gap-3">
                                <dt className="font-semibold text-[var(--color-open)]">Open seats</dt>
                                <dd className="min-w-0 leading-7">{task.openSeats ?? '?'} / {task.capacity ?? '?'}</dd>
                            </div>
                            <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-start gap-3">
                                <dt className="font-semibold text-[var(--color-waitlist)]">Waitlist</dt>
                                <dd className="min-w-0 leading-7">{task.waitlistSeats ?? '?'} / {task.waitlistCapacity ?? '?'}</dd>
                            </div>
                            {meetingSummary ? (
                                <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-start gap-3">
                                    <dt className="font-semibold text-[var(--color-schedule)]">Schedule</dt>
                                    <dd className="min-w-0 leading-7">{meetingSummary}</dd>
                                </div>
                            ) : null}
                            {meetingLocationSummary ? (
                                <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-start gap-3">
                                    <dt className="font-semibold text-[var(--color-location)]">Location</dt>
                                    <dd className="min-w-0 leading-7">{meetingLocationSummary}</dd>
                                </div>
                            ) : null}
                        </dl>

                        <div className="mt-auto flex flex-wrap justify-end gap-3 border-t border-[var(--surface-divider)] pt-4">
                            <button
                                className="min-w-[112px] rounded-[14px] px-3 py-0 text-[var(--action-link-subtle)] transition hover:text-[var(--action-link-subtle-hover)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55"
                                disabled={deletingDocId === task.docId}
                                onClick={() => onDelete(task.docId, task.sectionId)}
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
