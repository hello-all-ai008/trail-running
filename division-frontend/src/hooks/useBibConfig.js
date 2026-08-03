import { useEffect, useState } from 'react'
import { CATEGORIES } from '../lib/raceData'
import { distanceFromCategory } from '../lib/bibNumbering'
import {
  defaultStructuralElements,
  HEADER_BAND_PCT,
  FOOTER_BAND_PCT,
  STRUCTURAL_TYPES,
  isRemovableElement,
} from '../lib/bibTemplate'

const STORAGE_KEY = 'tt:v1:bibConfig'

/**
 * @typedef {Object} BibCategoryConfig
 * @property {string} id
 * @property {number|null} distanceKm
 * @property {number} checkpointCount  1-4
 * @property {string} prefix
 * @property {number} totalDigits
 * @property {number} startSeq
 */

/**
 * @typedef {Object} BibElement
 * @property {string} id
 * @property {'image'|'text'|'bibNumber'|'checkpointBox'} type
 * @property {number} xPct
 * @property {number} yPct
 * @property {number} wPct
 * @property {number} hPct
 * @property {number} zIndex
 * @property {string} [role]        checkpointBox only: 'start'|'cp1'..'cp4'|'finish'
 * @property {string} [src]         image only: data URL
 * @property {string} [text]        text only: editable content
 * @property {number} [fontSize]
 * @property {number} [fontWeight]
 * @property {string} [color]
 * @property {'left'|'center'|'right'} [align]
 */

/**
 * @returns {{ elements: BibElement[], categories: BibCategoryConfig[] }}
 */
export function defaultConfig() {
  return {
    elements: defaultStructuralElements(),
    categories: CATEGORIES.map((code) => {
      const distanceKm = distanceFromCategory(code)
      return {
        id: crypto.randomUUID(),
        distanceKm,
        checkpointCount: 1,
        prefix: distanceKm != null ? String(distanceKm)[0] : '',
        totalDigits: 4,
        startSeq: 1,
      }
    }),
  }
}

/**
 * Migrates a single stored category row from the old `code`-keyed shape to
 * the new `id` + `distanceKm` shape. Rows already in the new shape (they
 * carry `distanceKm`) pass through unchanged. Preserves any prefix/startSeq/
 * checkpointCount the admin already configured — only the identity fields
 * are re-keyed.
 * @param {object} entry
 * @returns {BibCategoryConfig}
 */
function migrateCategory(entry) {
  const isOldShape = entry && typeof entry === 'object' && entry.code && !('distanceKm' in entry)
  if (!isOldShape) return entry
  return {
    id: crypto.randomUUID(),
    distanceKm: distanceFromCategory(entry.code),
    checkpointCount: entry.checkpointCount,
    prefix: entry.prefix,
    totalDigits: entry.totalDigits,
    startSeq: entry.startSeq,
  }
}

/**
 * Migrates a pre-freeform config (flat `headerImage`/`footerImage` fields,
 * no `elements` array) into the elements-based shape: each banner becomes
 * an `image` element pinned to the old fixed band, and the structural
 * (bibNumber + checkpoint box) elements are seeded at their old default
 * position — so an in-progress design from before this change keeps
 * looking the same until the admin drags something. Configs that already
 * have `elements` pass through unchanged.
 * @param {object} parsed
 * @returns {{ elements: BibElement[] }}
 */
export function migrateElements(parsed) {
  if (Array.isArray(parsed.elements)) return { elements: parsed.elements }

  const elements = defaultStructuralElements()
  if (parsed.headerImage) {
    elements.push({
      id: crypto.randomUUID(),
      type: 'image',
      xPct: 0,
      yPct: 0,
      wPct: 100,
      hPct: HEADER_BAND_PCT,
      zIndex: 0,
      src: parsed.headerImage,
    })
  }
  if (parsed.footerImage) {
    elements.push({
      id: crypto.randomUUID(),
      type: 'image',
      xPct: 0,
      yPct: 100 - FOOTER_BAND_PCT,
      wPct: 100,
      hPct: FOOTER_BAND_PCT,
      zIndex: 0,
      src: parsed.footerImage,
    })
  }
  return { elements }
}

/**
 * Read + parse a localStorage key, falling back to a default on any error.
 * Mirrors useRaceState.js's readStored — same defensive shape, own key.
 * Migrates any old-shape category rows and any pre-freeform header/footer
 * config to the current shape right after parsing, before the value is
 * used as initial state.
 * @param {() => { elements: BibElement[], categories: BibCategoryConfig[] }} makeFallback
 * @returns {{ elements: BibElement[], categories: BibCategoryConfig[] }}
 */
