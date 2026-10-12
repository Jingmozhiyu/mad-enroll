import 'server-only'

import {backendRequest} from '@/lib/api/server/http'
import type {SearchCourseHit, SearchTerm, Subscription} from '@/lib/course/types'

export async function backendFetchSearchTerms(token: string) {
    return backendRequest<SearchTerm[]>('/api/subscriptions/terms', {method: 'GET'}, token)
}

export async function backendFetchSubscriptions(token: string) {
    return backendRequest<Subscription[]>('/api/subscriptions', {method: 'GET'}, token)
}

export async function backendSearchCourses(
    token: string,
    courseName: string,
    termCode: string,
    page: number,
) {
    const path =
        `/api/subscriptions/search/courses?courseName=${encodeURIComponent(courseName)}` +
        `&termCode=${encodeURIComponent(termCode)}` +
        `&page=${encodeURIComponent(String(page))}`
    return backendRequest<SearchCourseHit[]>(path, {method: 'GET'}, token)
}

export async function backendSearchSections(
    token: string,
    termCode: string,
    subjectId: string,
    courseId: string,
) {
    const path =
        `/api/subscriptions/search/sections?termCode=${encodeURIComponent(termCode)}` +
        `&subjectId=${encodeURIComponent(subjectId)}` +
        `&courseId=${encodeURIComponent(courseId)}`
    return backendRequest<Subscription[]>(path, {method: 'GET'}, token)
}

export async function backendAddSubscription(token: string, docId: string) {
    const path = `/api/subscriptions?docId=${encodeURIComponent(docId)}`
    return backendRequest<Subscription>(path, {method: 'POST'}, token)
}

export async function backendDeleteSubscription(token: string, docId: string) {
    const path = `/api/subscriptions?docId=${encodeURIComponent(docId)}`
    await backendRequest<null>(path, {method: 'DELETE'}, token)
}
