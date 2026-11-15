import {MadgradesApiError} from '@/lib/madgrades/api'
import {SITE_URL} from '@/lib/seo'

/**
 * Last date the course and directory page HTML changed in code (titles, markup, routing fixes).
 * Bump it by hand when that HTML changes materially; Madgrades has no update timestamps, so data
 * refreshes never move it. Google ignores lastmod values that are not accurate.
 */
export const COURSE_PAGES_LASTMOD = '2026-11-15'

/** Writes sitemap URLs with XML escaping; lastmod is only published when a real date is known. */
export function sitemapResponse(paths: string[], index = false, lastmod?: string) {
    const root = index ? 'sitemapindex' : 'urlset'
    const item = index ? 'sitemap' : 'url'
    const entries = [...new Set(paths)].map((path) => {
        const url = new URL(path, SITE_URL).href
            .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;').replaceAll("'", '&apos;')
        return `<${item}><loc>${url}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</${item}>`
    }).join('')
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><${root} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</${root}>`, {
        headers: {'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=3600'},
    })
}

/** Reports sitemap failures without publishing an incomplete or substitute course catalog. */
export function sitemapErrorResponse(error: unknown) {
    const status = error instanceof MadgradesApiError && error.status === 404 ? 404 : 503
    if (status === 503) console.error('Course sitemap unavailable', error)
    return new Response(status === 404 ? 'Sitemap not found.' : 'Course sitemap is temporarily unavailable.', {
        status, headers: {'Cache-Control': 'no-store'},
    })
}
