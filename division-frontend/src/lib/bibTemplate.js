import { checkpointLabels } from './bibNumbering'

/**
 * Shared BIB tag layout: default positions for the structural elements
 * (bib number + checkpoint boxes) and the pct<->pt conversion used by both
 * the on-page canvas editor (HTML/CSS) and the printed PDF (react-pdf), so
 * the two never drift out of sync by hand like the old fixed-band layout did.
 *
 * Positions are stored as percentages (0-100) of a single tag's bounding
 * box, independent of the on-screen or print unit — `boxToPt` is the only
 * place that translates into the PDF's point space.
 */

/** All checkpoint-box roles a template can hold, left to right. `cp1`-`cp4`
 *  are fixed slots — only the first `checkpointCount` of them render for a
 *  given category (see `visibleElements`), so repositioning a slot is a
 *  one-time setup rather than something redone per category. */
export const CHECKPOINT_ROLES = ['start', 'cp1', 'cp2', 'cp3', 'cp4', 'finish']
export const MAX_CHECKPOINTS = 4

export const STRUCTURAL_TYPES = ['bibNumber', 'checkpointBox']

/** Unlike cp1-4 (toggled on/off via checkpointCount, never individually
 *  deleted) and bibNumber (must always exist), Start/Finish can be removed
 *  and re-added — some races don't want them printed at all. */
export const REMOVABLE_CHECKPOINT_ROLES = ['start', 'finish']

/**
 * Whether an element can be deleted from the template. Images/text are
 * always removable; checkpointBox only for start/finish; bibNumber never.
 * @param {{ type: string, role?: string }} element
 * @returns {boolean}
 */
export function isRemovableElement(element) {
  if (element.type === 'checkpointBox') return REMOVABLE_CHECKPOINT_ROLES.includes(element.role)
  return !STRUCTURAL_TYPES.includes(element.type)
}

/** PDF tag content area, in points — half an A4 page minus the shared 24pt
 *  page padding (matches the two-tags-per-page layout in BibDocument.jsx). */
export const TAG_WIDTH_PT = 547.28
export const TAG_HEIGHT_PT = 396.95

/** @param {number} pct 0-100 @returns {number} pt along the tag's width */
export function pctToPtX(pct) {
  return (pct / 100) * TAG_WIDTH_PT
}

/** @param {number} pct 0-100 @returns {number} pt along the tag's height */
export function pctToPtY(pct) {
  return (pct / 100) * TAG_HEIGHT_PT
}

/**
 * @param {{ xPct: number, yPct: number, wPct: number, hPct: number }} box
 * @returns {{ left: number, top: number, width: number, height: number }} pt
 */
export function boxToPt({ xPct, yPct, wPct, hPct }) {
  return {
    left: pctToPtX(xPct),
    top: pctToPtY(yPct),
    width: pctToPtX(wPct),
    height: pctToPtY(hPct),
  }
}

/**
 * Display label for a checkpoint-box role. Delegates to
 * `checkpointLabels` so a role's text stays correct as `checkpointCount`
 * changes (e.g. a single checkpoint reads "Check Point", not "CP1").
 * @param {string} role one of CHECKPOINT_ROLES
 * @param {number} checkpointCount 1-4
 * @returns {string}
 */
export function checkpointBoxLabel(role, checkpointCount) {
  if (role === 'start') return 'Start'
  if (role === 'finish') return 'Finish'
  const index = CHECKPOINT_ROLES.indexOf(role) - 1 // cp1 -> 0, cp2 -> 1, ...
  return checkpointLabels(checkpointCount)[index] ?? ''
}

/**
 * Filters a template's elements down to what a given category should show:
 * every custom image/text element, plus only the checkpoint-box roles up to
 * `checkpointCount` (start and finish always show).
 * @param {Array<object>} elements
 * @param {number} checkpointCount 1-4
 * @returns {Array<object>}
 */
export function visibleElements(elements, checkpointCount) {
  const visibleCpRoles = new Set(['start', 'finish', ...CHECKPOINT_ROLES.slice(1, 1 + checkpointCount)])
  return elements.filter((el) => el.type !== 'checkpointBox' || visibleCpRoles.has(el.role))
}

/** Old fixed-band proportions (header 70pt / number flex / checkpoint row
 *  ~68pt / footer 70pt out of a 396.95pt tag), kept only so a first-time
 *  template, a post-reset template, and a migrated pre-freeform config all
 *  land in the same visual arrangement. */
export const HEADER_BAND_PCT = 17.6
export const FOOTER_BAND_PCT = 17.6

const SLOT_MARGIN_PCT = 4
const SLOT_GAP_PCT = 1.5
const SLOT_COUNT = CHECKPOINT_ROLES.length
const SLOT_WIDTH_PCT = (100 - 2 * SLOT_MARGIN_PCT - (SLOT_COUNT - 1) * SLOT_GAP_PCT) / SLOT_COUNT
const SLOT_Y_PCT = 66
const SLOT_HEIGHT_PCT = 14

/**
 * Default structural layout — mirrors the old fixed-band design (header /
 * number centered / checkpoint boxes in a row / footer) so a brand-new
 * template and a post-reset template look like the pre-freeform BIB tag.
 * @returns {Array<object>} bibNumber + one checkpointBox per role
 */
export function defaultStructuralElements() {
  const checkpointBoxes = CHECKPOINT_ROLES.map((role, index) => ({
    id: role,
    type: 'checkpointBox',
    role,
    xPct: SLOT_MARGIN_PCT + index * (SLOT_WIDTH_PCT + SLOT_GAP_PCT),
    yPct: SLOT_Y_PCT,
    wPct: SLOT_WIDTH_PCT,
    hPct: SLOT_HEIGHT_PCT,
    fontSize: 9,
    zIndex: 1,
  }))

  const bibNumber = {
    id: 'bibNumber',
    type: 'bibNumber',
    xPct: 20,
    yPct: HEADER_BAND_PCT + 2,
    wPct: 60,
    hPct: SLOT_Y_PCT - HEADER_BAND_PCT - 4,
    fontSize: 64,
    fontWeight: 700,
    color: '#000000',
    align: 'center',
    zIndex: 1,
  }

  return [...checkpointBoxes, bibNumber]
}
