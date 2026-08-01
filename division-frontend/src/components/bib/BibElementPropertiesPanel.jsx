import Button from '../ui/Button'
import { readFileAsDataURL } from '../../hooks/useBibConfig'
import { STRUCTURAL_TYPES } from '../../lib/bibTemplate'

const ALIGN_OPTIONS = [
  { value: 'left', label: 'ซ้าย' },
  { value: 'center', label: 'กึ่งกลาง' },
  { value: 'right', label: 'ขวา' },
]

/**
 * Properties panel for the element currently selected on `BibCanvasEditor`.
 * Field set depends on element type: image gets a file-replace input, text
 * gets an editable content box, text/bibNumber share font styling, and
 * checkpointBox only exposes font size (its label is derived, not editable).
 * bibNumber/checkpointBox are structural — no delete button for them.
 *
 * @param {{
 *   element: import('../../hooks/useBibConfig').BibElement|null,
 *   onUpdate: (id: string, patch: object) => void,
 *   onRemove: (id: string) => void,
 *   onReorder: (id: string, direction: 'front'|'back') => void,
 * }} props
 */
function BibElementPropertiesPanel({ element, onUpdate, onRemove, onReorder }) {
  if (!element) {
    return (
      <div className="glass-panel bib-props">
        <p className="bib-props__empty">คลิกองค์ประกอบบน canvas เพื่อแก้ไข</p>
      </div>
    )
  }

  const isStructural = STRUCTURAL_TYPES.includes(element.type)
  const showsFontStyle = element.type === 'text' || element.type === 'bibNumber'

  async function onReplaceImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const src = await readFileAsDataURL(file)
    onUpdate(element.id, { src })
  }

  return (
    <div className="glass-panel bib-props">
      <h2 className="bib-props__title">คุณสมบัติองค์ประกอบ</h2>

      {element.type === 'image' && (
        <label className="field">
          <span>เปลี่ยนรูปภาพ</span>
          <input className="search" type="file" accept="image/*" onChange={onReplaceImage} />
        </label>
      )}

      {element.type === 'text' && (
        <label className="field">
          <span>ข้อความ</span>
          <textarea
            className="search bib-props__textarea"
            rows={2}
            value={element.text}
            onChange={(e) => onUpdate(element.id, { text: e.target.value })}
          />
        </label>
      )}

      {showsFontStyle && (
        <>
          <label className="field">
            <span>ขนาดตัวอักษร</span>
            <input
              className="search"
              type="number"
              min={6}
              value={element.fontSize}
              onChange={(e) => onUpdate(element.id, { fontSize: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span>น้ำหนักตัวอักษร</span>
            <select
              className="search"
              value={element.fontWeight}
              onChange={(e) => onUpdate(element.id, { fontWeight: Number(e.target.value) })}
            >
              <option value={400}>ปกติ</option>
              <option value={700}>หนา</option>
            </select>
          </label>
          <label className="field">
            <span>สี</span>
            <input
              className="bib-props__color"
              type="color"
              value={element.color}
              onChange={(e) => onUpdate(element.id, { color: e.target.value })}
            />
          </label>
          <label className="field">
            <span>จัดแนว</span>
            <select
              className="search"
              value={element.align}
              onChange={(e) => onUpdate(element.id, { align: e.target.value })}
            >
              {ALIGN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {element.type === 'checkpointBox' && (
        <label className="field">
          <span>ขนาดตัวอักษร</span>
          <input
            className="search"
            type="number"
            min={6}
            value={element.fontSize}
            onChange={(e) => onUpdate(element.id, { fontSize: Number(e.target.value) })}
          />
        </label>
      )}

      <div className="bib-props__layer">
        <Button variant="secondary" onClick={() => onReorder(element.id, 'front')}>
          เอาไว้หน้า
        </Button>
        <Button variant="secondary" onClick={() => onReorder(element.id, 'back')}>
          เอาไว้หลัง
        </Button>
      </div>

      {!isStructural && (
        <Button variant="danger" className="bib-props__remove" onClick={() => onRemove(element.id)}>
          ลบองค์ประกอบนี้
        </Button>
      )}
    </div>
  )
}

export default BibElementPropertiesPanel
