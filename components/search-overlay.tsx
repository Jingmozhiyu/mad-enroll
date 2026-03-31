'use client'

import { StatusBadge } from '@/components/status-badge'
import { getMeetingSummary, getSeatsSummary } from '@/lib/format'
import type { Task } from '@/lib/types'

type SearchOverlayProps = {
  open: boolean
  searchValue: string
  onSearchValueChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
  results: Task[]
  isSearching: boolean
  searchMessage: string
  onAdd: (sectionId: string) => void
  addingSectionId: string | null
}

export function SearchOverlay({
  open,
  searchValue,
  onSearchValueChange,
  onClose,
  onSubmit,
  results,
  isSearching,
  searchMessage,
  onAdd,
  addingSectionId,
}: SearchOverlayProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(23,49,60,0.18)] px-4 py-6 backdrop-blur-sm md:py-10">
      <div className="glass-card relative max-h-[90vh] w-full max-w-5xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-[rgba(154,238,222,0.2)] px-6 py-5 md:px-8">
          <div>
            <p className="eyebrow">Search Course</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink)] md:text-3xl">
              Search sections before adding them to your monitor list.
            </h2>
          </div>
          <button className="button-ghost min-w-[96px]" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="flex max-h-[calc(90vh-6.5rem)] flex-col gap-5 overflow-y-auto px-6 py-5 md:px-8">
          <form
            className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"
            onSubmit={(event) => {
              event.preventDefault()
              onSubmit()
            }}
          >
            <label className="grid gap-2">
              <span className="text-sm font-bold text-[var(--color-ink-soft)]">
                Course name
              </span>
              <input
                className="input-shell"
                onChange={(event) => onSearchValueChange(event.target.value)}
                placeholder="COMP SCI 240"
                value={searchValue}
              />
            </label>
            <div className="flex items-end">
              <button
                className="button-primary w-full min-w-[140px]"
                disabled={isSearching}
                type="submit"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--color-ink-soft)]">{searchMessage}</p>
            <span className="pill">{results.length} sections</span>
          </div>

          {results.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-[rgba(154,238,222,0.4)] bg-white/55 px-5 py-9 text-center text-sm text-[var(--color-ink-soft)]">
              Search for a course and matching sections will appear here.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {results.map((section) => {
                const isExisting = Boolean(section.id && section.enabled)
                const isAdding = addingSectionId === section.sectionId

                return (
                  <article
                    key={`${section.sectionId}-${section.id ?? 'new'}`}
                    className="rounded-[26px] border border-[rgba(154,238,222,0.22)] bg-white/75 px-4 py-4 shadow-[0_18px_40px_rgba(50,90,81,0.08)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-[var(--color-ink)]">
                          {section.courseDisplayName}
                        </h3>
                        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                          Section {section.sectionId}
                        </p>
                      </div>
                      <StatusBadge status={section.status} />
                    </div>

                    <div className="mt-4 space-y-2 text-sm leading-6 text-[var(--color-ink-soft)]">
                      <p>{getMeetingSummary(section.meetingInfo)}</p>
                      <p>{getSeatsSummary(section)}</p>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-deep-teal)]">
                        {isExisting ? 'Already added' : 'Ready to add'}
                      </span>
                      <button
                        className={isExisting ? 'button-ghost min-w-[110px]' : 'button-primary min-w-[110px]'}
                        disabled={isExisting || isAdding}
                        onClick={() => onAdd(section.sectionId)}
                        type="button"
                      >
                        {isExisting ? 'Added' : isAdding ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
