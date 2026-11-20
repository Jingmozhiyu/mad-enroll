'use client'

import {Fragment} from 'react'
import {EmptyState} from '@/components/empty-state'
import {
    formatCount,
    formatShortDate,
    getStatusTextClass,
    getSubscriptionState,
    sortSubscriptionsByState,
    type AdminUserFilter,
} from '@/components/admin/admin-helpers'
import type {AdminDashboard} from '@/components/admin/use-admin-dashboard'
import {formatDateTime} from '@/lib/course/format'
import type {AdminUserSort} from '@/lib/admin/types'

/** A users-table header that sorts the whole list; the active column shows its direction. */
function SortableHeader({field, label, sort, onSort, className = 'px-3', activeClassName = 'text-[var(--color-ink)]'}: {
    field: AdminUserSort['field']
    label: string
    sort: AdminUserSort
    onSort: (field: AdminUserSort['field']) => void
    /** Padding and width of the cell, plus a color for colored state columns. */
    className?: string
    /** Text color of the button while this column is the active sort. */
    activeClassName?: string
}) {
    const active = sort.field === field
    return (
        <th
            aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
            className={`py-3 text-center font-semibold ${className}`}
        >
            <button
                className={`inline-flex items-center gap-1 bg-transparent p-0 uppercase tracking-[0.08em] transition hover:text-[var(--color-ink)] ${active ? activeClassName : ''}`}
                onClick={() => onSort(field)}
                type="button"
            >
                {label}
                <span aria-hidden="true" className={active ? '' : 'opacity-0'}>
                    {active && sort.direction === 'desc' ? '↓' : '↑'}
                </span>
            </button>
        </th>
    )
}

const USER_FILTERS: {filter: AdminUserFilter; label: string}[] = [
    {filter: 'enabled', label: 'Has enabled'},
    {filter: 'open', label: 'Has open seat'},
    {filter: 'admin', label: 'Admins'},
]

const STATE_COLUMNS: {field: 'open' | 'waitlist' | 'closed' | 'disabled'; label: string; colorClass: string}[] = [
    {field: 'open', label: 'Open', colorClass: 'text-[var(--color-mmj)]'},
    {field: 'waitlist', label: 'Waitlist', colorClass: 'text-[var(--color-monori)]'},
    {field: 'closed', label: 'Closed', colorClass: 'text-[var(--color-airi)]'},
    {field: 'disabled', label: 'Disabled', colorClass: 'text-[var(--color-haruka)]'},
]

