'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { EmptyState } from '@/components/empty-state'
import { CourseQueryInput } from '@/components/course-query-input'
import { CourseSelectionControls } from '@/components/course-selection-controls'
import { GpaChart } from '@/components/gpa-chart'
import { GradeDistributionChart } from '@/components/grade-distribution-chart'
import type {
  CourseCompareState,
  MadgradesCourse,
  MadgradesCourseGrades,
} from '@/lib/madgrades/types'
import {
  calculateGpa,
  formatGpa,
  getCourseComparisonSelectionLabel,
  getCourseDisplayLine,
  getSelectionDistribution,
  getSelectionGpaSeries,
} from '@/lib/madgrades/utils'

type MadgradesCoursePageProps = {
  uuid: string
  course: MadgradesCourse | null
  grades: MadgradesCourseGrades | null
  compareWith?: string | null
  compareCourse?: MadgradesCourse | null
  compareGrades?: MadgradesCourseGrades | null
  initialSelection1: CourseCompareState
  initialSelection2: CourseCompareState
  error?: string | null
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

function parseState(searchParams: URLSearchParams, prefix = ''): CourseCompareState {
  return {
    instructorId: Number(searchParams.get(`${prefix}instructorId`) ?? '0'),
    termCode: Number(searchParams.get(`${prefix}termCode`) ?? '0'),
  }
}

function SelectionCard({
  course,
  grades,
  selection,
  onChange,
  replaceHref,
}: {
  course: MadgradesCourse
  grades: MadgradesCourseGrades | null
  selection: CourseCompareState
  onChange: (state: CourseCompareState) => void
  replaceHref: string
}) {
  const distribution = getSelectionDistribution(grades, selection)

  return (
    <section className="glass-card px-5 py-5 md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--color-ink)]">{course.name}</h2>
          <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{getCourseDisplayLine(course)}</p>
        </div>
        <Link className="button-ghost" href={replaceHref}>
          Replace Course
        </Link>
      </div>

      <div className="mt-5">
        <CourseSelectionControls grades={grades} onChange={onChange} selection={selection} />
      </div>

      <div className="mt-4 rounded-[22px] border border-[rgba(154,238,222,0.18)] bg-white/70 px-4 py-4 text-sm leading-7 text-[var(--color-ink-soft)]">
        <p>
          Current selection:
          <span className="ml-2 font-semibold text-[var(--color-ink)]">
            {getCourseComparisonSelectionLabel(grades, selection.instructorId, selection.termCode)}
          </span>
        </p>
        <p>
          GPA:
          <span className="ml-2 font-semibold text-[var(--color-ink)]">
            {distribution ? formatGpa(calculateGpa(distribution)) : 'N/A'}
          </span>
        </p>
      </div>
    </section>
  )
}

export function MadgradesCoursePage({
  uuid,
  course,
  grades,
  compareWith,
  compareCourse = null,
  compareGrades = null,
  initialSelection1,
  initialSelection2,
  error = null,
}: MadgradesCoursePageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchDraft, setSearchDraft] = useState('')

  const selection1 = parseState(new URLSearchParams(searchParams.toString()))
  const selection2 = parseState(new URLSearchParams(searchParams.toString()), 'course2')
  const effectiveSelection1 =
    searchParams.toString().length > 0 ? selection1 : initialSelection1
  const effectiveSelection2 =
    searchParams.toString().length > 0 ? selection2 : initialSelection2

  const singlePrimary = useMemo(
    () => getSelectionDistribution(grades, effectiveSelection1),
    [effectiveSelection1, grades],
  )
  const overallSeries = useMemo(
    () => getSelectionGpaSeries(grades, { instructorId: 0, termCode: 0 }),
    [grades],
  )
  const overallPrimary = grades?.cumulative ?? null
  const isInstructorFiltered = effectiveSelection1.instructorId > 0
  const isSemesterFiltered = effectiveSelection1.termCode > 0
  const isFilteredSingle = isInstructorFiltered || isSemesterFiltered
  const instructorSeries = useMemo(
    () =>
      isInstructorFiltered
        ? getSelectionGpaSeries(grades, {
            instructorId: effectiveSelection1.instructorId,
            termCode: 0,
          })
        : [],
    [effectiveSelection1.instructorId, grades, isInstructorFiltered],
  )
  const comparePrimary = useMemo(
    () => getSelectionDistribution(grades, effectiveSelection1),
    [effectiveSelection1, grades],
  )
  const compareSecondary = useMemo(
    () => getSelectionDistribution(compareGrades, effectiveSelection2),
    [compareGrades, effectiveSelection2],
  )

  function updateSelection(prefix: '' | 'course2', nextState: CourseCompareState) {
    const params = new URLSearchParams(searchParams.toString())
    if (nextState.instructorId > 0) {
      params.set(`${prefix}instructorId`, String(nextState.instructorId))
    } else {
      params.delete(`${prefix}instructorId`)
    }

    if (nextState.termCode > 0) {
      params.set(`${prefix}termCode`, String(nextState.termCode))
    } else {
      params.delete(`${prefix}termCode`)
    }

    router.push(params.toString() ? `/courses/${uuid}?${params.toString()}` : `/courses/${uuid}`)
  }

  function openSearchFromHeader(nextQueryValue = searchDraft) {
    const query = nextQueryValue.trim()
    router.push(query ? `/search?query=${encodeURIComponent(query)}` : '/search')
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

  if (compareWith && compareCourse && compareGrades) {
    return (
      <div className="grid gap-6">
        <section className="glass-card px-6 py-8 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="eyebrow">Course Compare</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--color-ink)] md:text-5xl">
              {course.name} vs {compareCourse.name}
            </h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link className="button-ghost" href={`/courses/${uuid}`}>
                Leave Compare
              </Link>
              <Link className="button-primary" href="/search">
                Back to Search
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <GradeDistributionChart
            primary={comparePrimary}
            primaryLabel={`${course.name} · ${getCourseComparisonSelectionLabel(grades, effectiveSelection1.instructorId, effectiveSelection1.termCode)}`}
            secondary={compareSecondary}
            secondaryLabel={`${compareCourse.name} · ${getCourseComparisonSelectionLabel(compareGrades, effectiveSelection2.instructorId, effectiveSelection2.termCode)}`}
            title="Grade distribution comparison"
          />
          <GpaChart
            primary={getSelectionGpaSeries(grades, effectiveSelection1)}
            primaryLabel={`${course.name} · ${getCourseComparisonSelectionLabel(grades, effectiveSelection1.instructorId, effectiveSelection1.termCode)}`}
            secondary={getSelectionGpaSeries(compareGrades, effectiveSelection2)}
            secondaryLabel={`${compareCourse.name} · ${getCourseComparisonSelectionLabel(compareGrades, effectiveSelection2.instructorId, effectiveSelection2.termCode)}`}
            title="Average GPA over time"
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <SelectionCard
            course={course}
            grades={grades}
            onChange={(nextState) => updateSelection('', nextState)}
            replaceHref={`/search?compareWith=${compareCourse.uuid}&replacing=1`}
            selection={effectiveSelection1}
          />
          <SelectionCard
            course={compareCourse}
            grades={compareGrades}
            onChange={(nextState) => updateSelection('course2', nextState)}
            replaceHref={`/search?compareWith=${uuid}&replacing=2`}
            selection={effectiveSelection2}
          />
        </section>
      </div>
    )
  }

  const selectionLabel = getCourseComparisonSelectionLabel(
    grades,
    effectiveSelection1.instructorId,
    effectiveSelection1.termCode,
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
                  className="rounded-[5px] bg-[rgba(108,203,32,0.3)] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.02em] text-[var(--color-ink)]"
                >
                  {(subject.abbreviation || subject.code) + ' ' + course.number}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[minmax(0,2fr)_auto] items-center gap-3 xl:min-w-[320px] xl:self-center">
            <CourseQueryInput
              inputClassName="input-shell search-input-accent h-11 w-full px-4"
              onSelectSuggestion={(suggestion) => router.push(`/courses/${suggestion.uuid}`)}
              onSubmit={openSearchFromHeader}
              onValueChange={setSearchDraft}
              placeholder="Search..."
              value={searchDraft}
            />
            <Link className="button-primary" href={`/search?compareWith=${uuid}`}>
              Compare
            </Link>
          </div>
        </div>
      </section>

      <div className="h-px w-full bg-[linear-gradient(90deg,rgba(51,204,187,0.14),rgba(51,204,187,0.9),rgba(51,204,187,0.14))]" />

      <section className="grid gap-6 xl:grid-cols-[minmax(260px,0.33fr)_minmax(0,0.67fr)] xl:items-start">
        <div className="grid gap-5 pt-2">
          <CourseSelectionControls
            grades={grades}
            onChange={(nextState) => updateSelection('', nextState)}
            selection={effectiveSelection1}
          />
        </div>

        <div className="grid gap-0">
          <GradeDistributionChart
            heightClassName={COURSE_DISTRIBUTION_CHART_HEIGHT_CLASS}
            primary={overallPrimary}
            primaryColor="#99cdff"
            primaryLabel="Overall"
            secondary={isFilteredSingle ? singlePrimary : null}
            secondaryColor="#ffa9cc"
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
              <span className="h-5 w-10 rounded-[8px] bg-[#99cdff]" />
              <span className="font-medium text-[var(--color-ink)]">
                Cumulative: {cumulativeGpa} GPA
              </span>
            </div>
            {isFilteredSingle ? (
              <div className="inline-flex items-center gap-3">
                <span className="h-5 w-10 rounded-[8px] bg-[#ffa9cc]" />
                <span className="font-medium text-[var(--color-ink)]">
                  {selectionLabel}: {filteredGpa} GPA
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="h-px w-full bg-[linear-gradient(90deg,rgba(51,204,187,0.14),rgba(51,204,187,0.9),rgba(51,204,187,0.14))]" />

      <section className="pt-1">
        <GpaChart
          domainSource={overallSeries}
          primary={overallSeries}
          primaryColor="#9aeede"
          primaryLabel="Overall"
          secondary={instructorSeries}
          secondaryColor="#ffcdac"
          secondaryLabel={isInstructorFiltered ? selectionLabel : undefined}
          heightClassName={COURSE_GPA_CHART_HEIGHT_CLASS}
          highlightSeries={isInstructorFiltered ? 'secondary' : 'primary'}
          highlightTermCode={isSemesterFiltered ? effectiveSelection1.termCode : undefined}
          showLegend={false}
          title=""
        />

        <div className="mt-0 flex flex-wrap items-center justify-center gap-5 text-sm text-[var(--color-ink-soft)]">
          <div className="inline-flex items-center gap-3">
            <span className="relative block h-4 w-12">
              <span className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-[#9aeede]" />
              <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#9aeede]" />
            </span>
            <span className="font-medium text-[var(--color-ink)]">Cumulative</span>
          </div>
          {isInstructorFiltered ? (
            <div className="inline-flex items-center gap-3">
              <span className="relative block h-4 w-12">
                <span className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-[#ffcdac]" />
                <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffcdac]" />
              </span>
              <span className="font-medium text-[var(--color-ink)]">{selectionLabel}</span>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
