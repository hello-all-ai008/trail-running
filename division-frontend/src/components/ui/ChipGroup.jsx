import { ANY } from '../../lib/results'

/**
 * A one-tap toggle strip for a small dimension. Raw <button> rather than the
 * Button primitive: Button intentionally spreads no rest props, so it cannot
 * carry aria-pressed — same trade-off as the scan-mode toggle in StationPage.
 * Shared by ResultsFilterBar and MonitorFilterBar.
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

export default ChipGroup
