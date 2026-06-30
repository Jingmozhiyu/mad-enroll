import type {ReactNode} from 'react'

export function SummaryMetric({
                                  label,
                                  value,
                                  detail,
                              }: {
    label: string
    value: number
    detail?: string
}) {
    return (
        <div className="surface-panel-strong rounded-[14px] px-4 py-4">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
                {label}
            </p>
            <p className="mt-2 text-4xl font-semibold text-[var(--color-ink)]">{value}</p>
            {detail ? <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{detail}</p> : null}
        </div>
    )
}

export function CompactPanel({
                                 title,
                                 className = '',
                                 children,
                             }: {
    title: string
    className?: string
    children: ReactNode
}) {
    return (
        <section
            className={['surface-panel-strong flex h-full flex-col rounded-[14px] px-4 py-4', className].join(' ')}
        >
            <h2 className="text-base font-semibold text-[var(--color-ink)]">{title}</h2>
            <div className="mt-4 flex flex-1 flex-col">{children}</div>
        </section>
    )
}

export function MiniPagination({
                                   currentPage,
                                   totalPages,
                                   onPageChange,
                               }: {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
}) {
    if (totalPages <= 1) {
        return null
    }

    const visiblePages = (() => {
        if (totalPages <= 4) {
            return Array.from({length: totalPages}, (_, index) => index + 1)
        }

        if (currentPage <= 3) {
            return [1, 2, 3, totalPages]
        }

        if (currentPage >= totalPages - 2) {
            return [1, totalPages - 2, totalPages - 1, totalPages]
        }

        return [1, currentPage, totalPages]
    })()

    return (
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-3 text-sm text-[var(--color-ink-soft)]">
            <button
                className="bg-transparent p-0 transition hover:text-[var(--color-ink)] disabled:opacity-40"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                type="button"
            >
                ←
            </button>
            <div className="flex flex-wrap items-center gap-2">
                {visiblePages.map((page, index) => {
                    const previousPage = visiblePages[index - 1]
                    const showEllipsis = previousPage !== undefined && page - previousPage > 1

                    return (
                        <div key={page} className="flex items-center gap-2">
                            {showEllipsis ? <span aria-hidden="true">...</span> : null}
                            <button
                                className={[
                                    'bg-transparent p-0 transition hover:text-[var(--color-ink)]',
                                    page === currentPage
                                        ? 'font-semibold text-[var(--color-ink)] underline underline-offset-4'
                                        : '',
                                ].join(' ')}
                                onClick={() => onPageChange(page)}
                                type="button"
                            >
                                {page}
                            </button>
                        </div>
                    )
                })}
            </div>
            <button
                className="bg-transparent p-0 transition hover:text-[var(--color-ink)] disabled:opacity-40"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                type="button"
            >
                →
            </button>
            <label className="flex items-center gap-2">
                <span>Jump</span>
                <input
                    aria-label="Jump to page"
                    className="input-shell input-shell-compact h-8 rounded-[8px] px-2 py-0"
                    inputMode="numeric"
                    max={totalPages}
                    min={1}
                    name="jump-page"
                    onKeyDown={(event) => {
                        if (event.key !== 'Enter') {
                            return
                        }

                        const nextPage = Number((event.currentTarget as HTMLInputElement).value)
                        if (Number.isInteger(nextPage) && nextPage >= 1 && nextPage <= totalPages) {
                            onPageChange(nextPage)
                            ;(event.currentTarget as HTMLInputElement).value = ''
                        }
                    }}
                    placeholder={`${currentPage}`}
                    type="text"
                />
            </label>
        </div>
    )
}
