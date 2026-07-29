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
 * numbering/checkpoint settings per race category.
 * @param {{
 *   config: { headerImage: string|null, footerImage: string|null, categories: object[] },
 *   runnerCounts: Record<string, number>,
 *   selectedCode: string,
 *   onSelectCategory: (code: string) => void,
 *   onHeaderImageChange: (dataUrl: string|null) => void,
 *   onFooterImageChange: (dataUrl: string|null) => void,
 *   onUpdateCategory: (code: string, patch: object) => void,
 * }} props
 */
function BibConfigForm({
  config,
  runnerCounts,
  selectedCode,
  onSelectCategory,
  onHeaderImageChange,
  onFooterImageChange,
  onUpdateCategory,
}) {
  return (
    <div className="glass-panel bib-form">
      <h2 className="bib-form__title">Header / Footer</h2>
      <BannerUpload label="Header banner" src={config.headerImage} onChange={onHeaderImageChange} />
      <BannerUpload label="Footer banner" src={config.footerImage} onChange={onFooterImageChange} />

      <h2 className="bib-form__title">ประเภทการแข่งขัน</h2>
      <div className="bib-form__categories">
        {config.categories.map((cat) => (
          <div key={cat.code} className={`bib-form__category ${selectedCode === cat.code ? 'is-selected' : ''}`}>
            <label className="bib-form__category-select">
              <input
                type="radio"
                name="bib-preview-category"
                checked={selectedCode === cat.code}
                onChange={() => onSelectCategory(cat.code)}
              />
              <b>{cat.code}</b>
              <span className="bib-form__runner-count">{runnerCounts[cat.code] ?? 0} คน</span>
            </label>

            <div className="bib-form__category-grid">
              <label className="field">
                <span>Prefix</span>
                <input
                  className="search"
                  type="text"
                  value={cat.prefix}
                  onChange={(e) => onUpdateCategory(cat.code, { prefix: e.target.value })}
                />
              </label>
              <label className="field">
                <span>จำนวนหลักรวม</span>
                <input
                  className="search"
                  type="number"
                  min={1}
                  value={cat.totalDigits}
                  onChange={(e) => onUpdateCategory(cat.code, { totalDigits: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                <span>เลขเริ่มต้น</span>
                <input
                  className="search"
                  type="number"
                  min={0}
                  value={cat.startSeq}
                  onChange={(e) => onUpdateCategory(cat.code, { startSeq: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                <span>จำนวน Check Point</span>
                <select
                  className="search"
                  value={cat.checkpointCount}
                  onChange={(e) => onUpdateCategory(cat.code, { checkpointCount: Number(e.target.value) })}
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
    </div>
  )
}

export default BibConfigForm
