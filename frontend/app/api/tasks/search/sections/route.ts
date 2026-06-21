import {NextResponse} from 'next/server'
import {backendSearchSections} from '@/lib/api/server/tasks'
import {
    COURSE_SEARCH_FAILURE_MESSAGE,
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
        const termId =
            searchParams.get('termId') ?? resolveTaskSearchTermId(searchParams.get('termKey'))
        const subjectId = searchParams.get('subjectId') ?? ''
        const courseId = searchParams.get('courseId') ?? ''

        if (!subjectId || !courseId) {
            return badRequestResponse('Subject and course are required.')
        }

        const results = await backendSearchSections(token, termId, subjectId, courseId)
        return NextResponse.json(results)
    } catch (error) {
        return courseSearchErrorResponse(error, COURSE_SEARCH_FAILURE_MESSAGE)
    }
}
