'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, type ReactNode } from 'react'
import { BrandMark } from '@/components/brand-mark'
import {
  ProgressLink,
  RouteProgressProvider,
} from '@/components/navigation-progress'
import { useAuth } from '@/components/providers'

const themeBackgrounds = {
  light: '#f6fbf8',
  dark: '#0b1c23',
} as const

type ThemeMode = keyof typeof themeBackgrounds

type ThemeApplyOptions = {
  animate?: boolean
  persist?: boolean
}

type ThemeWindow = Window & {
  __madEnrollSetTheme?: (theme: ThemeMode, options?: ThemeApplyOptions) => void
}

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/monitor', label: 'Seat Alerts' },
  { href: '/search', label: 'Browse Courses' },
  { href: '/about', label: 'About' },
]

function ThemeIcon() {
  return (
    <svg aria-hidden="true" className="theme-toggle-icon h-4 w-4" fill="none" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="2.6" fill="currentColor" opacity="0.85" />
      <path
        d="M8 1.5v1.4M8 13.1v1.4M13.1 8h1.4M1.5 8h1.4M11.9 4.1l1 1M3.1 11.9l1-1M11.9 11.9l1 1M3.1 4.1l1 1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.15"
      />
    </svg>
  )
}

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

  const toggleTheme = useCallback(() => {
    const currentTheme =
      document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark'
    const themeWindow = window as ThemeWindow

    if (typeof themeWindow.__madEnrollSetTheme === 'function') {
      themeWindow.__madEnrollSetTheme(nextTheme, {
        animate: true,
        persist: true,
      })
      return
    }

    document.documentElement.dataset.theme = nextTheme
    document.documentElement.style.backgroundColor = themeBackgrounds[nextTheme]
    document.documentElement.style.colorScheme = nextTheme
    window.localStorage.setItem('mad-enroll-theme', nextTheme)
  }, [])

  return (
    <RouteProgressProvider shouldTrackNavigation={shouldTrackNavigation}>
      <div className="relative min-h-screen overflow-hidden">
        <div className="page-orb-left pointer-events-none absolute -left-10 top-[-5rem] h-80 w-80 rounded-full blur-2xl" />
        <div className="page-orb-right pointer-events-none absolute right-[-5rem] top-14 h-96 w-96 rounded-full blur-2xl" />
        <div className="page-orb-bottom pointer-events-none absolute bottom-[-7rem] left-1/4 h-[26rem] w-[26rem] rounded-full blur-2xl" />

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-4 py-3 md:px-5 md:py-4">
          <header className="theme-ready-only mb-4 flex flex-col gap-4 border-b border-[var(--surface-divider)] px-0 py-2 md:flex-row md:items-center md:justify-between md:py-3">
            <div className="flex items-center">
              <ProgressLink aria-label="Go to homepage" className="brand-mark-link" href="/">
                <h1 className="text-3xl font-semibold leading-[1.16] tracking-tight text-[var(--color-ink)] md:text-4xl">
                  <BrandMark variant={pathname === '/about' ? 'colorful' : 'default'} />
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
                      'rounded-full px-4 py-2.5 text-sm font-bold leading-[1.18] transition',
                      isActive ? 'nav-link-active' : 'nav-link-idle',
                    ].join(' ')}
                    href={item.href}
                  >
                    {item.label}
                  </ProgressLink>
                )
              })}
              <button
                aria-label="Toggle theme"
                className="theme-toggle-button"
                onClick={toggleTheme}
                type="button"
              >
                <ThemeIcon />
              </button>
            </nav>
          </header>

          <main className="flex-1 pt-1">{children}</main>
        </div>
      </div>
    </RouteProgressProvider>
  )
}
