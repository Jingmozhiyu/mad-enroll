import type {
  CourseCompareState,
  GradeDistribution,
  MadgradesCourse,
  MadgradesCourseGrades,
  MadgradesCourseOffering,
  MadgradesInstructor,
  MadgradesInstructorAggregate,
  MadgradesSection,
  MadgradesSubject,
} from '@/lib/madgrades/types'

const GPA_KEYS = [
  'aCount',
  'abCount',
  'bCount',
  'bcCount',
  'cCount',
  'dCount',
  'fCount',
] as const

const ALL_GRADE_KEYS = [
  ...GPA_KEYS,
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

type GradeKey = (typeof ALL_GRADE_KEYS)[number]

const GRADE_NAME_MAP: Record<GradeKey, string> = {
  aCount: 'A',
  abCount: 'AB',
  bCount: 'B',
  bcCount: 'BC',
  cCount: 'C',
  dCount: 'D',
  fCount: 'F',
  sCount: 'S',
  ubCount: 'UB',
  crCount: 'CR',
  nCount: 'N',
  pCount: 'P',
  iCount: 'I',
  nwCount: 'NW',
  nrCount: 'NR',
  otherCount: 'Other',
}

const RAW_TO_CAMEL_KEY: Record<string, GradeKey> = {
  a_count: 'aCount',
  ab_count: 'abCount',
  b_count: 'bCount',
  bc_count: 'bcCount',
  c_count: 'cCount',
  d_count: 'dCount',
  f_count: 'fCount',
  s_count: 'sCount',
  u_count: 'ubCount',
  ub_count: 'ubCount',
  cr_count: 'crCount',
  n_count: 'nCount',
  p_count: 'pCount',
  i_count: 'iCount',
  nw_count: 'nwCount',
  nr_count: 'nrCount',
  other_count: 'otherCount',
}

const SEASON_IDS: Record<number, string> = {
  4: 'Spring',
  6: 'Summer',
  2: 'Fall',
}

export function numberWithCommas(value: number) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function getEmptyDistribution(termCode = 0): GradeDistribution {
  return {
    termCode,
    aCount: 0,
    abCount: 0,
    bCount: 0,
    bcCount: 0,
    cCount: 0,
    dCount: 0,
    fCount: 0,
    sCount: 0,
    ubCount: 0,
    crCount: 0,
    nCount: 0,
    pCount: 0,
    iCount: 0,
    nwCount: 0,
    nrCount: 0,
    otherCount: 0,
    total: 0,
  }
}

export function normalizeGradeDistribution(
  input: Record<string, unknown> | null | undefined,
  fallbackTermCode = 0,
): GradeDistribution {
  const base = getEmptyDistribution(fallbackTermCode)
  const source = input ?? {}

  for (const key of ALL_GRADE_KEYS) {
    const rawCamelValue = source[key]
    const rawSnakeValue =
      source[
        Object.keys(RAW_TO_CAMEL_KEY).find(
          (rawKey) => RAW_TO_CAMEL_KEY[rawKey] === key,
        ) as keyof typeof source
      ]

    const value =
      typeof rawCamelValue === 'number'
        ? rawCamelValue
        : typeof rawSnakeValue === 'number'
          ? rawSnakeValue
          : 0

    base[key] = value
  }

  const explicitTotal = source.total
  base.total =
    typeof explicitTotal === 'number'
      ? explicitTotal
      : ALL_GRADE_KEYS.reduce((sum, key) => sum + base[key], 0)

  const rawTermCode = source.termCode ?? source.term_code
  if (typeof rawTermCode === 'number') {
    base.termCode = rawTermCode
  }

  return base
}

export function combineGradeDistributions(
  left: GradeDistribution,
  right: GradeDistribution,
  termCode = left.termCode ?? right.termCode ?? 0,
) {
  const combined = getEmptyDistribution(termCode)
  for (const key of ALL_GRADE_KEYS) {
    combined[key] = (left[key] ?? 0) + (right[key] ?? 0)
  }
  combined.total = (left.total ?? 0) + (right.total ?? 0)
  return combined
}

export function combineAllDistributions(distributions: GradeDistribution[]) {
  return distributions.reduce(
    (accumulator, distribution) =>
      combineGradeDistributions(accumulator, distribution, 0),
    getEmptyDistribution(0),
  )
}

export function calculateGpa(distribution: GradeDistribution) {
  const count = GPA_KEYS.reduce((sum, key) => sum + distribution[key], 0)
  if (count === 0) {
    return NaN
  }

  const weighted =
    distribution.aCount * 4 +
    distribution.abCount * 3.5 +
    distribution.bCount * 3 +
    distribution.bcCount * 2.5 +
    distribution.cCount * 2 +
    distribution.dCount * 1

  return weighted / count
}

export function formatGpa(gpa: number) {
  return Number.isNaN(gpa) ? 'N/A' : gpa.toFixed(2)
}

export function toTermName(termCode?: number) {
  if (!termCode) {
    return 'Cumulative'
  }

  const seasonId = termCode % 10
  const termYear = Math.round(termCode / 10)
  let offset = termYear - 101
  if (seasonId === 2) {
    offset -= 1
  }

  const calendarYear = 2001 + offset
  const season = SEASON_IDS[seasonId] ?? 'Term'
  return `${season} ${calendarYear}`
}

export function getGradeLabel(key: GradeKey) {
  return GRADE_NAME_MAP[key]
}

export function normalizeSubject(input: Record<string, unknown>): MadgradesSubject {
  return {
    code: String(input.code ?? ''),
    name: String(input.name ?? ''),
    abbreviation:
      typeof input.abbreviation === 'string' ? input.abbreviation : undefined,
    coursesUrl: typeof input.coursesUrl === 'string' ? input.coursesUrl : undefined,
  }
}

export function normalizeInstructor(
  input: Record<string, unknown>,
): MadgradesInstructor {
  return {
    id: Number(input.id ?? 0),
    name: String(input.name ?? ''),
    url: typeof input.url === 'string' ? input.url : undefined,
  }
}

export function normalizeCourse(input: Record<string, unknown>): MadgradesCourse {
  return {
    uuid: String(input.uuid ?? ''),
    number: Number(input.number ?? 0),
    name: String(input.name ?? ''),
    names: Array.isArray(input.names)
      ? input.names.filter((value): value is string => typeof value === 'string')
      : undefined,
    subjects: Array.isArray(input.subjects)
      ? input.subjects
          .filter(
            (subject): subject is Record<string, unknown> =>
              !!subject && typeof subject === 'object',
          )
          .map(normalizeSubject)
      : [],
    url: typeof input.url === 'string' ? input.url : undefined,
    gradesUrl: typeof input.gradesUrl === 'string' ? input.gradesUrl : undefined,
  }
}

function normalizeSection(input: Record<string, unknown>): MadgradesSection {
  return {
    ...normalizeGradeDistribution(input),
    uuid: typeof input.uuid === 'string' ? input.uuid : undefined,
    number: typeof input.number === 'number' ? input.number : undefined,
    sectionType:
      typeof input.sectionType === 'string' ? input.sectionType : undefined,
    instructors: Array.isArray(input.instructors)
      ? input.instructors
          .filter(
            (instructor): instructor is Record<string, unknown> =>
              !!instructor && typeof instructor === 'object',
          )
          .map(normalizeInstructor)
      : [],
  }
}

function normalizeCourseOffering(
  input: Record<string, unknown>,
): MadgradesCourseOffering {
  const termCode = Number(input.termCode ?? input.term_code ?? 0)
  const sections = Array.isArray(input.sections)
    ? input.sections
        .filter(
          (section): section is Record<string, unknown> =>
            !!section && typeof section === 'object',
        )
        .map(normalizeSection)
    : []

  const cumulativeInput =
    input.cumulative && typeof input.cumulative === 'object'
      ? (input.cumulative as Record<string, unknown>)
      : null

  const cumulative =
    cumulativeInput && Object.keys(cumulativeInput).length > 0
      ? normalizeGradeDistribution(cumulativeInput, termCode)
      : combineAllDistributions(
          sections.map((section) => normalizeGradeDistribution(section, termCode)),
        )

  return {
    uuid: typeof input.uuid === 'string' ? input.uuid : undefined,
    termCode,
    name: typeof input.name === 'string' ? input.name : undefined,
    cumulative,
    sections,
  }
}

export function normalizeCourseGrades(
  input: Record<string, unknown>,
): MadgradesCourseGrades {
  const rawOfferings = Array.isArray(input.courseOfferings)
    ? input.courseOfferings
    : Array.isArray(input.course_offerings)
      ? input.course_offerings
      : []

  const courseOfferings = rawOfferings
    .filter(
      (offering): offering is Record<string, unknown> =>
        !!offering && typeof offering === 'object',
    )
    .map(normalizeCourseOffering)
    .sort((left, right) => left.termCode - right.termCode)

  const cumulativeSource =
    input.cumulative && typeof input.cumulative === 'object'
      ? (input.cumulative as Record<string, unknown>)
      : null

  const cumulative =
    cumulativeSource && Object.keys(cumulativeSource).length > 0
      ? normalizeGradeDistribution(cumulativeSource, 0)
      : combineAllDistributions(courseOfferings.map((offering) => offering.cumulative))

  const instructorMap = new Map<number, { name: string; terms: Map<number, GradeDistribution> }>()

  for (const offering of courseOfferings) {
    for (const section of offering.sections) {
      for (const instructor of section.instructors) {
        const existing =
          instructorMap.get(instructor.id) ??
          { name: instructor.name, terms: new Map<number, GradeDistribution>() }

        const previousTermDistribution =
          existing.terms.get(offering.termCode) ?? getEmptyDistribution(offering.termCode)

        existing.terms.set(
          offering.termCode,
          combineGradeDistributions(
            previousTermDistribution,
            normalizeGradeDistribution(section, offering.termCode),
            offering.termCode,
          ),
        )

        instructorMap.set(instructor.id, existing)
      }
    }
  }

  const instructors: MadgradesInstructorAggregate[] = [...instructorMap.entries()]
    .map(([id, value]) => {
      const terms = [...value.terms.values()].sort(
        (left, right) => (left.termCode ?? 0) - (right.termCode ?? 0),
      )
      const latestTerm = Math.max(...terms.map((term) => term.termCode ?? 0), 0)

      return {
        id,
        name: value.name,
        cumulative: combineAllDistributions(terms),
        terms,
        latestTerm,
      }
    })
    .sort((left, right) => right.latestTerm - left.latestTerm)

  return {
    cumulative,
    courseOfferings,
    instructors,
  }
}

export function getCourseDisplayLine(course: MadgradesCourse) {
  const subjectText = course.subjects
    .map((subject) => subject.abbreviation || subject.name || subject.code)
    .join(', ')

  return `${subjectText} ${course.number}`.trim()
}

export function getCourseComparisonSelectionLabel(
  grades: MadgradesCourseGrades | null,
  instructorId: number,
  termCode: number,
) {
  if (!grades) {
    return 'Cumulative'
  }

  if (instructorId > 0 && termCode > 0) {
    const instructor = grades.instructors.find((item) => item.id === instructorId)
    return instructor ? `${instructor.name} · ${toTermName(termCode)}` : toTermName(termCode)
  }

  if (instructorId > 0) {
    const instructor = grades.instructors.find((item) => item.id === instructorId)
    return instructor?.name ?? `Instructor ${instructorId}`
  }

  if (termCode > 0) {
    return toTermName(termCode)
  }

  return 'Cumulative'
}

export function getSelectableTerms(
  grades: MadgradesCourseGrades | null,
  instructorId: number,
) {
  if (!grades) {
    return []
  }

  if (instructorId > 0) {
    const instructor = grades.instructors.find((item) => item.id === instructorId)
    return (instructor?.terms ?? [])
      .map((term) => term.termCode ?? 0)
      .filter((value) => value > 0)
      .sort((left, right) => left - right)
  }

  return grades.courseOfferings
    .map((offering) => offering.termCode)
    .filter((value) => value > 0)
    .sort((left, right) => left - right)
}

export function getSelectableInstructors(
  grades: MadgradesCourseGrades | null,
  termCode: number,
) {
  if (!grades) {
    return []
  }

  if (termCode > 0) {
    return grades.instructors.filter((instructor) =>
      instructor.terms.some((term) => term.termCode === termCode),
    )
  }

  return grades.instructors
}

export function getSelectionDistribution(
  grades: MadgradesCourseGrades | null,
  selection: CourseCompareState,
) {
  if (!grades) {
    return null
  }

  const { instructorId, termCode } = selection

  if (termCode > 0 && instructorId === 0) {
    const offering = grades.courseOfferings.find((item) => item.termCode === termCode)
    return offering?.cumulative ?? null
  }

  if (instructorId > 0 && termCode === 0) {
    return grades.instructors.find((item) => item.id === instructorId)?.cumulative ?? null
  }

  if (instructorId > 0 && termCode > 0) {
    return (
      grades.instructors
        .find((item) => item.id === instructorId)
        ?.terms.find((term) => term.termCode === termCode) ?? null
    )
  }

  return grades.cumulative
}

export function getSelectionGpaSeries(
  grades: MadgradesCourseGrades | null,
  selection: CourseCompareState,
) {
  if (!grades) {
    return []
  }

  const { instructorId, termCode } = selection

  if (termCode > 0 && instructorId === 0) {
    const offering = grades.courseOfferings.find((item) => item.termCode === termCode)
    return offering
      ? [{ ...offering.cumulative, termCode: offering.termCode }]
      : []
  }

  if (instructorId > 0 && termCode === 0) {
    return (
      grades.instructors.find((item) => item.id === instructorId)?.terms.map((term) => ({
        ...term,
        termCode: term.termCode,
      })) ?? []
    )
  }

  if (instructorId > 0 && termCode > 0) {
    const term = grades.instructors
      .find((item) => item.id === instructorId)
      ?.terms.find((item) => item.termCode === termCode)

    return term ? [{ ...term, termCode }] : []
  }

  return grades.courseOfferings.map((offering) => ({
    ...offering.cumulative,
    termCode: offering.termCode,
  }))
}
