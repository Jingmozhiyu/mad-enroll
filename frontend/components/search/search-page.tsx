'use client'

import {startTransition, useState, useTransition} from 'react'
import {usePathname} from 'next/navigation'
import {EmptyState} from '@/components/empty-state'
import {useProgressRouter} from '@/components/navigation-progress'
import {SearchResultsSkeleton} from '@/components/page-skeletons'
import {CourseQueryInput} from '@/components/course-query-input'
import {
    EntityMultiSelect,
    type SearchEntityOption,
} from '@/components/search/entity-multi-select'
import {Pagination} from '@/components/pagination'
import {
    fetchInstructorOptions,
    fetchSubjectOptions,
} from '@/lib/api/client/madgrades'
import type {
    MadgradesCourse,
    MadgradesPaginatedResponse,
} from '@/lib/madgrades/types'
import {getCourseDisplayLine} from '@/lib/madgrades/utils'

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

type SearchFilterState = {
    query: string
    selectedSubjects: SearchEntityOption[]
    selectedInstructors: SearchEntityOption[]
    sort: string
}

function CourseResultCard({course}: { course: MadgradesCourse }) {
    const router = useProgressRouter()
    const href = `/courses/${course.uuid}`

    return (
        <button
            className="glass-card hover-elevated w-full px-5 py-5 text-left transition hover:-translate-y-0.5"
            onFocus={() => router.prefetch(href)}
            onMouseEnter={() => router.prefetch(href)}
            onClick={() => router.push(href)}
            type="button"
        >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                    <h3 className="text-xl font-semibold text-[var(--color-ink)]">{course.name}</h3>
                    <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{getCourseDisplayLine(course)}</p>
                </div>

                <div className="flex items-center justify-between gap-4 md:min-w-[180px] md:flex-col md:items-end">
                    <span className="font-semibold text-[var(--color-deep-teal)]">Open</span>
                </div>
            </div>
        </button>
    )
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
    const [filters, setFilters] = useState<SearchFilterState>({
        query: initialQuery,
        selectedInstructors: initialInstructors,
        selectedSubjects: initialSubjects,
        sort: initialSort,
    })

    function updateFilters(nextFilters: Partial<SearchFilterState>) {
        setFilters((current) => ({
            ...current,
            ...nextFilters,
        }))
    }

    function updateUrl(nextPage = 1, nextQueryValue = filters.query) {
        const nextQuery = buildSearchParams(
            nextQueryValue,
            filters.selectedSubjects,
            filters.selectedInstructors,
            filters.sort,
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
                                onValueChange={(query) => updateFilters({query})}
                                placeholder="ECON 101, Math 234, Algorithms..."
                                value={filters.query}
                            />
                        </label>

                        <EntityMultiSelect
                            title="Subjects"
                            placeholder="Start typing a subject..."
                            onChange={(selectedSubjects) => updateFilters({selectedSubjects})}
                            searcher={async (value) => {
                                const response = await fetchSubjectOptions(value)
                                return response.map((subject) => ({
                                    key: subject.code,
                                    label: subject.name,
                                    sublabel: subject.abbreviation || subject.code,
                                }))
                            }}
                            selected={filters.selectedSubjects}
                        />

                        <EntityMultiSelect
                            title="Instructors"
                            placeholder="Start typing an instructor..."
                            onChange={(selectedInstructors) => updateFilters({selectedInstructors})}
                            searcher={async (value) => {
                                const response = await fetchInstructorOptions(value)
                                return response.map((instructor) => ({
                                    key: String(instructor.id),
                                    label: instructor.name,
                                }))
                            }}
                            selected={filters.selectedInstructors}
                        />

                        <label className="grid gap-2">
                            <span className="text-sm font-bold text-[var(--color-ink-soft)]">Sort</span>
                            <select
                                className="input-shell"
                                onChange={(event) => updateFilters({sort: event.target.value})}
                                value={filters.sort}
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
                                    setFilters({
                                        query: '',
                                        selectedInstructors: [],
                                        selectedSubjects: [],
                                        sort: 'relevance',
                                    })
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
                            <div
                                className="status-alert-error mt-4 rounded-[12px] px-4 py-4 text-sm text-[var(--color-ink)]">
                                {error}
                            </div>
                        ) : null}
                    </div>

                    {isPending ? (
                        <SearchResultsSkeleton/>
                    ) : initialResults && initialResults.results.length > 0 ? (
                        <>
                            <section className="grid gap-3">
                                {initialResults.results.map((course) => (
                                    <CourseResultCard key={course.uuid} course={course}/>
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
