'use client'

import dynamic from 'next/dynamic'
import {useState} from 'react'
import type {ReactNode} from 'react'
import type {CourseCompareState, MadgradesCourse, MadgradesCourseGrades} from '@/lib/madgrades/types'

const InteractiveCoursePage = dynamic(
    () => import('@/components/courses/course-page').then((module) => module.MadgradesCoursePage),
    {
        ssr: false,
        loading: () => (
            <div className="grid gap-4 py-6" role="status">
                <p className="text-sm text-[var(--color-ink-soft)]">Loading interactive charts…</p>
                <div aria-hidden="true" className="skeleton-block h-[318px] rounded-lg"/>
            </div>
        ),
    },
)

type CourseViewsProps = {
    course: MadgradesCourse
    grades: MadgradesCourseGrades
    initialSelection: CourseCompareState
    children: ReactNode
}

/** Keeps the server-rendered summary as the default and loads charts on request. */
export function CourseViews({course, grades, initialSelection, children}: CourseViewsProps) {
    const [showCharts, setShowCharts] = useState(false)

    return (
        <div className="grid min-w-0 gap-6">
            <div className="flex justify-end">
                <button
                    className="button-secondary min-h-11 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-deep-teal)]"
                    onClick={() => setShowCharts((visible) => !visible)}
                    type="button"
                >
                    {showCharts ? 'View grade tables' : 'View interactive charts'}
                </button>
            </div>
            {showCharts ? (
                <InteractiveCoursePage course={course} grades={grades} initialSelection={initialSelection}/>
            ) : children}
        </div>
    )
}
