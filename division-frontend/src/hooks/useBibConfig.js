import { useEffect, useState } from 'react'
import { CATEGORIES } from '../lib/raceData'

const STORAGE_KEY = 'tt:v1:bibConfig'

/**
 * @typedef {Object} BibCategoryConfig
 * @property {string} code
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
      code,
      checkpointCount: 1,
      prefix: '',
      totalDigits: 4,
      startSeq: 1,
    })),
  }
}

/**
 * Read + parse a localStorage key, falling back to a default on any error.
 * Mirrors useRaceState.js's readStored — same defensive shape, own key.
 * @template T
 * @param {() => T} makeFallback
 * @returns {T}
 */
function readStored(makeFallback) {
  if (typeof window === 'undefined') return makeFallback()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : makeFallback()
  } catch {
    return makeFallback()
  }
}

/**
 * Owns the Custom BIB PDF generator's draft state (header/footer banner
 * images + per-category numbering/checkpoint settings), persisted to
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
   * @param {string} code
   * @param {Partial<BibCategoryConfig>} patch
   */
  const updateCategory = (code, patch) =>
    setConfig((c) => ({
      ...c,
      categories: c.categories.map((cat) => (cat.code === code ? { ...cat, ...patch } : cat)),
    }))

  return { config, setHeaderImage, setFooterImage, updateCategory }
}
