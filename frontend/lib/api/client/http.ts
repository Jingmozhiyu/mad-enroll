import axios from 'axios'
import {normalizeCourseSearchErrorMessage} from '@/lib/course/search'

export const clientApi = axios.create({
    baseURL: '',
    timeout: 20000,
    withCredentials: true,
})

export const ADMIN_REQUEST_TIMEOUT = 60000

export function getErrorMessage(error: unknown, fallbackMessage: string) {
    if (axios.isAxiosError(error)) {
        const responseData = error.response?.data
        const responseMessage =
            typeof responseData === 'string'
                ? responseData.trim()
                : typeof responseData?.msg === 'string'
                    ? responseData.msg
                    : typeof responseData?.message === 'string'
                        ? responseData.message
                        : typeof responseData?.error === 'string'
                            ? responseData.error
                            : null

        if (responseMessage) {
            return normalizeCourseSearchErrorMessage(responseMessage, fallbackMessage)
        }

        if ((error.response?.status ?? 0) >= 500) {
            return fallbackMessage
        }

        return normalizeCourseSearchErrorMessage(error.message, fallbackMessage)
    }

    if (error instanceof Error) {
        return normalizeCourseSearchErrorMessage(error, fallbackMessage)
    }

    return fallbackMessage
}

export function isUnauthorizedError(error: unknown) {
    return axios.isAxiosError(error) && error.response?.status === 401
}
