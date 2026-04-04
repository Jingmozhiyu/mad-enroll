'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, type ReactNode } from 'react'
import { BrandMark } from '@/components/brand-mark'
import {
  ProgressLink,
  RouteProgressProvider,
} from '@/components/navigation-progress'
import { useAuth } from '@/components/providers'

const navItems = [
  { href: '/', label: 'Welcome' },
  { href: '/monitor', label: 'Monitor' },
  { href: '/search', label: 'Search' },
  { href: '/about', label: 'About' },
]

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isLoggedIn, session } = useAuth()
  const isAdminUser = session?.email === 'ygong68@wisc.edu'
  const resolvedNavItems = isAdminUser
    ? [
        navItems[0],
        navItems[1],
        navItems[2],
        { href: '/admin', label: 'Admin' },
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
      <div className="relative min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute -left-10 top-[-5rem] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(154,238,222,0.36),transparent_72%)] blur-2xl" />
        <div className="pointer-events-none absolute right-[-5rem] top-14 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(51,204,187,0.28),transparent_70%)] blur-2xl" />
        <div className="pointer-events-none absolute bottom-[-7rem] left-1/4 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(154,238,222,0.2),transparent_70%)] blur-2xl" />

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-4 py-3 md:px-5 md:py-4">
          <header className="mb-4 flex flex-col gap-4 border-b border-[rgba(154,238,222,0.3)] px-0 py-2 md:flex-row md:items-center md:justify-between md:py-3">
            <div className="flex items-center">
              <ProgressLink aria-label="Go to homepage" className="brand-mark-link" href="/">
                <h1 className="text-3xl font-semibold leading-[1.16] tracking-tight text-[var(--color-ink)] md:text-4xl">
                  <BrandMark variant={pathname === '/about' ? 'colorful' : 'default'} />
                </h1>
              </ProgressLink>
            </div>

            <nav className="flex flex-wrap gap-2">
              {resolvedNavItems.map((item) => {
                const isActive =
                  item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)

                return (
                  <ProgressLink
                    key={item.href}
                    className={[
                      'rounded-full px-4 py-2.5 text-sm font-bold leading-[1.18] transition',
                      isActive
                        ? 'bg-[linear-gradient(135deg,rgba(154,238,222,0.42),rgba(51,204,187,0.22))] text-[var(--color-ink)] shadow-[inset_0_0_0_1px_rgba(154,238,222,0.26)]'
                        : 'text-[var(--color-ink-soft)] hover:bg-[rgba(154,238,222,0.36)]',
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
