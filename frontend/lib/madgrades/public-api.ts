import {NextResponse} from 'next/server'
import {hasMadgradesToken, MadgradesApiError} from '@/lib/madgrades/api'
import {getCoursePath, getCourseSlug, getSubjectIdentifier} from '@/lib/madgrades/identifiers'
import type {GradeDistribution, MadgradesCourse, MadgradesCourseGrades, MadgradesSubject} from '@/lib/madgrades/types'
import {calculateGpa, getGradePercentage, getLetterGradeCount, getNonLetterGradeCount, toTermName} from '@/lib/madgrades/utils'

/** Returns the public subject identity without upstream API credentials or URLs. */
export function publicSubject(subject: MadgradesSubject) {
    return {subjectId: subject.code, abbreviation: getSubjectIdentifier(subject), name: subject.name}
}

/** Returns a readable course identity and its citable HTML and JSON URLs. */
export function publicCourse(course: MadgradesCourse) {
    const identifier = getCourseSlug(course)
    return {
        identifier,
        name: course.name,
        number: course.number,
        subjects: course.subjects.map(publicSubject),
        canonicalUrl: `https://madenroll.com${getCoursePath(course)}`,
        gradesUrl: `https://madenroll.com/api/grades/courses/${encodeURIComponent(identifier)}`,
    }
}

function publicDistribution(distribution: GradeDistribution) {
    const counts = Object.fromEntries(Object.entries(distribution)
        .filter(([key]) => key !== 'termCode' && key !== 'ubCount'))
    const gpa = calculateGpa(distribution)
    return {
        counts: {...counts, uCount: distribution.ubCount},
        letterGradeCount: getLetterGradeCount(distribution),
        nonLetterGradeCount: getNonLetterGradeCount(distribution),
        gpa: Number.isFinite(gpa) ? gpa : null,
        aPercent: getGradePercentage(distribution, 'aCount'),
    }
}

/** Serializes the same aggregates and calculations used by the HTML grade page. */
export function publicCourseGrades(course: MadgradesCourse, grades: MadgradesCourseGrades) {
    const terms = [...grades.courseOfferings].sort((left, right) => left.termCode - right.termCode)
    return {
        course: publicCourse(course),
        provider: {name: 'MadEnroll', url: 'https://madenroll.com'},
        coverage: {
            firstTermCode: terms[0]?.termCode ?? null,
            lastTermCode: terms.at(-1)?.termCode ?? null,
            termCount: terms.length,
        },
        cumulative: publicDistribution(grades.cumulative),
        terms: terms.map((term) => ({
            termCode: term.termCode,
            name: toTermName(term.termCode),
            ...publicDistribution(term.cumulative),
        })),
    }
}

/** Handles public read-only requests without exposing upstream errors or caching failures. */
export async function gradeApiResponse(load: () => Promise<unknown>) {
    try {
        if (!hasMadgradesToken()) throw new MadgradesApiError(503)
        return NextResponse.json(await load(), {
            headers: {
                'Cache-Control': 'public, max-age=300, s-maxage=3600',
                Link: '</openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
            },
        })
    } catch (error) {
        const status = error instanceof MadgradesApiError && [400, 404, 409].includes(error.status)
            ? error.status : 503
        if (status === 503) console.error('Public grade API unavailable', error)
        const message = status === 503 ? 'Course data is temporarily unavailable. Please try again later.'
            : (error as MadgradesApiError).message
        return NextResponse.json({message}, {status, headers: {'Cache-Control': 'no-store'}})
    }
}
