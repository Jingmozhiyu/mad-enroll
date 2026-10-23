import {fetchMadgradesCourseGrades, MadgradesApiError, resolveMadgradesCourse} from '@/lib/madgrades/api'
import {gradeApiResponse, publicCourseGrades} from '@/lib/madgrades/public-api'

/** Returns cumulative and semester grades resolved by a readable UW course code. */
export async function GET(_request: Request, {params}: {params: Promise<{identifier: string}>}) {
    return gradeApiResponse(async () => {
        const {identifier} = await params
        const course = await resolveMadgradesCourse(identifier)
        if (!course) throw new MadgradesApiError(404, 'Course not found.')
        return publicCourseGrades(course, await fetchMadgradesCourseGrades(course.uuid))
    })
}
