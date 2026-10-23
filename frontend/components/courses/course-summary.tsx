import type {MadgradesCourse, MadgradesCourseGrades} from '@/lib/madgrades/types'
import {
    calculateGpa,
    formatGpa,
    getCourseDisplayLine,
    getGradeLabel,
    getGradePercentage,
    getLetterGradeCount,
    getNonLetterGradeCount,
    LETTER_GRADE_KEYS,
    numberWithCommas,
    toTermName,
} from '@/lib/madgrades/utils'

type CourseSummaryProps = {
    course: MadgradesCourse
    grades: MadgradesCourseGrades
}

const NON_LETTER_GRADE_KEYS = [
    'sCount',
    'ubCount',
    'crCount',
    'nCount',
    'pCount',
    'iCount',
    'nwCount',
    'nrCount',
    'otherCount',
] as const

const CELL_CLASS = 'whitespace-nowrap px-4 py-3'
const ROW_CLASS = 'border-b border-[var(--surface-divider)]'
const LINK_CLASS = 'course-data-link underline decoration-[var(--about-inline-decoration)] underline-offset-4 hover:decoration-[var(--color-deep-teal)]'

function formatPercentage(value: number | null) {
    return value === null ? 'N/A' : `${value.toFixed(1)}%`
}

/** Renders the course's reported grade data without requiring JavaScript. */
export function CourseSummary({course, grades}: CourseSummaryProps) {
    const courseCode = getCourseDisplayLine(course)
    const cumulative = grades.cumulative
    const letterCount = getLetterGradeCount(cumulative)
    const nonLetterCount = getNonLetterGradeCount(cumulative)
    const offerings = [...grades.courseOfferings].sort((left, right) => right.termCode - left.termCode)
    const reportedTerms = [...new Set(offerings
        .filter((offering) => offering.termCode > 0 && offering.cumulative.total > 0)
        .map((offering) => offering.termCode))].sort((left, right) => left - right)
    const firstTerm = reportedTerms[0]
    const lastTerm = reportedTerms[reportedTerms.length - 1]
    const coverage = firstTerm
        ? firstTerm === lastTerm
            ? toTermName(firstTerm)
            : `${toTermName(firstTerm)}–${toTermName(lastTerm)}`
        : null

    return (
        <article className="grid min-w-0 gap-8 px-1 text-[var(--color-ink)]">
            <header className="grid gap-3">
                <h1 className="text-[1.6rem] font-semibold leading-tight tracking-tight md:text-[2rem]">
                    {courseCode}: {course.name}
                </h1>
                <p className="text-lg">UW–Madison grade distribution</p>
                <p className="max-w-[72ch] leading-7">
                    {letterCount > 0 ? (
                        <>
                            {courseCode} ({course.name}) at the University of Wisconsin–Madison has a{' '}
                            <strong>{formatGpa(calculateGpa(cumulative))} average GPA</strong> and a{' '}
                            <strong>{formatPercentage(getGradePercentage(cumulative, 'aCount'))} A rate</strong>{' '}
                            across its recorded grade history, based on {numberWithCommas(letterCount)} letter-grade
                            records (A, AB, B, BC, C, D and F).
                        </>
                    ) : (
                        <>
                            No letter-grade records are available for {courseCode} ({course.name}) at the University
                            of Wisconsin–Madison. Average GPA and A rate are not available.
                        </>
                    )}{' '}
                    There are {numberWithCommas(cumulative.total)} total grade records;
                    the non-letter categories contain {numberWithCommas(nonLetterCount)} records.
                </p>
                <p className="max-w-[72ch] text-sm leading-6 text-[var(--color-ink-soft)]">
                    {coverage ? `Reported terms with grade records: ${coverage}.` : 'Term coverage is not available.'}{' '}
                    Grade records are not unique students. Historical grades do not measure workload or guarantee
                    a future result.
                </p>
            </header>

            <section aria-labelledby="letter-grade-heading" className="grid min-w-0 gap-3">
                <h2 className="text-xl font-semibold" id="letter-grade-heading">Letter-grade distribution</h2>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm tabular-nums">
                        <caption className="pb-3 text-left leading-6 text-[var(--color-ink-soft)]">
                            All recorded terms. Percentages use {numberWithCommas(letterCount)} letter-grade records
                            as the denominator.
                        </caption>
                        <thead className="bg-[var(--surface-background-muted)]">
                        <tr>
                            <th className={CELL_CLASS} scope="col">Grade</th>
                            <th className={`${CELL_CLASS} text-right`} scope="col">Records</th>
                            <th className={`${CELL_CLASS} text-right`} scope="col">Share of letter grades</th>
                        </tr>
                        </thead>
                        <tbody>
                        {LETTER_GRADE_KEYS.map((key) => (
                            <tr className={ROW_CLASS} key={key}>
                                <th className={`${CELL_CLASS} font-medium`} scope="row">{getGradeLabel(key)}</th>
                                <td className={`${CELL_CLASS} text-right`}>{numberWithCommas(cumulative[key])}</td>
                                <td className={`${CELL_CLASS} text-right`}>
                                    {formatPercentage(getGradePercentage(cumulative, key))}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                        <tfoot>
                        <tr>
                            <th className={CELL_CLASS} scope="row">Letter-grade total</th>
                            <td className={`${CELL_CLASS} text-right`}>{numberWithCommas(letterCount)}</td>
                            <td className={`${CELL_CLASS} text-right`}>{letterCount > 0 ? '100%' : 'N/A'}</td>
                        </tr>
                        </tfoot>
                    </table>
                </div>
            </section>

            <section aria-labelledby="other-grade-heading" className="grid min-w-0 gap-3">
                <h2 className="text-xl font-semibold" id="other-grade-heading">Other recorded grades</h2>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm tabular-nums">
                        <caption className="pb-3 text-left leading-6 text-[var(--color-ink-soft)]">
                            These source categories are excluded from GPA and letter-grade percentages.
                        </caption>
                        <thead className="bg-[var(--surface-background-muted)]">
                        <tr>
                            <th className={CELL_CLASS} scope="col">Source grade category</th>
                            <th className={`${CELL_CLASS} text-right`} scope="col">Records</th>
                        </tr>
                        </thead>
                        <tbody>
                        {NON_LETTER_GRADE_KEYS.map((key) => (
                            <tr className={ROW_CLASS} key={key}>
                                <th className={`${CELL_CLASS} font-medium`} scope="row">{getGradeLabel(key)}</th>
                                <td className={`${CELL_CLASS} text-right`}>{numberWithCommas(cumulative[key])}</td>
                            </tr>
                        ))}
                        </tbody>
                        <tfoot>
                        <tr>
                            <th className={CELL_CLASS} scope="row">Non-letter total</th>
                            <td className={`${CELL_CLASS} text-right`}>{numberWithCommas(nonLetterCount)}</td>
                        </tr>
                        </tfoot>
                    </table>
                </div>
            </section>

            <section aria-labelledby="term-grade-heading" className="grid min-w-0 gap-3">
                <h2 className="text-xl font-semibold" id="term-grade-heading">Grades by term</h2>
                {offerings.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm tabular-nums">
                            <caption className="pb-3 text-left leading-6 text-[var(--color-ink-soft)]">
                                Reported course totals by term, newest first. GPA and A rate use each term&apos;s
                                letter-grade count.
                            </caption>
                            <thead className="bg-[var(--surface-background-muted)]">
                            <tr>
                                <th className={CELL_CLASS} scope="col">Term</th>
                                <th className={`${CELL_CLASS} text-right`} scope="col">Average GPA</th>
                                <th className={`${CELL_CLASS} text-right`} scope="col">A rate</th>
                                <th className={`${CELL_CLASS} text-right`} scope="col">Letter grades</th>
                                <th className={`${CELL_CLASS} text-right`} scope="col">Non-letter grades</th>
                                <th className={`${CELL_CLASS} text-right`} scope="col">Reported total</th>
                            </tr>
                            </thead>
                            <tbody>
                            {offerings.map((offering) => (
                                <tr className={ROW_CLASS} key={offering.uuid ?? offering.termCode}>
                                    <th className={`${CELL_CLASS} font-medium`} scope="row">
                                        {toTermName(offering.termCode)}
                                    </th>
                                    <td className={`${CELL_CLASS} text-right`}>
                                        {formatGpa(calculateGpa(offering.cumulative))}
                                    </td>
                                    <td className={`${CELL_CLASS} text-right`}>
                                        {formatPercentage(getGradePercentage(offering.cumulative, 'aCount'))}
                                    </td>
                                    <td className={`${CELL_CLASS} text-right`}>
                                        {numberWithCommas(getLetterGradeCount(offering.cumulative))}
                                    </td>
                                    <td className={`${CELL_CLASS} text-right`}>
                                        {numberWithCommas(getNonLetterGradeCount(offering.cumulative))}
                                    </td>
                                    <td className={`${CELL_CLASS} text-right`}>
                                        {numberWithCommas(offering.cumulative.total)}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="leading-7 text-[var(--color-ink-soft)]">No term-level grade records are available.</p>
                )}
            </section>

            <section aria-labelledby="grade-methodology-heading" className="grid max-w-[72ch] gap-3 leading-7">
                <h2 className="text-xl font-semibold" id="grade-methodology-heading">Data and methodology</h2>
                <p>
                    The university publishes{' '}
                    <a className={LINK_CLASS} href="https://registrar.wisc.edu/grade-reports/">
                        UW–Madison grade-distribution reports
                    </a>.
                </p>
                <p>
                    Average GPA is weighted by recorded letter grades: A = 4.0, AB = 3.5, B = 3.0,
                    BC = 2.5, C = 2.0, D = 1.0 and F = 0.0. A rate is the A count divided by the
                    total of those seven categories. Non-letter grades are reported separately. These are
                    averages of grade records, not credit-weighted student GPAs.
                </p>
                <p>
                    Cumulative and term totals use reported aggregates; where an aggregate
                    is absent, available lower-level records are summed. Course totals do not add section
                    totals again. Coverage reflects the records available from this source, not a complete
                    history of every offering. Missing or unpublished records are not evidence of zero grades.
                    The source does not provide a last-updated date for these records.
                </p>
            </section>
        </article>
    )
}
