type StatusBadgeProps = {
  status: string
}

const statusClassMap: Record<string, string> = {
  OPEN: 'status-open',
  WAITLIST: 'status-waitlist',
  CLOSED: 'status-closed',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status?.toUpperCase?.() || 'UNKNOWN'
  const statusClass = statusClassMap[normalized] ?? 'status-unknown'

  return (
    <span
      className={`inline-flex min-w-[108px] items-center justify-center rounded-full px-3 py-2 text-xs font-bold tracking-[0.02em] ${statusClass}`}
    >
      {normalized}
    </span>
  )
}
