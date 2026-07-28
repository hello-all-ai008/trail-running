import { useMemo, useState } from 'react'
import Button from '../components/ui/Button'
import MonitorCard from '../components/monitor/MonitorCard'
import MonitorFilterBar from '../components/monitor/MonitorFilterBar'
import { useRecentArrivals } from '../hooks/useRecentArrivals'
import { buildMonitorFeed, buildMonitorOverall, buildMonitorPodium } from '../lib/monitor'
import { EMPTY_FILTER } from '../lib/results'

/**
 * Live award-division board: top-5 podium per division or a recent-scan
 * feed, switched by a page-level view toggle that shares one filter bar and
 * one card grid. Real-time comes free from useRaceState's own re-renders on
 * every scan — no polling, no clock added here.
 * @param {{
 *   runners: Array<import('../lib/raceData').Runner>,
 *   finishers: Array<import('../lib/raceData').Runner>,
 *   ranks: Record<string, { overall: number, gender: number, age: number }>,
 *   scanLog: Array<import('../lib/raceEngine').LogEntry>,
 *   onOpenSlip: (bib: string) => void
 * }} props
 */
function MonitorPage({ runners, finishers, ranks, scanLog, onOpenSlip }) {
  const [filter, setFilter] = useState(EMPTY_FILTER)
  const [viewMode, setViewMode] = useState('podium')

  const podiumView = useMemo(
    () => buildMonitorPodium({ finishers, ranks, filter }),
    [finishers, ranks, filter],
  )
  const feedView = useMemo(
    () => buildMonitorFeed({ runners, scanLog, filter }),
    [runners, scanLog, filter],
  )
  const overallView = useMemo(
    () => buildMonitorOverall({ finishers, ranks, filter }),
    [finishers, ranks, filter],
  )
  const activeView = viewMode === 'podium' ? podiumView : feedView

  const idsThisRender = useMemo(
    () =>
      viewMode === 'podium'
        ? activeView.cards.flatMap((card) => card.rows.map((row) => row.runner.bib))
        : activeView.cards.flatMap((card) => card.entries.map((entry) => entry.id)),
    [activeView, viewMode],
  )
  // scope = viewMode: podium and feed use incompatible id formats, so
  // switching views must re-baseline instead of diffing one format against
  // the other (which would flash every row in the newly-shown view).
  const recentIds = useRecentArrivals(idsThisRender, viewMode)

  function handleFilter(key, value) {
    setFilter((prev) => ({ ...prev, [key]: value }))
  }

  function clearFilter() {
    setFilter(EMPTY_FILTER)
  }

  // "No data at all" vs "filtered to nothing" needs a filter-independent
  // signal. Podium already exposes totalFinishers (unaffected by filter).
  // Feed has no such field, so the equivalent check is: unfiltered and still
  // zero cards — that can only happen when there is no accepted scan yet.
  const hasNoData =
    viewMode === 'podium' ? podiumView.totalFinishers === 0 : !feedView.isFiltered && feedView.cards.length === 0

  return (
    <section aria-labelledby="monitor-heading">
      <header className="page-head">
        <span className="eyebrow">Live</span>
        <h1 id="monitor-heading">Live Monitor</h1>
        <p>ติดตามอันดับและความเคลื่อนไหวการเข้าเส้นชัยแบบเรียลไทม์ แยกตามระยะ เพศ และรุ่นอายุ</p>
      </header>

      <MonitorFilterBar
        filter={filter}
        viewMode={viewMode}
        view={activeView}
        onFilter={handleFilter}
        onViewMode={setViewMode}
        onClear={clearFilter}
      />

      {viewMode === 'podium' && overallView.cards.length > 0 && (
        <section className="monitor-overall" aria-labelledby="monitor-overall-heading">
          <span className="eyebrow" id="monitor-overall-heading">ภาพรวมแยกระยะ</span>
          <div className="monitor-overall-grid">
            {overallView.cards.map((card) => (
              <MonitorCard key={card.key} card={card} mode="overall" recentIds={recentIds} onOpenSlip={onOpenSlip} />
            ))}
          </div>
        </section>
      )}

      {activeView.cards.length === 0 ? (
        <div className="glass-panel empty">
          {hasNoData ? (
            viewMode === 'podium' ? 'ยังไม่มีผู้เข้าเส้นชัย' : 'ยังไม่มีการสแกน'
          ) : (
            <>
              ไม่พบข้อมูลตามตัวกรองที่เลือก{' '}
              <Button variant="secondary" className="btn-sm" onClick={clearFilter}>ล้างตัวกรอง</Button>
            </>
          )}
        </div>
      ) : (
        <div className="monitor-grid">
          {activeView.cards.map((card) => (
            <MonitorCard key={card.key} card={card} mode={viewMode} recentIds={recentIds} onOpenSlip={onOpenSlip} />
          ))}
        </div>
      )}
    </section>
  )
}

export default MonitorPage
