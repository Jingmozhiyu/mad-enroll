import {clientApi} from '@/lib/api/client/http'
import type {SearchCourseHit, SearchTerm, Subscription} from '@/lib/course/types'

export async function fetchSearchTerms() {
    return (await clientApi.get<SearchTerm[]>('/api/subscriptions/terms')).data
}

export async function fetchSubscriptions() {
    const response = await clientApi.get<Subscription[]>('/api/subscriptions')
    return response.data
}

export async function searchCourses(courseName: string, termCode: string, page: number) {
    const response = await clientApi.get<SearchCourseHit[]>('/api/subscriptions/search/courses', {
        params: {courseName, page, termCode},
    })

    return response.data
}

export async function searchSections(termCode: string, subjectId: string, courseId: string) {
    const response = await clientApi.get<Subscription[]>('/api/subscriptions/search/sections', {
        params: {courseId, subjectId, termCode},
    })

    return response.data
}

export async function addSubscription(docId: string) {
    const response = await clientApi.post<Subscription>('/api/subscriptions', null, {
        params: {docId},
    })

    return response.data
}

export async function deleteSubscription(docId: string) {
    await clientApi.delete('/api/subscriptions', {
        params: {docId},
    })
}
