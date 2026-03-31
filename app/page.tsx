import Link from 'next/link'

export default function WelcomePage() {
  return (
    <section className="glass-card grid gap-8 px-6 py-8 md:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)] md:px-10 md:py-10">
      <div className="flex flex-col justify-center gap-6">
        <div className="space-y-4">
          <h1 className="text-5xl font-semibold tracking-tight text-[var(--color-ink)] md:text-7xl">
            MadEnroll
          </h1>
          <p className="max-w-xl text-base leading-7 text-[var(--color-ink-soft)] md:text-lg">
            Search sections, add subscriptions, and monitor your tasks in one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link className="button-primary" href="/monitor">
            Open Monitor
          </Link>
        </div>
      </div>

      <div className="relative min-h-[320px] overflow-hidden rounded-[28px] border border-[rgba(154,238,222,0.22)] bg-[linear-gradient(160deg,rgba(154,238,222,0.95),rgba(51,204,187,0.58))]">
        <div className="absolute left-7 top-7 h-32 w-32 rounded-full border border-white/35 bg-white/20 blur-[2px]" />
        <div className="absolute left-24 top-20 h-52 w-52 rounded-full border border-white/25 bg-white/12" />
        <div className="absolute right-8 top-12 h-40 w-40 rounded-full border border-[rgba(255,255,255,0.32)] bg-[rgba(21,152,137,0.18)]" />
        <div className="absolute right-16 top-28 h-56 w-56 rounded-full border border-[rgba(255,255,255,0.24)] bg-[rgba(255,255,255,0.08)]" />
        <div className="absolute bottom-[-2rem] left-1/2 h-60 w-60 -translate-x-1/2 rounded-full border border-white/20 bg-[rgba(255,255,255,0.18)]" />
        <div className="absolute bottom-10 left-10 h-24 w-24 rounded-full border border-white/30 bg-white/18" />
      </div>
    </section>
  )
}
