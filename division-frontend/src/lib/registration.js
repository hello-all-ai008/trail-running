/**
 * Public runner-registration helpers for the pre-race sign-up surface.
 * Frontend-only: submissions persist to localStorage as "pending" records
 * for staff to later review and assign a BIB (step 2 of the workflow).
 * No React, no side effects beyond the explicit localStorage read/write.
 */

import { AGE_BRACKETS, UNSPECIFIED } from './raceData'

const STORAGE_KEY = 'tt:v1:registrations'

/**
 * Age-group bracket derived from a date of birth, driven by the shared
 * AGE_BRACKETS vocabulary in raceData.js — so registrations slot into the same
 * category/age rankings as the seeded event. Anyone under 40 (including
 * under-20) folds into the youngest '20-39' bracket, since that is the youngest
 * bracket the real dataset uses.
 * A future date of birth is treated as invalid input rather than folded into
 * the youngest bracket — it yields a negative age, which matches no bracket.
 * @param {string} dobString  ISO date (yyyy-mm-dd) from a date input
 * @returns {string}  a bracket key, or UNSPECIFIED for a missing/invalid/future date
 */
export function computeAgeGroup(dobString) {
  const dob = new Date(dobString)
  if (!dobString || Number.isNaN(dob.getTime())) return UNSPECIFIED

  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const monthDelta = now.getMonth() - dob.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) age -= 1

  // findLast returns undefined for a negative age — never dereference it blindly,
  // or a mistyped year silently throws out of the whole submit handler.
  return AGE_BRACKETS.findLast((b) => age >= b.minAge)?.key ?? UNSPECIFIED
}

/**
 * Build an immutable pending-registration record from validated form values.
 * @param {Record<string, string|boolean>} formValues
 * @returns {Readonly<Record<string, unknown>>}
 */
export function buildRegistration(formValues) {
  return Object.freeze({
    id: crypto.randomUUID(),
    submittedAt: new Date().toISOString(),
    ...formValues,
    ageGroup: computeAgeGroup(String(formValues.dob ?? '')),
    status: 'pending',
  })
}

/**
 * Maps an in-memory registration record (camelCase, from buildRegistration)
 * to the `registrations` table's column names for a Supabase insert.
 * @param {Record<string, unknown>} record
 * @param {'web'|'google_form'} [source]
 * @returns {Record<string, unknown>}
 */
export function toRegistrationRow(record, source = 'web') {
  return {
    id: record.id,
    full_name: record.fullName,
    name_on_bib: record.nameOnBib,
    gender: record.gender,
    dob: record.dob || null,
    age_group: record.ageGroup,
    nationality: record.nationality,
    category_code: record.category,
    phone: record.phone,
    email: record.email,
    emergency_name: record.emergencyName,
    emergency_phone: record.emergencyPhone,
    shirt_size: record.shirtSize,
    accept_waiver: Boolean(record.acceptWaiver),
    source,
    status: record.status,
  }
}

/**
 * Read all stored registrations, falling back to an empty list on any error.
 * @returns {Array<Record<string, unknown>>}
 */
export function readRegistrations() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * Append a registration record immutably and persist the new list.
 * @param {Record<string, unknown>} record
 * @returns {Array<Record<string, unknown>>}  the updated list
 */
export function saveRegistration(record) {
  const next = [...readRegistrations(), record]
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }
  return next
}
