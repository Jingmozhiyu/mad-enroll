import {NextResponse} from 'next/server'
import {backendSubmitFeedback} from '@/lib/api/server/feedback'
import {getServerSession} from '@/lib/auth/session.server'
import {jsonError} from '@/lib/api/server/responses'
import type {FeedbackPayload} from '@/lib/feedback/types'

export async function POST(request: Request) {
    try {
        const {token} = await getServerSession()
        const payload = (await request.json()) as Partial<FeedbackPayload>
        const normalized = {
            message: payload.message?.trim() ?? '',
        }

        if (!normalized.message) {
            return NextResponse.json(
                {message: 'Feedback message is required.'},
                {status: 400},
            )
        }

        await backendSubmitFeedback(normalized, token ?? undefined)

        return NextResponse.json({ok: true})
    } catch (error) {
        return jsonError(error, 'Failed to submit feedback.')
    }
}
