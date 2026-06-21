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
                                <h1 className="text-3xl font-semibold leading-[1.16] tracking-tight text-[var(--color-ink)] md:text-4xl">
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
                </div>
            </div>
        </RouteProgressProvider>
    )
}
