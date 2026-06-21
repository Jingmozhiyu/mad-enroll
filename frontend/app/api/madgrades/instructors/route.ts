import {NextResponse} from 'next/server'
import {jsonError} from '@/lib/api/server/responses'
import {searchMadgradesInstructors} from '@/lib/madgrades/api'

export async function GET(request: Request) {
    const {searchParams} = new URL(request.url)
    const query = searchParams.get('query')?.trim() ?? ''

    if (query.length < 2) {
        return NextResponse.json([])
    }

    try {
        const response = await searchMadgradesInstructors(query)
        return NextResponse.json(response.results)
    } catch (error) {
        return jsonError(error, 'Instructor search failed.')
    }
}
