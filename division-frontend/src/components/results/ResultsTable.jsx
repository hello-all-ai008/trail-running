import Button from '../ui/Button'

const COLUMN_COUNT = 11

const RANK_COLUMNS = [
  { key: 'rankCategory', label: 'อันดับระยะ' },
  { key: 'rankGender', label: 'อันดับเพศ' },
  { key: 'rankAge', label: 'อันดับรุ่น' },
]

/** Emphasis follows the grouping depth; column order never moves. */
function rankClass(key, primaryRankKey) {
  return key === primaryRankKey ? 'rank--primary' : 'rank--muted'
}

/**
 * Results grouped into award divisions — one <tbody> per division, led by a
 * row-group header. Ranks are always field-wide, never renumbered per filter.
 *
 * Deliberately no per-cell `headers` attributes: 11 × ~100 attributes for
 * partial screen-reader support is not a worthwhile trade. The row-group
 * header plus scope="col" on the column headers carries the structure.
 * @param {{
 *   view: import('../../lib/results').ResultsView,
 *   onOpenSlip: (bib: string) => void,
 *   onClear: () => void
 * }} props
 */
function ResultsTable({ view, onOpenSlip, onClear }) {
  const { groups, primaryRankKey } = view
  const hasNoFinishers = view.totalUnfiltered === 0

  return (
    <div className="glass-panel table-wrap results-wrap">
      <table className="data-table results-table">
        <caption className="sr-only">ผลการแข่งขัน แยกตามระยะ เพศ และรุ่นอายุ</caption>
        <thead>
          <tr>
            {RANK_COLUMNS.map((col) => (
              <th key={col.key} scope="col" className={rankClass(col.key, primaryRankKey)}>
                {col.label}
              </th>
            ))}
            <th scope="col" className="col-bib">BIB</th>
            <th scope="col" className="col-name">ชื่อ-นามสกุล</th>
            <th scope="col" className="col-gender">เพศ</th>
            <th scope="col" className="col-age">รุ่น</th>
            <th scope="col" className="col-start">Start</th>
            <th scope="col" className="col-finish">Finish</th>
            <th scope="col" className="col-total">Total Time</th>
            <th scope="col" className="col-slip"><span className="sr-only">e-Slip</span></th>
          </tr>
        </thead>

        {groups.length === 0 ? (
          <tbody>
            <tr>
              <td colSpan={COLUMN_COUNT} className="empty">
                {hasNoFinishers ? (
                  'ยังไม่มีผู้เข้าเส้นชัย'
                ) : (
                  <>
                    ไม่พบผู้เข้าเส้นชัยตามตัวกรองที่เลือก{' '}
                    <Button variant="secondary" className="btn-sm" onClick={onClear}>ล้างตัวกรอง</Button>
                  </>
                )}
              </td>
            </tr>
          </tbody>
        ) : (
          groups.map((group) => (
            <tbody key={group.key} className="results-group">
              <tr className="results-group__head">
                <th scope="rowgroup" colSpan={COLUMN_COUNT}>
                  <span className="results-group__label">
                    {group.label}
                    <span className="results-group__count">{group.count} คน</span>
                  </span>
                </th>
              </tr>
              {group.rows.map((row) => (
                <tr key={row.runner.bib}>
                  {RANK_COLUMNS.map((col) => (
                    <td key={col.key} className={`mono ${rankClass(col.key, primaryRankKey)}`}>
                      {row[col.key] ?? '—'}
                    </td>
                  ))}
                  <td className="mono col-bib"><b>{row.runner.bib}</b></td>
                  <td className="col-name">
                    <span className="results-name" title={row.runner.name}>{row.runner.name}</span>
                  </td>
                  <td className="col-gender">{row.genderText}</td>
                  <td className="mono col-age">{row.ageGroupText}</td>
                  <td className="mono col-start">{row.startText}</td>
                  <td className="mono col-finish">{row.finishText}</td>
                  <td className="mono col-total data-table__total"><b>{row.totalText}</b></td>
                  <td className="col-slip">
                    <Button variant="secondary" className="btn-sm" onClick={() => onOpenSlip(row.runner.bib)}>
                      e-Slip
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          ))
        )}
      </table>
    </div>
  )
}

export default ResultsTable
