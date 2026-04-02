import { MadgradesCoursePage } from '@/components/course-page'
import { fetchMadgradesCourse, fetchMadgradesCourseGrades, hasMadgradesToken } from '@/lib/madgrades/api'
import type { CourseCompareState } from '@/lib/madgrades/types'

function getSingleParam(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] ?? '' : ''
}

function parseSelection(
  params: Record<string, string | string[] | undefined>,
  prefix = '',
): CourseCompareState {
  return {
    instructorId: Number(getSingleParam(params[`${prefix}instructorId`]) || '0'),
    termCode: Number(getSingleParam(params[`${prefix}termCode`]) || '0'),
  }
}

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ uuid: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { uuid } = await params
  const nextSearchParams = await searchParams
  const compareWith = getSingleParam(nextSearchParams.compareWith) || null
  const initialSelection1 = parseSelection(nextSearchParams)
  const initialSelection2 = parseSelection(nextSearchParams, 'course2')

  if (!hasMadgradesToken()) {
    return (
      <MadgradesCoursePage
        compareWith={compareWith}
        course={null}
        error="Madgrades API token is missing."
        grades={null}
        initialSelection1={initialSelection1}
        initialSelection2={initialSelection2}
        uuid={uuid}
      />
    )
  }

  let course = null
  let grades = null
  let compareCourse = null
  let compareGrades = null
  let error: string | null = null

  try {
    const [nextCourse, nextGrades, compareData] = await Promise.all([
      fetchMadgradesCourse(uuid),
      fetchMadgradesCourseGrades(uuid),
      compareWith
        ? Promise.all([
            fetchMadgradesCourse(compareWith),
            fetchMadgradesCourseGrades(compareWith),
          ])
        : Promise.resolve([null, null] as const),
    ])
    course = nextCourse
    grades = nextGrades
    compareCourse = compareData[0]
    compareGrades = compareData[1]
  } catch (nextError) {
    error = nextError instanceof Error ? nextError.message : 'Failed to load course.'
  }

  return (
    <MadgradesCoursePage
      compareCourse={compareCourse}
      compareGrades={compareGrades}
      compareWith={compareWith}
      course={course}
      error={error}
      grades={grades}
      initialSelection1={initialSelection1}
      initialSelection2={initialSelection2}
      uuid={uuid}
    />
  )
}
