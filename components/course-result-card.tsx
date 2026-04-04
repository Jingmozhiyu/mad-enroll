'use client'

import { useProgressRouter } from '@/components/navigation-progress'
import type { MadgradesCourse } from '@/lib/madgrades/types'
import { getCourseDisplayLine } from '@/lib/madgrades/utils'

type CourseResultCardProps = {
  course: MadgradesCourse
}

export function CourseResultCard({ course }: CourseResultCardProps) {
  const router = useProgressRouter()
  const href = `/courses/${course.uuid}`

  function handleOpen() {
    router.push(href)
  }

  return (
    <button
      className="glass-card w-full px-5 py-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(50,90,81,0.14)]"
      onFocus={() => router.prefetch(href)}
      onMouseEnter={() => router.prefetch(href)}
      onClick={handleOpen}
      type="button"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h3 className="text-xl font-semibold text-[var(--color-ink)]">{course.name}</h3>
          <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{getCourseDisplayLine(course)}</p>
        </div>

        <div className="flex items-center justify-between gap-4 md:min-w-[180px] md:flex-col md:items-end">
          <span className="text-sm text-[var(--color-ink-soft)]">Open course analytics</span>
          <span className="font-semibold text-[var(--color-deep-teal)]">Open</span>
        </div>
      </div>
    </button>
  )
}
