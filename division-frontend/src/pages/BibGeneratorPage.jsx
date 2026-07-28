import { useMemo, useState } from 'react'
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer'
import { useBibConfig } from '../hooks/useBibConfig'
import { initialRunners } from '../lib/raceData'
import { generateBibNumbers } from '../lib/bibNumbering'
import BibConfigForm from '../components/bib/BibConfigForm'
import BibDocument from '../components/bib/BibDocument'

/** @returns {Record<string, number>} category code -> real seeded runner count */
function countRunnersByCategory() {
  return initialRunners.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1
    return acc
  }, {})
}

/**
 * Custom BIB PDF generator — Step 2 tooling. Admin uploads header/footer
 * banner images, sets numbering + checkpoint-count per category, and
 * downloads a print-ready PDF (two tags per A4 sheet, second rotated 180°).
 */
function BibGeneratorPage() {
  const { config, setHeaderImage, setFooterImage, updateCategory } = useBibConfig()
  const runnerCounts = useMemo(countRunnersByCategory, [])
  const [selectedCode, setSelectedCode] = useState(config.categories[0]?.code ?? '')

  const selectedCategory = config.categories.find((c) => c.code === selectedCode) ?? config.categories[0]
  const runnerCount = selectedCategory ? runnerCounts[selectedCategory.code] ?? 0 : 0

  const bibNumbers = useMemo(() => {
    if (!selectedCategory) return []
    return generateBibNumbers(selectedCategory, runnerCount)
  }, [selectedCategory, runnerCount])

  // Live preview only ever needs one tag — feeding the full (up to
  // hundreds-of-pages) bibNumbers into PDFViewer made the page slow to open.
  const previewBibNumbers = useMemo(() => {
    if (!selectedCategory) return []
    return generateBibNumbers(selectedCategory, 1)
  }, [selectedCategory])

  return (
    <div className="bib-page">
      <header className="bib-page__header">
        <h1>สร้าง BIB (PDF)</h1>
        <p>อัปโหลด Header/Footer, ตั้งค่าเลขนำหน้าและจำนวน Check Point ต่อประเภท แล้วดาวน์โหลด PDF พร้อมพิมพ์</p>
      </header>

      <div className="bib-page__layout">
        <BibConfigForm
          config={config}
          runnerCounts={runnerCounts}
          selectedCode={selectedCategory?.code ?? ''}
          onSelectCategory={setSelectedCode}
          onHeaderImageChange={setHeaderImage}
          onFooterImageChange={setFooterImage}
          onUpdateCategory={updateCategory}
        />

        <div className="glass-panel bib-page__preview">
          {selectedCategory ? (
            <>
              <div className="bib-page__preview-toolbar">
                <span>
                  ตัวอย่าง {selectedCategory.code} — {runnerCount} ใบ ({Math.ceil(runnerCount / 2)} หน้า)
                </span>
                <PDFDownloadLink
                  document={
                    <BibDocument
                      headerImage={config.headerImage}
                      footerImage={config.footerImage}
                      checkpointCount={selectedCategory.checkpointCount}
                      bibNumbers={bibNumbers}
                    />
                  }
                  fileName={`bib-${selectedCategory.code}.pdf`}
                  className="btn btn-accent"
                >
                  {({ loading }) => (loading ? 'กำลังสร้าง PDF…' : 'ดาวน์โหลด PDF')}
                </PDFDownloadLink>
              </div>

              <PDFViewer className="bib-page__viewer" showToolbar={false}>
                <BibDocument
                  headerImage={config.headerImage}
                  footerImage={config.footerImage}
                  checkpointCount={selectedCategory.checkpointCount}
                  bibNumbers={previewBibNumbers}
                />
              </PDFViewer>
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
