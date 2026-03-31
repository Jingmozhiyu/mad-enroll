export default function AboutPage() {
  return (
    <section className="glass-card px-6 py-8 md:px-10">
      <p className="eyebrow">About</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--color-ink)] md:text-5xl">
        MadEnroll
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--color-ink-soft)] md:text-lg">
        A Next.js frontend for course monitoring with a cleaner search flow, a simpler
        main dashboard, and a separate admin page that is only reachable when visited
        directly with the right permissions.
      </p>
    </section>
  )
}
