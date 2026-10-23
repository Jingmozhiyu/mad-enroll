import 'server-only'

import {cache} from 'react'
import {
    findCourseIdentifierMatches,
    getCoursePath,
    getSubjectIdentifier,
    normalizeSubjectIdentifier,
    parseCourseIdentifier,
} from '@/lib/madgrades/identifiers'
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
const CATALOG_REVALIDATE_SECONDS = 86_400
const CATALOG_PAGE_SIZE = 100
const MAX_CATALOG_PAGES = 10
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** An upstream failure with a safe public message and the HTTP status needed by callers. */
export class MadgradesApiError extends Error {
    readonly status: number

    constructor(status: number, message = 'Course data is temporarily unavailable. Please try again later.') {
        super(message)
        this.name = 'MadgradesApiError'
        this.status = status
    }
}

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

async function madgradesFetch<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
    cacheCatalog = false,
) {
    let response: Response
    try {
        response = await fetch(buildUrl(path, params), {
            method: 'GET',
            headers: {
                Authorization: `Token token=${MADGRADES_API_TOKEN}`,
            },
            ...(cacheCatalog ? {next: {revalidate: CATALOG_REVALIDATE_SECONDS}} : {cache: 'no-store'}),
        })
    } catch {
        throw new MadgradesApiError(503)
    }

    if (!response.ok) {
        throw new MadgradesApiError(response.status)
    }

    try {
        return (await response.json()) as T
    } catch {
        throw new MadgradesApiError(502)
    }
}

async function fetchCatalogPages(
    path: string,
    params?: Record<string, string | number | undefined>,
) {
    const results: Record<string, unknown>[] = []
    let totalPages = 1
    for (let page = 1; page <= totalPages; page += 1) {
        const response = await madgradesFetch<MadgradesPaginatedResponse<Record<string, unknown>>>(
            path,
            {...params, page, per_page: CATALOG_PAGE_SIZE},
            true,
        )
        if (!Number.isInteger(response.totalPages) || response.totalPages < 0 ||
            response.totalPages > MAX_CATALOG_PAGES || !Array.isArray(response.results)) {
            throw new MadgradesApiError(502)
        }
        totalPages = response.totalPages
        results.push(...response.results)
    }
    return results
}

const fetchSubjectCatalog = cache(async () => {
    const subjects = await fetchCatalogPages('subjects')
    return subjects.map(normalizeSubject)
})

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
        path: getCoursePath(course),
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

export const fetchMadgradesCourse = cache(async (uuid: string) => {
    const response = await madgradesFetch<Record<string, unknown>>(
        `courses/${encodeURIComponent(uuid)}`, undefined, true,
    )
    return normalizeCourse(response)
})

export async function fetchMadgradesSubject(code: string) {
    const response = await madgradesFetch<Record<string, unknown>>(
        `subjects/${encodeURIComponent(code)}`, undefined, true,
    )
    return normalizeSubject(response)
}

export async function fetchMadgradesInstructor(id: number) {
    const response = await madgradesFetch<Record<string, unknown>>(`instructors/${id}`, undefined, true)
    return normalizeInstructor(response)
}

export const fetchMadgradesCourseGrades = cache(async (uuid: string) => {
    const response = await madgradesFetch<Record<string, unknown>>(
        `courses/${encodeURIComponent(uuid)}/grades`, undefined, true,
    )
    return normalizeCourseGrades(response) satisfies MadgradesCourseGrades
})

/** Resolves UUIDs or readable course codes without treating fuzzy search results as identities. */
export const resolveMadgradesCourse = cache(async (identifier: string): Promise<MadgradesCourse | null> => {
    if (UUID_PATTERN.test(identifier)) {
        try {
            return await fetchMadgradesCourse(identifier.toLowerCase())
        } catch (error) {
            if (error instanceof MadgradesApiError && error.status === 404) {
                return null
            }
            throw error
        }
    }

    const parsed = parseCourseIdentifier(identifier)
    if (!parsed) {
        return null
    }

    const catalog = await fetchSubjectCatalog()
    const subjectCodes: string[] = []
    for (const identifier of parsed.subjects) {
        const matches = catalog.filter((subject) =>
            getSubjectIdentifier(subject) === identifier ||
            normalizeSubjectIdentifier(subject.code) === identifier)
        const codes = [...new Set(matches.map((subject) => subject.code))]
        if (codes.length === 0) {
            return null
        }
        if (codes.length > 1) {
            throw new MadgradesApiError(409, 'This course code is ambiguous. Please search for the course.')
        }
        subjectCodes.push(codes[0])
    }

    // Madgrades supports exact number + subject filtering; its query parameter is fuzzy search.
    const candidates = await fetchCatalogPages('courses', {
        subject: subjectCodes[0],
        number: parsed.number,
        sort: 'name',
        order: 'ASC',
    })
    const matches = findCourseIdentifierMatches(candidates.map(normalizeCourse), subjectCodes, parsed.number)
    if (matches.length > 1) {
        throw new MadgradesApiError(409, 'This course code is ambiguous. Please search for the course.')
    }

    return matches[0] ?? null
})
