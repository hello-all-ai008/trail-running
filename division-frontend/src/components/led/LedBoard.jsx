import { useEffect, useRef } from 'react'
import { fmtTime, fmtDur } from '../../lib/raceData'

/**
 * Signature LED race board — dark panel, amber mono type, scanline texture,
 * flash animation on each scan. The "designed device" focal object of every
 * scan station, sitting inside the glass layout.
 *
 * @param {{ result: import('../../lib/raceEngine').ScanResult | undefined }} props
 */
function LedBoard({ result }) {
  const ref = useRef(null)

  // retrigger flash animation on every new scan
  useEffect(() => {
    const el = ref.current
    if (!el || !result) return
    el.classList.remove('led--flash-ok', 'led--flash-warn')
    // force reflow so the same animation can replay
    void el.offsetWidth
    el.classList.add(result.outcome === 'ok' ? 'led--flash-ok' : 'led--flash-warn')
  }, [result])

  return (
    <div>
      <div ref={ref} className="led" role="status" aria-live="polite">
        {!result ? (
          <div className="led__idle">— รอการสแกน —</div>
        ) : result.outcome === 'not-found' ? (
          <>
            <div className="led__bib">?</div>
            <div className="led__warn">NOT FOUND · ไม่พบในระบบ</div>
          </>
        ) : (
          <>
            <div className="led__bib">{result.runner.bib}</div>
            <div className="led__name">{result.runner.name.toUpperCase()}</div>
            <div className="led__meta">
              {result.runner.nationality} · {result.runner.ageGroup} · {result.runner.category}
            </div>
            {result.outcome === 'ok' && result.station === 'Finish' ? (
              <>
                <div className="led__time">Finish : {fmtTime(result.time)}</div>
                <div className="led__meta">Total Time {fmtDur(result.runner.startTime, result.runner.finish)}</div>
              </>
            ) : result.outcome === 'ok' ? (
              <div className="led__time">
                {result.station} : {fmtTime(result.time)}
              </div>
            ) : result.outcome === 'duplicate' ? (
              <div className="led__warn">
                Already scanned
                {result.station === 'Finish'
                  ? ` : ${fmtTime(result.runner.finish)}`
                  : result.station === 'Check-in'
                    ? ` : ${fmtTime(result.runner.checkin)}`
                    : ''}
              </div>
            ) : (
              <div className="led__warn">ยังไม่ได้ Check-in ที่จุดสตาร์ท</div>
            )}
          </>
        )}
      </div>
      <p className="led__caption">แสดงผลบน Monitor / Tablet / Mobile</p>
    </div>
  )
}

export default LedBoard
