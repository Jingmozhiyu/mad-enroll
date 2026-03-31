import type { MeetingSlot, Task } from '@/lib/types'

function parseMeetingInfo(meetingInfo: string) {
  if (!meetingInfo) {
    return [] as MeetingSlot[]
  }

  try {
    const parsed = JSON.parse(meetingInfo)
    return Array.isArray(parsed) ? (parsed as MeetingSlot[]) : []
  } catch {
    return []
  }
}

function formatClock(milliseconds?: number) {
  if (typeof milliseconds !== 'number') {
    return 'TBA'
  }

  const totalMinutes = Math.floor(milliseconds / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const normalizedHours = hours % 24
  const period = normalizedHours >= 12 ? 'PM' : 'AM'
  const hour12 = normalizedHours % 12 || 12

  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`
}

export function getMeetingSummary(meetingInfo: string) {
  const meetings = parseMeetingInfo(meetingInfo)

  if (meetings.length === 0) {
    return 'Schedule unavailable'
  }

  return meetings
    .map((meeting) => {
      const days = meeting.meetingDays?.trim() || 'TBA'
      const start = formatClock(meeting.meetingTimeStart)
      const end = formatClock(meeting.meetingTimeEnd)
      return `${days} ${start} - ${end}`
    })
    .join(' / ')
}

export function sortTasks(tasks: Task[]) {
  return [...tasks].sort((left, right) => {
    if (left.enabled !== right.enabled) {
      return left.enabled ? -1 : 1
    }

    if (left.courseDisplayName !== right.courseDisplayName) {
      return left.courseDisplayName.localeCompare(right.courseDisplayName)
    }

    return String(left.sectionId).localeCompare(String(right.sectionId))
  })
}

export function getSeatsSummary(task: Pick<Task, 'openSeats' | 'capacity' | 'waitlistSeats' | 'waitlistCapacity'>) {
  const seatParts: string[] = []

  if (typeof task.openSeats === 'number' || typeof task.capacity === 'number') {
    seatParts.push(
      `Open ${task.openSeats ?? '?'} / ${task.capacity ?? '?'}`,
    )
  }

  if (typeof task.waitlistSeats === 'number' || typeof task.waitlistCapacity === 'number') {
    seatParts.push(
      `Waitlist ${task.waitlistSeats ?? '?'} / ${task.waitlistCapacity ?? '?'}`,
    )
  }

  return seatParts.length > 0 ? seatParts.join(' | ') : 'Seat data unavailable'
}
