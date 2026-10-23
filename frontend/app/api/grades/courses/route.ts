import {type NextRequest} from 'next/server'
import {fetchMadgradesCourseDirectory, fetchMadgradesSubjectCatalog, MadgradesApiError} from '@/lib/madgrades/api'
import {gradeApiResponse, publicCourse, publicSubject} from '@/lib/madgrades/public-api'

/** Lists one page of subject courses using the same cached catalog as the HTML directory. */
export async function GET(request: NextRequest) {
    return gradeApiResponse(async () => {
        const subjectId = request.nextUrl.searchParams.get('subjectId') ?? ''
        const pageText = request.nextUrl.searchParams.get('page') ?? '1'
        const page = Number(pageText)
        if (!subjectId || !/^\d+$/.test(pageText) || !Number.isSafeInteger(page) || page < 1) {
            throw new MadgradesApiError(400, 'Provide subjectId and a positive integer page.')
        }
        const subject = (await fetchMadgradesSubjectCatalog()).find((item) => item.code === subjectId)
        if (!subject) throw new MadgradesApiError(404, 'Subject not found.')
        const courses = await fetchMadgradesCourseDirectory(subject.code, page)
        if (page > Math.max(1, courses.totalPages)) throw new MadgradesApiError(404, 'Page not found.')
        return {
            subject: publicSubject(subject),
            currentPage: courses.currentPage,
            totalPages: courses.totalPages,
            totalCount: courses.totalCount,
            nextPageUrl: page < courses.totalPages
                ? `https://madenroll.com/api/grades/courses?subjectId=${encodeURIComponent(subject.code)}&page=${page + 1}` : null,
            results: courses.results.map(publicCourse),
        }
    })
}
