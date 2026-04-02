export type MadgradesSubject = {
  code: string
  name: string
  abbreviation?: string
  coursesUrl?: string
}

export type MadgradesInstructor = {
  id: number
  name: string
  url?: string
}

export type MadgradesCourse = {
  uuid: string
  number: number
  name: string
  names?: string[]
  subjects: MadgradesSubject[]
  url?: string
  gradesUrl?: string
}

export type MadgradesCourseSuggestion = {
  uuid: string
  name: string
  displayLine: string
}

export type MadgradesPaginatedResponse<T> = {
  currentPage: number
  totalPages: number
  totalCount: number
  nextPageUrl?: string | null
  results: T[]
}

export type MadgradesSearchParams = {
  query?: string
  subjects?: string[]
  instructors?: number[]
  sort?: 'name' | 'number' | 'relevance'
  order?: 'ASC' | 'DESC'
  page?: number
  perPage?: number
}

export type GradeDistribution = {
  termCode?: number
  aCount: number
  abCount: number
  bCount: number
  bcCount: number
  cCount: number
  dCount: number
  fCount: number
  sCount: number
  ubCount: number
  crCount: number
  nCount: number
  pCount: number
  iCount: number
  nwCount: number
  nrCount: number
  otherCount: number
  total: number
}

export type MadgradesSection = GradeDistribution & {
  uuid?: string
  number?: number
  sectionType?: string
  instructors: MadgradesInstructor[]
}

export type MadgradesCourseOffering = {
  uuid?: string
  termCode: number
  name?: string
  cumulative: GradeDistribution
  sections: MadgradesSection[]
}

export type MadgradesInstructorAggregate = {
  id: number
  name: string
  cumulative: GradeDistribution
  terms: GradeDistribution[]
  latestTerm: number
}

export type MadgradesCourseGrades = {
  cumulative: GradeDistribution
  courseOfferings: MadgradesCourseOffering[]
  instructors: MadgradesInstructorAggregate[]
}

export type CourseCompareState = {
  instructorId: number
  termCode: number
}
