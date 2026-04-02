import Link from 'next/link'
import { BrandMark } from '@/components/brand-mark'
import { WelcomeCarousel } from '@/components/welcome-carousel'

export default function WelcomePage() {
  return (
    <section className="grid min-h-[540px] gap-10 overflow-hidden px-2 py-6 md:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)] md:items-center md:px-4 md:py-10">
      <div className="flex flex-col justify-center gap-8">
        <div className="space-y-4">
          <h1 className="max-w-[8ch] text-5xl font-semibold leading-[1.08] tracking-tight text-[var(--color-ink)] md:text-6xl">
            <BrandMark />
          </h1>
          <p className="max-w-xl text-base leading-8 text-[var(--color-ink-soft)] md:text-xl">
            A cleaner course monitor for searching sections, adding subscriptions, and
            staying ready when seats open up.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link className="button-primary" href="/monitor">
            Open Monitor
          </Link>
          <Link className="button-info" href="/search">
            Open Chart
          </Link>
        </div>
      </div>

      <WelcomeCarousel />
    </section>
  )
}
