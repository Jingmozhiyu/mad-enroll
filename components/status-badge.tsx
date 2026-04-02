type StatusBadgeProps = {
  status: string
}

const statusClassMap: Record<string, string> = {
  OPEN: 'status-open',
  WAITLIST: 'status-waitlist',
  WAITLISTED: 'status-waitlist',
  WELCOME: 'status-welcome',
  CLOSED: 'status-closed',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status?.toUpperCase?.() || 'UNKNOWN'
  const statusClass = statusClassMap[normalized] ?? 'status-unknown'
  const displayLabel = normalized === 'WAITLISTED' ? 'WAITLIST' : normalized

  return (
    <span
      className={`inline-flex min-w-[96px] items-center justify-center rounded-xl px-2.5 py-2 text-sm font-bold tracking-[0.02em] ${statusClass}`}
    >
      {displayLabel}
    </span>
  )
}
