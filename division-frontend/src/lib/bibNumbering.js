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
