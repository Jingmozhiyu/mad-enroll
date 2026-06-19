import { MadgradesSearchPage } from '@/components/search-page'
import { fetchMadgradesInstructor, fetchMadgradesSubject, hasMadgradesToken, searchMadgradesCourses } from '@/lib/madgrades/api'
import type { MadgradesPaginatedResponse, MadgradesCourse } from '@/lib/madgrades/types'
import type { SearchEntityOption } from '@/components/entity-multi-select'

function getSingleParam(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] ?? '' : ''
}

function getMultiParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : []
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const query = getSingleParam(params.query)
  const subjectParams = getMultiParam(params.subjects)
  const instructorParams = getMultiParam(params.instructors)
  const sort = getSingleParam(params.sort) || 'relevance'
  const order = getSingleParam(params.order) === 'DESC' ? 'DESC' : 'ASC'
  const page = Number(getSingleParam(params.page) || '1') || 1

  let results: MadgradesPaginatedResponse<MadgradesCourse> | null = null
  let error: string | null = null

  if (!hasMadgradesToken()) {
    error = 'Madgrades API token is missing.'
  } else {
    try {
      results = await searchMadgradesCourses({
        query: query || undefined,
        subjects: subjectParams.length > 0 ? subjectParams : undefined,
        instructors:
          instructorParams.length > 0
            ? instructorParams.map((value) => Number(value)).filter((value) => !Number.isNaN(value))
            : undefined,
        sort:
          sort === 'number' || sort === 'name' || sort === 'relevance'
            ? sort
            : 'relevance',
        order,
        page: page > 0 ? page : 1,
        perPage: 5,
      })
    } catch (nextError) {
      error = nextError instanceof Error ? nextError.message : 'Search failed.'
    }
  }

  const [initialSubjects, initialInstructors] = await Promise.all([
    Promise.all(
      subjectParams.map(async (code) => {
        try {
          const subject = await fetchMadgradesSubject(code)
          return {
            key: subject.code,
            label: subject.name,
            sublabel: subject.abbreviation || subject.code,
          } satisfies SearchEntityOption
        } catch {
          return { key: code, label: code } satisfies SearchEntityOption
        }
      }),
    ),
    Promise.all(
      instructorParams.map(async (idText) => {
        try {
          const instructor = await fetchMadgradesInstructor(Number(idText))
          return {
            key: String(instructor.id),
            label: instructor.name,
          } satisfies SearchEntityOption
        } catch {
          return { key: idText, label: idText } satisfies SearchEntityOption
        }
      }),
    ),
  ])

  return (
    <MadgradesSearchPage
      key={JSON.stringify({
        instructorParams,
        page,
        query,
        sort,
        subjectParams,
      })}
      error={error}
      initialInstructors={initialInstructors}
      initialQuery={query}
      initialResults={results}
      initialSort={sort === 'number' && order === 'DESC' ? 'number_desc' : sort}
      initialSubjects={initialSubjects}
    />
  )
}
