import { MadgradesCoursePage } from '@/components/course-page'
import { fetchMadgradesCourse, fetchMadgradesCourseGrades, hasMadgradesToken } from '@/lib/madgrades/api'
import type { CourseCompareState } from '@/lib/madgrades/types'

function getSingleParam(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] ?? '' : ''
}

function parseSelection(
  params: Record<string, string | string[] | undefined>,
): CourseCompareState {
  return {
    instructorId: Number(getSingleParam(params.instructorId) || '0'),
    termCode: Number(getSingleParam(params.termCode) || '0'),
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
  const initialSelection = parseSelection(nextSearchParams)

  if (!hasMadgradesToken()) {
    return (
      <MadgradesCoursePage
        course={null}
        error="Madgrades API token is missing."
        grades={null}
        initialSelection={initialSelection}
        uuid={uuid}
      />
    )
  }

  let course = null
  let grades = null
  let error: string | null = null

  try {
    const [nextCourse, nextGrades] = await Promise.all([
      fetchMadgradesCourse(uuid),
      fetchMadgradesCourseGrades(uuid),
    ])
    course = nextCourse
    grades = nextGrades
  } catch (nextError) {
    error = nextError instanceof Error ? nextError.message : 'Failed to load course.'
  }

  return (
    <MadgradesCoursePage
      course={course}
      error={error}
      grades={grades}
      initialSelection={initialSelection}
      uuid={uuid}
    />
  )
}
