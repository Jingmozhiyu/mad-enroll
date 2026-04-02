import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { GeistSans } from 'geist/font/sans'
import '@/app/globals.css'
import { Providers } from '@/components/providers'
import { SiteShell } from '@/components/site-shell'
import { getServerSession } from '@/lib/server-session'

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
    <html lang="en">
      <body className={GeistSans.className}>
        <Providers initialSession={session} initialSessionResolved>
          <SiteShell>{children}</SiteShell>
        </Providers>
      </body>
    </html>
  )
}
