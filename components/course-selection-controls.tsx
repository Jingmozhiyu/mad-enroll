'use client'

import type { CourseCompareState, MadgradesCourseGrades } from '@/lib/madgrades/types'
import {
  calculateGpa,
  formatGpa,
  getSelectableTerms,
  toTermName,
} from '@/lib/madgrades/utils'

type CourseSelectionControlsProps = {
  grades: MadgradesCourseGrades | null
  selection: CourseCompareState
  onChange: (nextSelection: CourseCompareState) => void
}

export function CourseSelectionControls({
  grades,
  selection,
  onChange,
}: CourseSelectionControlsProps) {
  const availableTerms = getSelectableTerms(grades, selection.instructorId)

  return (
    <div className="grid gap-4">
      <label className="grid gap-2">
        <span className="text-sm font-bold text-[var(--color-ink-soft)]">Instructor</span>
        <select
          className="input-shell"
          onChange={(event) => {
            const nextInstructorId = Number(event.target.value)
            const nextTerms = getSelectableTerms(grades, nextInstructorId)
            const nextTermCode = nextTerms.includes(selection.termCode) ? selection.termCode : 0
            onChange({
              instructorId: nextInstructorId,
              termCode: nextTermCode,
            })
          }}
          value={selection.instructorId}
        >
          <option value={0}>All instructors</option>
          {(grades?.instructors ?? []).map((instructor) => (
            <option key={instructor.id} value={instructor.id}>
              {instructor.name} · {formatGpa(calculateGpa(instructor.cumulative))}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-bold text-[var(--color-ink-soft)]">Semester</span>
        <select
          className="input-shell"
          onChange={(event) =>
            onChange({
              instructorId: selection.instructorId,
              termCode: Number(event.target.value),
            })
          }
          value={selection.termCode}
        >
          <option value={0}>
            {selection.instructorId > 0 ? 'All semesters' : 'Cumulative'}
          </option>
          {availableTerms.map((termCode) => (
            <option key={termCode} value={termCode}>
              {toTermName(termCode)}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
