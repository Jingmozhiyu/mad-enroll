import {NextResponse} from 'next/server'
import {backendSearchSections} from '@/lib/api/server/subscriptions'
import {
    COURSE_SEARCH_FAILURE_MESSAGE,
} from '@/lib/course/search'
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
        const termCode = searchParams.get('termCode')
        if (!termCode || !/^\d{4}$/.test(termCode)) {
            return badRequestResponse('A four-digit termCode is required.')
        }
        const subjectId = searchParams.get('subjectId') ?? ''
        const courseId = searchParams.get('courseId') ?? ''

        if (!subjectId || !courseId) {
            return badRequestResponse('Subject and course are required.')
        }

        const results = await backendSearchSections(token, termCode, subjectId, courseId)
        return NextResponse.json(results)
    } catch (error) {
        return courseSearchErrorResponse(error, COURSE_SEARCH_FAILURE_MESSAGE)
    }
}
