'use client'

import Link from 'next/link'

export default function CourseError({reset}: {reset: () => void}) {
    return (
        <section className="grid gap-4 py-8">
            <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Course data unavailable</h1>
            <p className="text-[var(--color-ink-soft)]">
                We could not load a unique course and its grade data. Try again or search by course code.
            </p>
            <div className="flex flex-wrap items-center gap-4">
                <button className="button-ghost" onClick={reset} type="button">Try again</button>
                <Link className="underline underline-offset-4" href="/search">Browse courses</Link>
            </div>
        </section>
    )
}
