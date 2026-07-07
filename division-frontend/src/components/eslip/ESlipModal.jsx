import { CHECKPOINTS, fmtTime, fmtTotal } from '../../lib/raceData'
import Button from '../ui/Button'

/**
 * e-Slip receipt modal — per-runner provisional result with category ranks.
 * @param {{
 *   runner: import('../../lib/raceData').Runner | null,
 *   ranks: Record<string, { overall?: number, gender?: number, age?: number }>,
 *   onClose: () => void
 * }} props
 */
function ESlipModal({ runner, ranks, onClose }) {
  if (!runner) return null
  const rank = ranks[runner.bib] ?? {}

  return (
    <div
      className="modal-bg is-open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`e-Slip BIB ${runner.bib}`}
    >
      <div className="eslip">
        <div className="eslip__head">
          <div className="eslip__mark">TT</div>
          <b>TRAILTIME RACE RESULT</b>
          <span>*Provisional Result</span>
        </div>

        <div className="eslip__row"><span>Bib No</span><b>{runner.bib}</b></div>
        <div className="eslip__row"><span>Name</span><b>{runner.name}</b></div>
        <div className="eslip__row"><span>Gender</span><span>{runner.gender}</span></div>
        <div className="eslip__row"><span>Age Group</span><span>{runner.ageGroup}</span></div>
        <div className="eslip__row"><span>Nationality</span><span>{runner.nationality}</span></div>
        <div className="eslip__row"><span>Category</span><span>{runner.category}</span></div>

        <div className="eslip__hr" />
        <div className="eslip__row"><span>Check in</span><span>{fmtTime(runner.checkin)}</span></div>
        <div className="eslip__row"><span>Start</span><span>{fmtTime(runner.startTime)}</span></div>
        {CHECKPOINTS.filter((c) => runner.cps[c.id]).map((c) => (
          <div key={c.id} className="eslip__row"><span>{c.name}</span><span>{fmtTime(runner.cps[c.id])}</span></div>
        ))}
        <div className="eslip__row"><span>Finish Time</span><span>{fmtTime(runner.finish)}</span></div>
        <div className="eslip__row"><span>Total Time</span><b>{fmtTotal(runner)}</b></div>

        <div className="eslip__hr" />
        <div className="eslip__rank">Overall Rank : {rank.overall ?? '—'}</div>
        <div className="eslip__row"><span>Gender Rank</span><span>{rank.gender ?? '—'}</span></div>
        <div className="eslip__row"><span>Age Group Rank</span><span>{rank.age ?? '—'}</span></div>

        <div className="eslip__foot">Timing System · TrailTime<br />Monitor / Tablet / Mobile / Web-site</div>

        <div className="eslip__actions">
          <Button variant="secondary" onClick={onClose}>ปิด</Button>
          <Button onClick={() => window.print()}>พิมพ์ e-Slip</Button>
        </div>
      </div>
    </div>
  )
}

export default ESlipModal
