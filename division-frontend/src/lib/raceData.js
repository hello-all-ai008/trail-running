/**
 * Race data + pure helpers for the multi-page timing app.
 * Runner database extracted from data/Timing System.xlsx (real event:
 * Baan Pong Cross Country "Mae Kha Nin", 2024-09-15) via scripts/extract_runners.py.
 * No React, no side effects.
 */

import runnersJson from '../data/runners.json'

/**
 * @typedef {Object} Runner
 * @property {string} bib
 * @property {string} barcode   e.g. "*3315*"
 * @property {string} name
 * @property {string} nameOnBib
 * @property {string} gender    'Male' | 'Female' | 'LGBTIQAN+'
 * @property {string} ageGroup
 * @property {string} nationality
 * @property {string} category  'MKT33' | 'MKT50'
 * @property {string|null} startTime  ISO — mass-start gun time for the category
 * @property {string|null} checkin
 * @property {Record<string, string>} cps  checkpoint id -> ISO time
 * @property {string|null} finish
 */

/** @type {ReadonlyArray<Runner>} */
export const initialRunners = runnersJson

export const CATEGORIES = ['MKT33', 'MKT50']

export const CHECKPOINTS = [
  { id: 'A1', name: 'A1 Mae Kha Nin' },
  { id: 'A2', name: 'A2 Doi Pha Daeng' },
  { id: 'A3', name: 'A3 Huai Nam Sai' },
]

export const STATIONS = {
  CHECKIN: 'Check-in',
  FINISH: 'Finish',
}

/**
 * @param {string} id
 * @returns {string}
 */
export function cpName(id) {
  const cp = CHECKPOINTS.find((c) => c.id === id)
  return cp ? cp.name : id
}

/**
 * Time-of-day (HH:MM:SS) for an ISO timestamp.
 * @param {string|null} iso
 * @returns {string}
 */
export function fmtTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toTimeString().slice(0, 8)
}

/**
 * Duration between two ISO timestamps as HH:MM:SS.
 * @param {string|null} fromIso
 * @param {string|null} toIso
 * @returns {string}
 */
export function fmtDur(fromIso, toIso) {
  if (!fromIso || !toIso) return '—'
  const sec = Math.max(0, Math.floor((new Date(toIso) - new Date(fromIso)) / 1000))
  const h = String(Math.floor(sec / 3600)).padStart(2, '0')
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0')
  const s = String(sec % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

/**
 * Net race time in milliseconds — Finish − Start (gun time), matching the
 * Excel "Time Result" column. Null until finished.
 * @param {Runner} runner
 * @returns {number|null}
 */
export function totalMs(runner) {
  if (!runner.finish || !runner.startTime) return null
  return new Date(runner.finish) - new Date(runner.startTime)
}

/**
 * Formatted total time (gun) for a finished runner.
 * @param {Runner} runner
 * @returns {string}
 */
export function fmtTotal(runner) {
  return fmtDur(runner.startTime, runner.finish)
}

/**
 * Progress status for the database table.
 * @param {Runner} runner
 * @returns {{ key: string, label: string }}
 */
export function statusOf(runner) {
  if (runner.finish) return { key: 'FINISHED', label: 'Finished' }
  const cps = Object.keys(runner.cps)
  if (cps.length) return { key: 'ON_COURSE', label: `At ${cps.sort().pop()}` }
  if (runner.checkin) return { key: 'CHECKED_IN', label: 'Checked-in' }
  return { key: 'REGISTERED', label: 'Registered' }
}

/**
 * Locate a runner by BIB or barcode form ("3315" or "*3315*"), case-insensitive.
 * @param {ReadonlyArray<Runner>} runners
 * @param {string} value
 * @returns {Runner | undefined}
 */
export function findRunner(runners, value) {
  const v = String(value || '').trim().toUpperCase().replaceAll('*', '')
  if (!v) return undefined
  return runners.find((r) => r.bib === v || r.barcode.replaceAll('*', '') === v)
}

/**
 * CSV download helper (UTF-8 BOM for Thai text in Excel).
 * @param {string} filename
 * @param {string} text
 */
export function downloadCSV(filename, text) {
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
