import GlassCard from '../components/ui/GlassCard'
import { CHECKPOINTS, categoriesFromRunners, fmtTotal } from '../lib/raceData'

/**
 * Live overview: stat tiles, per-category progress bars, runner-flow nodes,
 * latest finishers — mockup_2's dashboard in glass.
 * @param {{
 *   runners: Array<import('../lib/raceData').Runner>,
 *   stats: { total: number, checkedIn: number, onCourse: number, finished: number, checkedInPct: number, finishedPct: number },
 *   finishers: Array<import('../lib/raceData').Runner>
 * }} props
 */
function DashboardPage({ runners, stats, finishers }) {
  const categories = categoriesFromRunners(runners)

  const tiles = [
    { label: 'ผู้สมัครทั้งหมด', value: stats.total, hint: 'Registered runners', accent: 'forest' },
    { label: 'Check-in แล้ว', value: stats.checkedIn, hint: `${stats.checkedInPct}% ของผู้สมัคร`, accent: 'var(--station-start)' },
    { label: 'อยู่ในเส้นทาง', value: stats.onCourse, hint: 'On course', accent: 'var(--station-cp)' },
    { label: 'เข้าเส้นชัย', value: stats.finished, hint: `${stats.finishedPct}% ของผู้เริ่มวิ่ง`, accent: 'var(--station-finish)' },
  ]

  const flow = [
    { label: 'Start', count: stats.checkedIn, color: 'var(--station-start)' },
    ...CHECKPOINTS.map((c) => ({
      label: c.id,
      count: runners.filter((r) => r.cps[c.id]).length,
      color: 'var(--station-cp)',
    })),
    { label: 'Finish', count: stats.finished, color: 'var(--station-finish)' },
  ]

  const latest = finishers
    .slice()
    .sort((a, b) => new Date(b.finish) - new Date(a.finish))
    .slice(0, 5)

  return (
    <section className="dashboard-page" aria-labelledby="dashboard-heading">
      <header className="page-head">
        <span className="eyebrow">Live Overview</span>
        <h1 id="dashboard-heading">แดชบอร์ด</h1>
        <p>สรุปสถานะการแข่งขันแบบเรียลไทม์ อัปเดตทันทีเมื่อมีการสแกน</p>
      </header>

      <div className="stats-grid">
        {tiles.map((t) => (
          <GlassCard key={t.label} label={t.label} value={String(t.value)} accent={t.accent} hint={t.hint} />
        ))}
      </div>

      <div className="dash-grid">
        <div className="glass-panel panel">
          <div className="panel__head"><h2>Progress by Category</h2></div>
          <div className="panel__body">
            {categories.map((cat) => {
              const group = runners.filter((r) => r.category === cat)
              const done = group.filter((r) => r.finish).length
              const pct = group.length ? Math.round((done / group.length) * 100) : 0
              return (
                <div key={cat} className="bar-row">
                  <b className="bar-row__label">{cat}</b>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="bar-row__count">{done}/{group.length} จบ</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="glass-panel panel">
          <div className="panel__head"><h2>Runner Flow</h2></div>
          <div className="panel__body">
            <div className="cp-flow">
              {flow.map((f) => (
                <div key={f.label} className="cp-node">
                  <span className="eyebrow" style={{ color: f.color }}>{f.label}</span>
                  <div className="cp-node__num">{f.count}</div>
                </div>
              ))}
            </div>

            <span className="eyebrow cp-flow__latest-head">Latest Finishers</span>
            {latest.length === 0 ? (
              <p className="empty">ยังไม่มีผู้เข้าเส้นชัย</p>
            ) : (
              <ul className="latest-list">
                {latest.map((r) => (
                  <li key={r.bib}>
                    <span>
                      <b className="mono">{r.bib}</b> · {r.name}{' '}
                      <span className="latest-list__cat">({r.category})</span>
                    </span>
                    <span className="mono latest-list__time">{fmtTotal(r)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default DashboardPage
