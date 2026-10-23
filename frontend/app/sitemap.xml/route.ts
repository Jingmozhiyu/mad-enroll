import type {NextRequest} from 'next/server'
import {fetchMadgradesCourseDirectory, fetchMadgradesSubjectCatalog, hasMadgradesToken, MadgradesApiError} from '@/lib/madgrades/api'
import {getCoursePath} from '@/lib/madgrades/identifiers'
import {sitemapErrorResponse, sitemapResponse} from '@/lib/sitemap'

/** Publishes the sitemap index or one subject's complete catalog, all at the site root. */
export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams
    try {
        if (query.get('section') === 'pages') {
            return sitemapResponse([
                '/', '/monitor', '/search', '/course', '/openapi', '/about',
                '/news/fall-2026-report', '/news/fall-2026-report?lang=zh-cn',
            ])
        }
        if (!hasMadgradesToken()) throw new MadgradesApiError(503)
        const subjects = await fetchMadgradesSubjectCatalog()
        const subjectId = query.get('subject')
        if (subjectId === null) {
            return sitemapResponse([
                '/sitemap.xml?section=pages',
                ...subjects.map((subject) => `/sitemap.xml?subject=${encodeURIComponent(subject.code)}`),
            ], true)
        }
        if (!subjects.some((subject) => subject.code === subjectId)) throw new MadgradesApiError(404)
        const first = await fetchMadgradesCourseDirectory(subjectId)
        if (!Number.isSafeInteger(first.totalPages) || first.totalPages < 0) throw new MadgradesApiError(502)
        const courses = [...first.results]
        const paths = [`/course?subject=${encodeURIComponent(subjectId)}`]
        for (let page = 2; page <= first.totalPages; page += 1) {
            courses.push(...(await fetchMadgradesCourseDirectory(subjectId, page)).results)
            paths.push(`/course?subject=${encodeURIComponent(subjectId)}&page=${page}`)
        }

        // Cross-listings appear only in their first UW subject, matching canonical identifier order.
        const identities = new Map<string, Set<string>>()
        for (const course of courses) {
            const primarySubject = [...course.subjects].sort((left, right) =>
                left.code.localeCompare(right.code, 'en', {numeric: true}))[0]
            if (primarySubject?.code !== subjectId) continue
            const path = getCoursePath(course)
            const uuids = identities.get(path) ?? new Set<string>()
            uuids.add(course.uuid)
            identities.set(path, uuids)
        }
        // Ambiguous historical identities cannot resolve to one canonical page.
        for (const [path, uuids] of identities) {
            if (uuids.size === 1) paths.push(path)
        }
        return sitemapResponse(paths)
    } catch (error) {
        return sitemapErrorResponse(error)
    }
}
