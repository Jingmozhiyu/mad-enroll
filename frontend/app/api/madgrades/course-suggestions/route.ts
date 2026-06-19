import { NextResponse } from 'next/server'
import { searchMadgradesCourseSuggestions } from '@/lib/madgrades/api'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')?.trim() ?? ''

  if (query.length < 2) {
    return NextResponse.json([])
  }

  try {
    const results = await searchMadgradesCourseSuggestions(query)
    return NextResponse.json(results)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Suggestion request failed.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
