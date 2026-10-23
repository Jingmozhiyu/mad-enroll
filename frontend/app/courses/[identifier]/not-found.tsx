import Link from 'next/link'

export default function CourseNotFound() {
    return (
        <section className="grid gap-4 py-8">
            <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Course not found</h1>
            <p className="text-[var(--color-ink-soft)]">Check the course code or search the Madgrades catalog.</p>
            <Link className="w-fit underline underline-offset-4" href="/search">Browse courses</Link>
        </section>
    )
}
