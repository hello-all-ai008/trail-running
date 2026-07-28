import { ANY } from '../../lib/results'

/**
 * A one-tap toggle strip for a small dimension. Raw <button> rather than the
 * Button primitive: Button intentionally spreads no rest props, so it cannot
 * carry aria-pressed — same trade-off as the scan-mode toggle in StationPage.
 * Shared by ResultsFilterBar and MonitorFilterBar.
 *
 * multiSelect=false (default): value is a string, exclusive selection.
 * multiSelect=true: value is a string[], independent toggles; clicking the
 * "all" chip clears the array. role="group" (not radiogroup) is correct for
 * both — even the exclusive case isn't semantically a radio group here.
 * @param {{
 *   id: string,
 *   legend: string,
 *   allLabel: string,
 *   options: Array<{ value: string, label: string }>,
 *   value: string | string[],
 *   onSelect: (value: string | string[]) => void,
 *   multiSelect?: boolean
 * }} props
 */
function ChipGroup({ id, legend, allLabel, options, value, onSelect, multiSelect = false }) {
  const chips = [{ value: ANY, label: allLabel }, ...options]

  function isOn(chipValue) {
    if (chipValue === ANY) return multiSelect ? value.length === 0 : value === ANY
    return multiSelect ? value.includes(chipValue) : value === chipValue
  }

  function handleClick(chipValue) {
    if (!multiSelect) return onSelect(chipValue)
    if (chipValue === ANY) return onSelect([])
    const next = value.includes(chipValue) ? value.filter((v) => v !== chipValue) : [...value, chipValue]
    onSelect(next)
  }

  return (
    <div className="filter-bar__group">
      <span className="filter-bar__legend" id={id}>{legend}</span>
      <div className="filter-bar__options" role="group" aria-labelledby={id}>
        {chips.map((chip) => {
          const on = isOn(chip.value)
          return (
            <button
              key={chip.value || '__any__'}
              type="button"
              className={`btn btn-sm filter-chip ${on ? 'btn-accent' : 'btn-secondary'}`}
              aria-pressed={on}
              onClick={() => handleClick(chip.value)}
            >
              {chip.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ChipGroup
