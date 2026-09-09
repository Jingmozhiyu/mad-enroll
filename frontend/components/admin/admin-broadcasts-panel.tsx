'use client'

import {useCallback, useEffect, useState, type FormEvent} from 'react'
import {createBroadcast, fetchAdminTerms, fetchBroadcast, fetchBroadcastRecipients, fetchBroadcasts, sendBroadcast, sendBroadcastTestEmail} from '@/lib/api/client/admin'
import {getErrorMessage} from '@/lib/api/client/http'
import type {AcademicTerm, Broadcast, BroadcastDraft, BroadcastDelivery, PageResponse} from '@/lib/admin/types'
import {MiniPagination} from '@/components/admin/admin-sections'

const blank: BroadcastDraft = {subject: '', body: '', audience: 'TERM_SUBSCRIBERS', termCode: ''}
const statusLabel = {DRAFT: 'Draft', QUEUED: 'Sending', COMPLETED: 'Finished'}
const deliveryLabel = {PENDING: 'Pending', SENDING: 'Sending', SENT: 'Sent', FAILED: 'Failed', UNKNOWN: 'Needs review'}

export function AdminBroadcastsPanel() {
    const [list, setList] = useState<PageResponse<Broadcast> | null>(null)
    const [page, setPage] = useState(1)
    const [terms, setTerms] = useState<AcademicTerm[]>([])
    const [selected, setSelected] = useState<Broadcast | null>(null)
    const [draft, setDraft] = useState<BroadcastDraft>(blank)
    const [composing, setComposing] = useState(false)
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [confirmed, setConfirmed] = useState(false)
    const [testRecipient, setTestRecipient] = useState('')
    const [recipients, setRecipients] = useState<PageResponse<BroadcastDelivery> | null>(null)
    const [recipientPage, setRecipientPage] = useState(1)
    const [recipientError, setRecipientError] = useState('')
    const [refreshVersion, setRefreshVersion] = useState(0)

    const refresh = useCallback(async () => {
        setLoading(true)
        setError('')
        try { setList(await fetchBroadcasts(page)) }
        catch (error) { setError(getErrorMessage(error, 'Failed to load broadcasts.')) }
        finally { setLoading(false) }
    }, [page])
    useEffect(() => { void refresh() }, [refresh])
    useEffect(() => {
        let active = true
        void fetchAdminTerms().then(items => { if (active) setTerms(items) })
            .catch(error => { if (active) setError(getErrorMessage(error, 'Failed to load terms. Refresh the page to retry.')) })
        return () => { active = false }
    }, [])

    const selectedId = selected?.id
    const selectedStatus = selected?.status
    useEffect(() => {
        if (!selectedId) return
        let active = true
        let timer: ReturnType<typeof setTimeout> | undefined
        setRecipients(null)
        const load = async () => {
            try {
                const [detail, rows] = await Promise.all([fetchBroadcast(selectedId), fetchBroadcastRecipients(selectedId, recipientPage)])
                if (!active) return
                setSelected(detail)
                setRecipients(rows)
                setRecipientError('')
                setList(current => current ? {...current, items: current.items.map(item => item.id === detail.id ? detail : item)} : current)
                if (detail.status === 'QUEUED') timer = setTimeout(() => void load(), 3000)
            } catch (error) {
                if (active) setRecipientError(getErrorMessage(error, 'Failed to refresh delivery results.'))
            }
        }
        void load()
        return () => { active = false; if (timer) clearTimeout(timer) }
    }, [selectedId, selectedStatus, recipientPage, refreshVersion])

    function choose(item: Broadcast) {
        setSelected(item)
        setRecipientPage(1)
        setConfirmed(false)
        setMessage('')
        setRecipientError('')
        setComposing(false)
    }
    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setBusy(true); setError(''); setMessage('')
        try {
            const result = await createBroadcast({...draft, termCode: draft.audience === 'TERM_SUBSCRIBERS' ? draft.termCode : undefined})
            choose(result)
            setDraft(blank)
            setMessage(`Draft saved with ${result.recipientCount} recipients. Review the message before sending.`)
            await refresh()
        } catch (error) { setError(getErrorMessage(error, 'Failed to save draft.')) }
        finally { setBusy(false) }
    }
    async function testEmail(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!selected) return
        setBusy(true); setError(''); setMessage('')
        try {
            await sendBroadcastTestEmail(selected.id, testRecipient.trim())
            setMessage(`Test queued for ${testRecipient.trim()}. Check that inbox before sending the broadcast.`)
        } catch (error) { setError(getErrorMessage(error, 'Test status could not be confirmed. Check the inbox before sending another test.')) }
        finally { setBusy(false) }
    }
    async function queue() {
        if (!selected || !confirmed) return
        setBusy(true); setError(''); setMessage('')
        try {
            const result = await sendBroadcast(selected.id)
            setSelected(result)
            setConfirmed(false)
            setMessage('Queued for background delivery. You can leave this page while sending continues.')
            await refresh()
        } catch (error) { setError(getErrorMessage(error, 'Could not confirm queue status. Refresh before trying again.')) }
        finally { setBusy(false) }
    }

    return <section className="surface-panel-strong rounded-[14px] px-4 py-4" aria-labelledby="broadcast-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
                <h2 id="broadcast-heading" className="text-base font-semibold text-[var(--color-ink)]">Broadcasts</h2>
                <p className="mt-1 max-w-[70ch] text-sm text-[var(--color-ink-soft)]">Send semester reports and enrollment reminders. Save a draft, review its recipients, then send.</p>
            </div>
            <div className="flex flex-wrap gap-2">
                <button className="button-secondary" type="button" disabled={busy || loading} onClick={() => {void refresh(); setRefreshVersion(value => value + 1)}}>{loading ? 'Refreshing…' : 'Refresh broadcasts'}</button>
                <button className="button-primary" type="button" disabled={busy} onClick={() => {setComposing(true); setSelected(null); setConfirmed(false); setMessage('')}}>New broadcast</button>
            </div>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-[var(--color-ink)]">{error}</p>}
        <p role="status" className={message ? 'mt-3 text-sm text-[var(--color-ink)]' : 'sr-only'}>{message}</p>

        {composing && <form className="subtle-panel-divider mt-4 grid gap-4 border-t pt-4" onSubmit={event => void save(event)}>
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm text-[var(--color-ink)]">Audience
                    <select className="input-shell h-11" disabled={busy} value={draft.audience} onChange={event => setDraft({...draft, audience: event.target.value as BroadcastDraft['audience']})}>
                        <option value="TERM_SUBSCRIBERS">Term subscribers</option><option value="ALL_USERS">All users</option>
                    </select>
                </label>
                {draft.audience === 'TERM_SUBSCRIBERS' && <label className="grid gap-1.5 text-sm text-[var(--color-ink)]">Term
                    <select className="input-shell h-11" required disabled={busy} value={draft.termCode} onChange={event => setDraft({...draft, termCode: event.target.value})}>
                        <option value="">Choose a term</option>
                        {terms.map(term => <option key={term.code} value={term.code}>{term.label} · {term.code}</option>)}
                    </select>
                </label>}
            </div>
            <p className="text-sm text-[var(--color-ink-soft)]">{draft.audience === 'TERM_SUBSCRIBERS' ? 'Includes disabled subscriptions. ' : ''}Recipients are fixed when the draft is saved. Each email address receives one copy.</p>
            <label className="grid gap-1.5 text-sm text-[var(--color-ink)]">Subject
                <input className="input-shell h-11" required maxLength={200} disabled={busy} value={draft.subject} onChange={event => setDraft({...draft, subject: event.target.value})}/>
            </label>
            <label className="grid gap-1.5 text-sm text-[var(--color-ink)]">Message
                <textarea className="input-shell min-h-48 py-3" rows={8} required maxLength={20000} disabled={busy} value={draft.body} onChange={event => setDraft({...draft, body: event.target.value})}/>
                <span className="text-[var(--color-ink-soft)]">Plain text. Include a full report URL in the message to share a report.</span>
            </label>
            <div className="flex flex-wrap gap-2">
                <button className="button-primary" disabled={busy || !draft.subject.trim() || !draft.body.trim()} type="submit">{busy ? 'Saving…' : 'Save draft & review'}</button>
                <button className="button-secondary" disabled={busy} type="button" onClick={() => setComposing(false)}>Cancel</button>
            </div>
        </form>}

        {!list && loading ? <div className="surface-inner mt-4 h-20 rounded-lg" aria-label="Loading broadcasts"/> : null}
        {list && <div className="mt-4">
            {list.items.length === 0 ? <p className="py-3 text-sm text-[var(--color-ink-soft)]">No broadcasts yet. Create a draft to prepare your first update.</p> :
                list.items.map(item => <button key={item.id} type="button" disabled={busy} aria-pressed={selected?.id === item.id}
                    onClick={() => choose(item)} className={`subtle-panel-divider flex w-full flex-wrap items-center justify-between gap-2 border-b px-2 py-3 text-left text-sm text-[var(--color-ink)] last:border-b-0 hover:bg-[var(--color-surface-soft)] ${selected?.id === item.id ? 'surface-inner' : ''}`}>
                    <span className="min-w-0 flex-1 break-words font-medium">{item.subject}</span>
                    <span className="text-[var(--color-ink-soft)]">{statusLabel[item.status]} · {item.counts.sent}/{item.recipientCount} sent{item.counts.failed > 0 ? ` · ${item.counts.failed} failed` : ''}{item.counts.unknown > 0 ? ` · ${item.counts.unknown} need review` : ''}</span>
                </button>)}
            <MiniPagination currentPage={page} totalPages={list.totalPages} disabled={busy || loading} onPageChange={setPage}/>
        </div>}

        {selected && !composing && <div className="subtle-panel-divider mt-4 grid gap-4 border-t pt-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="break-words font-semibold text-[var(--color-ink)]">{selected.subject}</h3>
                    <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{selected.audience === 'ALL_USERS' ? 'All users' : `Term ${selected.termCode} subscribers, including disabled`} · {selected.recipientCount} recipients · {statusLabel[selected.status]}</p>
                </div>
                <button className="button-secondary" type="button" disabled={busy} onClick={() => {setDraft({subject: selected.subject, body: selected.body, audience: selected.audience, termCode: selected.termCode ?? ''}); setComposing(true); setMessage('')}}>Use as new draft</button>
            </div>
            <div className="surface-inner max-h-80 overflow-auto rounded-lg p-4">
                <p className="max-w-[75ch] whitespace-pre-wrap break-words text-sm text-[var(--color-ink)]">{selected.body}</p>
            </div>
            <p className="text-sm text-[var(--color-ink-soft)]">{selected.counts.sent} sent · {selected.counts.pending} pending · {selected.counts.sending} sending · {selected.counts.failed} failed · {selected.counts.unknown} need review</p>
            {selected.counts.unknown > 0 && <p className="text-sm text-[var(--color-ink)]">Some deliveries stopped before a result was recorded. Check the mail provider before contacting those recipients again; they are excluded from automatic retries.</p>}
            <form onSubmit={testEmail} className="grid justify-items-start gap-2">
                <label htmlFor="broadcast-test-recipient" className="text-sm text-[var(--color-ink)]">Test recipient email</label>
                <div className="flex w-full flex-wrap gap-2">
                    <input id="broadcast-test-recipient" type="email" required value={testRecipient} disabled={busy}
                        onChange={event => setTestRecipient(event.target.value)}
                        className="surface-inner min-w-0 flex-1 rounded-lg px-3 py-2 text-sm text-[var(--color-ink)]"/>
                    <button type="submit" className="button-secondary" disabled={busy || !testRecipient.trim()}>Send test email</button>
                </div>
                <p className="text-sm text-[var(--color-ink-soft)]">Sends this message to one address. The broadcast audience and counts stay the same. Failed sends are not retried.</p>
            </form>
            {selected.status === 'DRAFT' && <div className="grid justify-items-start gap-3">
                {selected.recipientCount === 0 ? <p className="text-sm text-[var(--color-ink-soft)]">This draft has no recipients. Create a new draft with a different audience.</p> : <>
                    <label className="flex items-start gap-2 text-sm text-[var(--color-ink)]">
                        <input className="mt-1 h-4 w-4" type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)}/>
                        <span>{`I reviewed this message and its ${selected.recipientCount} recipients.`}</span>
                    </label>
                    <button className="button-primary" type="button" disabled={busy || !confirmed}
                        onClick={() => void queue()}>
                        {busy ? 'Queuing…' : `Send to ${selected.recipientCount} recipients`}
                    </button>
                </>}
            </div>}
            <div>
                <h4 className="text-sm font-semibold text-[var(--color-ink)]">Recipients & delivery results</h4>
                {recipientError && <p role="alert" className="mt-2 text-sm text-[var(--color-ink)]">{recipientError} <button type="button" className="underline" onClick={() => setRefreshVersion(value => value + 1)}>Try again</button></p>}
                {!recipients && !recipientError && <p role="status" className="py-3 text-sm text-[var(--color-ink-soft)]">Loading recipients…</p>}
                {recipients && <>
                    <div className="mt-2 overflow-x-auto">
                        <table className="w-full text-left text-sm text-[var(--color-ink)]">
                            <thead><tr className="subtle-panel-divider border-b"><th className="py-2 pr-3">Email</th><th className="py-2 pr-3">Status</th><th className="py-2">Attempts</th></tr></thead>
                            <tbody>{recipients.items.map(row => <tr key={row.id} className="subtle-panel-divider border-b last:border-b-0">
                                <td className="break-all py-2 pr-3">{row.email}</td>
                                <td className="py-2 pr-3">{deliveryLabel[row.status]}{row.lastError && <span className="mt-1 block max-w-[45ch] text-xs text-[var(--color-ink-soft)]">{row.lastError}</span>}</td>
                                <td className="py-2">{row.attempts}</td>
                            </tr>)}</tbody>
                        </table>
                    </div>
                    <MiniPagination currentPage={recipientPage} totalPages={recipients.totalPages} disabled={busy} onPageChange={setRecipientPage}/>
                </>}
            </div>
        </div>}
    </section>
}
