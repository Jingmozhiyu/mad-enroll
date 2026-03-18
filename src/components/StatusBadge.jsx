const STATUS_CLASS_MAP = {
  OPEN: 'status-badge--open',
  WAITLISTED: 'status-badge--waitlist',
  CLOSED: 'status-badge--closed',
}

function StatusBadge({ status }) {
  const normalizedStatus = status || 'N/A'
  const className = STATUS_CLASS_MAP[normalizedStatus] || 'status-badge--unknown'
  const label = normalizedStatus === 'WAITLISTED' ? 'WAITLIST' : normalizedStatus

  return <span className={`status-badge ${className}`}>{label}</span>
}

export default StatusBadge
