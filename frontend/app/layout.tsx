import type {Metadata} from 'next'
import localFont from 'next/font/local'
import {GeistSans} from 'geist/font/sans'
import type {ReactNode} from 'react'
import '@/app/globals.css'
import {Providers} from '@/components/providers'
import {SiteShell} from '@/components/site-shell'
import {getServerSession} from '@/lib/auth/session.server'

const hanyiWenHei = localFont({
    src: [
        {path: '../public/hanyi-wenhei-35w-latin.woff2', weight: '300', style: 'normal'},
        {path: '../public/hanyi-wenhei-45w-latin.woff2', weight: '400', style: 'normal'},
        {path: '../public/hanyi-wenhei-55w-latin.woff2', weight: '500', style: 'normal'},
        {path: '../public/hanyi-wenhei-65w-latin.woff2', weight: '600', style: 'normal'},
        {path: '../public/hanyi-wenhei-75w-latin.woff2', weight: '700', style: 'normal'},
        {path: '../public/hanyi-wenhei-85w-latin.woff2', weight: '800', style: 'normal'},
    ],
    display: 'swap',
    preload: false,
    fallback: ['Arial', 'sans-serif'],
})

export const metadata: Metadata = {
    title: 'MadEnroll',
    description: 'Course monitoring dashboard for search, subscriptions, and admin control.',
    icons: {
        icon: '/shamrock_6ccb20.svg',
    },
}

export default async function RootLayout({
                                             children,
                                         }: Readonly<{
    children: ReactNode
}>) {
    const {session} = await getServerSession()

    return (
        <html lang="en">
            <body className={`${hanyiWenHei.className} ${GeistSans.variable}`}>
                <Providers initialSession={session} initialSessionResolved>
                    <SiteShell>{children}</SiteShell>
                </Providers>
            </body>
        </html>
    )
}
