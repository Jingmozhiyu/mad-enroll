'use client'

import {usePathname, useRouter, useSearchParams} from 'next/navigation'
import {AdminTermsPanel} from '@/components/admin/admin-terms-panel'
import {AdminBroadcastsPanel} from '@/components/admin/admin-broadcasts-panel'
import {AdminMailTab} from '@/components/admin/admin-mail-tab'
import {AdminOverviewTab} from '@/components/admin/admin-overview-tab'
import {AdminUsersTab} from '@/components/admin/admin-users-tab'
import {EmptyState} from '@/components/empty-state'
import {ProgressLink} from '@/components/navigation-progress'
import {useAdminDashboard} from '@/components/admin/use-admin-dashboard'

const TABS = [
    {id: 'overview', label: 'Overview'},
    {id: 'users', label: 'Users'},
    {id: 'mail', label: 'Mail'},
    {id: 'operations', label: 'Operations'},
] as const

type AdminTab = (typeof TABS)[number]['id']

function parseTab(value: string | null): AdminTab {
    return TABS.find((tab) => tab.id === value)?.id ?? 'overview'
}

export function AdminDashboardPage() {
    const dashboard = useAdminDashboard()
    const {emailHistoryPage, isLoggedIn, loadDashboard, ready, statusMessage} = dashboard
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    // The open tab lives in the URL (?tab=), so a reload or a shared link lands on the same tab.
    const activeTab = parseTab(searchParams.get('tab'))

    function selectTab(tab: AdminTab) {
        const params = new URLSearchParams(searchParams.toString())
        if (tab === 'overview') {
            params.delete('tab')
        } else {
            params.set('tab', tab)
        }
        router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, {scroll: false})
    }

    function refreshDashboard() {
        return loadDashboard(undefined, {emailHistoryPage, preserveClientPagination: true})
    }

    if (!ready) {
        return (
            <section className="surface-panel-strong rounded-[14px] px-5 py-8">
                <p className="text-sm text-[var(--color-ink-soft)]">Loading session...</p>
            </section>
        )
    }

    if (!isLoggedIn) {
        return (
            <section className="surface-panel-strong rounded-[14px] px-5 py-8">
                <EmptyState
                    description="This route does not redirect on its own. Use the monitor page to login, then return here if your account has admin permissions."
                    title="Login required"
                />
                <div className="mt-5 flex justify-center">
                    <ProgressLink className="button-primary min-w-[160px]" href="/monitor">
                        Go to Monitor
                    </ProgressLink>
                </div>
            </section>
        )
    }

    return (
        <div className="grid gap-5">
            {/* Plain centered tabs; the selected one is bold and underlined. */}
            <div className="grid justify-items-center gap-1">
                <div aria-label="Admin sections" className="flex max-w-full gap-x-6 overflow-x-auto sm:gap-x-8" role="tablist">
                    {TABS.map((tab) => {
                        const active = tab.id === activeTab
                        return (
                            <button
                                key={tab.id}
                                aria-controls={`admin-tab-${tab.id}`}
                                aria-selected={active}
                                className={[
                                    'shrink-0 bg-transparent px-0 py-2 transition',
                                    active
                                        ? 'font-semibold text-[var(--color-ink)] underline decoration-2 underline-offset-8'
                                        : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]',
                                ].join(' ')}
                                id={`admin-tab-button-${tab.id}`}
                                onClick={() => selectTab(tab.id)}
                                role="tab"
                                type="button"
                            >
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
                {/* Results of actions (a toggle, a test email, a failed load); the line keeps its height when empty. */}
                <p className="min-h-5 text-center text-sm text-[var(--color-ink-soft)]" role="status">{statusMessage}</p>
            </div>

            {/* min-w-0 lets wide tables scroll inside their panel instead of widening the page. */}
            <div
                aria-labelledby={`admin-tab-button-${activeTab}`}
                className="min-w-0"
                id={`admin-tab-${activeTab}`}
                role="tabpanel"
            >
                {activeTab === 'overview' ? (
                    <AdminOverviewTab dashboard={dashboard}/>
                ) : activeTab === 'users' ? (
                    <AdminUsersTab dashboard={dashboard}/>
                ) : activeTab === 'mail' ? (
                    <AdminMailTab dashboard={dashboard}/>
                ) : (
                    <div className="grid gap-5">
                        <AdminTermsPanel onChanged={refreshDashboard}/>
                        <AdminBroadcastsPanel/>
                    </div>
                )}
            </div>
        </div>
    )
}
