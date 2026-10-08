import type {
    AcademicTerm, AdminSubscription, AdminSummary, AdminUserSubscriptions,
    AlertDeadLetter, AlertDeliveryLog, MailDailyStat, PageResponse, SchedulerStatus,
} from '@/lib/admin/types'

const courses = ['COMP SCI 640', 'MATH 320', 'CHEM 343', 'BIOCHEM 104']
const statuses = ['OPEN', 'WAITLIST', 'CLOSED', 'OPEN']

export const demoUsers: AdminUserSubscriptions[] = Array.from({length: 24}, (_, index) => ({
    userId: `demo-user-${index + 1}`,
    email: `student${String(index + 1).padStart(2, '0')}@example.test`,
    role: index === 0 ? 'ADMIN' : 'USER',
    subscriptions: courses.map((name, courseIndex): AdminSubscription => ({
        termCode: '1272',
        subscriptionId: `demo-subscription-${index}-${courseIndex}`,
        enabled: (index + courseIndex) % 4 !== 0,
        courseId: `demo-course-${courseIndex}`,
        subjectCode: name.slice(0, name.lastIndexOf(' ')),
        catalogNumber: name.slice(name.lastIndexOf(' ') + 1),
        courseDisplayName: name,
        sectionId: String(101 + courseIndex),
        status: statuses[(index + courseIndex) % statuses.length],
        openSeats: 3,
        capacity: 60,
        meetingInfo: 'MWF 10:00–10:50',
    })),
}))

export const demoStats: MailDailyStat[] = [
    [2, 67, 25, 3], [3, 71, 22, 5], [4, 44, 17, 1], [5, 11, 5, 0],
    [6, 16, 8, 0], [7, 18, 5, 0], [8, 43, 22, 1], [9, 32, 18, 1],
].map(([day, open, waitlist, welcome], index) => ({
    id: `demo-stat-${index}`,
    statsDate: `2026-09-${String(day).padStart(2, '0')}`,
    sentTotal: open + waitlist + welcome,
    sentOpen: open,
    sentWaitlist: waitlist,
    sentWelcome: welcome,
    sentManualTest: 0,
    deadTotal: index === 1 || index === 5 ? 1 : 0,
    deadOpen: index === 1 ? 1 : 0,
    deadWaitlist: index === 5 ? 1 : 0,
    deadWelcome: 0,
    deadManualTest: 0,
}))

export const demoDeliveries: AlertDeliveryLog[] = demoStats.flatMap(stat =>
    Array.from({length: stat.sentTotal}, (_, index) => {
        const alertType = index < stat.sentOpen ? 'OPEN'
            : index < stat.sentOpen + stat.sentWaitlist ? 'WAITLIST' : 'WELCOME'
        return {
            id: `demo-delivery-${stat.id}-${index}`,
            eventId: `demo-event-${stat.id}-${index}`,
            alertType,
            recipientEmail: demoUsers[index % demoUsers.length].email,
            sectionId: alertType === 'WELCOME' ? '—' : String(101 + index % 4),
            courseDisplayName: alertType === 'WELCOME' ? 'Welcome' : courses[index % 4],
            sourceQueue: alertType === 'WELCOME' ? 'welcome-emails' : 'seat-alerts',
            manualTest: false,
            sentAt: new Date(Date.parse(`${stat.statsDate}T14:00:00Z`) + index * 15000).toISOString(),
        }
    }),
).sort((left, right) => right.sentAt.localeCompare(left.sentAt))

export const demoDeadLetters: AlertDeadLetter[] = [
    {id: 'demo-dead-1', alertType: 'OPEN', recipientEmail: 'student04@example.test', courseDisplayName: 'CHEM 343', failedAt: '2026-09-03T15:10:00Z', deadLetterReason: 'SMTP connection timed out'},
    {id: 'demo-dead-2', alertType: 'WAITLIST', recipientEmail: 'student12@example.test', courseDisplayName: 'MATH 320', failedAt: '2026-09-07T19:42:00Z', deadLetterReason: 'Mailbox unavailable'},
]

export const demoTerms: AcademicTerm[] = [
    {code: '1274', label: 'Spring 2027', status: 'UPCOMING'},
    {code: '1272', label: 'Fall 2026', status: 'ACTIVE'},
    {code: '1266', label: 'Summer 2026', status: 'EXPIRED'},
]

export const demoSummary: AdminSummary = {
    totalUsers: demoUsers.length,
    totalSubscriptions: demoUsers.reduce((sum, user) => sum + user.subscriptions.length, 0),
    enabledSubscriptions: demoUsers.reduce((sum, user) => sum + user.subscriptions.filter(item => item.enabled).length, 0),
    totalDeliveries: demoStats.reduce((sum, stat) => sum + stat.sentTotal, 0),
    totalDeadLetters: demoDeadLetters.length,
}

export const demoSnapshot: SchedulerStatus = {
    observedAt: '2026-09-09T14:30:00Z',
    heartbeatIntervalMs: 1000,
    fetchIntervalMs: 1000,
    activeCourseCount: 4,
    dueCourseCount: 1,
    queueSize: 3,
    queuedCourseIds: ['004293', '005178', '006401'],
    lastFetchedCourseId: '004293',
    lastFetchFinishedAt: '2026-09-09T14:29:59Z',
}

export function demoPage<T>(items: T[], page: number, pageSize: number): PageResponse<T> {
    return {
        items: items.slice((page - 1) * pageSize, page * pageSize),
        page,
        pageSize,
        totalItems: items.length,
        totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
    }
}
