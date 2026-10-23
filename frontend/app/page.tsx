import type {Metadata} from 'next'
import {WelcomeHero} from '@/components/home/welcome-hero'
import {SITE_DESCRIPTION, SITE_TITLE, SITE_URL} from '@/lib/seo'

export const metadata: Metadata = {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    alternates: {canonical: '/'},
    openGraph: {title: SITE_TITLE, description: SITE_DESCRIPTION, url: '/', siteName: 'MadEnroll'},
    twitter: {card: 'summary', title: SITE_TITLE, description: SITE_DESCRIPTION},
}

export default function WelcomePage() {
    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                '@id': `${SITE_URL}/#website`,
                name: 'MadEnroll',
                url: SITE_URL,
                description: SITE_DESCRIPTION,
                publisher: {'@type': 'Organization', name: 'MadEnroll', url: SITE_URL, sameAs: 'https://github.com/jingmozhiyu/mad-enroll'},
                hasPart: [
                    {'@type': 'WebPage', name: 'UW–Madison Seat Alerts', url: `${SITE_URL}/monitor`},
                    {'@type': 'WebPage', name: 'UW–Madison Grade Distribution Dataset', url: `${SITE_URL}/course`},
                    {'@type': 'WebPage', name: 'Grade Data API Reference', url: `${SITE_URL}/openapi`},
                ],
            })}}/>
            <WelcomeHero/>
        </>
    )
}
