import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {
    fetchMadgradesCourseDirectory,
    fetchMadgradesSubjectCatalog,
    hasMadgradesToken,
} from '@/lib/madgrades/api'
import {getCoursePath} from '@/lib/madgrades/identifiers'
import {getCourseDisplayLine, numberWithCommas} from '@/lib/madgrades/utils'

type DirectoryPageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

const LINK_CLASS = 'course-data-link underline underline-offset-4'

function singleValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function directoryPath(subjectCode: string, page = 1) {
    const params = new URLSearchParams({subject: subjectCode})
    if (page > 1) {
        params.set('page', String(page))
    }
    return `/course?${params.toString()}`
}

export async function generateMetadata({searchParams}: DirectoryPageProps): Promise<Metadata> {
    const query = await searchParams
    const subjectCode = singleValue(query.subject)
    const page = Number(singleValue(query.page) || '1')
    const subject = subjectCode ? (await fetchMadgradesSubjectCatalog()).find((item) => item.code === subjectCode) : null
    const title = subject
        ? `${subject.name} Grade Distributions${page > 1 ? ` — Page ${page}` : ''} | UW–Madison | MadEnroll`
        : 'UW–Madison Grade Distribution Dataset | MadEnroll'
    return {
        title,
        description: subject
            ? `Browse UW–Madison ${subject.name} courses and historical grade distributions, GPA and semester results.`
            : 'A public reference directory of UW–Madison historical grade distributions, GPA, semester statistics and source information.',
        alternates: {canonical: subjectCode ? directoryPath(subjectCode, page) : '/course'},
    }
}

export default async function CourseDirectoryPage({searchParams}: DirectoryPageProps) {
    const query = await searchParams
    const subjectCode = singleValue(query.subject)
    const page = Number(singleValue(query.page) || '1')
    if (!Number.isSafeInteger(page) || page < 1 || (!subjectCode && page !== 1)) {
        notFound()
    }
    if (!hasMadgradesToken()) {
        throw new Error('Course data is temporarily unavailable.')
    }

    const subjects = await fetchMadgradesSubjectCatalog()
    const selectedSubject = subjectCode ? subjects.find((subject) => subject.code === subjectCode) : null
    if (subjectCode && !selectedSubject) {
        notFound()
    }
    const courses = selectedSubject ? await fetchMadgradesCourseDirectory(subjectCode, page) : null
    if (courses && page > Math.max(courses.totalPages, 1)) {
        notFound()
    }
    const firstPage = Math.max(1, page - 2)
    const lastPage = courses ? Math.min(courses.totalPages, page + 2) : 0
    const pages = Array.from({length: Math.max(lastPage - firstPage + 1, 0)}, (_, index) => firstPage + index)

    return (
        <article className="grid min-w-0 gap-8 px-1 text-[var(--color-ink)]">
            <header className="grid max-w-[75ch] gap-4 leading-7">
                <h1 className="text-3xl font-semibold leading-tight">UW–Madison Grade Distribution Dataset</h1>
                <p>
                    MadEnroll’s public reference directory of historical grade counts, GPA and semester statistics.
                    Browse the data for research, citations or automated access.
                </p>
                <p className="text-sm text-[var(--color-ink-soft)]">
                    Looking for interactive charts? <Link className={LINK_CLASS} href="/search">Browse Courses</Link>.
                    {' '}Need an enrollment notification? <Link className={LINK_CLASS} href="/monitor">Seat Alerts</Link>.
                </p>
            </header>

            {selectedSubject && courses ? (
                <section className="grid gap-4" aria-labelledby="directory-courses-heading">
                    <Link className={`${LINK_CLASS} w-fit text-sm text-[var(--color-ink-soft)]`} href="/course">
                        All subjects
                    </Link>
                    <h2 className="text-xl font-semibold" id="directory-courses-heading">{selectedSubject.name}</h2>
                    <p className="text-sm text-[var(--color-ink-soft)]">{numberWithCommas(courses.totalCount)} courses</p>
                    {courses.results.length > 0 ? (
                        <ul className="grid gap-3">
                            {courses.results.map((course) => (
                                <li key={course.uuid}>
                                    <Link className={LINK_CLASS} href={getCoursePath(course)} prefetch={false}>
                                        {getCourseDisplayLine(course)}: {course.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : <p>No courses are listed for this subject.</p>}
                    {courses.totalPages > 1 ? (
                        <nav aria-label="Course directory pagination" className="flex flex-wrap gap-4 text-sm">
                            {page > 1 ? <Link className={LINK_CLASS} href={directoryPath(subjectCode, page - 1)}>Previous</Link> : null}
                            {pages.map((value) => (
                                <Link
                                    aria-current={value === page ? 'page' : undefined}
                                    className={LINK_CLASS}
                                    href={directoryPath(subjectCode, value)}
                                    key={value}
                                >
                                    {value}
                                </Link>
                            ))}
                            {page < courses.totalPages ? <Link className={LINK_CLASS} href={directoryPath(subjectCode, page + 1)}>Next</Link> : null}
                        </nav>
                    ) : null}
                </section>
            ) : (
                <section className="grid gap-4" aria-labelledby="directory-subjects-heading">
                    <h2 className="text-xl font-semibold" id="directory-subjects-heading">Subjects</h2>
                    <ul className="grid gap-x-8 gap-y-3 md:grid-cols-2">
                        {[...subjects].sort((left, right) => left.name.localeCompare(right.name)).map((subject) => (
                            <li key={subject.code}>
                                <Link className={LINK_CLASS} href={directoryPath(subject.code)} prefetch={false}>
                                    {subject.name}{subject.abbreviation ? ` (${subject.abbreviation})` : ''}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className="grid max-w-[75ch] gap-3 text-sm leading-6 text-[var(--color-ink-soft)]" aria-labelledby="directory-source-heading">
                <h2 className="text-lg font-semibold text-[var(--color-ink)]" id="directory-source-heading">Data coverage and sources</h2>
                <p>
                    Each course page reports its available grade terms, sample counts and calculation methods.
                    Coverage may differ by course. GPA and A rates use letter-grade
                    records; non-letter grades are listed separately.
                </p>
                <p>
                    The university publishes the underlying{' '}
                    <a className={LINK_CLASS} href="https://registrar.wisc.edu/grade-reports/">grade-distribution reports</a>.
                    Historical grades do not measure workload or guarantee future results.
                </p>
            </section>
        </article>
    )
}
