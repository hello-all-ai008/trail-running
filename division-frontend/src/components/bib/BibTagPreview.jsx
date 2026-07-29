import { checkpointLabels } from '../../lib/bibNumbering'

// Mirrors BAND_HEIGHT in BibDocument.jsx (pt in the PDF, px here — 1:1 is
// fine since this is a plain-HTML approximation, not the print output).
const BAND_HEIGHT = 70

/**
 * @param {{ src: string|null, placeholder: string }} props
 */
function Band({ src, placeholder }) {
  if (src) return <img className="bib-tag-preview__band-image" src={src} alt={placeholder} />
  return (
    <div className="bib-tag-preview__band bib-tag-preview__band--placeholder">
      <span>{placeholder}</span>
    </div>
  )
}

/**
 * Plain-HTML/CSS approximation of a single BIB tag, used for the live
 * on-page preview so opening this page never has to boot the react-pdf
 * layout engine. Visual values (box size, band height, font) are matched to
 * `BibDocument.jsx` as closely as a DOM render allows; the real PDF (via
 * the download button) remains the source of truth for print output.
 * @param {{
 *   headerImage: string|null,
 *   footerImage: string|null,
 *   checkpointCount: number,
 *   bibNumber: string,
 * }} props
 */
function BibTagPreview({ headerImage, footerImage, checkpointCount, bibNumber }) {
  const boxLabels = ['Start', ...checkpointLabels(checkpointCount), 'Finish']

  return (
    <div className="bib-tag-preview" style={{ '--bib-tag-preview-band-height': `${BAND_HEIGHT}px` }}>
      <Band src={headerImage} placeholder="Header" />
      <div className="bib-tag-preview__number-area">
        <span className="bib-tag-preview__number">{bibNumber}</span>
      </div>
      <div className="bib-tag-preview__checkpoints">
        {boxLabels.map((label) => (
          <div key={label} className="bib-tag-preview__checkpoint">
            {label}
          </div>
        ))}
      </div>
      <Band src={footerImage} placeholder="Footer" />
    </div>
  )
}

export default BibTagPreview
