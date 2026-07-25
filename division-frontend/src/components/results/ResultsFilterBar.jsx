import Button from '../ui/Button'
import { AGE_GROUPS, CATEGORIES, GENDERS, UNSPECIFIED_LABEL, ageGroupLabel, genderLabel } from '../../lib/raceData'
import { ANY, FILTER_UNSPECIFIED, GROUP_MODES } from '../../lib/results'

const GROUP_MODE_TH = {
  category: 'ระยะ',
  'category+gender': 'ระยะ + เพศ',
  'category+gender+age': 'ระยะ + เพศ + รุ่น',
}

/**
 * A one-tap toggle strip for a small dimension. Raw <button> rather than the
 * Button primitive: Button intentionally spreads no rest props, so it cannot
 * carry aria-pressed — same trade-off as the scan-mode toggle in StationPage.
 * @param {{
 *   id: string,
 *   legend: string,
 *   allLabel: string,
 *   options: Array<{ value: string, label: string }>,
 *   value: string,
 *   onSelect: (value: string) => void
 * }} props
 */
function ChipGroup({ id, legend, allLabel, options, value, onSelect }) {
  const chips = [{ value: ANY, label: allLabel }, ...options]

  return (
    <div className="filter-bar__group">
      <span className="filter-bar__legend" id={id}>{legend}</span>
      <div className="filter-bar__options" role="group" aria-labelledby={id}>
        {chips.map((chip) => {
          const isOn = value === chip.value
          return (
            <button
              key={chip.value || '__any__'}
              type="button"
              className={`btn btn-sm filter-chip ${isOn ? 'btn-accent' : 'btn-secondary'}`}
              aria-pressed={isOn}
              onClick={() => onSelect(chip.value)}
            >
              {chip.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Division filters for the results page: distance + gender as chip strips
 * (small, high-traffic sets), age bracket and grouping depth as selects.
 * @param {{
 *   filter: { category: string, gender: string, ageGroup: string },
 *   groupBy: string,
 *   view: import('../../lib/results').ResultsView,
 *   onFilter: (key: string, value: string) => void,
 *   onGroupBy: (mode: string) => void,
 *   onClear: () => void,
 *   onExport: () => void
 * }} props
 */
function ResultsFilterBar({ filter, groupBy, view, onFilter, onGroupBy, onClear, onExport }) {
  return (
    <>
      <div className="filter-bar">
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

        <div className="filter-bar__group">
          <span className="filter-bar__legend" id="filter-age-legend">รุ่นอายุ</span>
          <select
            className="search search--select"
            value={filter.ageGroup}
            onChange={(e) => onFilter('ageGroup', e.target.value)}
            aria-labelledby="filter-age-legend"
          >
            <option value={ANY}>ทุกรุ่น</option>
            {AGE_GROUPS.map((a) => (
              <option key={a} value={a}>{ageGroupLabel(a)}</option>
            ))}
            <option value={FILTER_UNSPECIFIED}>{UNSPECIFIED_LABEL}</option>
          </select>
        </div>

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
