import type {MetadataRoute} from 'next'
import {SITE_URL} from '@/lib/seo'

/** Opens public HTML and grade APIs to search and AI crawlers while excluding account operations. */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: ['/', '/api/grades/'],
            disallow: ['/admin', '/api/'],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
    }
}
