import Button from '../ui/Button'
import ChipGroup from '../ui/ChipGroup'
import { AGE_GROUPS, CATEGORIES, GENDERS, UNSPECIFIED_LABEL, ageGroupLabel, genderLabel } from '../../lib/raceData'
import { ANY, FILTER_UNSPECIFIED } from '../../lib/results'

const VIEW_MODES = [
  { value: 'podium', label: 'อันดับ 1-5' },
  { value: 'feed', label: 'สแกนล่าสุด' },
]

/**
 * Sum of `card.total` across every card — the pre-slice matched count for
 * podium (badge counts, not the on-screen top-5 rows) and the unsliced scan
 * count for feed. Both already come from monitor.js, never recomputed here.
 * @param {{ cards: Array<{ total: number }> }} view
 * @returns {number}
 */
function matchedCount(view) {
  return view.cards.reduce((sum, card) => sum + card.total, 0)
}

/**
 * @param {'podium'|'feed'} viewMode
 * @param {import('../../lib/monitor').MonitorCardData|import('../../lib/monitor').MonitorFeedCard} view
 * @returns {string}
 */
function summaryText(viewMode, view) {
  const shown = matchedCount(view)
  if (viewMode === 'podium') {
    return `แสดง ${shown} จาก ${view.totalFinishers} คน · ${view.cardCount} รุ่น`
  }
  return `${shown} รายการล่าสุด · ${view.cardCount} รุ่นที่มีความเคลื่อนไหว`
}

/**
 * Filter bar for the Live Monitor page: same division filters as Results
 * (ระยะ / เพศ / รุ่นอายุ), no group-by or export — the card grid is always at
 * full division depth. The podium/feed view toggle sits first since it
 * changes what every card on the page means.
 * @param {{
 *   filter: { category: string, gender: string, ageGroup: string },
 *   viewMode: 'podium'|'feed',
 *   view: import('../../lib/monitor').MonitorCardData|import('../../lib/monitor').MonitorFeedCard,
 *   onFilter: (key: string, value: string) => void,
 *   onViewMode: (mode: 'podium'|'feed') => void,
 *   onClear: () => void
 * }} props
 */
function MonitorFilterBar({ filter, viewMode, view, onFilter, onViewMode, onClear }) {
  return (
    <>
      <div className="monitor-view-toggle scan-mode-toggle" role="group" aria-label="มุมมอง">
        {VIEW_MODES.map((mode) => (
          <button
            key={mode.value}
            type="button"
            className={`btn btn-sm ${viewMode === mode.value ? 'btn-accent' : 'btn-secondary'}`}
            aria-pressed={viewMode === mode.value}
            onClick={() => onViewMode(mode.value)}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <ChipGroup
          id="monitor-filter-category-legend"
          legend="ระยะ"
          allLabel="ทุกระยะ"
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          value={filter.category}
          onSelect={(v) => onFilter('category', v)}
        />

        <ChipGroup
          id="monitor-filter-gender-legend"
          legend="เพศ"
          allLabel="ทุกเพศ"
          options={GENDERS.map((g) => ({ value: g, label: genderLabel(g) }))}
          value={filter.gender}
          onSelect={(v) => onFilter('gender', v)}
        />

        <div className="filter-bar__group">
          <span className="filter-bar__legend" id="monitor-filter-age-legend">รุ่นอายุ</span>
          <select
            className="search search--select"
            value={filter.ageGroup}
            onChange={(e) => onFilter('ageGroup', e.target.value)}
            aria-labelledby="monitor-filter-age-legend"
          >
            <option value={ANY}>ทุกรุ่น</option>
            {AGE_GROUPS.map((a) => (
              <option key={a} value={a}>{ageGroupLabel(a)}</option>
            ))}
            <option value={FILTER_UNSPECIFIED}>{UNSPECIFIED_LABEL}</option>
          </select>
        </div>

        <div className="filter-bar__actions">
          {view.isFiltered && (
            <Button variant="secondary" className="btn-sm" onClick={onClear}>ล้างตัวกรอง</Button>
          )}
        </div>
      </div>

      {/* role="status" already implies aria-live="polite" — this bar's only live region. */}
      <p className="results-summary" role="status">
        <span>{summaryText(viewMode, view)}</span>
        {view.isFiltered && (
          <>
            <span className="results-summary__sep">·</span>
            <span>
              กรอง:{' '}
              {view.activeFilters.map((f, i) => (
                <span key={f.key}>
                  {i > 0 && ' · '}
                  <span className="results-summary__filter">{f.label}</span>
                </span>
              ))}
            </span>
          </>
        )}
      </p>
    </>
  )
}

export default MonitorFilterBar
