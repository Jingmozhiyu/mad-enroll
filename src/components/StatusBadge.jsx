const STATUS_CLASS_MAP = {
  OPEN: 'status-badge--open',
  WAITLISTED: 'status-badge--waitlist',
  CLOSED: 'status-badge--closed',
}

function StatusBadge({ status }) {
  const normalizedStatus = status || 'N/A'
  const className = STATUS_CLASS_MAP[normalizedStatus] || 'status-badge--unknown'

  return <span className={`status-badge ${className}`}>{normalizedStatus}</span>
}

export default StatusBadge
