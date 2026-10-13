import type {ReactNode} from 'react'
import {MonitorTaskList} from '@/components/monitor/monitor-sections'
import type {Subscription} from '@/lib/course/types'

// Meeting times are epoch milliseconds on 1970-01-01, shown in America/Chicago (CST, UTC-6).
function clock(hour: number, minute: number) {
    return ((hour + 6) * 60 + minute) * 60_000
}

function meeting(days: string, start: [number, number], end: [number, number], room: string, buildingName: string) {
    return JSON.stringify([{
        meetingDays: days,
        meetingTimeStart: clock(...start),
        meetingTimeEnd: clock(...end),
        room,
        buildingName,
    }])
}

function sample(
    courseDisplayName: string,
    sectionId: string,
    status: string,
    seats: [number, number, number, number],
    meetingInfo: string,
): Subscription {
    const [openSeats, capacity, waitlistSeats, waitlistCapacity] = seats
    return {
        id: null,
        docId: `preview-${sectionId}`,
        sectionId,
        courseId: '',
        subjectId: '',
        catalogNumber: '',
        courseDisplayName,
        meetingInfo,
        status,
        openSeats,
        capacity,
        waitlistSeats,
        waitlistCapacity,
    }
}

// Illustrative alerts behind the blur. Not real data and never interactive.
const previewAlerts: Subscription[] = [
    sample('COMP SCI 400', '66421', 'OPEN', [3, 120, 0, 20], meeting('TR', [9, 30], [10, 45], '1100', 'Grainger Hall')),
    sample('MATH 340', '51234', 'CLOSED', [0, 40, 0, 5], meeting('MWF', [11, 0], [11, 50], 'B239', 'Van Vleck Hall')),
    sample('CHEM 343', '24817', 'WAITLISTED', [0, 200, 4, 30], meeting('TR', [13, 0], [14, 15], '1315', 'Chemistry Building')),
    sample('ECON 101', '30562', 'CLOSED', [0, 60, 0, 0], meeting('MW', [14, 30], [15, 45], '6210', 'Social Science')),
    sample('PSYCH 202', '47705', 'OPEN', [1, 35, 0, 10], meeting('W', [15, 30], [16, 45], '105', 'Brogden Psychology')),
    sample('STAT 240', '58113', 'WAITLISTED', [0, 24, 2, 6], meeting('F', [9, 55], [10, 45], '1524', 'Morgridge Hall')),
]

type MonitorPreviewProps = {
    // Rendered on top of the blurred sample alerts. Omit it to use the preview as a loading skeleton.
    children?: ReactNode
}

/** Blurred sample alerts shown when the real list is unavailable (logged out, loading, or off-season). */
export function MonitorPreview({children}: MonitorPreviewProps) {
    return (
        <div className="relative">
            <div aria-hidden className="pointer-events-none select-none blur-[5px]" inert>
                <MonitorTaskList
                    canSearch={false}
                    deleteError={null}
                    deletingDocId={null}
                    loadError=""
                    onDelete={() => {}}
                    onRetryLoad={() => {}}
                    tasks={previewAlerts}
                    termsLoading={false}
                />
            </div>
            <div
                className="absolute inset-0 flex items-start justify-center bg-[linear-gradient(to_bottom,rgba(255,255,255,0.45),rgba(255,255,255,0.9))] px-4 pt-16">
                {children ? (
                    // No card chrome: the copy sits on a soft white glow, like the home hero, not a popup.
                    <div
                        className="rise-in grid w-full max-w-xl justify-items-center gap-4 bg-[radial-gradient(closest-side,rgba(255,255,255,0.96)_60%,rgba(255,255,255,0))] px-12 py-14 text-center">
                        {children}
                    </div>
                ) : null}
            </div>
        </div>
    )
}
