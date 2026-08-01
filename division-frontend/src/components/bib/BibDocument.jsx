import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { visibleElements, checkpointBoxLabel, boxToPt, TAG_WIDTH_PT, TAG_HEIGHT_PT } from '../../lib/bibTemplate'

const styles = StyleSheet.create({
  page: {
    padding: 24,
    flexDirection: 'column',
  },
  pageBody: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  tagSlot: {
    flexGrow: 1,
  },
  tag: {
    width: TAG_WIDTH_PT,
    height: TAG_HEIGHT_PT,
    position: 'relative',
    borderWidth: 2,
    borderColor: '#000000',
    borderStyle: 'solid',
  },
  elBox: {
    position: 'absolute',
  },
  checkpointBox: {
    borderWidth: 1,
    borderColor: '#000000',
    borderStyle: 'solid',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkpointLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
})

const ALIGN_TO_ITEMS = { left: 'flex-start', center: 'center', right: 'flex-end' }

/**
 * Renders one template element at its absolute pt position (converted from
 * the same `xPct/yPct/wPct/hPct` the on-page canvas editor uses). Elements
 * are painted in the caller's zIndex-sorted order, since react-pdf/Yoga has
 * no `zIndex` style — paint order stands in for layering.
 * @param {{ el: object, text: string }} props
 */
function ElementView({ el, text }) {
  const box = boxToPt(el)
  const position = { left: box.left, top: box.top, width: box.width, height: box.height }

  if (el.type === 'image') {
    return <Image src={el.src} style={[styles.elBox, position, { objectFit: 'cover' }]} />
  }
  if (el.type === 'checkpointBox') {
    return (
      <View style={[styles.elBox, position, styles.checkpointBox]}>
        <Text style={styles.checkpointLabel}>{text}</Text>
      </View>
    )
  }
  return (
    <View style={[styles.elBox, position, { justifyContent: 'center', alignItems: ALIGN_TO_ITEMS[el.align] ?? 'center' }]}>
      <Text style={{ fontSize: el.fontSize, fontWeight: el.fontWeight, color: el.color, textAlign: el.align }}>{text}</Text>
    </View>
  )
}

/**
 * @param {{ bib: string, elements: object[], checkpointCount: number }} props
 */
function TagContent({ bib, elements, checkpointCount }) {
  const shown = visibleElements(elements, checkpointCount)
    .slice()
    .sort((a, b) => a.zIndex - b.zIndex)

  return (
    <View style={styles.tag}>
      {shown.map((el) => {
        const text =
          el.type === 'bibNumber' ? bib : el.type === 'checkpointBox' ? checkpointBoxLabel(el.role, checkpointCount) : el.text
        return <ElementView key={el.id} el={el} text={text} />
      })}
    </View>
  )
}

/**
 * Printable BIB tag PDF — two tags per A4 page, the lower one rotated 180°
 * so a single cut down the middle leaves both tags right-side-up. Renders
 * from the same `elements` template as the on-page canvas editor
 * (`BibCanvasEditor.jsx`), through the shared `lib/bibTemplate.js`
 * pct-to-pt conversion, so preview and print never drift apart by hand.
 * @param {{ elements: object[], checkpointCount: number, bibNumbers: string[] }} props
 */
function BibDocument({ elements, checkpointCount, bibNumbers }) {
  const pages = []
  for (let i = 0; i < bibNumbers.length; i += 2) {
    pages.push(bibNumbers.slice(i, i + 2))
  }
  if (pages.length === 0) pages.push([])

  return (
    <Document>
      {pages.map((pair, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          <View style={styles.pageBody}>
            <View style={styles.tagSlot}>
              {pair[0] && <TagContent bib={pair[0]} elements={elements} checkpointCount={checkpointCount} />}
            </View>
            <View style={[styles.tagSlot, { transform: 'rotate(180deg)' }]}>
              {pair[1] && <TagContent bib={pair[1]} elements={elements} checkpointCount={checkpointCount} />}
            </View>
          </View>
        </Page>
      ))}
    </Document>
  )
}

export default BibDocument
