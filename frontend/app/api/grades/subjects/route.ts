import {fetchMadgradesSubjectCatalog} from '@/lib/madgrades/api'
import {gradeApiResponse, publicSubject} from '@/lib/madgrades/public-api'

/** Lists the complete subject catalog for public grade-data discovery. */
export async function GET() {
    return gradeApiResponse(async () => ({subjects: (await fetchMadgradesSubjectCatalog()).map(publicSubject)}))
}
