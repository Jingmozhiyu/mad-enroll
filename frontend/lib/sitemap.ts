import {MadgradesApiError} from '@/lib/madgrades/api'
import {SITE_URL} from '@/lib/seo'

/** Writes sitemap URLs with XML escaping; dates are omitted because the source has no update timestamps. */
export function sitemapResponse(paths: string[], index = false) {
    const root = index ? 'sitemapindex' : 'urlset'
    const item = index ? 'sitemap' : 'url'
    const entries = [...new Set(paths)].map((path) => {
        const url = new URL(path, SITE_URL).href
            .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;').replaceAll("'", '&apos;')
        return `<${item}><loc>${url}</loc></${item}>`
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
