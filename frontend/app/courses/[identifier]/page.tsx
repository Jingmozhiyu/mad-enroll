import type {Metadata} from 'next'
import {permanentRedirect} from 'next/navigation'
import {CourseSummary} from '@/components/courses/course-summary'
import {CourseCharts} from '@/components/courses/course-views'
import {fetchMadgradesCourseGrades} from '@/lib/madgrades/api'
import {getCoursePageCourse, getCoursePageMetadata} from '@/lib/madgrades/course-page'
import {getCoursePath, getCourseSlug} from '@/lib/madgrades/identifiers'
import {getCourseDisplayLine} from '@/lib/madgrades/utils'
import {SITE_URL} from '@/lib/seo'

type CoursePageProps = {
    params: Promise<{identifier: string}>
}

// Historical grades rarely change: each page renders on its first request, then the CDN serves it
// until it is 30 days old (kept in step with the Madgrades fetch cache). Nothing is prebuilt.
// Old ?view=charts links get this same page: the charts are always shown and read the URL themselves.
// The chart view renders client-side only, so the static HTML carries a skeleton plus the collapsed summary.
export const revalidate = 2592000

export function generateStaticParams() {
    return []
}

export async function generateMetadata({params}: CoursePageProps): Promise<Metadata> {
    const {identifier} = await params
    return getCoursePageMetadata(await getCoursePageCourse(identifier))
}

export default async function CoursePage({params}: CoursePageProps) {
    const {identifier} = await params
    const course = await getCoursePageCourse(identifier)

    // A static page cannot see the query string, so a non-canonical link loses any query here.
    if (identifier !== getCourseSlug(course)) {
        permanentRedirect(getCoursePath(course))
    }

    const grades = await fetchMadgradesCourseGrades(course.uuid)
    return (
        <div className="grid min-w-0 gap-5">
            <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Dataset',
                name: `${getCourseDisplayLine(course)}: ${course.name} — UW–Madison grade distribution`,
                description: `Historical grade counts, GPA, A rates and semester results for ${getCourseDisplayLine(course)}, available on MadEnroll.`,
                identifier: getCourseSlug(course),
                url: `${SITE_URL}${getCoursePath(course)}`,
                provider: {'@type': 'Organization', name: 'MadEnroll', url: SITE_URL},
                distribution: {
                    '@type': 'DataDownload',
                    encodingFormat: 'application/json',
                    contentUrl: `${SITE_URL}/api/grades/courses/${encodeURIComponent(getCourseSlug(course))}`,
                },
            }).replaceAll('<', '\\u003c')}}/>
            <CourseCharts course={course} grades={grades} initialSelection={{instructorId: 0, termCode: 0}}/>
            {/*
              Text alternative for the charts: the same data as tables, for screen readers and clients without
              JavaScript. Visually hidden (sr-only), so the page looks exactly like the chart view. It must only
              restate what the charts show — never extra keywords — or it becomes hidden text under Google's spam policy.
            */}
            <section aria-label="Grade data" className="sr-only">
                <CourseSummary course={course} grades={grades}/>
            </section>
        </div>
    )
}
