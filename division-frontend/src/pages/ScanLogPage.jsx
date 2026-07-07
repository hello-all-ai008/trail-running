import { fmtTime } from '../lib/raceData'

const LOG_LIMIT = 120

/**
 * Full scan audit trail — every scan at every station, ok or rejected,
 * newest first. Dispute-resolution surface for race day.
 * @param {{ scanLog: Array<import('../lib/raceEngine').LogEntry> }} props
 */
function ScanLogPage({ scanLog }) {
  const rows = scanLog.slice(0, LOG_LIMIT)

  return (
    <section aria-labelledby="log-heading">
      <header className="page-head">
        <span className="eyebrow">Audit</span>
        <h1 id="log-heading">Scan Log</h1>
        <p>ประวัติการสแกนทั้งหมดทุกจุด เรียงจากล่าสุด — ใช้ตรวจสอบย้อนหลังกรณีมีข้อโต้แย้ง</p>
      </header>

      <div className="glass-panel table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>เวลา</th><th>จุดสแกน</th><th>BIB</th><th>ชื่อ</th><th>ผลลัพธ์</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="empty">ยังไม่มีประวัติ</td></tr>
            ) : (
              rows.map((entry, i) => (
                <tr key={`${entry.time}-${entry.bib}-${i}`}>
                  <td className="mono">{fmtTime(entry.time)}</td>
                  <td>{entry.station}</td>
                  <td className="mono"><b>{entry.bib}</b></td>
                  <td>{entry.name}</td>
                  <td>
                    {entry.ok ? (
                      <span className="scan-ok">✓ บันทึกแล้ว</span>
                    ) : (
                      <span className="scan-bad">✕ {entry.msg || 'ไม่พบ'}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="note">
        💡 เวอร์ชันตัวอย่างนี้เก็บข้อมูลใน localStorage ของเบราว์เซอร์ — ระบบจริงต้องต่อฐานข้อมูลกลาง
        (เช่น Supabase/PostgreSQL) เพื่อให้ทุกจุดสแกนซิงก์ข้อมูลถึงกันแบบเรียลไทม์
      </p>
    </section>
  )
}

export default ScanLogPage
