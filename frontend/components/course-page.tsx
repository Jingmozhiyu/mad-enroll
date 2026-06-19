'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { EmptyState } from '@/components/empty-state'
import { CourseQueryInput } from '@/components/course-query-input'
import { CourseSelectionControls } from '@/components/course-selection-controls'
import { GpaChart } from '@/components/gpa-chart'
import { GradeDistributionChart } from '@/components/grade-distribution-chart'
import { useProgressRouter } from '@/components/navigation-progress'
import type {
  CourseCompareState,
  MadgradesCourse,
  MadgradesCourseGrades,
} from '@/lib/madgrades/types'
import {
  calculateGpa,
  formatGpa,
  getCourseComparisonSelectionLabel,
  getSelectionDistribution,
  getSelectionGpaSeries,
} from '@/lib/madgrades/utils'

type MadgradesCoursePageProps = {
  uuid: string
  course: MadgradesCourse | null
  grades: MadgradesCourseGrades | null
  initialSelection: CourseCompareState
  error?: string | null
}

function CoursePageSearch() {
  const router = useProgressRouter()
  const [searchDraft, setSearchDraft] = useState('')

  function openSearch(nextQueryValue: string) {
    const query = nextQueryValue.trim()
    router.push(query ? `/search?query=${encodeURIComponent(query)}` : '/search')
  }

  return (
    <CourseQueryInput
      inputClassName="input-shell search-input-accent h-11 w-full px-4"
      onSelectSuggestion={(suggestion) => router.push(`/courses/${suggestion.uuid}`)}
      onSubmit={openSearch}
      onValueChange={setSearchDraft}
      placeholder="Search..."
      value={searchDraft}
    />
  )
}

const COURSE_GPA_CHART_HEIGHT_CLASS = 'h-[318px]'
const COURSE_DISTRIBUTION_CHART_HEIGHT_CLASS = 'h-[324px]'
const COURSE_DISTRIBUTION_PRIMARY_BAR_SIZE_FILTERED = 38
const COURSE_DISTRIBUTION_PRIMARY_BAR_SIZE_SINGLE = 50
const COURSE_DISTRIBUTION_SECONDARY_BAR_SIZE = 35
const COURSE_DISTRIBUTION_BAR_GAP = 6
const COURSE_DISTRIBUTION_BAR_CATEGORY_GAP = '16%'
const COURSE_DISTRIBUTION_PERCENT_FONT_SIZE = 12
const COURSE_DISTRIBUTION_COUNT_FONT_SIZE = 10
const COURSE_DISTRIBUTION_LABEL_OFFSET = 18

function parseState(searchParams: URLSearchParams): CourseCompareState {
  return {
    instructorId: Number(searchParams.get('instructorId') ?? '0'),
    termCode: Number(searchParams.get('termCode') ?? '0'),
  }
}

