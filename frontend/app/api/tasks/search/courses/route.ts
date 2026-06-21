import {NextResponse} from 'next/server'
import {backendSearchCourses} from '@/lib/api/server/tasks'
import {
    COURSE_SEARCH_FAILURE_MESSAGE,
    getCourseSearchValidationMessage,
    normalizeCourseSearchQuery,
} from '@/lib/course/search'
import {resolveTaskSearchTermId} from '@/lib/course/task-search-terms.server'
import {getServerSession} from '@/lib/auth/session.server'
import {
    badRequestResponse,
    courseSearchErrorResponse,
    unauthorizedResponse,
} from '@/lib/api/server/responses'

export async function GET(request: Request) {
    const {token} = await getServerSession()
    if (!token) {
        return unauthorizedResponse()
    }

    try {
        const {searchParams} = new URL(request.url)
        const courseName = normalizeCourseSearchQuery(searchParams.get('courseName') ?? '')
        const termId =
            searchParams.get('termId') ?? resolveTaskSearchTermId(searchParams.get('termKey'))
        const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
        const validationMessage = getCourseSearchValidationMessage(courseName)

        if (validationMessage) {
            return badRequestResponse(validationMessage)
        }

        const results = await backendSearchCourses(token, courseName, termId, page)
        return NextResponse.json(results)
    } catch (error) {
        return courseSearchErrorResponse(error, COURSE_SEARCH_FAILURE_MESSAGE)
    }
}
