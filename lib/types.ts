export type ApiEnvelope<T> = {
  code: number
  msg: string
  data: T
}

export type AuthPayload = {
  email: string
  password: string
}

export type ClientSession = {
  userId: string
  email: string
}

export type UserSession = ClientSession & {
  token: string
}

export type Task = {
  id: string | null
  enabled?: boolean
  sectionId: string
  courseId: string
  subjectCode: string
  catalogNumber: string
  courseDisplayName: string
  meetingInfo: string
  status: string
  openSeats?: number
  capacity?: number
  waitlistSeats?: number
  waitlistCapacity?: number
}

export type AdminSubscription = {
  subscriptionId: string
  enabled: boolean
  courseId: string
  subjectCode: string
  catalogNumber: string
  courseDisplayName: string
  sectionId: string
  status: string
  openSeats?: number
  capacity?: number
  waitlistSeats?: number
  waitlistCapacity?: number
  meetingInfo: string
}

export type AdminUserSubscriptions = {
  userId: string
  email: string
  role: string
  subscriptions: AdminSubscription[]
}

export type AlertDeadLetter = {
  id?: string
  eventId?: string
  alertType?: string
  recipientEmail?: string
  sectionId?: string
  courseDisplayName?: string
  sourceQueue?: string
  failedAt?: string
  deadLetterReason?: string
  [key: string]: unknown
}

export type AlertDeliveryLog = {
  id: string
  eventId: string
  alertType: string
  recipientEmail: string
  sectionId: string
  courseDisplayName: string
  sourceQueue: string
  manualTest: boolean
  sentAt: string
}

export type MailDailyStat = {
  id: string
  statsDate: string
  sentTotal: number
  sentOpen: number
  sentWaitlist: number
  sentWelcome: number
  sentManualTest: number
  deadTotal: number
  deadOpen: number
  deadWaitlist: number
  deadWelcome: number
  deadManualTest: number
}

export type TestEmailPayload = {
  recipientEmail?: string
  alertType?: string
  sectionId?: string
  courseDisplayName?: string
}

export type MeetingSlot = {
  meetingDays?: string
  meetingTimeStart?: number
  meetingTimeEnd?: number
}

export type SchedulerStatus = {
  observedAt: string
  heartbeatIntervalMs: number
  fetchIntervalMs: number
  activeCourseCount: number
  dueCourseCount: number
  queueSize: number
  queuedCourseIds: string[]
  lastHeartbeatAt?: string
  lastFetchStartedAt?: string
  lastFetchFinishedAt?: string
  lastFetchedCourseId?: string
}
