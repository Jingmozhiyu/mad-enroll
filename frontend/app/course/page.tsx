import {CourseDirectory, getCourseDirectoryMetadata} from '@/components/courses/course-directory'

// Static subject list; subject pages (/course?subject=…) are rewritten to /course/[subject]/[page].
export const revalidate = 2592000

export function generateMetadata() {
    return getCourseDirectoryMetadata('', 1)
}

export default function CourseDirectoryPage() {
    return <CourseDirectory subjectCode="" page={1}/>
}
