'use client'

import dynamic from 'next/dynamic'
import type {CourseCompareState, MadgradesCourse, MadgradesCourseGrades} from '@/lib/madgrades/types'

const InteractiveCoursePage = dynamic(
    () => import('@/components/courses/course-page').then((module) => module.MadgradesCoursePage),
    {
        ssr: false,
        loading: () => (
            <div aria-label="Loading charts" className="skeleton-block h-[318px] rounded-lg" role="status"/>
        ),
    },
)

type CourseChartsProps = {
    course: MadgradesCourse
    grades: MadgradesCourseGrades
    initialSelection: CourseCompareState
}

/** Loads the original chart interface only for an explicitly requested chart URL. */
export function CourseCharts({course, grades, initialSelection}: CourseChartsProps) {
    return (
        <InteractiveCoursePage course={course} grades={grades} initialSelection={initialSelection}/>
    )
}
