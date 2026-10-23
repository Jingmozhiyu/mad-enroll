import {NextResponse} from 'next/server'
import {gradeApiSpec} from '@/lib/madgrades/openapi'

/** Publishes the OpenAPI contract without requiring client-side rendering. */
export function GET() {
    return NextResponse.json(gradeApiSpec, {
        headers: {'Cache-Control': 'public, max-age=3600', 'Content-Type': 'application/vnd.oai.openapi+json'},
    })
}
