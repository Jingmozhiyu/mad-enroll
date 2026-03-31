'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const navItems = [
  { href: '/', label: 'Welcome' },
  { href: '/monitor', label: 'Monitor' },
  { href: '/about', label: 'About' },
]

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-10 top-[-5rem] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(154,238,222,0.36),transparent_72%)] blur-2xl" />
      <div className="pointer-events-none absolute right-[-5rem] top-14 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(51,204,187,0.28),transparent_70%)] blur-2xl" />
      <div className="pointer-events-none absolute bottom-[-7rem] left-1/4 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(154,238,222,0.2),transparent_70%)] blur-2xl" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-4 py-5 md:px-5 md:py-6">
        <header className="glass-card mb-7 flex flex-col gap-5 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-7">
          <div>
            <p className="eyebrow">MadEnroll</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--color-ink)] md:text-4xl">
              Course monitor frontend
            </h1>
          </div>

          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const isActive =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  className={[
                    'rounded-full px-4 py-2.5 text-sm font-bold transition',
                    isActive
                      ? 'bg-[linear-gradient(135deg,rgba(154,238,222,0.42),rgba(51,204,187,0.22))] text-[var(--color-ink)] shadow-[inset_0_0_0_1px_rgba(154,238,222,0.26)]'
                      : 'text-[var(--color-ink-soft)] hover:bg-[rgba(154,238,222,0.36)]',
                  ].join(' ')}
                  href={item.href}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
