import type { Metadata } from 'next'
import Script from 'next/script'
import type { ReactNode } from 'react'
import { GeistSans } from 'geist/font/sans'
import '@/app/globals.css'
import { Providers } from '@/components/providers'
import { SiteShell } from '@/components/site-shell'
import { getServerSession } from '@/lib/server-session'

const themeInitScript = `
  (() => {
    const STORAGE_KEY = 'mad-enroll-theme'
    const ANIMATION_ATTRIBUTE = 'data-theme-animating'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const themeBackgrounds = {
      light: '#f6fbf8',
      dark: '#0b1c23',
    }

    const prefersReducedMotion = () =>
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const resolveTheme = () => {
      const stored = localStorage.getItem(STORAGE_KEY)

      return stored === 'light' || stored === 'dark'
        ? stored
        : mediaQuery.matches
          ? 'dark'
          : 'light'
    }

    const commitTheme = (resolved) => {
      document.documentElement.dataset.theme = resolved
      document.documentElement.dataset.themeReady = 'true'
      document.documentElement.style.backgroundColor = themeBackgrounds[resolved]
      document.documentElement.style.colorScheme = resolved
    }

    const applyTheme = (nextTheme, options = {}) => {
      const resolved =
        nextTheme === 'light' || nextTheme === 'dark' ? nextTheme : resolveTheme()
      const shouldAnimate =
        options.animate === true &&
        document.documentElement.dataset.themeReady === 'true' &&
        !prefersReducedMotion()

      const runCommit = () => {
        commitTheme(resolved)

        if (options.persist === true) {
          localStorage.setItem(STORAGE_KEY, resolved)
        }
      }

      if (!shouldAnimate) {
        document.documentElement.removeAttribute(ANIMATION_ATTRIBUTE)
        runCommit()
        return
      }

      document.documentElement.setAttribute(ANIMATION_ATTRIBUTE, 'true')

      if (typeof document.startViewTransition === 'function') {
        const transition = document.startViewTransition(() => {
          runCommit()
        })

        transition.finished.finally(() => {
          document.documentElement.removeAttribute(ANIMATION_ATTRIBUTE)
        })

        return
      }

      runCommit()
      window.setTimeout(() => {
        document.documentElement.removeAttribute(ANIMATION_ATTRIBUTE)
      }, 320)
    }

    window.__madEnrollSetTheme = applyTheme

    try {
      applyTheme(resolveTheme())
      const handleSystemThemeChange = () => {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored !== 'light' && stored !== 'dark') {
          applyTheme(resolveTheme(), { animate: true })
        }
      }

      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleSystemThemeChange)
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handleSystemThemeChange)
      }
    } catch {
      document.documentElement.dataset.theme = 'light'
      document.documentElement.dataset.themeReady = 'true'
      document.documentElement.removeAttribute(ANIMATION_ATTRIBUTE)
      document.documentElement.style.backgroundColor = themeBackgrounds.light
      document.documentElement.style.colorScheme = 'light'
    }
  })();
`

export const metadata: Metadata = {
  title: 'MadEnroll',
  description: 'Course monitoring dashboard for search, subscriptions, and admin control.',
  icons: {
    icon: '/favicon.svg',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const { session } = await getServerSession()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
      </head>
      <body className={GeistSans.className}>
        <Providers initialSession={session} initialSessionResolved>
          <SiteShell>{children}</SiteShell>
        </Providers>
      </body>
    </html>
  )
}
