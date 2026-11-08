import type {MadgradesCourse, MadgradesSubject} from '@/lib/madgrades/types'

export type CourseIdentifier = {
    subjects: string[]
    number: number
}

/** Normalizes a subject abbreviation without changing its meaningful punctuation. */
export function normalizeSubjectIdentifier(value: string) {
    return value.replace(/\s+/g, '').toUpperCase()
}

/** Returns the readable subject token used in public course URLs. */
export function getSubjectIdentifier(subject: MadgradesSubject) {
    return normalizeSubjectIdentifier(subject.abbreviation || subject.code)
}

/** Builds a stable readable identifier, ordering cross-listings by UW subject code. */
export function getCourseSlug(course: MadgradesCourse) {
    const subjects = [...course.subjects].sort((left, right) =>
        left.code.localeCompare(right.code, 'en', {numeric: true}),
    )
    const subjectIdentifiers = [...new Set(subjects.map(getSubjectIdentifier))]

    return subjectIdentifiers.length > 0
        ? `${subjectIdentifiers.join('_')}_${course.number}`
        : course.uuid
}

/** Encodes a course identifier as a single URL path segment. */
export function getCoursePath(course: MadgradesCourse) {
    return `/courses/${encodeURIComponent(getCourseSlug(course))}`
}

/** Parses readable course identifiers; route parameters are already URL-decoded by Next.js. */
export function parseCourseIdentifier(identifier: string): CourseIdentifier | null {
    const parts = identifier.trim().split('_')
    const numberText = parts.pop() ?? ''
    const subjects = parts.map(normalizeSubjectIdentifier)

    if (!/^\d{1,3}$/.test(numberText) || Number(numberText) === 0 || subjects.length === 0 ||
        subjects.some((subject) => !/^[A-Z0-9&.-]+$/.test(subject)) ||
        new Set(subjects).size !== subjects.length) {
        return null
    }

    return {subjects, number: Number(numberText)}
}

/** Prefers an exact cross-listing match, otherwise returns all matching subset aliases. */
export function findCourseIdentifierMatches(
    courses: MadgradesCourse[],
    subjectCodes: string[],
    number: number,
) {
    const requestedSubjects = new Set(subjectCodes)
    const candidates = [...new Map(courses.map((course) => [course.uuid, course])).values()]
        .filter((course) => course.number === number &&
            [...requestedSubjects].every((code) => course.subjects.some((subject) => subject.code === code)))
    const exactMatches = candidates.filter((course) =>
        new Set(course.subjects.map((subject) => subject.code)).size === requestedSubjects.size)

    return exactMatches.length > 0 ? exactMatches : candidates
}
