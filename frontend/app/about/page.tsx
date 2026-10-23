import type {Metadata} from 'next'
import {AboutHero} from '@/components/about/about-hero'

export const metadata: Metadata = {
    title: 'About MadEnroll | UW–Madison Seat Alerts & Course Grades',
    description: 'MadEnroll is an open-source UW–Madison enrollment tool with course seat alerts and historical course grade distributions.',
    alternates: {canonical: '/about'},
}

export default function AboutPage() {
    return <AboutHero/>
}
