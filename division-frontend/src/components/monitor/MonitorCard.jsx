import { fmtTime } from '../../lib/raceData'

/** Turn a division key ('MKT33|Male|20-39') into a valid DOM id fragment. */
function slug(key) {
  return key.replace(/[^A-Za-z0-9]+/g, '-')
}

/** Row class: medal accent for places 1-3 (by real rank, not array index) + arrival flash. */
function rowClasses({ rankAge, isNew }) {
  const classes = []
  if (isNew) classes.push('monitor-row--new')
  if (rankAge != null && rankAge <= 3) classes.push(`monitor-row--${rankAge}`)
  return classes.join(' ') || undefined
}

/**
 * One division card — top-5 podium or recent-scan feed, depending on `mode`.
 * BIB + name share one clickable cell so the whole runner identity opens the
 * e-Slip with a single keyboard-reachable control, rather than one button per
 * column (place/time stay plain cells; only clicking the name matters).
 * @param {{
 *   card: import('../../lib/monitor').MonitorCardData | import('../../lib/monitor').MonitorFeedCard,
 *   mode: 'podium' | 'feed',
 *   recentIds: Set<string>,
 *   onOpenSlip: (bib: string) => void
 * }} props
 */
function MonitorCard({ card, mode, recentIds, onOpenSlip }) {
  const isPodium = mode === 'podium'
  const items = isPodium ? card.rows : card.entries
  const headingId = `monitor-card-${slug(card.key)}`
  const badgeText = isPodium ? `จบ ${card.total} คน` : `${card.total} ล่าสุด`

  return (
    <section className="glass-panel monitor-card" aria-labelledby={headingId}>
      <header className="monitor-card__head">
        <h3 id={headingId}>{card.label}</h3>
        <span className="monitor-card__badge">{badgeText}</span>
      </header>

      {items.length > 0 && isPodium && (
        <table className="monitor-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">BIB</th>
              <th scope="col">ชื่อ</th>
              <th scope="col">เวลา</th>
            </tr>
          </thead>
          <tbody>
            {card.rows.map((row) => {
              const isNew = recentIds.has(row.runner.bib)
              return (
                <tr key={row.runner.bib} className={rowClasses({ rankAge: row.rankAge, isNew })}>
                  <td className="mono monitor-row__place">{row.rankAge ?? '—'}</td>
                  <td colSpan={2}>
                    <button
                      type="button"
                      className="monitor-row__btn"
                      aria-label={`เปิด e-Slip BIB ${row.runner.bib}`}
                      onClick={() => onOpenSlip(row.runner.bib)}
                    >
                      <span className="mono">{row.runner.bib}</span>
                      <span>{row.runner.name}</span>
                    </button>
                  </td>
                  <td className="mono">{row.finishText}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {items.length > 0 && !isPodium && (
        <div className="monitor-feed-scroll">
          <table className="monitor-table">
            <thead>
              <tr>
                <th scope="col">เวลา</th>
                <th scope="col">จุดสแกน</th>
                <th scope="col">BIB</th>
                <th scope="col">ชื่อ</th>
              </tr>
            </thead>
            <tbody>
              {card.entries.map((entry) => {
                const isNew = recentIds.has(entry.id)
                return (
                  <tr key={entry.id} className={rowClasses({ rankAge: null, isNew })}>
                    <td className="mono">{fmtTime(entry.time)}</td>
                    <td>{entry.station}</td>
                    <td colSpan={2}>
                      <button
                        type="button"
                        className="monitor-row__btn"
                        aria-label={`เปิด e-Slip BIB ${entry.bib}`}
                        onClick={() => onOpenSlip(entry.bib)}
                      >
                        <span className="mono">{entry.bib}</span>
                        <span>{entry.name}</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default MonitorCard
