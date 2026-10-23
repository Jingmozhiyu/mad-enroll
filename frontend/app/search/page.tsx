import type {Metadata} from 'next'
import {MadgradesSearchPage} from '@/components/search/search-page'
import {
    fetchMadgradesInstructor,
    fetchMadgradesSubject,
    hasMadgradesToken,
    searchMadgradesCourses,
    resolveMadgradesCourse,
} from '@/lib/madgrades/api'
import type {MadgradesPaginatedResponse, MadgradesCourse} from '@/lib/madgrades/types'
import type {SearchEntityOption} from '@/components/search/entity-multi-select'

type SearchPageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

// The default recommendations are curated, rather than inferred from upstream search order.
const FEATURED_COURSES = ['ANTHRO_104', 'BIOCHEM_104', 'CURRIC_277', 'LIS_202', 'NUTRSCI_132']

export async function generateMetadata({searchParams}: SearchPageProps): Promise<Metadata> {
    const params = await searchParams
    const canonicalParams = new URLSearchParams()
    for (const key of ['query', 'subjects', 'instructors', 'sort', 'order', 'page']) {
        for (const value of getMultiParam(params[key])) {
            if (value.trim() && !(key === 'page' && value === '1') && !(key === 'sort' && value === 'relevance') && !(key === 'order' && value === 'ASC')) {
                canonicalParams.append(key, value.trim())
            }
        }
    }
    const suffix = canonicalParams.toString()
    return {
        title: 'Browse UW–Madison Courses & Grade Distributions | MadEnroll',
        description: 'Search UW–Madison courses by subject, instructor or course code. Compare historical grade distributions and GPA.',
        alternates: {canonical: `/search${suffix ? `?${suffix}` : ''}`},
        robots: suffix ? {index: false, follow: true} : {index: true, follow: true},
    }
}

function getSingleParam(value: string | string[] | undefined) {
    return typeof value === 'string' ? value : Array.isArray(value) ? value[0] ?? '' : ''
}

function getMultiParam(value: string | string[] | undefined) {
    return Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : []
}

export default async function SearchPage({
                                             searchParams,
                                         }: SearchPageProps) {
    const params = await searchParams
    const query = getSingleParam(params.query)
    const subjectParams = getMultiParam(params.subjects)
    const instructorParams = getMultiParam(params.instructors)
    const sort = getSingleParam(params.sort) || 'relevance'
    const order = getSingleParam(params.order) === 'DESC' ? 'DESC' : 'ASC'
    const page = Number(getSingleParam(params.page) || '1') || 1
    const isFeatured = !query.trim() && subjectParams.length === 0 && instructorParams.length === 0 &&
        page <= 1 && sort === 'relevance' && order === 'ASC'

    let results: MadgradesPaginatedResponse<MadgradesCourse> | null = null
    let error: string | null = null

    if (!hasMadgradesToken()) {
        error = 'Course data is temporarily unavailable. Please try again later.'
    } else {
        try {
            if (isFeatured) {
                const courses = await Promise.all(FEATURED_COURSES.map(async (identifier) => {
                    const course = await resolveMadgradesCourse(identifier)
                    if (!course) throw new Error(`Course data is unavailable for ${identifier}.`)
                    return course
                }))
                results = {currentPage: 1, totalPages: 1, totalCount: courses.length, results: courses}
            } else {
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
            }
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
                    return {key: code, label: code} satisfies SearchEntityOption
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
                    return {key: idText, label: idText} satisfies SearchEntityOption
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
            isFeatured={isFeatured}
        />
    )
}
