import { useMemo, useState } from 'react'
import ResultsFilterBar from '../components/results/ResultsFilterBar'
import ResultsTable from '../components/results/ResultsTable'
import { categoriesFromRunners, downloadCSV } from '../lib/raceData'
import {
  DEFAULT_GROUP_MODE,
  EMPTY_FILTER,
  buildResultsView,
  resultsCsv,
  resultsCsvFilename,
} from '../lib/results'

/**
 * Race results, grouped into award divisions (ระยะ × เพศ × รุ่นอายุ — the same
 * dimensions the registration form collects) and ranked by gun time within
 * each. Grouping is always at least by distance: a 33 km time is not
 * comparable to a 50 km one, so a single cross-distance list would make every
 * rank column misleading.
 * @param {{
 *   finishers: Array<import('../lib/raceData').Runner>,
 *   ranks: Record<string, { overall: number, gender: number, age: number }>,
 *   onOpenSlip: (bib: string) => void
 * }} props
 */
function ResultsPage({ finishers, ranks, onOpenSlip }) {
  const [filter, setFilter] = useState(EMPTY_FILTER)
  const [groupBy, setGroupBy] = useState(DEFAULT_GROUP_MODE)
  const categories = useMemo(() => categoriesFromRunners(finishers), [finishers])

  const view = useMemo(
    () => buildResultsView({ finishers, ranks, filter, groupBy }),
    [finishers, ranks, filter, groupBy],
  )

  function handleFilter(key, value) {
    setFilter((prev) => ({ ...prev, [key]: value }))
  }

  function clearFilter() {
    setFilter(EMPTY_FILTER)
  }

  function exportCSV() {
    downloadCSV(resultsCsvFilename(filter), resultsCsv(view))
  }

  return (
    <section aria-labelledby="results-heading">
      <header className="page-head">
        <span className="eyebrow">Report</span>
        <h1 id="results-heading">ผลการแข่งขัน</h1>
        <p>
          จัดอันดับจาก Total Time (Finish − Start เวลาปล่อยตัว) แยกรุ่นตามระยะ · เพศ · อายุ
          — เทียบเวลาข้ามระยะไม่ได้ อันดับทุกคอลัมน์จึงนับภายในระยะเดียวกัน
        </p>
      </header>

      <ResultsFilterBar
        filter={filter}
        groupBy={groupBy}
        view={view}
        categories={categories}
        onFilter={handleFilter}
        onGroupBy={setGroupBy}
        onClear={clearFilter}
        onExport={exportCSV}
      />

      <ResultsTable view={view} onOpenSlip={onOpenSlip} onClear={clearFilter} />
    </section>
  )
}

export default ResultsPage
