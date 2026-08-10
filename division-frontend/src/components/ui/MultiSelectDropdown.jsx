import { useEffect, useRef, useState } from 'react'
import { ANY } from '../../lib/results'

/**
 * Dropdown replacement for the old chip-strip multi-select (ChipGroup with
 * multiSelect). Closed by default: a select-styled trigger button shows a
 * summary label; opening it reveals a checkbox list so multiple values stay
 * selectable, just inside a menu instead of an always-visible chip row.
 * Drop-in for the previous `ChipGroup multiSelect` call sites — same
 * `value: string[]` / `onSelect: (next: string[]) => void` contract.
 * @param {{
 *   id: string,
 *   legend: string,
 *   allLabel: string,
 *   options: Array<{ value: string, label: string }>,
 *   value: string[],
 *   onSelect: (next: string[]) => void
 * }} props
 */
function MultiSelectDropdown({ id, legend, allLabel, options, value, onSelect }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function toggle(optionValue) {
    const next = value.includes(optionValue) ? value.filter((v) => v !== optionValue) : [...value, optionValue]
    onSelect(next)
  }

  const triggerLabel = value.length === 0 ? allLabel : `${legend}: ${value.length} รุ่น`

  return (
    <div className="filter-bar__group multiselect-dropdown" ref={rootRef}>
      <span className="filter-bar__legend" id={id}>{legend}</span>
      <button
        type="button"
        className="search search--select multiselect-dropdown__trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-labelledby={id}
        onClick={() => setOpen((o) => !o)}
      >
        {triggerLabel}
      </button>

      {open && (
        <div className="glass-panel multiselect-dropdown__menu" role="group" aria-labelledby={id}>
          <label className="multiselect-dropdown__option">
            <input type="checkbox" checked={value.length === 0} onChange={() => onSelect([])} />
            {allLabel}
          </label>
          {options.map((opt) => (
            <label key={opt.value || ANY} className="multiselect-dropdown__option">
              <input type="checkbox" checked={value.includes(opt.value)} onChange={() => toggle(opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default MultiSelectDropdown
