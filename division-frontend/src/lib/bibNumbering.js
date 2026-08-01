/**
 * BIB number generation. Numbering is fully admin-controlled per category
 * (prefix + total digit width + starting sequence) — see CLAUDE.md decision
 * log for why this isn't auto-derived from distance.
 */

/**
 * @typedef {Object} BibNumberConfig
 * @property {string} prefix       e.g. "5" or "50"
 * @property {number} totalDigits  total width of the final BIB string
 * @property {number} startSeq     first sequence number (inclusive)
 */

/**
 * Generates `count` sequential BIB numbers as `prefix + zero-padded sequence`.
 * The sequence is padded to fill whatever width remains after the prefix
 * (`totalDigits - prefix.length`), clamped to at least 1 digit so a prefix
 * as long as (or longer than) totalDigits still produces a valid, if longer,
 * BIB string instead of throwing.
 * @param {BibNumberConfig} config
 * @param {number} count
 * @returns {string[]}
 */
export function generateBibNumbers({ prefix, totalDigits, startSeq }, count) {
  const seqWidth = Math.max(1, totalDigits - prefix.length)
  return Array.from({ length: count }, (_, i) => {
    const seq = String(startSeq + i).padStart(seqWidth, '0')
    return `${prefix}${seq}`
  })
}

/**
 * Checkpoint box labels: a single generic "Check Point" box when there's
 * only one, else CP1..CPn — matches the reference design (BIB.png) which
 * only labels boxes individually once there's more than one checkpoint.
 * @param {number} checkpointCount
 * @returns {string[]}
 */
export function checkpointLabels(checkpointCount) {
  if (checkpointCount <= 1) return ['Check Point']
  return Array.from({ length: checkpointCount }, (_, i) => `CP${i + 1}`)
}

/**
 * Extracts the numeric distance (km) embedded in a runner's category string,
 * e.g. 'MKT33' -> 33. Used to bridge admin-managed distance rows (BIB PDF
 * config) with the seeded runner dataset's free-text `category` field.
 * @param {string} category
 * @returns {number|null}
 */
export function distanceFromCategory(category) {
  const match = String(category ?? '').match(/\d+/)
  return match ? Number(match[0]) : null
}

/**
 * Counts how many runners have a category whose embedded distance matches
 * `distanceKm`.
 * @param {ReadonlyArray<{ category: string }>} runners
 * @param {number} distanceKm
 * @returns {number}
 */
export function countRunnersByDistance(runners, distanceKm) {
  return runners.filter((r) => distanceFromCategory(r.category) === distanceKm).length
}
