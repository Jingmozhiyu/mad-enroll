import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { GeistSans } from 'geist/font/sans'
import '@/app/globals.css'
import { Providers } from '@/components/providers'
import { SiteShell } from '@/components/site-shell'

export const metadata: Metadata = {
  title: 'MadEnroll',
  description: 'Course monitoring dashboard for search, subscriptions, and admin control.',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en">
      <body className={GeistSans.className}>
        <Providers>
          <SiteShell>{children}</SiteShell>
        </Providers>
      </body>
    </html>
  )
}
