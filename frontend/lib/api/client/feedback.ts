import {clientApi} from '@/lib/api/client/http'
import type {FeedbackPayload} from '@/lib/feedback/types'

export async function submitFeedback(payload: FeedbackPayload) {
    await clientApi.post('/api/feedback', payload)
}
