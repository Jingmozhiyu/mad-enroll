import type {
  MadgradesCourseSuggestion,
  MadgradesInstructor,
  MadgradesSubject,
} from '@/lib/madgrades/types'

async function readJson<T>(input: RequestInfo | URL) {
  const response = await fetch(input, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with ${response.status}.`)
  }

  return (await response.json()) as T
}

export async function fetchCourseSuggestions(query: string) {
  const url = new URL('/api/madgrades/course-suggestions', window.location.origin)
  url.searchParams.set('query', query)
  return readJson<MadgradesCourseSuggestion[]>(url)
}

export async function fetchSubjectOptions(query: string) {
  const url = new URL('/api/madgrades/subjects', window.location.origin)
  url.searchParams.set('query', query)
  return readJson<MadgradesSubject[]>(url)
}

export async function fetchInstructorOptions(query: string) {
  const url = new URL('/api/madgrades/instructors', window.location.origin)
  url.searchParams.set('query', query)
  return readJson<MadgradesInstructor[]>(url)
}
