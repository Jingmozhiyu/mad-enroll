'use client'

import {useCallback, useEffect, useState, type FormEvent} from 'react'
import {createAdminTerm, fetchAdminTerms, updateAdminTerm} from '@/lib/api/client/admin'
import {getErrorMessage} from '@/lib/api/client/http'
import type {AcademicTerm, TermStatus} from '@/lib/admin/types'

const statusLabels: Record<TermStatus, string> = {
    UPCOMING: 'Upcoming',
    ACTIVE: 'Active',
    EXPIRED: 'Expired',
}

const statusDescriptions: Record<TermStatus, string> = {
    UPCOMING: 'Accept subscriptions. Monitoring is paused; subscription choices are preserved.',
    ACTIVE: 'Monitor enabled subscriptions. Subscription choices are preserved.',
    EXPIRED: 'Stop monitoring and disable every subscription in this term. Reopening will not restore them.',
}

export function AdminTermsPanel({onChanged}: {onChanged: () => Promise<void>}) {
    const [terms, setTerms] = useState<AcademicTerm[]>([])
    const [loaded, setLoaded] = useState(false)
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState<string | null>(null)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [code, setCode] = useState('')
    const [label, setLabel] = useState('')

    const loadTerms = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            setTerms(await fetchAdminTerms())
            setLoaded(true)
        } catch (error) {
            setError(getErrorMessage(error, 'Failed to load terms. Admin access is required.'))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { void loadTerms() }, [loadTerms])

    async function createTerm(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setBusy('create')
        setError('')
        setMessage('')
        try {
            const term = await createAdminTerm({code, label: label.trim()})
            setTerms((current) => [...current, term].sort((a, b) => b.code.localeCompare(a.code)))
            setCode('')
            setLabel('')
            setMessage(`${term.label} created as Upcoming. Users can subscribe before monitoring starts.`)
        } catch (error) {
            setError(getErrorMessage(error, 'Failed to create term.'))
        } finally {
            setBusy(null)
        }
    }

    async function changeStatus(term: AcademicTerm, status: TermStatus) {
        setBusy(term.code)
        setError('')
        setMessage('')
        try {
            const result = await updateAdminTerm(term.code, status)
            setTerms((current) => current.map((item) => item.code === term.code ? result.term : item))
            setMessage(status === 'EXPIRED'
                ? `${term.label} expired. ${result.disabledSubscriptions} subscriptions disabled.`
                : `${term.label} is now ${statusLabels[status]}. Subscription choices were preserved.`)
            await onChanged()
        } catch (error) {
            setError(getErrorMessage(error, 'Failed to update term. Refresh to check its current status.'))
        } finally {
            setBusy(null)
        }
    }

    return (
        <section className="surface-panel-strong rounded-[14px] px-4 py-4" aria-labelledby="terms-heading">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 id="terms-heading" className="text-base font-semibold text-[var(--color-ink)]">Terms</h2>
                    <p className="mt-1 max-w-[70ch] text-sm text-[var(--color-ink-soft)]">
                        Upcoming accepts subscriptions. Active monitors them. Expired ends service for that term.
                    </p>
                </div>
                <button className="button-secondary" disabled={loading || busy !== null}
                        onClick={() => void loadTerms()} type="button">
                    {loading ? 'Refreshing...' : 'Refresh terms'}
                </button>
            </div>

            {error ? <p role="alert" className="mt-3 text-sm text-[var(--color-ink)]">{error}</p> : null}
            <p role="status" className={message ? 'mt-3 text-sm text-[var(--color-ink)]' : 'sr-only'}>{message}</p>

            {!loaded && loading ? (
                <div className="surface-inner mt-4 h-24 rounded-lg" aria-label="Loading terms" />
            ) : loaded ? (
                <>
                    <div className="mt-4">
                        {terms.length === 0 ? (
                            <p className="py-3 text-sm text-[var(--color-ink-soft)]">No terms configured. Add a term below to accept subscriptions.</p>
                        ) : terms.map((term) => (
                            <TermRow key={`${term.code}-${term.status}`} term={term} busy={busy}
                                     disabled={loading || busy !== null} onSave={changeStatus} />
                        ))}
                    </div>
                    <form onSubmit={(event) => void createTerm(event)}
                          className="subtle-panel-divider mt-4 grid gap-3 border-t pt-4 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-end">
                        <label className="grid gap-1.5 text-sm text-[var(--color-ink)]">
                            Term code
                            <input className="input-shell h-11" inputMode="numeric" pattern="[0-9]{4}"
                                   maxLength={4} required value={code} disabled={busy !== null}
                                   onChange={(event) => setCode(event.target.value)} />
                        </label>
                        <label className="grid gap-1.5 text-sm text-[var(--color-ink)]">
                            Term name
                            <input className="input-shell h-11" maxLength={80} required value={label}
                                   disabled={busy !== null} onChange={(event) => setLabel(event.target.value)} />
                        </label>
                        <button className="button-primary min-h-11" disabled={loading || busy !== null || !label.trim()} type="submit">
                            {busy === 'create' ? 'Adding...' : 'Add upcoming term'}
                        </button>
                    </form>
                </>
            ) : null}
        </section>
    )
}

function TermRow({term, busy, disabled, onSave}: {
    term: AcademicTerm
    busy: string | null
    disabled: boolean
    onSave: (term: AcademicTerm, status: TermStatus) => Promise<void>
}) {
    const [status, setStatus] = useState(term.status)
    return (
        <div className="subtle-panel-divider grid gap-3 border-b py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_12rem_15rem] md:items-center">
            <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-[var(--color-ink)]">
                    {term.label} <span className="font-normal">· {term.code} · {statusLabels[term.status]}</span>
                </p>
                <p id={`term-help-${term.code}`} className="mt-1 text-sm text-[var(--color-ink-soft)]">
                    {statusDescriptions[status]}
                </p>
            </div>
            <label className="grid gap-1.5 text-sm text-[var(--color-ink)]">
                <span className="sr-only">Status for {term.label}</span>
                <select className="input-shell h-11" value={status} disabled={disabled}
                        aria-describedby={`term-help-${term.code}`}
                        onChange={(event) => setStatus(event.target.value as TermStatus)}>
                    {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
            </label>
            <button className="button-secondary min-h-11" type="button"
                    disabled={disabled || status === term.status} onClick={() => void onSave(term, status)}>
                {busy === term.code ? 'Saving...' : status === 'EXPIRED' ? 'Expire & disable subscriptions' : 'Save status'}
            </button>
        </div>
    )
}
