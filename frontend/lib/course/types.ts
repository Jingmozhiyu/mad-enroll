export type Task = {
    id: string | null
    docId: string
    enabled?: boolean
    sectionId: string
    courseId: string
    subjectCode: string
    catalogNumber: string
    courseDisplayName: string
    onlineOnly?: boolean
    meetingInfo: string
    status: string
    openSeats?: number
    capacity?: number
    waitlistSeats?: number
    waitlistCapacity?: number
}

export type SearchCourseHit = {
    courseDesignation: string
    title: string
    subjectId: string
    courseId: string
}

export type MeetingSlot = {
    meetingDays?: string
    meetingTimeStart?: number
    meetingTimeEnd?: number
    buildingName?: string
    room?: string
}
