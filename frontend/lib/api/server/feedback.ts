import 'server-only'

import {backendRequest} from '@/lib/api/server/http'
import type {FeedbackPayload} from '@/lib/feedback/types'

const FEEDBACK_API_PATH = process.env.FEEDBACK_API_PATH ?? '/api/feedback'

export async function backendSubmitFeedback(payload: FeedbackPayload, token?: string) {
    const payloadCandidates = [
        {message: payload.message},
        {content: payload.message},
        {feedback: payload.message},
        {text: payload.message},
    ]

    let lastError: unknown = null

    for (const candidate of payloadCandidates) {
        try {
            await backendRequest<null>(FEEDBACK_API_PATH, {
                method: 'POST',
                body: JSON.stringify(candidate),
            }, token)
            return
        } catch (error) {
            const status =
                typeof error === 'object' &&
                error !== null &&
                'status' in error &&
                typeof (error as { status?: unknown }).status === 'number'
                    ? (error as { status: number }).status
                    : 500

            lastError = error

            if (status !== 400 && status !== 422) {
                throw error
            }
        }
    }

    throw lastError ?? new Error('Failed to submit feedback.')
}
