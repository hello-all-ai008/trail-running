/**
 * Status pill for the runner database + logs. Colors come from the reserved
 * dashboard status tokens (--color-status-*) plus station colors.
 */

/** @type {Record<string, string>} */
const STATUS_COLOR = {
  REGISTERED: 'var(--color-text-muted)',
  CHECKED_IN: 'var(--station-start)',
  ON_COURSE: 'var(--station-cp)',
  FINISHED: 'var(--station-finish)',
  OK: 'var(--color-status-green)',
  REJECTED: 'var(--color-status-red)',
}

/**
 * @param {{ statusKey: string, label: string }} props
 */
function StatusBadge({ statusKey, label }) {
  const color = STATUS_COLOR[statusKey] ?? STATUS_COLOR.REGISTERED
  return (
    <span
      className="status-badge"
      style={{
        color,
        borderColor: `color-mix(in oklch, ${color} 45%, transparent)`,
        background: `color-mix(in oklch, ${color} 10%, transparent)`,
      }}
    >
      <span className="status-badge__dot" style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  )
}

export default StatusBadge
