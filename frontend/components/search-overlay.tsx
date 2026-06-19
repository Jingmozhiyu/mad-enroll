'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Pagination } from '@/components/pagination'
import { StatusBadge } from '@/components/status-badge'
import {
  getMeetingDetailLines,
  getOpenSeatsSummary,
  getWaitlistSeatsSummary,
} from '@/lib/format'
import type { TaskSearchTermKey } from '@/lib/task-search-terms'
import type { SearchCourseHit, Task } from '@/lib/types'

type SearchOverlayProps = {
  open: boolean
  searchStage: 'courses' | 'sections'
  searchValue: string
  selectedTermKey: TaskSearchTermKey
  termOptions: ReadonlyArray<{ key: TaskSearchTermKey; label: string }>
  searchMessage: string
  courseResults: SearchCourseHit[]
  coursePage: number
  courseTotalPages: number
  selectedCourse: SearchCourseHit | null
  sectionResults: Task[]
  isSearchingCourses: boolean
  isLoadingSections: boolean
  isTransitioning: boolean
  addingDocId: string | null
  onSearchValueChange: (value: string) => void
  onTermChange: (termKey: TaskSearchTermKey) => void
  onSubmit: () => void
  onClose: () => void
  onCoursePageChange: (page: number) => void
  onOpenSections: (course: SearchCourseHit) => void
  onBackToCourses: () => void
  onAdd: (docId: string) => void
}

export function SearchOverlay({
  open,
  searchStage,
  searchValue,
  selectedTermKey,
  termOptions,
  searchMessage,
  courseResults,
  coursePage,
  courseTotalPages,
  selectedCourse,
  sectionResults,
  isSearchingCourses,
  isLoadingSections,
  isTransitioning,
  addingDocId,
  onSearchValueChange,
  onTermChange,
  onSubmit,
  onClose,
  onCoursePageChange,
  onOpenSections,
  onBackToCourses,
  onAdd,
}: SearchOverlayProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [onClose, open])

  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus()
    })

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className="overlay-backdrop fixed inset-0 z-50 flex items-start justify-center px-4 py-6 backdrop-blur-sm md:py-10">
      <div className="glass-card relative max-h-[90vh] w-full max-w-5xl overflow-hidden">
        <div className="subtle-panel-divider flex items-start justify-between gap-4 border-b px-6 py-5 md:px-8">
          <div>
            <p className="eyebrow">Search Course</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink)] md:text-3xl">
              Search courses, inspect sections, then add to monitor.
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
                ref={searchInputRef}
                className="input-shell"
                onChange={(event) => onSearchValueChange(event.target.value)}
                placeholder="COMP SCI 571"
                value={searchValue}
              />
            </label>
            <div className="flex flex-col items-stretch justify-end">
              <button
                className="button-primary w-full min-w-[140px]"
                disabled={isSearchingCourses || isLoadingSections}
                type="submit"
              >
                {isSearchingCourses ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--color-ink-soft)]">{searchMessage}</p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-ink-soft)]">
                <span className="font-medium">Term</span>
                <div className="flex flex-wrap items-center gap-2">
                  {termOptions.map((term, index) => {
                    const isActive = term.key === selectedTermKey

                    return (
                      <div key={term.key} className="flex items-center gap-2">
                        {index > 0 ? <span aria-hidden="true" className="text-[var(--inline-muted)]">/</span> : null}
                        <button
                          className={[
                            'rounded-none bg-transparent px-0 py-0 transition focus-visible:outline-none',
                            isActive
                              ? 'font-semibold text-[var(--color-deep-teal)] underline underline-offset-4'
                              : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]',
                          ].join(' ')}
                          onClick={() => onTermChange(term.key)}
                          type="button"
                        >
                          {term.label}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
              <span className="pill">
                {searchStage === 'courses'
                  ? `${courseResults.length} course${courseResults.length === 1 ? '' : 's'}`
                  : `${sectionResults.length} section${sectionResults.length === 1 ? '' : 's'}`}
              </span>
            </div>
          </div>

          {searchStage === 'sections' && selectedCourse ? (
            <div className="surface-panel-muted flex flex-wrap items-center justify-between gap-3 rounded-[24px] px-4 py-4">
              <div>
                <p className="text-lg font-semibold text-[var(--color-ink)]">
                  {selectedCourse.courseDesignation}
                </p>
                <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{selectedCourse.title}</p>
              </div>
              <button className="button-ghost min-w-[132px]" onClick={onBackToCourses} type="button">
                Back to Courses
              </button>
            </div>
          ) : null}

          <div
            className={[
              'min-h-[360px] transition-all duration-200 ease-out',
              isTransitioning ? 'translate-y-3 opacity-0' : 'translate-y-0 opacity-100',
            ].join(' ')}
          >
            {searchStage === 'courses' ? (
              courseResults.length === 0 ? (
                <div className="surface-panel-dashed rounded-[28px] px-5 py-9 text-center text-sm text-[var(--color-ink-soft)]">
                  Search for a course to browse matching UW course entries here.
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    {courseResults.map((course) => (
                      <article
                        key={`${course.subjectId}-${course.courseId}-${course.courseDesignation}`}
                        className="surface-panel rounded-[18px] px-4 py-3.5"
                      >
                        <div className="grid gap-1.5">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="min-w-0 flex-1 text-lg font-semibold leading-6 text-[var(--color-ink)]">
                              {course.courseDesignation}
                            </h3>
                            <button
                              className="shrink-0 rounded-none bg-transparent px-0 py-0 text-sm font-semibold text-[var(--color-deep-teal)] underline-offset-4 transition hover:text-[var(--color-ink)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--field-focus-ring)]"
                              disabled={isLoadingSections}
                              onClick={() => onOpenSections(course)}
                              type="button"
                            >
                              {isLoadingSections ? 'Loading...' : 'See Sections'}
                            </button>
                          </div>
                          <p className="text-sm leading-6 text-[var(--color-ink-soft)]">{course.title}</p>
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="px-2 py-5">
                    <Pagination
                      currentPage={coursePage}
                      onPageChange={onCoursePageChange}
                      totalPages={courseTotalPages}
                    />
                  </div>
                </>
              )
            ) : sectionResults.length === 0 ? (
              <div className="surface-panel-dashed rounded-[28px] px-5 py-9 text-center text-sm text-[var(--color-ink-soft)]">
                No section details are available for this course right now.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sectionResults.map((section) => {
                  const isExisting = Boolean(section.id) && section.enabled !== false
                  const isAdding = addingDocId === section.docId
                  const meetingDetails = getMeetingDetailLines(section.meetingInfo)

                  return (
                    <article
                      key={section.docId}
                      className="surface-panel rounded-[26px] px-4 py-4"
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

                      <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--color-ink-soft)]">
                        {meetingDetails.length > 0 ? (
                          <div className="space-y-2">
                            {meetingDetails.map((meeting, index) => (
                              <div key={`${section.docId}-meeting-${index}`} className="space-y-0.5">
                                <p>{meeting.schedule}</p>
                                {meeting.location ? <p>{meeting.location}</p> : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <p>{getOpenSeatsSummary(section)}</p>
                        <p>{getWaitlistSeatsSummary(section)}</p>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-deep-teal)]">
                          {isExisting ? 'Already added' : 'Ready to add'}
                        </span>
                        <button
                          className={isExisting ? 'button-ghost min-w-[110px]' : 'button-info min-w-[110px]'}
                          disabled={isExisting || isAdding}
                          onClick={() => onAdd(section.docId)}
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
    </div>,
    document.body,
  )
}
