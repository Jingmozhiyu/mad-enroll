import 'server-only'

import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {cache} from 'react'
import {hasMadgradesToken, resolveMadgradesCourse} from '@/lib/madgrades/api'
import {getCoursePath} from '@/lib/madgrades/identifiers'
import type {MadgradesCourse} from '@/lib/madgrades/types'
import {getCourseDisplayLine} from '@/lib/madgrades/utils'

/** Resolves a /courses/[identifier] parameter for the summary and chart pages, or renders 404. */
export const getCoursePageCourse = cache(async (identifier: string) => {
    if (!hasMadgradesToken()) {
        throw new Error('Course data is temporarily unavailable.')
    }

    const course = await resolveMadgradesCourse(identifier)
    if (!course) {
        notFound()
    }
    return course
})

/** Metadata shared by both views; the canonical URL is always the summary page. */
export function getCoursePageMetadata(course: MadgradesCourse): Metadata {
    const displayLine = getCourseDisplayLine(course)
    const title = `${displayLine} - Grade Distribution - ${course.name} | UW–Madison | MadEnroll`
    const description = `Historical grade distributions and GPA for ${displayLine}, ${course.name}, at UW–Madison. Compare grade counts, A rates and semester results on MadEnroll.`

    return {
        title,
        description,
        alternates: {canonical: getCoursePath(course)},
        openGraph: {title, description, url: getCoursePath(course), type: 'website'},
    }
}
