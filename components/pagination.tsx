type PaginationProps = {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
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

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        className="button-ghost min-w-[108px]"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        Previous
      </button>

      {pages.map((page) => (
        <button
          key={page}
          className={
            page === currentPage ? 'button-primary min-w-[48px]' : 'button-ghost min-w-[48px]'
          }
          onClick={() => onPageChange(page)}
          type="button"
        >
          {page}
        </button>
      ))}

      <button
        className="button-ghost min-w-[108px]"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        Next
      </button>
    </div>
  )
}