function readStored(makeFallback) {
  if (typeof window === 'undefined') return makeFallback()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return makeFallback()
    const parsed = JSON.parse(raw)
    return {
      ...migrateElements(parsed),
      categories: (parsed.categories ?? []).map(migrateCategory),
    }
  } catch {
    return makeFallback()
  }
}

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * @param {BibElement[]} elements
 * @returns {number} one above the current highest zIndex (0 if empty)
 */
function nextZIndex(elements) {
  return elements.length === 0 ? 1 : Math.max(...elements.map((el) => el.zIndex)) + 1
}

/**
 * Owns the Custom BIB PDF generator's draft state — a freeform template of
 * `elements` (bib number, checkpoint boxes, and any admin-added images/text)
 * plus per-distance numbering/checkpoint settings — persisted to
 * localStorage so an in-progress design survives a refresh.
 */
export function useBibConfig() {
  const [config, setConfig] = useState(() => readStored(defaultConfig))

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  }, [config])

  /**
   * @param {string} id
   * @param {Partial<BibCategoryConfig>} patch
   */
  const updateCategory = (id, patch) =>
    setConfig((c) => ({
      ...c,
      categories: c.categories.map((cat) => (cat.id === id ? { ...cat, ...patch } : cat)),
    }))

  /** Appends a new, empty distance row for the admin to fill in. */
  const addCategory = () =>
    setConfig((c) => ({
      ...c,
      categories: [
        ...c.categories,
        { id: crypto.randomUUID(), distanceKm: null, checkpointCount: 1, prefix: '', totalDigits: 4, startSeq: 1 },
      ],
    }))

  /** @param {string} id */
  const removeCategory = (id) =>
    setConfig((c) => ({ ...c, categories: c.categories.filter((cat) => cat.id !== id) }))

  /** Reads an uploaded file and adds it as a freely-positioned image element. */
  const addImageElement = async (file) => {
    const src = await readFileAsDataURL(file)
    setConfig((c) => ({
      ...c,
      elements: [
        ...c.elements,
        { id: crypto.randomUUID(), type: 'image', xPct: 25, yPct: 40, wPct: 50, hPct: 20, zIndex: nextZIndex(c.elements), src },
      ],
    }))
  }

  /** Adds a blank, freely-positioned text element for the admin to edit. */
  const addTextElement = () =>
    setConfig((c) => ({
      ...c,
      elements: [
        ...c.elements,
        {
          id: crypto.randomUUID(),
          type: 'text',
          xPct: 25,
          yPct: 40,
          wPct: 50,
          hPct: 12,
          zIndex: nextZIndex(c.elements),
          text: 'ข้อความ',
          fontSize: 14,
          fontWeight: 400,
          color: '#000000',
          align: 'center',
        },
      ],
    }))

  /**
   * @param {string} id
   * @param {Partial<BibElement>} patch
   */
  const updateElement = (id, patch) =>
    setConfig((c) => ({ ...c, elements: c.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)) }))

  /** Removes an element — no-op for bibNumber/cp1-4, which aren't removable. */
  const removeElement = (id) =>
    setConfig((c) => ({
      ...c,
      elements: c.elements.filter((el) => el.id !== id || !isRemovableElement(el)),
    }))

  /** Re-adds a previously removed Start/Finish checkpoint box at its default
   *  position (the position it had before removal isn't remembered — same
   *  as addImageElement/addTextElement always starting fresh). No-op if
   *  already present.
   *  @param {'start'|'finish'} role */
  const addCheckpointBox = (role) =>
    setConfig((c) => {
      if (c.elements.some((el) => el.role === role)) return c
      const fresh = defaultStructuralElements().find((el) => el.role === role)
      return { ...c, elements: [...c.elements, { ...fresh, zIndex: nextZIndex(c.elements) }] }
    })

  /** @param {string} id @param {'front'|'back'} direction */
  const reorderElement = (id, direction) =>
    setConfig((c) => {
      const zIndexes = c.elements.map((el) => el.zIndex)
      const targetZ = direction === 'front' ? Math.max(0, ...zIndexes) + 1 : Math.min(0, ...zIndexes) - 1
      return { ...c, elements: c.elements.map((el) => (el.id === id ? { ...el, zIndex: targetZ } : el)) }
    })

  /** Resets bibNumber + checkpoint-box positions to default; leaves any
   *  custom image/text elements the admin added untouched. */
  const resetLayout = () =>
    setConfig((c) => ({
      ...c,
      elements: [...defaultStructuralElements(), ...c.elements.filter((el) => !STRUCTURAL_TYPES.includes(el.type))],
    }))

  return {
    config,
    updateCategory,
    addCategory,
    removeCategory,
    addImageElement,
    addTextElement,
    updateElement,
    removeElement,
    addCheckpointBox,
    reorderElement,
    resetLayout,
  }
}
