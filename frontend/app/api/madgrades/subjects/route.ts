import { NextResponse } from 'next/server'
import { searchMadgradesSubjects } from '@/lib/madgrades/api'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')?.trim() ?? ''

  if (query.length < 2) {
    return NextResponse.json([])
  }

  try {
    const response = await searchMadgradesSubjects(query)
    return NextResponse.json(response.results)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Subject search failed.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
