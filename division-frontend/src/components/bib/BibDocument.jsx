import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'

const BAND_HEIGHT = 70

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
    flex: 1,
    flexDirection: 'column',
    borderWidth: 2,
    borderColor: '#000000',
    borderStyle: 'solid',
  },
  band: {
    height: BAND_HEIGHT,
    width: '100%',
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bandImage: {
    height: BAND_HEIGHT,
    width: '100%',
    objectFit: 'cover',
  },
  bandPlaceholder: {
    fontSize: 10,
    color: '#999999',
  },
  numberArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontSize: 96,
    fontWeight: 700,
  },
  boxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 16,
  },
  box: {
    width: 76,
    height: 52,
    borderWidth: 1,
    borderColor: '#000000',
    borderStyle: 'solid',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
})

/**
 * @param {{ src: string|null, placeholder: string }} props
 */
function Band({ src, placeholder }) {
  if (src) return <Image src={src} style={styles.bandImage} />
  return (
    <View style={styles.band}>
      <Text style={styles.bandPlaceholder}>{placeholder}</Text>
    </View>
  )
}

/**
 * Checkpoint box labels: a single generic "Check Point" box when there's
 * only one, else CP1..CPn — matches the reference design (BIB.png) which
 * only labels boxes individually once there's more than one checkpoint.
 * @param {number} checkpointCount
 * @returns {string[]}
 */
function checkpointLabels(checkpointCount) {
  if (checkpointCount <= 1) return ['Check Point']
  return Array.from({ length: checkpointCount }, (_, i) => `CP${i + 1}`)
}

/**
 * @param {{ bib: string, headerImage: string|null, footerImage: string|null, checkpointCount: number }} props
 */
function TagContent({ bib, headerImage, footerImage, checkpointCount }) {
  const boxLabels = ['Start', ...checkpointLabels(checkpointCount), 'Finish']
  return (
    <View style={styles.tag}>
      <Band src={headerImage} placeholder="Header" />
      <View style={styles.numberArea}>
        <Text style={styles.number}>{bib}</Text>
      </View>
      <View style={styles.boxesRow}>
        {boxLabels.map((label) => (
          <View key={label} style={styles.box}>
            <Text style={styles.boxLabel}>{label}</Text>
          </View>
        ))}
      </View>
      <Band src={footerImage} placeholder="Footer" />
    </View>
  )
}

/**
 * Printable BIB tag PDF — two tags per A4 page, the lower one rotated 180°
 * so a single cut down the middle leaves both tags right-side-up.
 * @param {{
 *   headerImage: string|null,
 *   footerImage: string|null,
 *   checkpointCount: number,
 *   bibNumbers: string[],
 * }} props
 */
function BibDocument({ headerImage, footerImage, checkpointCount, bibNumbers }) {
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
              {pair[0] && (
                <TagContent
                  bib={pair[0]}
                  headerImage={headerImage}
                  footerImage={footerImage}
                  checkpointCount={checkpointCount}
                />
              )}
            </View>
            <View style={[styles.tagSlot, { transform: 'rotate(180deg)' }]}>
              {pair[1] && (
                <TagContent
                  bib={pair[1]}
                  headerImage={headerImage}
                  footerImage={footerImage}
                  checkpointCount={checkpointCount}
                />
              )}
            </View>
          </View>
        </Page>
      ))}
    </Document>
  )
}

export default BibDocument
