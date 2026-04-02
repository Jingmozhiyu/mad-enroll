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

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(milliseconds))
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
    if (left.courseDisplayName !== right.courseDisplayName) {
      return left.courseDisplayName.localeCompare(right.courseDisplayName)
    }

    return String(left.sectionId).localeCompare(String(right.sectionId))
  })
}

export function formatDateTime(value?: string) {
  if (!value) {
    return 'Unknown time'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date)
}

export function getSeatsSummary(task: Pick<Task, 'openSeats' | 'capacity' | 'waitlistSeats' | 'waitlistCapacity'>) {
  const seatParts: string[] = []

  if (typeof task.openSeats === 'number' || typeof task.capacity === 'number') {
    seatParts.push(
      `Open Seats: ${task.openSeats ?? '?'} / ${task.capacity ?? '?'}`,
    )
  }

  if (typeof task.waitlistSeats === 'number' || typeof task.waitlistCapacity === 'number') {
    seatParts.push(
      `Waitlist Seats: ${task.waitlistSeats ?? '?'} / ${task.waitlistCapacity ?? '?'}`,
    )
  }

  return seatParts.length > 0 ? seatParts.join(' | ') : 'Seat data unavailable'
}

export function getOpenSeatsSummary(task: Pick<Task, 'openSeats' | 'capacity'>) {
  return `Open Seats: ${task.openSeats ?? '?'} / ${task.capacity ?? '?'}`
}

export function getWaitlistSeatsSummary(task: Pick<Task, 'waitlistSeats' | 'waitlistCapacity'>) {
  return `Waitlist Seats: ${task.waitlistSeats ?? '?'} / ${task.waitlistCapacity ?? '?'}`
}