export function MadgradesCoursePage({
  uuid,
  course,
  grades,
  initialSelection,
  error = null,
}: MadgradesCoursePageProps) {
  const router = useProgressRouter()
  const searchParams = useSearchParams()

  const selection = parseState(new URLSearchParams(searchParams.toString()))
  const effectiveSelection =
    searchParams.toString().length > 0 ? selection : initialSelection

  const singlePrimary = useMemo(
    () => getSelectionDistribution(grades, effectiveSelection),
    [effectiveSelection, grades],
  )
  const overallSeries = useMemo(
    () => getSelectionGpaSeries(grades, { instructorId: 0, termCode: 0 }),
    [grades],
  )
  const overallPrimary = grades?.cumulative ?? null
  const isInstructorFiltered = effectiveSelection.instructorId > 0
  const isSemesterFiltered = effectiveSelection.termCode > 0
  const isFilteredSingle = isInstructorFiltered || isSemesterFiltered
  const instructorSeries = useMemo(
    () =>
      isInstructorFiltered
        ? getSelectionGpaSeries(grades, {
            instructorId: effectiveSelection.instructorId,
            termCode: 0,
          })
        : [],
    [effectiveSelection.instructorId, grades, isInstructorFiltered],
  )

  function updateSelection(nextState: CourseCompareState) {
    const params = new URLSearchParams(searchParams.toString())
    if (nextState.instructorId > 0) {
      params.set('instructorId', String(nextState.instructorId))
    } else {
      params.delete('instructorId')
    }

    if (nextState.termCode > 0) {
      params.set('termCode', String(nextState.termCode))
    } else {
      params.delete('termCode')
    }

    router.replace(
      params.toString() ? `/courses/${uuid}?${params.toString()}` : `/courses/${uuid}`,
      { scroll: false },
    )
  }

  if (error || !course || !grades) {
    return (
      <section className="glass-card px-6 py-8">
        <EmptyState
          description={error ?? 'The requested course could not be loaded.'}
          title="Course unavailable"
        />
      </section>
    )
  }

  const selectionLabel = getCourseComparisonSelectionLabel(
    grades,
    effectiveSelection.instructorId,
    effectiveSelection.termCode,
  )
  const cumulativeGpa = overallPrimary ? formatGpa(calculateGpa(overallPrimary)) : 'N/A'
  const filteredGpa = singlePrimary ? formatGpa(calculateGpa(singlePrimary)) : 'N/A'

  return (
    <div className="grid gap-4 px-1">
      <section className="grid gap-4">
        <div className="grid gap-5 xl:min-h-[92px] xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="min-w-0">
            <h1 className="text-[1.6rem] font-semibold leading-[1.08] tracking-tight text-[var(--color-ink)] md:text-[2rem]">
              {course.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[0.8rem] font-semibold tracking-[0.01em] text-[var(--color-ink)]">
                Grade Distribution
              </span>
              {course.subjects.map((subject) => (
                <span
                  key={subject.code}
                  className="rounded-[5px] px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[-0.02em] text-[var(--color-ink)]"
                  style={{ background: 'var(--course-tag-background)' }}
                >
                  {(subject.abbreviation || subject.code) + ' ' + course.number}
                </span>
              ))}
            </div>
          </div>

          <div className="xl:min-w-[320px] xl:self-center">
            <CoursePageSearch />
          </div>
        </div>
      </section>

      <div className="accent-divider h-px w-full" />

      <section className="grid gap-6 xl:grid-cols-[minmax(260px,0.33fr)_minmax(0,0.67fr)] xl:items-start">
        <div className="grid gap-5 pt-2">
          <CourseSelectionControls
            grades={grades}
            onChange={updateSelection}
            selection={effectiveSelection}
          />
        </div>

        <div className="grid gap-0">
          <GradeDistributionChart
            heightClassName={COURSE_DISTRIBUTION_CHART_HEIGHT_CLASS}
            primary={overallPrimary}
            primaryColor="var(--color-haruka)"
            primaryLabel="Overall"
            secondary={isFilteredSingle ? singlePrimary : null}
            secondaryColor="var(--color-airi)"
            secondaryLabel={isFilteredSingle ? selectionLabel : undefined}
            showLegend={false}
            title=""
            barCategoryGap={COURSE_DISTRIBUTION_BAR_CATEGORY_GAP}
            barGap={COURSE_DISTRIBUTION_BAR_GAP}
            countFontSize={COURSE_DISTRIBUTION_COUNT_FONT_SIZE}
            labelYOffset={COURSE_DISTRIBUTION_LABEL_OFFSET}
            percentFontSize={COURSE_DISTRIBUTION_PERCENT_FONT_SIZE}
            primaryBarSize={
              isFilteredSingle
                ? COURSE_DISTRIBUTION_PRIMARY_BAR_SIZE_FILTERED
                : COURSE_DISTRIBUTION_PRIMARY_BAR_SIZE_SINGLE
            }
            secondaryBarSize={COURSE_DISTRIBUTION_SECONDARY_BAR_SIZE}
            sharpBars
          />

          <div className="flex flex-wrap items-center justify-center gap-4 pt-1 text-sm text-[var(--color-ink-soft)]">
            <div className="inline-flex items-center gap-3">
              <span className="h-5 w-10 rounded-[8px]" style={{ background: 'var(--color-haruka)' }} />
              <span className="font-medium text-[var(--color-ink)]">
                Cumulative: {cumulativeGpa} GPA
              </span>
            </div>
            {isFilteredSingle ? (
              <div className="inline-flex items-center gap-3">
                <span className="h-5 w-10 rounded-[8px]" style={{ background: 'var(--color-airi)' }} />
                <span className="font-medium text-[var(--color-ink)]">
                  {selectionLabel}: {filteredGpa} GPA
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="accent-divider h-px w-full" />

      <section className="pt-1">
        <GpaChart
          domainSource={overallSeries}
          primary={overallSeries}
          primaryColor="var(--color-shizuku)"
          primaryLabel="Overall"
          secondary={instructorSeries}
          secondaryColor="var(--color-monori)"
          secondaryLabel={isInstructorFiltered ? selectionLabel : undefined}
          heightClassName={COURSE_GPA_CHART_HEIGHT_CLASS}
          highlightSeries={isInstructorFiltered ? 'secondary' : 'primary'}
          highlightTermCode={isSemesterFiltered ? effectiveSelection.termCode : undefined}
          showLegend={false}
          title=""
        />

        <div className="mt-0 flex flex-wrap items-center justify-center gap-5 text-sm text-[var(--color-ink-soft)]">
          <div className="inline-flex items-center gap-3">
            <span className="relative block h-4 w-12">
              <span
                className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2"
                style={{ background: 'var(--color-shizuku)' }}
              />
              <span
                className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: 'var(--color-shizuku)' }}
              />
            </span>
            <span className="font-medium text-[var(--color-ink)]">Cumulative</span>
          </div>
          {isInstructorFiltered ? (
            <div className="inline-flex items-center gap-3">
              <span className="relative block h-4 w-12">
                <span
                  className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2"
                  style={{ background: 'var(--color-monori)' }}
                />
                <span
                  className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ background: 'var(--color-monori)' }}
                />
              </span>
              <span className="font-medium text-[var(--color-ink)]">{selectionLabel}</span>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
