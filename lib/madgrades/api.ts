import 'server-only'

import type {
  MadgradesCourse,
  MadgradesCourseGrades,
  MadgradesCourseSuggestion,
  MadgradesInstructor,
  MadgradesPaginatedResponse,
  MadgradesSearchParams,
  MadgradesSubject,
} from '@/lib/madgrades/types'
import {
  normalizeCourse,
  normalizeCourseGrades,
  normalizeInstructor,
  normalizeSubject,
} from '@/lib/madgrades/utils'

const MADGRADES_API_BASE =
  process.env.MADGRADES_API ?? 'https://api.madgrades.com/'
const MADGRADES_API_TOKEN = process.env.MADGRADES_API_TOKEN ?? ''

function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(`v1/${path}`, MADGRADES_API_BASE)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

async function madgradesFetch<T>(path: string, params?: Record<string, string | number | undefined>) {
  const response = await fetch(buildUrl(path, params), {
    method: 'GET',
    headers: {
      Authorization: `Token token=${MADGRADES_API_TOKEN}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Madgrades request failed with ${response.status}.`)
  }

  return (await response.json()) as T
}

export function hasMadgradesToken() {
  return Boolean(MADGRADES_API_TOKEN)
}

export async function searchMadgradesCourses(params: MadgradesSearchParams) {
  const response = await madgradesFetch<MadgradesPaginatedResponse<Record<string, unknown>>>(
    'courses',
    {
      query: params.query,
      subject: params.subjects?.join(','),
      instructor: params.instructors?.join(','),
      sort: params.sort,
      order: params.order,
      page: params.page ?? 1,
      per_page: params.perPage ?? 25,
    },
  )

  return {
    ...response,
    results: response.results.map(normalizeCourse),
  } satisfies MadgradesPaginatedResponse<MadgradesCourse>
}

export async function searchMadgradesCourseSuggestions(query: string, limit = 8) {
  if (!query.trim()) {
    return [] as MadgradesCourseSuggestion[]
  }

  const response = await searchMadgradesCourses({
    query: query.trim(),
    perPage: Math.max(limit, 1),
    page: 1,
  })

  return response.results.slice(0, limit).map((course) => ({
    uuid: course.uuid,
    name: course.name,
    displayLine: `${course.subjects
      .map((subject) => subject.abbreviation || subject.code || subject.name)
      .join(', ')} ${course.number}`.trim(),
  }))
}

export async function searchMadgradesSubjects(query: string, page = 1) {
  const response = await madgradesFetch<MadgradesPaginatedResponse<Record<string, unknown>>>(
    'subjects',
    {
      query,
      page,
      per_page: 50,
    },
  )

  return {
    ...response,
    results: response.results.map(normalizeSubject),
  } satisfies MadgradesPaginatedResponse<MadgradesSubject>
}

export async function searchMadgradesInstructors(query: string, page = 1) {
  const response = await madgradesFetch<MadgradesPaginatedResponse<Record<string, unknown>>>(
    'instructors',
    {
      query,
      page,
      per_page: 50,
    },
  )

  return {
    ...response,
    results: response.results.map(normalizeInstructor),
  } satisfies MadgradesPaginatedResponse<MadgradesInstructor>
}

export async function fetchMadgradesCourse(uuid: string) {
  const response = await madgradesFetch<Record<string, unknown>>(`courses/${uuid}`)
  return normalizeCourse(response)
}

export async function fetchMadgradesSubject(code: string) {
  const response = await madgradesFetch<Record<string, unknown>>(`subjects/${code}`)
  return normalizeSubject(response)
}

export async function fetchMadgradesInstructor(id: number) {
  const response = await madgradesFetch<Record<string, unknown>>(`instructors/${id}`)
  return normalizeInstructor(response)
}

export async function fetchMadgradesCourseGrades(uuid: string) {
  const response = await madgradesFetch<Record<string, unknown>>(`courses/${uuid}/grades`)
  return normalizeCourseGrades(response) satisfies MadgradesCourseGrades
}
