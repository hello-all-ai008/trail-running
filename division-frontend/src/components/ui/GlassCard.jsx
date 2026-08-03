/**
 * Glass surface primitive. Used standalone and as the stat-tile base.
 * `accent` accepts a trail-palette name (forest/sky/accent/soil) or a full CSS
 * color string (e.g. a status token) for the value text.
 * @param {{
 *   label: string,
 *   value: string,
 *   accent?: string,
 *   hint?: string,
 *   className?: string,
 *   children?: import('react').ReactNode
 * }} props
 */
function GlassCard({ label, value, accent = 'forest', hint, className = '', children }) {
  const PALETTE = ['forest', 'forest-dim', 'soil', 'sky', 'accent']
  const color = PALETTE.includes(accent) ? `var(--color-${accent})` : accent

  return (
    <div className={`glass-panel stat-card min-w-40 ${className}`}>
      <p className="stat-card__label font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </p>
      <p className="stat-card__value mt-2 font-extrabold leading-none" style={{ color }}>
        {value}
      </p>
      {hint && (
        <p className="stat-card__hint mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
          {hint}
        </p>
      )}
      {children}
    </div>
  )
}

export default GlassCard
