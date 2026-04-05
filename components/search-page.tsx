'use client'

import { startTransition, useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import { EmptyState } from '@/components/empty-state'
import { useProgressRouter } from '@/components/navigation-progress'
import { SearchResultsSkeleton } from '@/components/page-skeletons'
import { CourseQueryInput } from '@/components/course-query-input'
import { CourseResultCard } from '@/components/course-result-card'
import {
  EntityMultiSelect,
  type SearchEntityOption,
} from '@/components/entity-multi-select'
import { Pagination } from '@/components/pagination'
import {
  fetchInstructorOptions,
  fetchSubjectOptions,
} from '@/lib/madgrades/client-api'
import type {
  MadgradesCourse,
  MadgradesPaginatedResponse,
} from '@/lib/madgrades/types'

function buildSearchParams(
  query: string,
  subjects: SearchEntityOption[],
  instructors: SearchEntityOption[],
  sort: string,
  page: number,
) {
  const params = new URLSearchParams()
  const trimmedQuery = query.trim()

  if (trimmedQuery) {
    params.set('query', trimmedQuery)
  }
  subjects.forEach((subject) => params.append('subjects', subject.key))
  instructors.forEach((instructor) => params.append('instructors', instructor.key))
  if (sort === 'number_desc') {
    params.set('sort', 'number')
    params.set('order', 'DESC')
  } else if (sort === 'number' || sort === 'relevance' || sort === 'name') {
    params.set('sort', sort === 'relevance' ? 'relevance' : sort)
  }
  if (page > 1) {
    params.set('page', String(page))
  }

  return params.toString()
}

type MadgradesSearchPageProps = {
  initialQuery: string
  initialSubjects: SearchEntityOption[]
  initialInstructors: SearchEntityOption[]
  initialSort: string
  initialResults: MadgradesPaginatedResponse<MadgradesCourse> | null
  error: string | null
}

export function MadgradesSearchPage({
  initialQuery,
  initialSubjects,
  initialInstructors,
  initialSort,
  initialResults,
  error,
}: MadgradesSearchPageProps) {
  const router = useProgressRouter()
  const pathname = usePathname()
  const [isPending, startRouteTransition] = useTransition()
  const [query, setQuery] = useState(initialQuery)
  const [selectedSubjects, setSelectedSubjects] = useState<SearchEntityOption[]>(initialSubjects)
  const [selectedInstructors, setSelectedInstructors] = useState<SearchEntityOption[]>(
    initialInstructors,
  )
  const [sort, setSort] = useState(initialSort)

  function updateUrl(nextPage = 1, nextQueryValue = query) {
    const nextQuery = buildSearchParams(
      nextQueryValue,
      selectedSubjects,
      selectedInstructors,
      sort,
      nextPage,
    )

    startRouteTransition(() => {
      router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname)
    })
  }

  return (
    <section className="page-fade-enter px-2 py-6 md:px-4 md:py-8">
      <div className="grid gap-8 xl:grid-cols-[minmax(280px,0.33fr)_minmax(0,0.67fr)]">
        <div className="h-fit">
          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-[var(--color-ink-soft)]">Search</span>
              <CourseQueryInput
                inputClassName="input-shell search-input-accent h-12 w-full px-4"
                onSelectSuggestion={(suggestion) => router.push(`/courses/${suggestion.uuid}`)}
                onSubmit={(nextValue) => updateUrl(1, nextValue)}
                onValueChange={setQuery}
                placeholder="ECON 101, Math 234, Algorithms..."
                value={query}
              />
            </label>

            <EntityMultiSelect
              title="Subjects"
              placeholder="Start typing a subject..."
              onChange={setSelectedSubjects}
              searcher={async (value) => {
                const response = await fetchSubjectOptions(value)
                return response.map((subject) => ({
                  key: subject.code,
                  label: subject.name,
                  sublabel: subject.abbreviation || subject.code,
                }))
              }}
              selected={selectedSubjects}
            />

            <EntityMultiSelect
              title="Instructors"
              placeholder="Start typing an instructor..."
              onChange={setSelectedInstructors}
              searcher={async (value) => {
                const response = await fetchInstructorOptions(value)
                return response.map((instructor) => ({
                  key: String(instructor.id),
                  label: instructor.name,
                }))
              }}
              selected={selectedInstructors}
            />

            <label className="grid gap-2">
              <span className="text-sm font-bold text-[var(--color-ink-soft)]">Sort</span>
              <select
                className="input-shell"
                onChange={(event) => setSort(event.target.value)}
                value={sort}
              >
                <option value="relevance">Best match</option>
                <option value="number">Number ascending</option>
                <option value="number_desc">Number descending</option>
                <option value="name">Name</option>
              </select>
            </label>

            <div className="flex flex-wrap justify-end gap-3 pt-1">
              <button
                className="button-ghost"
                onClick={() => {
                  setQuery('')
                  setSelectedSubjects([])
                  setSelectedInstructors([])
                  setSort('relevance')
                  startTransition(() => {
                    router.push(pathname)
                  })
                }}
                type="button"
              >
                Clear
              </button>
              <button className="button-primary" onClick={() => updateUrl(1)} type="button">
                Search
              </button>
            </div>
          </div>
        </div>

        <div className="grid content-start gap-4">
          <div className="px-1">
            <h2 className="text-3xl font-semibold text-[var(--color-ink)]">
              {initialResults ? `${initialResults.totalCount} results` : 'Results'}
            </h2>
            {error ? (
              <div className="mt-4 rounded-[24px] border border-[rgba(255,169,204,0.35)] bg-[rgba(255,169,204,0.16)] px-4 py-4 text-sm text-[var(--color-ink)]">
                {error}
              </div>
            ) : null}
          </div>

          {isPending ? (
            <SearchResultsSkeleton />
          ) : initialResults && initialResults.results.length > 0 ? (
            <>
              <section className="grid gap-3">
                {initialResults.results.map((course) => (
                  <CourseResultCard key={course.uuid} course={course} />
                ))}
              </section>

              <section className="px-2 py-2">
                <Pagination
                  currentPage={initialResults.currentPage}
                  onPageChange={(page) => updateUrl(page)}
                  totalPages={initialResults.totalPages}
                />
              </section>
            </>
          ) : (
            <section className="glass-card px-6 py-8">
              <EmptyState
                description="Adjust the query, subjects, or instructors and try again."
                title="No courses found"
              />
            </section>
          )}
        </div>
      </div>
    </section>
  )
}
