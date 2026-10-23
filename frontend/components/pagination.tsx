import {ProgressLink} from '@/components/navigation-progress'

type PaginationProps = {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    getPageHref?: (page: number) => string
}

export function Pagination({
                               currentPage,
                               totalPages,
                               onPageChange,
                               getPageHref,
                           }: PaginationProps) {
    if (totalPages <= 1) {
        return null
    }

    const pages = []
    const start = Math.max(1, currentPage - 2)
    const end = Math.min(totalPages, currentPage + 2)

    for (let page = start; page <= end; page += 1) {
        pages.push(page)
    }

    function renderPage(page: number, label: string | number, disabled = false) {
        const className = typeof label === 'number'
            ? page === currentPage ? 'button-primary min-w-[48px]' : 'button-ghost min-w-[48px]'
            : 'button-ghost min-w-[108px]'

        if (getPageHref && !disabled) {
            return (
                <ProgressLink
                    key={label}
                    aria-current={page === currentPage ? 'page' : undefined}
                    className={className}
                    href={getPageHref(page)}
                    onClick={(event) => {
                        if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                            event.preventDefault()
                            onPageChange(page)
                        }
                    }}
                    prefetch={false}
                >
                    {label}
                </ProgressLink>
            )
        }

        return (
            <button
                key={label}
                aria-current={page === currentPage && !disabled ? 'page' : undefined}
                className={className}
                disabled={disabled}
                onClick={() => onPageChange(page)}
                type="button"
            >
                {label}
            </button>
        )
    }

    return (
        <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2">
            {renderPage(currentPage - 1, 'Previous', currentPage <= 1)}
            {pages.map((page) => renderPage(page, page))}
            {renderPage(currentPage + 1, 'Next', currentPage >= totalPages)}
        </nav>
    )
}
