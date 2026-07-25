import { describe, it, expect, afterEach, vi } from 'vitest'
import { computeAgeGroup } from './registration'

/**
 * Pins computeAgeGroup's boundaries now that it is driven by the shared
 * AGE_BRACKETS vocabulary in raceData.js instead of an inline if-chain.
 * Fake timers keep "today" fixed — no jsdom needed.
 */
const TODAY = new Date('2026-07-25T09:00:00Z')

function ageGroupAtAge(years, { monthOffset = 0, dayOffset = 0 } = {}) {
  vi.useFakeTimers()
  vi.setSystemTime(TODAY)
  const dob = new Date(
    TODAY.getFullYear() - years,
    TODAY.getMonth() + monthOffset,
    TODAY.getDate() + dayOffset,
  )
  const iso = `${dob.getFullYear()}-${String(dob.getMonth() + 1).padStart(2, '0')}-${String(dob.getDate()).padStart(2, '0')}`
  return computeAgeGroup(iso)
}

afterEach(() => {
  vi.useRealTimers()
})

describe('computeAgeGroup', () => {
  it('folds anyone under 40 into the youngest bracket', () => {
    expect(ageGroupAtAge(25)).toBe('20-39')
    expect(ageGroupAtAge(5)).toBe('20-39')
  })

  it('keeps exactly 39 in the youngest bracket', () => {
    expect(ageGroupAtAge(39)).toBe('20-39')
  })

  it('promotes exactly 40 to the next bracket', () => {
    expect(ageGroupAtAge(40)).toBe('40-49')
  })

  it('keeps exactly 59 in the 50-59 bracket', () => {
    expect(ageGroupAtAge(59)).toBe('50-59')
  })

  it('promotes exactly 60 to 60 Plus', () => {
    expect(ageGroupAtAge(60)).toBe('60 Plus')
  })

  it('does not count a birthday that has not happened yet this year', () => {
    // Born 40 calendar years ago but one day short of the birthday → still 39.
    expect(ageGroupAtAge(40, { dayOffset: 1 })).toBe('20-39')
  })

  it('returns an empty bracket for a missing or invalid date', () => {
    expect(computeAgeGroup('')).toBe('')
    expect(computeAgeGroup('not-a-date')).toBe('')
  })

  it('treats a future date of birth as unspecified instead of throwing', () => {
    vi.useFakeTimers()
    vi.setSystemTime(TODAY)
    // A mistyped year (1986 -> 2026) lands later in the current calendar year.
    expect(() => computeAgeGroup('2026-12-31')).not.toThrow()
    expect(computeAgeGroup('2026-12-31')).toBe('')
    expect(computeAgeGroup('2030-01-01')).toBe('')
  })
})
