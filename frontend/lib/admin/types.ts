export type AdminSubscription = {
    termCode: string
    subscriptionId: string
    enabled: boolean
    docId?: string
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

export type TermStatus = 'UPCOMING' | 'ACTIVE' | 'EXPIRED'

export type BroadcastAudience = 'ALL_USERS' | 'TERM_SUBSCRIBERS'
export type BroadcastDraft = {subject: string; body: string; audience: BroadcastAudience; termCode?: string}
export type Broadcast = BroadcastDraft & {
    id: string
    status: 'DRAFT' | 'QUEUED' | 'COMPLETED'
    createdAt: string
    recipientCount: number
    counts: {pending: number; sending: number; sent: number; failed: number; unknown: number}
}
export type BroadcastDelivery = {
    id: string
    email: string
    status: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'UNKNOWN'
    attempts: number
    sentAt: string | null
    lastError: string | null
}

export type AcademicTerm = {
    code: string
    label: string
    status: TermStatus
}

export type TermUpdateResult = {
    term: AcademicTerm
    disabledSubscriptions: number
}

export type AdminUserSubscriptions = {
    userId: string
    email: string
    role: string
    subscriptions: AdminSubscription[]
}

export type PageResponse<T> = {
    items: T[]
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
}

export type AdminSummary = {
    totalUsers: number
    totalSubscriptions: number
    enabledSubscriptions: number
    totalDeliveries: number
    totalDeadLetters: number
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
    termId?: string
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
