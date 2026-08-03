const CHECKPOINT_OPTIONS = [0, 1, 2, 3, 4]

/**
 * Left-hand configuration panel: one row of numbering/checkpoint settings
 * per admin-managed distance (km). Header/footer banners and any other
 * custom elements are no longer configured here — they're added and
 * positioned directly on `BibCanvasEditor`'s freeform canvas.
 * @param {{
 *   config: { categories: object[] },
 *   runnerCountsByDistance: Record<number, number>,
 *   selectedId: string,
 *   onSelectCategory: (id: string) => void,
 *   onUpdateCategory: (id: string, patch: object) => void,
 *   onAddCategory: () => void,
 *   onRemoveCategory: (id: string) => void,
 * }} props
 */
function BibConfigForm({
  config,
  runnerCountsByDistance,
  selectedId,
  onSelectCategory,
  onUpdateCategory,
  onAddCategory,
  onRemoveCategory,
}) {
  return (
    <div className="glass-panel bib-form">
      <h2 className="bib-form__title">ประเภทการแข่งขัน</h2>
      <div className="bib-form__categories">
        {config.categories.map((cat) => (
          <div key={cat.id} className={`bib-form__category ${selectedId === cat.id ? 'is-selected' : ''}`}>
            <label className="bib-form__category-select">
              <div className="bib-form__category-main">
                <input
                  type="radio"
                  name="bib-preview-category"
                  checked={selectedId === cat.id}
                  onChange={() => onSelectCategory(cat.id)}
                />
                <span className="bib-form__distance-pill">
                  <input
                    type="number"
                    min={1}
                    className="bib-form__distance-input"
                    value={cat.distanceKm ?? ''}
                    onChange={(e) => {
                      const distanceKm = e.target.value === '' ? null : Number(e.target.value)
                      const patch = { distanceKm }
                      // Only suggest a prefix while the admin hasn't set one — never overwrite a value they typed.
                      if (!cat.prefix && distanceKm != null) patch.prefix = String(distanceKm)[0]
                      onUpdateCategory(cat.id, patch)
                    }}
                  />
                  <span>กม.</span>
                </span>
              </div>
              <div className="bib-form__category-meta">
                <span className="bib-form__runner-count">{runnerCountsByDistance[cat.distanceKm] ?? 0} คน</span>
                <button
                  type="button"
                  className="bib-form__category-remove"
                  onClick={() => onRemoveCategory(cat.id)}
                  aria-label="ลบระยะทางนี้"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </button>
              </div>
            </label>

            <div className="bib-form__category-grid">
              <label className="field">
                <span>Prefix</span>
                <input
                  className="search"
                  type="text"
                  value={cat.prefix}
                  onChange={(e) => onUpdateCategory(cat.id, { prefix: e.target.value })}
                />
              </label>
              <label className="field">
                <span>จำนวนหลักรวม</span>
                <input
                  className="search"
                  type="number"
                  min={1}
                  value={cat.totalDigits}
                  onChange={(e) => onUpdateCategory(cat.id, { totalDigits: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                <span>เลขเริ่มต้น</span>
                <input
                  className="search"
                  type="number"
                  min={0}
                  value={cat.startSeq}
                  onChange={(e) => onUpdateCategory(cat.id, { startSeq: Number(e.target.value) })}
                />
              </label>
              <label className="field bib-form__field--wide">
                <span>จำนวน Check Point</span>
                <select
                  className="search"
                  value={cat.checkpointCount}
                  onChange={(e) => onUpdateCategory(cat.id, { checkpointCount: Number(e.target.value) })}
                >
                  {CHECKPOINT_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n === 0 ? '0 (ไม่มี)' : n}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="bib-form__category-add" onClick={onAddCategory}>
        + เพิ่มระยะทาง
      </button>
    </div>
  )
}

export default BibConfigForm
