import Button from '../ui/Button'
import ChipGroup from '../ui/ChipGroup'
import { AGE_GROUPS, CATEGORIES, GENDERS, UNSPECIFIED_LABEL, ageGroupLabel, genderLabel } from '../../lib/raceData'
import { FILTER_UNSPECIFIED, GROUP_MODES } from '../../lib/results'

const GROUP_MODE_TH = {
  category: 'ระยะ',
  'category+gender': 'ระยะ + เพศ',
  'category+gender+age': 'ระยะ + เพศ + รุ่น',
}

const AGE_OPTIONS = [
  ...AGE_GROUPS.map((a) => ({ value: a, label: ageGroupLabel(a) })),
  { value: FILTER_UNSPECIFIED, label: UNSPECIFIED_LABEL },
]

/**
 * Division filters for the results page: distance + gender as chip strips
 * (small, high-traffic sets), age brackets as multi-select chips, group-by
 * and export stay select/button.
 * @param {{
 *   filter: { category: string, gender: string, ageGroups: string[], query: string },
 *   groupBy: string,
 *   view: import('../../lib/results').ResultsView,
 *   onFilter: (key: string, value: unknown) => void,
 *   onGroupBy: (mode: string) => void,
 *   onClear: () => void,
 *   onExport: () => void
 * }} props
 */
function ResultsFilterBar({ filter, groupBy, view, onFilter, onGroupBy, onClear, onExport }) {
  return (
    <>
      <div className="filter-bar">
        <input
          type="search"
          className="search"
          placeholder="ค้นหา BIB หรือชื่อ-นามสกุล…"
          value={filter.query}
          onChange={(e) => onFilter('query', e.target.value)}
          aria-label="ค้นหานักวิ่ง"
        />

        <ChipGroup
          id="filter-category-legend"
          legend="ระยะ"
          allLabel="ทุกระยะ"
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          value={filter.category}
          onSelect={(v) => onFilter('category', v)}
        />

        <ChipGroup
          id="filter-gender-legend"
          legend="เพศ"
          allLabel="ทุกเพศ"
          options={GENDERS.map((g) => ({ value: g, label: genderLabel(g) }))}
          value={filter.gender}
          onSelect={(v) => onFilter('gender', v)}
        />

        <ChipGroup
          multiSelect
          id="filter-age-legend"
          legend="รุ่นอายุ"
          allLabel="ทุกรุ่น"
          options={AGE_OPTIONS}
          value={filter.ageGroups}
          onSelect={(next) => onFilter('ageGroups', next)}
        />

        <div className="filter-bar__group">
          <span className="filter-bar__legend" id="filter-group-legend">แยกกลุ่มตาม</span>
          <select
            className="search search--select"
            value={groupBy}
            onChange={(e) => onGroupBy(e.target.value)}
            aria-labelledby="filter-group-legend"
          >
            {GROUP_MODES.map((m) => (
              <option key={m} value={m}>{GROUP_MODE_TH[m]}</option>
            ))}
          </select>
        </div>

        <div className="filter-bar__actions">
          {view.isFiltered && (
            <Button variant="secondary" className="btn-sm" onClick={onClear}>ล้างตัวกรอง</Button>
          )}
          <Button onClick={onExport}>Export CSV</Button>
        </div>
      </div>

      {/* role="status" already implies aria-live="polite" — this is the page's
          only live region, so filter changes announce here and nowhere else. */}
      <p className="results-summary" role="status">
        <span>
          แสดง <span className="results-summary__count">{view.total}</span> จาก {view.totalUnfiltered} คน
        </span>
        <span className="results-summary__sep">·</span>
        <span>{view.groupCount} กลุ่ม</span>
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

export default ResultsFilterBar
