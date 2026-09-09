import {clientApi} from '@/lib/api/client/http'
import type {SearchCourseHit, SearchTerm, Task} from '@/lib/course/types'

export async function fetchSearchTerms() {
    return (await clientApi.get<SearchTerm[]>('/api/tasks/terms')).data
}

export async function fetchTasks() {
    const response = await clientApi.get<Task[]>('/api/tasks')
    return response.data
}

export async function searchCourses(courseName: string, termId: string, page: number) {
    const response = await clientApi.get<SearchCourseHit[]>('/api/tasks/search/courses', {
        params: {courseName, page, termId},
    })

    return response.data
}

export async function searchSections(termId: string, subjectId: string, courseId: string) {
    const response = await clientApi.get<Task[]>('/api/tasks/search/sections', {
        params: {courseId, subjectId, termId},
    })

    return response.data
}

export async function addTask(docId: string) {
    const response = await clientApi.post<Task>('/api/tasks', null, {
        params: {docId},
    })

    return response.data
}

export async function deleteTask(docId: string) {
    await clientApi.delete('/api/tasks', {
        params: {docId},
    })
}
