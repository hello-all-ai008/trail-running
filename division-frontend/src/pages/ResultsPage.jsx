import { useMemo, useState } from 'react'
import Button from '../components/ui/Button'
import { CATEGORIES, fmtTime, fmtTotal, downloadCSV } from '../lib/raceData'

const GENDER_TH = { Male: 'ชาย', Female: 'หญิง' }

/**
 * Race results — rank within category by gun time (Finish − Start),
 * matching the real event's Excel. Filters + e-Slip + CSV export.
 * @param {{
 *   finishers: Array<import('../lib/raceData').Runner>,
 *   ranks: Record<string, { overall?: number }>,
 *   onOpenSlip: (bib: string) => void
 * }} props
 */
function ResultsPage({ finishers, ranks, onOpenSlip }) {
  const [category, setCategory] = useState('')
  const [gender, setGender] = useState('')

  const rows = useMemo(
    () => finishers.filter((r) => (!category || r.category === category) && (!gender || r.gender === gender)),
    [finishers, category, gender],
  )

  function exportCSV() {
    const head = 'Rank,BIB,Name,Category,Gender,Start,Finish,TotalTime\n'
    const body = rows
      .map((r) =>
        [ranks[r.bib]?.overall ?? '', r.bib, r.name, r.category, r.gender, fmtTime(r.startTime), fmtTime(r.finish), fmtTotal(r)].join(','),
      )
      .join('\n')
    downloadCSV('race-results.csv', head + body)
  }

  return (
    <section aria-labelledby="results-heading">
      <header className="page-head">
        <span className="eyebrow">Report</span>
        <h1 id="results-heading">ผลการแข่งขัน</h1>
        <p>จัดอันดับจาก Total Time (Finish − Start เวลาปล่อยตัว) แยกตามระยะ · กดดู e-Slip รายบุคคล</p>
      </header>

      <div className="toolbar">
        <select className="search search--select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter category">
          <option value="">ทุกระยะ</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className="search search--select" value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Filter gender">
          <option value="">ทุกเพศ</option>
          <option value="Male">ชาย</option>
          <option value="Female">หญิง</option>
          <option value="LGBTIQAN+">LGBTIQAN+</option>
        </select>
        <Button onClick={exportCSV}>Export ผลการแข่งขัน (CSV)</Button>
      </div>

      <div className="glass-panel table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>อันดับ (ระยะ)</th>
              <th>BIB</th>
              <th>ชื่อ-นามสกุล</th>
              <th>ระยะ</th>
              <th>เพศ</th>
              <th>Start</th>
              <th>Finish</th>
              <th>Total Time</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={9} className="empty">ยังไม่มีผู้เข้าเส้นชัยตามเงื่อนไขที่เลือก</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.bib}>
                  <td className="mono data-table__rank"><b>{ranks[r.bib]?.overall ?? '—'}</b></td>
                  <td className="mono"><b>{r.bib}</b></td>
                  <td>{r.name}</td>
                  <td className="mono">{r.category}</td>
                  <td>{GENDER_TH[r.gender] ?? r.gender}</td>
                  <td className="mono">{fmtTime(r.startTime)}</td>
                  <td className="mono">{fmtTime(r.finish)}</td>
                  <td className="mono data-table__total"><b>{fmtTotal(r)}</b></td>
                  <td>
                    <Button variant="secondary" className="btn-sm" onClick={() => onOpenSlip(r.bib)}>
                      e-Slip
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default ResultsPage
