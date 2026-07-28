import { fmtTime } from '../../lib/raceData'
import { OVERALL_TOP_N } from '../../lib/monitor'

/** Turn a division key ('MKT33|Male|20-39') into a valid DOM id fragment. */
function slug(key) {
  return key.replace(/[^A-Za-z0-9]+/g, '-')
}

/**
 * How many of the shown places get medal-accent styling. Deliberately its own
 * constant, not OVERALL_TOP_N: this is a display choice about the podium's
 * top-5 award list (gold/silver/bronze on 1-3 of 5), unrelated to how many
 * finishers get excluded as overall winners. The two happen to both be 3
 * today — they must not be merged, or a future change to OVERALL_TOP_N would
 * silently widen podium medal coloring to match.
 */
const MEDAL_PLACES = 3

/** Row class: medal accent for the top MEDAL_PLACES (by the mode's own place number) + arrival flash. */
function rowClasses({ place, isNew }) {
  const classes = []
  if (isNew) classes.push('monitor-row--new')
  if (place != null && place <= MEDAL_PLACES) classes.push(`monitor-row--${place}`)
  return classes.join(' ') || undefined
}

function badgeText(mode, card) {
  if (mode === 'overall') return `TOP ${OVERALL_TOP_N} ภาพรวม`
  if (mode === 'feed') return `${card.total} ล่าสุด`
  return `จบ ${card.total} คน`
}

/**
 * One division card: top-5 podium (award-eligible only), the Overall Top-3
 * cross-gender/age card, or a recent-scan feed — picked by `mode`.
 *
 * Podium's place number is `row.awardRank`, not `row.rankAge` — award rank
 * excludes anyone who placed overall top-3 in their distance (see monitor.js
 * buildMonitorPodium), a Monitor-only concept that intentionally does not
 * touch rankAge/"อันดับรุ่น" on the Results page or the e-Slip.
 *
 * BIB + name share one clickable cell so the whole runner identity opens the
 * e-Slip with a single keyboard-reachable control, rather than one button per
 * column (place/time stay plain cells; only clicking the name matters).
 * @param {{
 *   card: import('../../lib/monitor').MonitorCardData
 *     | import('../../lib/monitor').MonitorFeedCard
 *     | import('../../lib/monitor').MonitorOverallCard,
 *   mode: 'podium' | 'feed' | 'overall',
 *   recentIds: Set<string>,
 *   onOpenSlip: (bib: string) => void
 * }} props
 */
function MonitorCard({ card, mode, recentIds, onOpenSlip }) {
  const isPodium = mode === 'podium'
  const isOverall = mode === 'overall'
  const isFeed = mode === 'feed'
  const items = isFeed ? card.entries : card.rows
  const headingId = `monitor-card-${slug(card.key)}`

  return (
    <section
      className={`glass-panel monitor-card${isOverall ? ' monitor-card--overall' : ''}`}
      aria-labelledby={headingId}
    >
      <header className="monitor-card__head">
        <h3 id={headingId}>{card.label}</h3>
        <span className="monitor-card__badge">{badgeText(mode, card)}</span>
      </header>

      {isPodium && card.exemptCount > 0 && (
        <p className="monitor-card__subnote">ตัดสิทธิ์ {card.exemptCount} คน (ติด Overall)</p>
      )}

      {isPodium && items.length === 0 && (
        <p className="empty">ผู้เข้าเส้นชัยทั้งหมดติด Overall — ไม่มีผู้มีสิทธิ์รับรางวัลรุ่นนี้</p>
      )}

      {(isPodium || isOverall) && items.length > 0 && (
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
            {items.map((row) => {
              const place = isOverall ? row.rankCategory : row.awardRank
              const isNew = !isOverall && recentIds.has(row.runner.bib)
              return (
                <tr key={row.runner.bib} className={rowClasses({ place, isNew })}>
                  <td className="mono monitor-row__place">{place ?? '—'}</td>
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

      {isFeed && items.length > 0 && (
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
                  <tr key={entry.id} className={rowClasses({ place: null, isNew })}>
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
