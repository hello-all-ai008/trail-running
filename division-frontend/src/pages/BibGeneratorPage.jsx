import { useMemo, useRef, useState } from 'react'
import { useBibConfig } from '../hooks/useBibConfig'
import { initialRunners } from '../lib/raceData'
import { generateBibNumbers, distanceFromCategory } from '../lib/bibNumbering'
import BibConfigForm from '../components/bib/BibConfigForm'
import BibCanvasEditor from '../components/bib/BibCanvasEditor'
import BibElementPropertiesPanel from '../components/bib/BibElementPropertiesPanel'
import Button from '../components/ui/Button'

/** @returns {Record<number, number>} distance (km) -> real seeded runner count */
function countRunnersByDistance() {
  return initialRunners.reduce((acc, r) => {
    const d = distanceFromCategory(r.category)
    if (d == null) return acc
    acc[d] = (acc[d] ?? 0) + 1
    return acc
  }, {})
}

/**
 * Custom BIB PDF generator — Step 2 tooling. Admin adds image/text elements
 * and drags every element (including the bib number and each checkpoint
 * box) freely on a Canva-style canvas, sets numbering + checkpoint-count
 * per category, and downloads a print-ready PDF (two tags per A4 sheet,
 * second rotated 180°).
 *
 * The heavy `@react-pdf/renderer` engine (~480KB gzip incl. fontkit) is
 * never statically imported here — the live preview is the interactive
 * `BibCanvasEditor` (plain HTML/CSS + pointer events), and the
 * PDF-generation code (`@react-pdf/renderer` + `BibDocument`) is only
 * pulled in via dynamic `import()` when the admin actually clicks download.
 */
function BibGeneratorPage() {
  const {
    config,
    updateCategory,
    addCategory,
    removeCategory,
    addImageElement,
    addTextElement,
    updateElement,
    removeElement,
    reorderElement,
    resetLayout,
  } = useBibConfig()
  const runnerCounts = useMemo(countRunnersByDistance, [])
  const [selectedId, setSelectedId] = useState(config.categories[0]?.id ?? '')
  const [selectedElementId, setSelectedElementId] = useState(null)
  const [generating, setGenerating] = useState(false)
  const imageInputRef = useRef(null)

  const selectedCategory = config.categories.find((c) => c.id === selectedId) ?? config.categories[0]
  const runnerCount = selectedCategory ? runnerCounts[selectedCategory.distanceKm] ?? 0 : 0

  const bibNumbers = useMemo(() => {
    if (!selectedCategory) return []
    return generateBibNumbers(selectedCategory, runnerCount)
  }, [selectedCategory, runnerCount])

  // Live preview only ever needs one tag.
  const previewBibNumbers = useMemo(() => {
    if (!selectedCategory) return []
    return generateBibNumbers(selectedCategory, 1)
  }, [selectedCategory])

  const selectedElement = config.elements.find((el) => el.id === selectedElementId) ?? null

  /** @param {import('react').ChangeEvent<HTMLInputElement>} e */
  async function onImageFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    await addImageElement(file)
    e.target.value = ''
  }

  function onRemoveSelectedElement(id) {
    removeElement(id)
    setSelectedElementId(null)
  }

  /** Lazily loads the PDF engine + document, builds the blob, and triggers a download. */
  async function onDownload() {
    if (!selectedCategory) return
    setGenerating(true)
    try {
      const [{ pdf }, { default: BibDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../components/bib/BibDocument'),
      ])
      const blob = await pdf(
        <BibDocument
          elements={config.elements}
          checkpointCount={selectedCategory.checkpointCount}
          bibNumbers={bibNumbers}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bib-${selectedCategory.distanceKm}km.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="bib-page">
      <header className="bib-page__header">
        <h1>สร้าง BIB (PDF)</h1>
        <p>เพิ่มรูปภาพ/ข้อความแล้วลากวางตำแหน่งได้อิสระบน canvas ตั้งค่าเลขนำหน้าและจำนวน Check Point ต่อประเภท แล้วดาวน์โหลด PDF พร้อมพิมพ์</p>
      </header>

      <div className="bib-page__layout">
        <BibConfigForm
          config={config}
          runnerCountsByDistance={runnerCounts}
          selectedId={selectedCategory?.id ?? ''}
          onSelectCategory={setSelectedId}
          onUpdateCategory={updateCategory}
          onAddCategory={addCategory}
          onRemoveCategory={removeCategory}
        />

        <div className="glass-panel bib-page__preview">
          {selectedCategory ? (
            <>
              <div className="bib-page__preview-toolbar">
                <span>
                  ตัวอย่าง {selectedCategory.distanceKm} กม. — {runnerCount} ใบ ({Math.ceil(runnerCount / 2)} หน้า)
                </span>
                <Button onClick={onDownload} disabled={generating}>
                  {generating ? 'กำลังสร้าง PDF…' : 'ดาวน์โหลด PDF'}
                </Button>
              </div>

              <div className="bib-page__canvas-toolbar">
                <Button variant="secondary" onClick={() => imageInputRef.current?.click()}>
                  + เพิ่มรูปภาพ
                </Button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="bib-page__hidden-input"
                  onChange={onImageFileChange}
                />
                <Button variant="secondary" onClick={addTextElement}>
                  + เพิ่มข้อความ
                </Button>
                <Button variant="danger" onClick={resetLayout}>
                  รีเซ็ตเป็นค่าเริ่มต้น
                </Button>
              </div>

              <BibCanvasEditor
                elements={config.elements}
                checkpointCount={selectedCategory.checkpointCount}
                bibNumberText={previewBibNumbers[0]}
                selectedId={selectedElementId}
                onSelectElement={setSelectedElementId}
                onUpdateElement={updateElement}
              />
            </>
          ) : (
            <p>ยังไม่มีประเภทการแข่งขัน</p>
          )}
        </div>

        <BibElementPropertiesPanel
          element={selectedElement}
          onUpdate={updateElement}
          onRemove={onRemoveSelectedElement}
          onReorder={reorderElement}
        />
      </div>
    </div>
  )
}

export default BibGeneratorPage
