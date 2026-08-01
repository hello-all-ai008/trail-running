import { useEffect, useState } from 'react'
import { CATEGORIES } from '../lib/raceData'
import { distanceFromCategory } from '../lib/bibNumbering'

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
 * @returns {{ headerImage: string|null, footerImage: string|null, categories: BibCategoryConfig[] }}
 */
function defaultConfig() {
  return {
    headerImage: null,
    footerImage: null,
    categories: CATEGORIES.map((code) => ({
      id: crypto.randomUUID(),
      distanceKm: distanceFromCategory(code),
      checkpointCount: 1,
      prefix: '',
      totalDigits: 4,
      startSeq: 1,
    })),
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
 * Read + parse a localStorage key, falling back to a default on any error.
 * Mirrors useRaceState.js's readStored — same defensive shape, own key.
 * Migrates any old-shape (`code`-keyed) category rows to the new
 * `id`/`distanceKm` shape right after parsing, before the value is used as
 * initial state.
 * @param {() => { headerImage: string|null, footerImage: string|null, categories: BibCategoryConfig[] }} makeFallback
 * @returns {{ headerImage: string|null, footerImage: string|null, categories: BibCategoryConfig[] }}
 */
function readStored(makeFallback) {
  if (typeof window === 'undefined') return makeFallback()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return makeFallback()
    const parsed = JSON.parse(raw)
    return {
      ...parsed,
      categories: (parsed.categories ?? []).map(migrateCategory),
    }
  } catch {
    return makeFallback()
  }
}

/**
 * Owns the Custom BIB PDF generator's draft state (header/footer banner
 * images + per-distance numbering/checkpoint settings), persisted to
 * localStorage so an in-progress design survives a refresh.
 */
export function useBibConfig() {
  const [config, setConfig] = useState(() => readStored(defaultConfig))

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  }, [config])

  /** @param {string|null} headerImage */
  const setHeaderImage = (headerImage) => setConfig((c) => ({ ...c, headerImage }))
  /** @param {string|null} footerImage */
  const setFooterImage = (footerImage) => setConfig((c) => ({ ...c, footerImage }))

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
        {
          id: crypto.randomUUID(),
          distanceKm: null,
          checkpointCount: 1,
          prefix: '',
          totalDigits: 4,
          startSeq: 1,
        },
      ],
    }))

  /** @param {string} id */
  const removeCategory = (id) =>
    setConfig((c) => ({
      ...c,
      categories: c.categories.filter((cat) => cat.id !== id),
    }))

  return { config, setHeaderImage, setFooterImage, updateCategory, addCategory, removeCategory }
}
