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

/**
 * Loads the chart interface in the browser only; the server HTML holds a skeleton in its place.
 * Instructor and term selections are read from the URL (instructorId, termCode).
 */
export function CourseCharts({course, grades, initialSelection}: CourseChartsProps) {
    return (
        <InteractiveCoursePage course={course} grades={grades} initialSelection={initialSelection}/>
    )
}
