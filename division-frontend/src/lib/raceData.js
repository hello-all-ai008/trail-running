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
 * @property {string} category  real category code, e.g. 'BP10' | 'BP5'
 * @property {string|null} startTime  ISO — mass-start gun time for the category
 * @property {string|null} checkin
 * @property {Record<string, string>} cps  checkpoint id -> ISO time
 * @property {string|null} finish
 */

/** @type {ReadonlyArray<Runner>} */
export const initialRunners = runnersJson

/**
 * Real category codes derived from whatever runners are actually loaded —
 * the correct source of truth for staff pages (Dashboard, Runners, Monitor,
 * Results), which always have a live `runners` array to read from. See
 * results.js's computeRanks for the pattern this mirrors.
 * @param {ReadonlyArray<{ category: string }>} runners
 * @returns {string[]}
 */
export function categoriesFromRunners(runners) {
  return [...new Set(runners.map((r) => r.category))].sort()
}

/**
 * Static fallback category list — used only where there is no live data to
 * derive from, i.e. the public /register page (unauthenticated, and
 * `race_categories` has no anon-read RLS policy). Keep in sync with the
 * active event's real category codes by hand.
 */
export const REGISTRATION_CATEGORIES = ['BP10', 'BP5']

/**
 * Demographic vocabulary shared by the public registration form and the
 * results page. Mirrored by hand in SQL CHECK constraints —
 * supabase/migrations/0001_init.sql:48 and 0004_registrations.sql:12.
 * Adding a gender is a two-place change (here + a migration).
 */
export const GENDERS = ['Male', 'Female', 'LGBTIQAN+']

/**
 * Age brackets in ascending order; `minAge` is the inclusive lower bound.
 * Doubles as the display/sort order. Keys are the exact strings used in
 * src/data/runners.json and in the `age_group` column, so a registration
 * slots straight into the same rankings as the seeded event.
 */
export const AGE_BRACKETS = [
  { key: '20-39', minAge: 0 },
  { key: '40-49', minAge: 40 },
  { key: '50-59', minAge: 50 },
  { key: '60 Plus', minAge: 60 },
]

/** @type {ReadonlyArray<string>} */
export const AGE_GROUPS = AGE_BRACKETS.map((b) => b.key)

/** Imported records may carry an empty gender/ageGroup — e.g. BIB 5050. */
export const UNSPECIFIED = ''
export const UNSPECIFIED_LABEL = 'ไม่ระบุ'

const GENDER_TH = { Male: 'ชาย', Female: 'หญิง', 'LGBTIQAN+': 'LGBTIQAN+' }

/**
 * Thai display label for a gender value. Unknown values pass through so a new
 * backend value shows up instead of silently reading as "unspecified".
 * @param {string} value
 * @returns {string}
 */
export function genderLabel(value) {
  if (!value) return UNSPECIFIED_LABEL
  return GENDER_TH[value] ?? value
}

/**
 * Display label for an age bracket. Brackets stay untranslated on purpose
 * ('60 Plus', not '60 ปีขึ้นไป') so group headers, the e-Slip, the CSV export
 * and the source Excel all read identically — do not "fix" this to Thai.
 * @param {string} value
 * @returns {string}
 */
export function ageGroupLabel(value) {
  return value || UNSPECIFIED_LABEL
}

/**
 * Real checkpoints for the active event — empty until Baanpong 2026's course
 * checkpoints are defined (no rows in the `checkpoints` table yet). Do not
 * hardcode placeholder checkpoints here; Runner Flow / Check Point station
 * degrade gracefully to a start/finish-only view when this is empty.
 */
export const CHECKPOINTS = []

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
 * RFC 4180 field — quoted only when it contains a separator, a quote, a line
 * break, or edge whitespace. Runner and registration names are free text, and
 * one comma would silently shift every column to its right.
 * @param {unknown} value
 * @returns {string}
 */
export function csvCell(value) {
  const s = value === null || value === undefined ? '' : String(value)
  return /[",\r\n]|^\s|\s$/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
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
