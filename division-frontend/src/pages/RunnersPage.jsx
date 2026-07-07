import { useMemo, useState } from 'react'
import Button from '../components/ui/Button'
import StatusBadge from '../components/ui/StatusBadge'
import { CATEGORIES, fmtTime, statusOf, downloadCSV } from '../lib/raceData'

const GENDER_TH = { Male: 'ชาย', Female: 'หญิง' }

/**
 * Runner database — real entrants imported from Timing System.xlsx.
 * Search by BIB/name, filter by category, export CSV.
 * @param {{ runners: Array<import('../lib/raceData').Runner> }} props
 */
function RunnersPage({ runners }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return runners.filter(
      (r) =>
        (!category || r.category === category) &&
        (!q || r.bib.includes(q) || r.name.toLowerCase().includes(q)),
    )
  }, [runners, query, category])

  function exportCSV() {
    const head = 'BIB,Name,Gender,AgeGroup,Category,Checkin,Finish,Status\n'
    const body = rows
      .map((r) =>
        [r.bib, r.name, r.gender, r.ageGroup, r.category, fmtTime(r.checkin), fmtTime(r.finish), statusOf(r).label].join(','),
      )
      .join('\n')
    downloadCSV('runners.csv', head + body)
  }

  return (
    <section aria-labelledby="runners-heading">
      <header className="page-head">
        <span className="eyebrow">Database</span>
        <h1 id="runners-heading">รายชื่อนักวิ่ง</h1>
        <p>ฐานข้อมูลผู้สมัคร (นำเข้าจากไฟล์ Excel งานจริง) — ค้นหาจาก BIB หรือชื่อเพื่อตรวจสอบสถานะ</p>
      </header>

      <div className="toolbar">
        <input
          className="search"
          placeholder="ค้นหา BIB, ชื่อ-นามสกุล…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search runners"
        />
        <select className="search search--select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter category">
          <option value="">ทุกระยะ</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <Button variant="secondary" onClick={exportCSV}>Export CSV</Button>
      </div>

      <div className="glass-panel table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>BIB</th>
              <th>ชื่อ-นามสกุล</th>
              <th>เพศ</th>
              <th>Age Group</th>
              <th>ระยะ</th>
              <th>Check-in</th>
              <th>Finish</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="empty">ไม่พบข้อมูล</td></tr>
            ) : (
              rows.map((r) => {
                const s = statusOf(r)
                return (
                  <tr key={r.bib}>
                    <td className="mono"><b>{r.bib}</b></td>
                    <td>{r.name}</td>
                    <td>{GENDER_TH[r.gender] ?? r.gender}</td>
                    <td className="mono">{r.ageGroup}</td>
                    <td className="mono">{r.category}</td>
                    <td className="mono">{fmtTime(r.checkin)}</td>
                    <td className="mono">{fmtTime(r.finish)}</td>
                    <td><StatusBadge statusKey={s.key} label={s.label} /></td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default RunnersPage
