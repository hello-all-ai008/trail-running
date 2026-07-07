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
    <div className={`glass-panel p-5 min-w-40 ${className}`}>
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </p>
      <p className="mt-2 text-3xl font-extrabold leading-none" style={{ color }}>
        {value}
      </p>
      {hint && (
        <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {hint}
        </p>
      )}
      {children}
    </div>
  )
}

export default GlassCard
