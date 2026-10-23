'use client'

import {usePathname, useRouter} from 'next/navigation'
import {useCallback, useEffect, type ReactNode} from 'react'
import {BrandMark} from '@/components/brand-mark'
import {
    ProgressLink,
    RouteProgressProvider,
} from '@/components/navigation-progress'
import {useAuth} from '@/components/providers'

const navItems = [
    {href: '/', label: 'Home'},
    {href: '/monitor', label: 'Seat Alerts'},
    {href: '/search', label: 'Browse Courses'},
    {href: '/about', label: 'About'},
]

export function SiteShell({children}: { children: ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const {isLoggedIn, session} = useAuth()
    const isAdminUser = session?.email === 'ygong68@wisc.edu'
    const resolvedNavItems = isAdminUser
        ? [
            navItems[0],
            navItems[1],
            navItems[2],
            {href: '/admin', label: 'Admin'},
            navItems[3],
        ]
        : navItems

    const shouldTrackNavigation = useCallback(
        (href: string) => {
            if (!isLoggedIn) {
                return false
            }

            return (
                href === '/monitor' ||
                href.startsWith('/monitor?') ||
                href === '/search' ||
                href.startsWith('/search?')
            )
        },
        [isLoggedIn],
    )

    useEffect(() => {
        router.prefetch('/monitor')
        router.prefetch('/search')
    }, [router])

    return (
        <RouteProgressProvider shouldTrackNavigation={shouldTrackNavigation}>
            <div className="min-h-screen">
                <div className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col px-4 py-4 md:px-6 md:py-6">
                    <header
                        className="mb-8 flex flex-col gap-5 border-b border-[var(--surface-divider)] px-0 pb-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center">
                            <ProgressLink aria-label="Go to homepage" className="brand-mark-link" href="/">
                                <h1 className="font-geist-brand text-3xl leading-[1.16] tracking-tight text-[var(--color-ink)] md:text-4xl">
                                    <BrandMark variant={pathname === '/about' ? 'colorful' : 'default'}/>
                                </h1>
                            </ProgressLink>
                        </div>

                        <nav className="flex flex-wrap items-center gap-2">
                            {resolvedNavItems.map((item) => {
                                const isActive =
                                    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)

                                return (
                                    <ProgressLink
                                        key={item.href}
                                        className={[
                                            'rounded-[10px] px-4 py-2.5 text-sm font-bold leading-[1.18] transition',
                                            isActive ? 'nav-link-active' : 'nav-link-idle',
                                        ].join(' ')}
                                        href={item.href}
                                    >
                                        {item.label}
                                    </ProgressLink>
                                )
                            })}
                        </nav>
                    </header>

                    <main className="flex-1 pt-1">{children}</main>

                    <footer
                        className="mt-16 grid grid-cols-1 items-center gap-y-3 border-t border-[var(--surface-divider)] pt-5 pb-2 text-sm text-[var(--color-ink-soft)] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 lg:col-start-2">
                            <span>Courses updated <span style={{color:"#4183C4"}}>Spring 2027</span>.</span>
                            <a
                                className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-ink)] underline decoration-[var(--color-shizuku)] decoration-2 underline-offset-4 transition hover:decoration-[var(--color-miku)]"
                                href="https://github.com/jingmozhiyu/mad-enroll"
                                rel="noopener"
                                target="_blank"
                            >
                                <svg aria-hidden="true" className="h-4 w-4 text-[var(--color-monori)]" viewBox="0 0 24 24"
                                     fill="currentColor" stroke="#d99a6c" strokeWidth="1.2" strokeLinejoin="round">
                                    <path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.4 1.1 6.3L12 17.1l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z"/>
                                </svg>
                                Star it on GitHub
                            </a>
                        </div>
                        <nav aria-label="Grade data resources" className="flex items-center gap-4 justify-self-end text-xs lg:col-start-3">
                            <ProgressLink className="course-data-link" href="/course" prefetch={false}>Grade Dataset</ProgressLink>
                            <ProgressLink className="course-data-link" href="/openapi" prefetch={false}>API Reference</ProgressLink>
                        </nav>
                    </footer>
                </div>
            </div>
        </RouteProgressProvider>
    )
}
