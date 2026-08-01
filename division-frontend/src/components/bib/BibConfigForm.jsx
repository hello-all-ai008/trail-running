const CHECKPOINT_OPTIONS = [1, 2, 3, 4]

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * @param {{ label: string, src: string|null, onChange: (dataUrl: string|null) => void }} props
 */
function BannerUpload({ label, src, onChange }) {
  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    onChange(await readFileAsDataURL(file))
  }

  return (
    <div className="field bib-form__banner">
      <span>{label}</span>
      {src && <img className="bib-form__banner-preview" src={src} alt={`${label} preview`} />}
      <div className="bib-form__banner-actions">
        <input className="search" type="file" accept="image/*" onChange={onFile} />
        {src && (
          <button type="button" className="bib-form__banner-clear" onClick={() => onChange(null)}>
            ลบรูป
          </button>
        )}
      </div>
      <span className="bib-form__banner-hint">แนะนำ 1600×190px (แนวนอน ~8:1) — ภาพจะถูก crop ให้พอดีแถบสูง 70px เสมอ</span>
    </div>
  )
}

/**
 * Left-hand configuration panel: header/footer banner uploads + one row of
 * numbering/checkpoint settings per admin-managed distance (km).
 * @param {{
 *   config: { headerImage: string|null, footerImage: string|null, categories: object[] },
 *   runnerCountsByDistance: Record<number, number>,
 *   selectedId: string,
 *   onSelectCategory: (id: string) => void,
 *   onHeaderImageChange: (dataUrl: string|null) => void,
 *   onFooterImageChange: (dataUrl: string|null) => void,
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
  onHeaderImageChange,
  onFooterImageChange,
  onUpdateCategory,
  onAddCategory,
  onRemoveCategory,
}) {
  return (
    <div className="glass-panel bib-form">
      <h2 className="bib-form__title">Header / Footer</h2>
      <BannerUpload label="Header banner" src={config.headerImage} onChange={onHeaderImageChange} />
      <BannerUpload label="Footer banner" src={config.footerImage} onChange={onFooterImageChange} />

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
                    onChange={(e) =>
                      onUpdateCategory(cat.id, { distanceKm: e.target.value === '' ? null : Number(e.target.value) })
                    }
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
              <label className="field">
                <span>จำนวน Check Point</span>
                <select
                  className="search"
                  value={cat.checkpointCount}
                  onChange={(e) => onUpdateCategory(cat.id, { checkpointCount: Number(e.target.value) })}
                >
                  {CHECKPOINT_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
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
