import {NextResponse} from 'next/server'
import {backendFetchMailAlertTotal} from '@/lib/api/server/public-stats'
import {jsonError} from '@/lib/api/server/responses'

export async function GET() {
    try {
        const total = await backendFetchMailAlertTotal()
        return NextResponse.json(total)
    } catch (error) {
        return jsonError(error, 'Failed to load the mail alert total.')
    }
}
