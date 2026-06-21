import {NextResponse} from 'next/server'
import {
    COURSE_SEARCH_NOT_FOUND_MESSAGE,
    normalizeCourseSearchErrorMessage,
} from '@/lib/course/search'

export function getErrorStatus(error: unknown, fallbackStatus = 500) {
    return typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
        ? (error as { status: number }).status
        : fallbackStatus
}

export function getErrorMessage(error: unknown, fallbackMessage: string) {
    return error instanceof Error && error.message.trim()
        ? error.message
        : fallbackMessage
}

export function jsonError(error: unknown, fallbackMessage: string) {
    return NextResponse.json(
        {message: getErrorMessage(error, fallbackMessage)},
        {status: getErrorStatus(error)},
    )
}

export function unauthorizedResponse() {
    return NextResponse.json({message: 'Unauthorized'}, {status: 401})
}

export function badRequestResponse(message: string) {
    return NextResponse.json({message}, {status: 400})
}

export function courseSearchErrorResponse(error: unknown, fallbackMessage: string) {
    const status = getErrorStatus(error)
    const message = normalizeCourseSearchErrorMessage(error, fallbackMessage)
    const nextStatus =
        message === COURSE_SEARCH_NOT_FOUND_MESSAGE
            ? 404
            : status >= 500
                ? 500
                : status

    return NextResponse.json({message}, {status: nextStatus})
}
