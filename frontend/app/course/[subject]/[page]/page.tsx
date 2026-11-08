import {CourseDirectory, getCourseDirectoryMetadata} from '@/components/courses/course-directory'

type SubjectDirectoryPageProps = {
    params: Promise<{subject: string, page: string}>
}

// Serves /course?subject=…&page=… (rewritten in next.config) as a static page: rendered on the
// first request, then cached for 30 days like the course pages. Its canonical URL stays the query form.
export const revalidate = 2592000

export function generateStaticParams() {
    return []
}

function parsePage(value: string) {
    return /^\d+$/.test(value) ? Number(value) : 0
}

export async function generateMetadata({params}: SubjectDirectoryPageProps) {
    const {subject, page} = await params
    return getCourseDirectoryMetadata(subject, parsePage(page))
}

export default async function SubjectDirectoryPage({params}: SubjectDirectoryPageProps) {
    const {subject, page} = await params
    return <CourseDirectory subjectCode={subject} page={parsePage(page)}/>
}
