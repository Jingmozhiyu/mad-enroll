import type {Metadata} from 'next'
import {notFound, permanentRedirect} from 'next/navigation'
import {cache} from 'react'
import {CourseSummary} from '@/components/courses/course-summary'
import {CourseViews} from '@/components/courses/course-views'
import {fetchMadgradesCourseGrades, hasMadgradesToken, resolveMadgradesCourse} from '@/lib/madgrades/api'
import {getCoursePath, getCourseSlug} from '@/lib/madgrades/identifiers'
import type {CourseCompareState} from '@/lib/madgrades/types'
import {getCourseDisplayLine} from '@/lib/madgrades/utils'

type CoursePageProps = {
    params: Promise<{identifier: string}>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

const getCourse = cache(async (identifier: string) => {
    if (!hasMadgradesToken()) {
        throw new Error('Course data is temporarily unavailable.')
    }

    const course = await resolveMadgradesCourse(identifier)
    if (!course) {
        notFound()
    }
    return course
})

function getSelectionValue(value: string | string[] | undefined) {
    const parsed = Number(Array.isArray(value) ? value[0] : value)
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0
}

export async function generateMetadata({params}: CoursePageProps): Promise<Metadata> {
    const {identifier} = await params
    const course = await getCourse(identifier)
    const displayLine = getCourseDisplayLine(course)
    const title = `${displayLine}: ${course.name} — Grade Distribution & GPA | UW–Madison | MadEnroll`
    const description = `Historical grade distributions and GPA for ${displayLine}, ${course.name}, at UW–Madison. Compare grade counts, A rates and semester results, with data from Madgrades.`

    return {
        title,
        description,
        alternates: {canonical: getCoursePath(course)},
        openGraph: {title, description, url: getCoursePath(course), type: 'website'},
    }
}

export default async function CoursePage({params, searchParams}: CoursePageProps) {
    const {identifier} = await params
    const course = await getCourse(identifier)
    const query = await searchParams

    if (identifier !== getCourseSlug(course)) {
        const preservedQuery = new URLSearchParams()
        for (const [key, value] of Object.entries(query)) {
            if (Array.isArray(value)) {
                value.forEach((item) => preservedQuery.append(key, item))
            } else if (value !== undefined) {
                preservedQuery.set(key, value)
            }
        }
        const suffix = preservedQuery.toString()
        permanentRedirect(`${getCoursePath(course)}${suffix ? `?${suffix}` : ''}`)
    }

    const grades = await fetchMadgradesCourseGrades(course.uuid)
    const initialSelection: CourseCompareState = {
        instructorId: getSelectionValue(query.instructorId),
        termCode: getSelectionValue(query.termCode),
    }

    return (
        <CourseViews key={course.uuid} course={course} grades={grades} initialSelection={initialSelection}>
            <CourseSummary course={course} grades={grades}/>
        </CourseViews>
    )
}