/** The whole user list with search, filters and sorting; a row expands into its subscriptions. */
export function AdminUsersTab({dashboard}: {dashboard: AdminDashboard}) {
    const {
        expandedUserIds,
        handleToggle,
        handleUsersSortChange,
        loadedUserCount,
        setUsersQuery,
        togglingId,
        toggleExpandedUser,
        toggleUsersFilter,
        usersFilters,
        usersQuery,
        usersSort,
        visibleUsers,
    } = dashboard

    return (
        <section className="surface-panel-strong rounded-[14px] px-4 py-4">
            <div className="subtle-panel-divider flex flex-wrap items-center gap-x-5 gap-y-3 border-b pb-3">
                {loadedUserCount > 0 ? (
                    <>
                        <input
                            aria-label="Search users by email"
                            className="input-shell h-9 w-full max-w-[16rem] text-sm"
                            name="users-search"
                            onChange={(event) => setUsersQuery(event.target.value)}
                            placeholder="Search email"
                            type="search"
                            value={usersQuery}
                        />
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                            {USER_FILTERS.map(({filter, label}, index) => {
                                const active = usersFilters.includes(filter)
                                return (
                                    <Fragment key={filter}>
                                        {index > 0 ? <span aria-hidden="true" className="text-[var(--color-ink-muted)]">|</span> : null}
                                        <button
                                            aria-pressed={active}
                                            className={[
                                                'bg-transparent p-0 transition',
                                                active
                                                    ? 'font-semibold text-[var(--color-deep-teal)] underline underline-offset-4'
                                                    : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]',
                                            ].join(' ')}
                                            onClick={() => toggleUsersFilter(filter)}
                                            type="button"
                                        >
                                            {label}
                                        </button>
                                    </Fragment>
                                )
                            })}
                        </div>
                        <p className="ml-auto text-sm tabular-nums text-[var(--color-ink-soft)]">
                            {visibleUsers.length === loadedUserCount
                                ? `${loadedUserCount} users`
                                : `${visibleUsers.length} of ${loadedUserCount} users`}
                        </p>
                    </>
                ) : null}
            </div>

            {loadedUserCount === 0 ? (
                <div className="pt-4">
                    <EmptyState
                        description="No admin subscription data is available yet, or your account does not have the required permissions."
                        title="Nothing to show"
                    />
                </div>
            ) : visibleUsers.length === 0 ? (
                <p className="pt-4 text-sm text-[var(--color-ink-soft)]">No users match the search and filters.</p>
            ) : (
                <>
                    <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full border-collapse text-sm">
                            <thead>
                                <tr className="subtle-panel-divider border-b text-left text-xs uppercase tracking-[0.08em] text-[var(--color-ink-soft)]">
                                    <SortableHeader field="email" label="Email" onSort={handleUsersSortChange} sort={usersSort}/>
                                    <SortableHeader field="registered" label="Registered" onSort={handleUsersSortChange} sort={usersSort}/>
                                    <SortableHeader field="subscribed" label="Subscribed" onSort={handleUsersSortChange} sort={usersSort}/>
                                    {/* w-px keeps the four state columns at content width, so they sit close together. */}
                                    {STATE_COLUMNS.map(({field, label, colorClass}) => (
                                        <SortableHeader
                                            key={field}
                                            activeClassName=""
                                            className={`w-px whitespace-nowrap px-2 ${colorClass}`}
                                            field={field}
                                            label={label}
                                            onSort={handleUsersSortChange}
                                            sort={usersSort}
                                        />
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {visibleUsers.map(({user: row, counts, enabledCount}) => {
                                    const sortedSubscriptions = sortSubscriptionsByState(row.subscriptions)
                                    const isExpanded = expandedUserIds.includes(row.userId)

                                    return (
                                        <Fragment key={row.userId}>
                                            <tr className="subtle-panel-divider border-b text-sm text-[var(--color-ink-soft)]">
                                                <td className="px-3 py-3 font-medium text-center text-[var(--color-ink)]">
                                                    {row.email}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-3 text-center tabular-nums" title={formatDateTime(row.registeredAt)}>
                                                    {formatShortDate(row.registeredAt)}
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <button
                                                        className="bg-transparent p-0 underline underline-offset-4 transition hover:text-[var(--color-ink)]"
                                                        onClick={() => toggleExpandedUser(row.userId)}
                                                        type="button"
                                                    >
                                                        {enabledCount}/{row.subscriptions.length} Enabled
                                                    </button>
                                                </td>
                                                <td className="px-2 py-3 text-center text-[var(--color-mmj)]">
                                                    {counts.open}
                                                </td>
                                                <td className="px-2 py-3 text-center text-[var(--color-monori)]">
                                                    {counts.waitlist}
                                                </td>
                                                <td className="px-2 py-3 text-center text-[var(--color-airi)]">
                                                    {counts.closed}
                                                </td>
                                                <td className="px-2 py-3 text-center text-[var(--color-haruka)]">
                                                    {counts.disabled}
                                                </td>
                                            </tr>
                                            {isExpanded ? (
                                                <tr className="subtle-panel-divider border-b">
                                                    <td className="px-3 py-4" colSpan={7}>
                                                        <div
                                                            className="surface-inner overflow-x-auto rounded-[18px] px-3 py-3">
                                                            <table
                                                                className="min-w-full border-collapse text-sm">
                                                                <thead>
                                                                    <tr className="subtle-panel-divider border-b text-left text-xs uppercase tracking-[0.08em] text-[var(--color-ink-soft)]">
                                                                        <th className="px-3 py-2 font-semibold">Course</th>
                                                                        <th className="px-3 py-2 text-center font-semibold">Section</th>
                                                                        <th className="px-3 py-2 text-center font-semibold">Status</th>
                                                                        <th className="px-3 py-2 text-center font-semibold text-[var(--color-mmj)]">
                                                                            Open Seats
                                                                        </th>
                                                                        <th className="px-3 py-2 text-center font-semibold text-[var(--color-mmj)]">
                                                                            Capacity
                                                                        </th>
                                                                        <th className="px-3 py-2 text-center font-semibold text-[var(--color-monori)]">
                                                                            Waitlist Seats
                                                                        </th>
                                                                        <th className="px-3 py-2 text-center font-semibold text-[var(--color-monori)]">
                                                                            Waitlist Capacity
                                                                        </th>
                                                                        <th className="px-3 py-2 text-center font-semibold">Action</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {sortedSubscriptions.map((subscription) => {
                                                                        const state = getSubscriptionState(subscription)
                                                                        const isSaving = togglingId === subscription.subscriptionId

                                                                        return (
                                                                            <tr
                                                                                key={subscription.subscriptionId}
                                                                                className="subtle-panel-divider border-b text-[var(--color-ink-soft)] last:border-b-0"
                                                                            >
                                                                                <td className="px-3 py-2 text-[var(--color-ink)]">
                                                                                    {subscription.courseDisplayName}
                                                                                    <span className="block text-xs font-normal text-[var(--color-ink-soft)]">Term {subscription.termCode}</span>
                                                                                </td>
                                                                                <td className="px-3 py-2 text-center">
                                                                                    {subscription.sectionId}
                                                                                </td>
                                                                                <td
                                                                                    className={[
                                                                                        'px-3 py-2 text-center font-medium',
                                                                                        getStatusTextClass(state),
                                                                                    ].join(' ')}
                                                                                >
                                                                                    {state}
                                                                                </td>
                                                                                <td className="px-3 py-2 text-center text-[var(--color-mmj)]">
                                                                                    {formatCount(subscription.openSeats)}
                                                                                </td>
                                                                                <td className="px-3 py-2 text-center text-[var(--color-mmj)]">
                                                                                    {formatCount(subscription.capacity)}
                                                                                </td>
                                                                                <td className="px-3 py-2 text-center text-[var(--color-monori)]">
                                                                                    {formatCount(subscription.waitlistSeats)}
                                                                                </td>
                                                                                <td className="px-3 py-2 text-center text-[var(--color-monori)]">
                                                                                    {formatCount(subscription.waitlistCapacity)}
                                                                                </td>
                                                                                <td className="px-3 py-2 text-center">
                                                                                    <button
                                                                                        className="bg-transparent p-0 text-sm font-medium text-[var(--color-ink)] underline underline-offset-4 transition hover:text-[var(--color-deep-teal)] disabled:cursor-not-allowed disabled:opacity-50"
                                                                                        disabled={isSaving}
                                                                                        onClick={() =>
                                                                                            void handleToggle(
                                                                                                subscription.subscriptionId,
                                                                                                !subscription.enabled,
                                                                                            )
                                                                                        }
                                                                                        type="button"
                                                                                    >
                                                                                        {isSaving
                                                                                            ? 'Saving...'
                                                                                            : subscription.enabled
                                                                                                ? 'Disable'
                                                                                                : 'Enable'}
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        )
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : null}
                                        </Fragment>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </section>
    )
}
