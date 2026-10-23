import {createServer} from 'node:http'
import {pathToFileURL} from 'node:url'

export const COURSE_UUID = '11111111-1111-4111-8111-111111111111'
export const CROSS_LISTED_UUID = '22222222-2222-4222-8222-222222222222'

const subjects = [
    {code: '266', abbreviation: 'COMP SCI', name: 'Computer Sciences'},
    {code: '600', abbreviation: 'MATH', name: 'Mathematics'},
    {code: '320', abbreviation: 'E C E', name: 'Electrical and Computer Engineering'},
    {code: '100', abbreviation: 'ART', name: 'Art'},
    {code: '448', abbreviation: 'HISTORY', name: 'History'},
    {code: '900', abbreviation: 'SOC', name: 'Sociology'},
]

const courses = [
    {uuid: COURSE_UUID, number: 300, name: 'Programming II', subjects: [subjects[0]]},
    {uuid: CROSS_LISTED_UUID, number: 354, name: 'Machine Organization and Programming', subjects: [subjects[2], subjects[0]]},
    {uuid: '33333333-3333-4333-8333-333333333333', number: 100, name: 'Non-letter Grading', subjects: [subjects[3]]},
    {uuid: '44444444-4444-4444-8444-444444444444', number: 999, name: 'Unavailable Grades', subjects: [subjects[4]]},
    {uuid: '55555555-5555-4555-8555-555555555555', number: 234, name: 'Calculus III', subjects: [subjects[1]]},
    {uuid: '66666666-6666-4666-8666-666666666666', number: 101, name: 'Historical Identity One', subjects: [subjects[5]]},
    {uuid: '77777777-7777-4777-8777-777777777777', number: 101, name: 'Historical Identity Two', subjects: [subjects[5]]},
]

const earlier = {aCount: 30, abCount: 0, bCount: 10, sCount: 8, uCount: 2, total: 50}
const later = {aCount: 50, abCount: 10, bCount: 0, sCount: 10, total: 70}
const grades = {
    cumulative: {aCount: 80, abCount: 10, bCount: 10, sCount: 18, uCount: 2, total: 120},
    courseOfferings: [
        {termCode: 1252, cumulative: earlier, sections: [{...earlier, number: 1, instructors: [{id: 1, name: 'Ada Instructor'}]}]},
        {termCode: 1254, cumulative: later, sections: [{...later, number: 1, instructors: [{id: 1, name: 'Ada Instructor'}, {id: 2, name: 'Co Instructor'}]}]},
    ],
}

/** Starts a deterministic upstream fixture; it never connects to a real service. */
export async function startMockMadgrades(port = 0) {
    const requests = new Map()
    const server = createServer((request, response) => {
        const url = new URL(request.url, 'http://localhost')
        requests.set(url.pathname + url.search, (requests.get(url.pathname + url.search) ?? 0) + 1)
        response.setHeader('Content-Type', 'application/json')
        function send(data, status = 200) {
            response.statusCode = status
            response.end(JSON.stringify(data))
        }
        if (url.pathname === '/v1/subjects') {
            // Force a second page so a resolver that only reads the first page fails.
            const page = Number(url.searchParams.get('page') ?? 1)
            return send({currentPage: page, totalPages: 2, totalCount: subjects.length,
                results: page === 1 ? subjects.slice(0, 2) : subjects.slice(2)})
        }
        if (url.pathname === '/v1/courses') {
            let matches = courses
            if (url.searchParams.has('subject')) {
                const code = url.searchParams.get('subject')
                matches = matches.filter((course) => course.subjects.some((subject) => subject.code === code))
            }
            if (url.searchParams.has('number')) {
                matches = matches.filter((course) => course.number === Number(url.searchParams.get('number')))
            }
            const page = Number(url.searchParams.get('page') ?? 1)
            const pageSize = Number(url.searchParams.get('per_page') ?? 25)
            return send({currentPage: page, totalPages: Math.ceil(matches.length / pageSize), totalCount: matches.length,
                results: matches.slice((page - 1) * pageSize, page * pageSize)})
        }
        const match = url.pathname.match(/^\/v1\/courses\/([^/]+)(\/grades)?$/)
        if (match) {
            const course = courses.find((candidate) => candidate.uuid === match[1])
            if (!course) return send({error: 'Not found'}, 404)
            if (!match[2]) return send(course)
            if (course.number === 999) return send({error: 'PRIVATE_UPSTREAM_ERROR_BODY'}, 503)
            if (course.number === 100) {
                const cumulative = {sCount: 25, total: 25}
                return send({cumulative, courseOfferings: [{termCode: 1254, cumulative, sections: []}]})
            }
            return send(grades)
        }
        if (url.pathname === '/v1/instructors') {
            return send({currentPage: 1, totalPages: 1, totalCount: 0, results: []})
        }
        return send({error: 'Not found'}, 404)
    })
    await new Promise((resolve, reject) => {
        server.once('error', reject)
        server.listen(port, '127.0.0.1', resolve)
    })
    return {server, requests, url: `http://127.0.0.1:${server.address().port}/`}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const fixture = await startMockMadgrades(Number(process.argv[2] ?? 0))
    console.log(fixture.url)
}
