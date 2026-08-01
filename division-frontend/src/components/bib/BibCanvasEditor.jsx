import { useRef, useState } from 'react'
import { visibleElements, checkpointBoxLabel, TAG_WIDTH_PT, TAG_HEIGHT_PT } from '../../lib/bibTemplate'

const HANDLES = ['nw', 'ne', 'sw', 'se']
const MIN_SIZE_PCT = 3

/** @param {number} v @returns {number} */
function clampPct(v) {
  return Math.min(100, Math.max(0, v))
}

/**
 * @param {{ el: import('../../hooks/useBibConfig').BibElement, bibNumberText: string, checkpointCount: number }} props
 */
function BibElementContent({ el, bibNumberText, checkpointCount }) {
  const textStyle = { fontSize: el.fontSize, fontWeight: el.fontWeight, color: el.color, textAlign: el.align }

  if (el.type === 'image') {
    return <img className="bib-canvas__image" src={el.src} alt="" draggable={false} />
  }
  if (el.type === 'text') {
    return (
      <span className="bib-canvas__text" style={textStyle}>
        {el.text}
      </span>
    )
  }
  if (el.type === 'bibNumber') {
    return (
      <span className="bib-canvas__text bib-canvas__bib-number" style={textStyle}>
        {bibNumberText}
      </span>
    )
  }
  return (
    <div className="bib-canvas__checkpoint" style={{ fontSize: el.fontSize }}>
      {checkpointBoxLabel(el.role, checkpointCount)}
    </div>
  )
}

/**
 * Interactive freeform canvas for the BIB tag template — every element
 * (uploaded images, custom text, the bib number, each checkpoint box) is
 * draggable and resizable via plain pointer events. Positions live as
 * percentages of the canvas so this stays in sync with the printed PDF,
 * which converts the same `elements` through `lib/bibTemplate.js`.
 *
 * Drag/resize is buffered locally (`draft` state) and only committed via
 * `onUpdateElement` on pointer-up, so localStorage isn't written on every
 * pointermove.
 *
 * @param {{
 *   elements: import('../../hooks/useBibConfig').BibElement[],
 *   checkpointCount: number,
 *   bibNumberText: string,
 *   selectedId: string|null,
 *   onSelectElement: (id: string|null) => void,
 *   onUpdateElement: (id: string, patch: object) => void,
 * }} props
 */
function BibCanvasEditor({ elements, checkpointCount, bibNumberText, selectedId, onSelectElement, onUpdateElement }) {
  const containerRef = useRef(null)
  const dragRef = useRef(null)
  const [draft, setDraft] = useState(null)

  const shown = visibleElements(elements, checkpointCount)
    .slice()
    .sort((a, b) => a.zIndex - b.zIndex)

  /** @param {import('../../hooks/useBibConfig').BibElement} el */
  function boxFor(el) {
    return draft && draft.id === el.id ? draft : el
  }

  /**
   * @param {PointerEvent} e
   * @param {import('../../hooks/useBibConfig').BibElement} el
   * @param {'move'|'resize'} mode
   * @param {string} [handle]
   */
  function beginDrag(e, el, mode, handle) {
    e.stopPropagation()
    e.preventDefault()
    onSelectElement(el.id)
    dragRef.current = {
      id: el.id,
      mode,
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startBox: { xPct: el.xPct, yPct: el.yPct, wPct: el.wPct, hPct: el.hPct },
      rect: containerRef.current.getBoundingClientRect(),
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e) {
    const drag = dragRef.current
    if (!drag) return
    const dxPct = ((e.clientX - drag.startClientX) / drag.rect.width) * 100
    const dyPct = ((e.clientY - drag.startClientY) / drag.rect.height) * 100
    const { startBox } = drag
    const next = { ...startBox }

    if (drag.mode === 'move') {
      next.xPct = clampPct(startBox.xPct + dxPct)
      next.yPct = clampPct(startBox.yPct + dyPct)
    } else {
      const isLeft = drag.handle.includes('w')
      const isTop = drag.handle.includes('n')
      if (isLeft) {
        next.xPct = clampPct(startBox.xPct + dxPct)
        next.wPct = Math.max(MIN_SIZE_PCT, startBox.wPct - dxPct)
      } else {
        next.wPct = Math.max(MIN_SIZE_PCT, startBox.wPct + dxPct)
      }
      if (isTop) {
        next.yPct = clampPct(startBox.yPct + dyPct)
        next.hPct = Math.max(MIN_SIZE_PCT, startBox.hPct - dyPct)
      } else {
        next.hPct = Math.max(MIN_SIZE_PCT, startBox.hPct + dyPct)
      }
    }

    setDraft({ id: drag.id, ...next })
  }

  function endDrag() {
    if (!dragRef.current) return
    dragRef.current = null
    setDraft((d) => {
      if (d) onUpdateElement(d.id, { xPct: d.xPct, yPct: d.yPct, wPct: d.wPct, hPct: d.hPct })
      return null
    })
  }

  return (
    <div
      ref={containerRef}
      className="bib-canvas"
      style={{ aspectRatio: `${TAG_WIDTH_PT} / ${TAG_HEIGHT_PT}` }}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onClick={() => onSelectElement(null)}
    >
      {shown.map((el) => {
        const box = boxFor(el)
        const isSelected = selectedId === el.id
        return (
          <div
            key={el.id}
            className={`bib-canvas__el${isSelected ? ' is-selected' : ''}`}
            style={{ left: `${box.xPct}%`, top: `${box.yPct}%`, width: `${box.wPct}%`, height: `${box.hPct}%`, zIndex: el.zIndex }}
            onPointerDown={(e) => beginDrag(e, el, 'move')}
            onClick={(e) => e.stopPropagation()}
          >
            <BibElementContent el={el} bibNumberText={bibNumberText} checkpointCount={checkpointCount} />
            {isSelected &&
              HANDLES.map((handle) => (
                <span
                  key={handle}
                  className={`bib-canvas__handle bib-canvas__handle--${handle}`}
                  onPointerDown={(e) => beginDrag(e, el, 'resize', handle)}
                />
              ))}
          </div>
        )
      })}
    </div>
  )
}

export default BibCanvasEditor
