export type ApiEnvelope<T> = {
  code: number
  msg: string
  data: T
}

export type AuthPayload = {
  email: string
  password: string
}

export type UserSession = {
  userId: string
  email: string
  token: string
}

export type Task = {
  id: string | null
  sectionId: string
  courseId: string
  subjectCode: string
  catalogNumber: string
  courseDisplayName: string
  meetingInfo: string
  status: string
  enabled: boolean
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

export type MeetingSlot = {
  meetingDays?: string
  meetingTimeStart?: number
  meetingTimeEnd?: number
}
