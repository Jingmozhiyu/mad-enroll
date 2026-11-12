import {notFound} from 'next/navigation'
import {CourseDirectory, getCourseDirectoryMetadata} from '@/components/courses/course-directory'

type CourseDirectoryPageProps = {
    params: Promise<{segments?: string[]}>
}

// Serves /course (no segments) and /course?subject=…&page=… (rewritten in next.config to
// /course/[subject]/[page]). Like the course pages, every URL is rendered on its first request and
// then cached for 30 days; nothing is prerendered, so builds do not depend on Madgrades being up.
// Canonical URLs stay /course and the query form.
export const revalidate = 2592000

export function generateStaticParams() {
    return []
}

function parsePage(value: string) {
    return /^\d+$/.test(value) ? Number(value) : 0
}

/** Maps the route segments to a directory view, or null when the path is not one. */
function parseSegments(segments: string[] | undefined) {
    if (!segments) {
        return {subjectCode: '', page: 1}
    }
    if (segments.length === 2) {
        return {subjectCode: segments[0], page: parsePage(segments[1])}
    }
    return null
}

export async function generateMetadata({params}: CourseDirectoryPageProps) {
    const view = parseSegments((await params).segments)
    if (!view) {
        notFound()
    }
    return getCourseDirectoryMetadata(view.subjectCode, view.page)
}

export default async function CourseDirectoryPage({params}: CourseDirectoryPageProps) {
    const view = parseSegments((await params).segments)
    if (!view) {
        notFound()
    }
    return <CourseDirectory subjectCode={view.subjectCode} page={view.page}/>
}
