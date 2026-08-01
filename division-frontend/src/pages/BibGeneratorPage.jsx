import { useMemo, useState } from 'react'
import { useBibConfig } from '../hooks/useBibConfig'
import { initialRunners } from '../lib/raceData'
import { generateBibNumbers, distanceFromCategory } from '../lib/bibNumbering'
import BibConfigForm from '../components/bib/BibConfigForm'
import BibTagPreview from '../components/bib/BibTagPreview'

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
 * Custom BIB PDF generator — Step 2 tooling. Admin uploads header/footer
 * banner images, sets numbering + checkpoint-count per category, and
 * downloads a print-ready PDF (two tags per A4 sheet, second rotated 180°).
 *
 * The heavy `@react-pdf/renderer` engine (~480KB gzip incl. fontkit) is
 * never statically imported here — the live preview is plain HTML/CSS
 * (`BibTagPreview`), and the PDF-generation code (`@react-pdf/renderer` +
 * `BibDocument`) is only pulled in via dynamic `import()` when the admin
 * actually clicks download.
 */
function BibGeneratorPage() {
  const { config, setHeaderImage, setFooterImage, updateCategory, addCategory, removeCategory } = useBibConfig()
  const runnerCounts = useMemo(countRunnersByDistance, [])
  const [selectedId, setSelectedId] = useState(config.categories[0]?.id ?? '')
  const [generating, setGenerating] = useState(false)

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
          headerImage={config.headerImage}
          footerImage={config.footerImage}
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
        <p>อัปโหลด Header/Footer, ตั้งค่าเลขนำหน้าและจำนวน Check Point ต่อประเภท แล้วดาวน์โหลด PDF พร้อมพิมพ์</p>
      </header>

      <div className="bib-page__layout">
        <BibConfigForm
          config={config}
          runnerCountsByDistance={runnerCounts}
          selectedId={selectedCategory?.id ?? ''}
          onSelectCategory={setSelectedId}
          onHeaderImageChange={setHeaderImage}
          onFooterImageChange={setFooterImage}
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
                <button type="button" className="btn btn-accent" onClick={onDownload} disabled={generating}>
                  {generating ? 'กำลังสร้าง PDF…' : 'ดาวน์โหลด PDF'}
                </button>
              </div>

              <BibTagPreview
                headerImage={config.headerImage}
                footerImage={config.footerImage}
                checkpointCount={selectedCategory.checkpointCount}
                bibNumber={previewBibNumbers[0]}
              />
            </>
          ) : (
            <p>ยังไม่มีประเภทการแข่งขัน</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default BibGeneratorPage
