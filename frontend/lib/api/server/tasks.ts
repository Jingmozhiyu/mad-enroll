import 'server-only'

import {backendRequest} from '@/lib/api/server/http'
import type {SearchCourseHit, Task} from '@/lib/course/types'

export async function backendFetchTasks(token: string) {
    return backendRequest<Task[]>('/api/tasks', {method: 'GET'}, token)
}

export async function backendSearchCourses(
    token: string,
    courseName: string,
    termId: string,
    page: number,
) {
    const path =
        `/api/tasks/search/courses?courseName=${encodeURIComponent(courseName)}` +
        `&termId=${encodeURIComponent(termId)}` +
        `&page=${encodeURIComponent(String(page))}`
    return backendRequest<SearchCourseHit[]>(path, {method: 'GET'}, token)
}

export async function backendSearchSections(
    token: string,
    termId: string,
    subjectId: string,
    courseId: string,
) {
    const path =
        `/api/tasks/search/sections?termId=${encodeURIComponent(termId)}` +
        `&subjectId=${encodeURIComponent(subjectId)}` +
        `&courseId=${encodeURIComponent(courseId)}`
    return backendRequest<Task[]>(path, {method: 'GET'}, token)
}

export async function backendSearchCourse(token: string, courseName: string) {
    return backendSearchCourses(token, courseName, '1272', 1)
}

export async function backendAddTask(token: string, docId: string) {
    const path = `/api/tasks?docId=${encodeURIComponent(docId)}`
    return backendRequest<Task>(path, {method: 'POST'}, token)
}

export async function backendDeleteTask(token: string, docId: string) {
    const path = `/api/tasks?docId=${encodeURIComponent(docId)}`
    await backendRequest<null>(path, {method: 'DELETE'}, token)
}
