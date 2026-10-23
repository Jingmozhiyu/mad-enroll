const schemaRef = (name: string) => ({$ref: `#/components/schemas/${name}`})
const arrayOf = (name: string) => ({type: 'array', items: schemaRef(name)})
const text = {type: 'string'}
const count = {type: 'integer', minimum: 0}
const nullableTerm = {type: ['integer', 'null']}
const nullableUrl = {type: ['string', 'null'], format: 'uri'}
const url = {type: 'string', format: 'uri'}
const object = (properties: Record<string, unknown>) => ({type: 'object', required: Object.keys(properties), properties})

export const gradeApiEndpoints = [
    {
        path: '/api/grades/subjects',
        operationId: 'listGradeSubjects',
        summary: 'List all subjects',
        description: 'Discover subject IDs and normalized abbreviations. The complete catalog is returned in one response.',
        schema: 'SubjectList',
        parameters: [],
        errors: ['503'],
    },
    {
        path: '/api/grades/courses',
        operationId: 'listGradeCourses',
        summary: 'List courses in a subject',
        description: 'Returns up to 100 courses per page, with readable identifiers, HTML citation URLs and JSON grade URLs. Follow nextPageUrl until null.',
        schema: 'CourseList',
        parameters: [
            {name: 'subjectId', in: 'query', required: true, description: 'UW subject ID from /api/grades/subjects, e.g. 266 for Computer Sciences.', schema: {type: 'string'}, example: '266'},
            {name: 'page', in: 'query', required: false, description: 'Page number, starting at 1.', schema: {type: 'integer', minimum: 1, default: 1}},
        ],
        errors: ['400', '404', '503'],
    },
    {
        path: '/api/grades/courses/{identifier}',
        operationId: 'getCourseGrades',
        summary: 'Get course grade distributions',
        description: 'Returns cumulative and semester grades on MadEnroll. Unique aliases and legacy UUIDs are accepted; course.identifier contains the canonical code. Ambiguous identities return 409.',
        schema: 'CourseGrades',
        parameters: [
            {name: 'identifier', in: 'path', required: true, description: 'Course code: remove spaces within subjects, join cross-listed subjects with underscores, then append the course number. Examples: COMPSCI_300, COMPSCI_ECE_354. URL-encode punctuation.', schema: {type: 'string'}, example: 'COMPSCI_300'},
        ],
        errors: ['404', '409', '503'],
    },
]

const errorDescriptions: Record<string, string> = {
    '400': 'Missing or invalid query parameters.',
    '404': 'Course, subject or page not found.',
    '409': 'Ambiguous course identity. Use the full identifier from the subject course list.',
    '503': 'Grade data is temporarily unavailable. No successful empty dataset is returned.',
}

export const gradeApiMethodology = 'GPA and A percentage use A, AB, B, BC, C, D and F as their denominator. Grade points are 4, 3.5, 3, 2.5, 2, 1 and 0. aPercent is on a 0–100 scale. GPA and A percentage are null when no letter grades exist. Counts are grade records, not unique students or credit-weighted student GPAs. Non-letter grades are reported separately; uCount means U. Source-provided aggregates take precedence. Historical grades do not measure workload.'

/** Machine-readable contract for the public grade endpoints documented by the SSR reference page. */
export const gradeApiSpec = {
    openapi: '3.1.0',
    info: {
        title: 'MadEnroll UW–Madison Grade Data API',
        version: '1.0.0',
        description: `MadEnroll’s public read-only UW–Madison grade distributions. No API key or login is required. These endpoints use the same data and calculations as the HTML dataset at https://madenroll.com/course. ${gradeApiMethodology} Upstream data is cached for 24 hours; this does not imply new grades are available. Coverage varies by course; record update dates are not available.`,
    },
    servers: [{url: 'https://madenroll.com'}],
    security: [],
    externalDocs: {description: 'Server-rendered grade dataset', url: 'https://madenroll.com/course'},
    paths: Object.fromEntries(gradeApiEndpoints.map((endpoint) => [endpoint.path, {get: {
        operationId: endpoint.operationId,
        summary: endpoint.summary,
        description: endpoint.description,
        parameters: endpoint.parameters,
        responses: {
            '200': {description: 'Successful JSON response.', content: {'application/json': {schema: schemaRef(endpoint.schema)}}},
            ...Object.fromEntries(endpoint.errors.map((status) => [status, {
                description: errorDescriptions[status], content: {'application/json': {schema: schemaRef('Error')}},
            }])),
        },
    }}])),
    components: {schemas: {
        Subject: object({subjectId: text, abbreviation: text, name: text}),
        SubjectList: object({subjects: arrayOf('Subject')}),
        Course: object({identifier: text, name: text, number: {type: 'integer'}, subjects: arrayOf('Subject'), canonicalUrl: url, gradesUrl: url}),
        CourseList: object({subject: schemaRef('Subject'), currentPage: {type: 'integer', minimum: 1}, totalPages: count, totalCount: count, nextPageUrl: nullableUrl, results: arrayOf('Course')}),
        GradeCounts: object(Object.fromEntries([
            'aCount', 'abCount', 'bCount', 'bcCount', 'cCount', 'dCount', 'fCount', 'sCount', 'uCount',
            'crCount', 'nCount', 'pCount', 'iCount', 'nwCount', 'nrCount', 'otherCount', 'total',
        ].map((key) => [key, count]))),
        Distribution: object({
            counts: schemaRef('GradeCounts'),
            letterGradeCount: count,
            nonLetterGradeCount: count,
            gpa: {type: ['number', 'null'], minimum: 0, maximum: 4},
            aPercent: {type: ['number', 'null'], minimum: 0, maximum: 100},
        }),
        TermDistribution: {allOf: [schemaRef('Distribution'), object({termCode: {type: 'integer'}, name: text})]},
        CourseGrades: object({
            course: schemaRef('Course'),
            provider: object({name: {type: 'string', const: 'MadEnroll'}, url}),
            coverage: object({firstTermCode: nullableTerm, lastTermCode: nullableTerm, termCount: count}),
            cumulative: schemaRef('Distribution'),
            terms: arrayOf('TermDistribution'),
        }),
        Error: object({message: text}),
    }},
}
