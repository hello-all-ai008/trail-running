import { describe, it, expect } from 'vitest'
import { computeRanks, EMPTY_FILTER, FILTER_UNSPECIFIED } from './results'
import { MONITOR_TOP_N, buildMonitorOverall, buildMonitorPodium, diffIds } from './monitor'

const START = '2024-09-15T05:30:00'

/** Minimal deterministic finisher — same shape as runners.json records. */
function makeFinisher({ bib, gender = 'Male', ageGroup = '20-39', category = 'MKT33', hours = 6 }) {
  const finish = new Date(new Date(START).getTime() + hours * 3600_000).toISOString()
  return {
    bib,
    barcode: `*${bib}*`,
    name: `RUNNER ${bib}`,
    nameOnBib: `RUNNER ${bib}`,
    gender,
    ageGroup,
    nationality: 'Thai',
    category,
    startTime: START,
    checkin: START,
    cps: {},
    finish,
  }
}

/** Mirrors results.test.js's fixture: two distances, three genders, a blank bracket. */
function field() {
  return [
    makeFinisher({ bib: '3301', hours: 5 }),
    makeFinisher({ bib: '3302', hours: 6 }),
    makeFinisher({ bib: '3303', gender: 'Female', hours: 7 }),
    makeFinisher({ bib: '3304', gender: 'Female', ageGroup: '40-49', hours: 8 }),
    makeFinisher({ bib: '3305', gender: 'LGBTIQAN+', ageGroup: '60 Plus', hours: 9 }),
    makeFinisher({ bib: '5001', category: 'MKT50', hours: 10 }),
    makeFinisher({ bib: '5002', category: 'MKT50', gender: 'Female', hours: 11 }),
    makeFinisher({ bib: '5050', category: 'MKT50', gender: 'LGBTIQAN+', ageGroup: '', hours: 12 }),
  ]
}

/** A single division with many finishers, gun times strictly ascending by bib order. */
function bigDivision(count) {
  return Array.from({ length: count }, (_, i) =>
    makeFinisher({ bib: `D${String(i + 1).padStart(2, '0')}`, hours: 5 + i * 0.1 }),
  )
}

const podium = (overrides = {}) => {
  const finishers = overrides.finishers ?? field()
  return buildMonitorPodium({
    finishers,
    ranks: computeRanks(finishers),
    filter: overrides.filter ?? EMPTY_FILTER,
    ...(overrides.limit !== undefined ? { limit: overrides.limit } : {}),
  })
}

describe('buildMonitorPodium', () => {
  it('slices to the top N and no further', () => {
    const view = podium({ finishers: bigDivision(18) })
    expect(view.cards).toHaveLength(1)
    expect(view.cards[0].rows).toHaveLength(MONITOR_TOP_N)
  })

  it('keeps `total` as the pre-slice count for a division with 18 finishers', () => {
    const view = podium({ finishers: bigDivision(18) })
    expect(view.cards[0].total).toBe(18)
    expect(view.cards[0].rows).toHaveLength(5)
  })

  it('produces no card for a division with zero finishers (empty field)', () => {
    const view = podium({ finishers: [] })
    expect(view.cards).toEqual([])
    expect(view.cardCount).toBe(0)
  })

  it('numbers rows by real field-wide rank, 1..N for a full division', () => {
    const view = podium({ finishers: bigDivision(18) })
    view.cards[0].rows.forEach((row, i) => {
      expect(row.awardRank).toBe(i + 1)
    })
  })

  it('orders cards the same way groupFinishers does, blank bracket last', () => {
    const view = podium()
    expect(view.cards.map((c) => c.label)).toEqual([
      'MKT33 · ชาย · 20-39',
      'MKT33 · หญิง · 20-39',
      'MKT33 · หญิง · 40-49',
      'MKT33 · LGBTIQAN+ · 60 Plus',
      'MKT50 · ชาย · 20-39',
      'MKT50 · หญิง · 20-39',
      'MKT50 · LGBTIQAN+ · ไม่ระบุ',
    ])
  })

  // MKT50 has exactly 3 finishers total in this fixture (5001, 5002, 5050),
  // so every one of them is automatically that category's overall top-3 and
  // therefore overall-exempt from division awards — the "fully exempt
  // division" edge case, exercised deliberately here rather than avoided.
  it('gives the blank bracket a real card, never a dangling one — even with zero eligible rows', () => {
    const view = podium()
    const blank = view.cards.at(-1)
    expect(blank.label).toBe('MKT50 · LGBTIQAN+ · ไม่ระบุ')
    expect(blank.total).toBe(1)
    expect(blank.exemptCount).toBe(1)
    expect(blank.rows).toEqual([])
  })

  it('FILTER_UNSPECIFIED isolates the blank bracket (card still renders with zero eligible rows)', () => {
    const view = podium({ filter: { ...EMPTY_FILTER, ageGroups: [FILTER_UNSPECIFIED] } })
    expect(view.cards).toHaveLength(1)
    expect(view.cards[0].label).toBe('MKT50 · LGBTIQAN+ · ไม่ระบุ')
    expect(view.cards[0].total).toBe(1)
    expect(view.cards[0].rows).toEqual([])
  })

  it('honours a custom limit', () => {
    const view = podium({ finishers: bigDivision(18), limit: 3 })
    expect(view.cards[0].rows).toHaveLength(3)
    expect(view.cards[0].total).toBe(18)
  })

  it('reports isFiltered/activeFilters for exactly the non-ANY dimensions', () => {
    const plain = podium()
    expect(plain.isFiltered).toBe(false)
    expect(plain.activeFilters).toEqual([])

    const filtered = podium({ filter: { category: 'MKT33', gender: 'Female', ageGroups: [] } })
    expect(filtered.isFiltered).toBe(true)
    expect(filtered.activeFilters).toEqual([
      { key: 'category', label: 'MKT33' },
      { key: 'gender', label: 'หญิง' },
    ])
  })

  it('totalFinishers is the unfiltered field size', () => {
    const view = podium({ filter: { ...EMPTY_FILTER, category: 'MKT50' } })
    expect(view.totalFinishers).toBe(8)
  })
})

describe('diffIds', () => {
  it('detects an id newly present in nextIds', () => {
    const prev = new Set(['A'])
    const next = new Set(['A', 'B'])
    expect(diffIds(prev, next)).toEqual(new Set(['B']))
  })

  it('does not flag an id present in both as new', () => {
    const prev = new Set(['A', 'B'])
    const next = new Set(['A', 'B'])
    expect(diffIds(prev, next)).toEqual(new Set())
  })

  it('ignores an id removed from next (no longer present)', () => {
    const prev = new Set(['A', 'B'])
    const next = new Set(['A'])
    expect(diffIds(prev, next)).toEqual(new Set())
  })

  it('returns empty when both are empty', () => {
    expect(diffIds(new Set(), new Set())).toEqual(new Set())
  })
})

/**
 * MKT33 only, 6 finishers across two gender groups. Fastest 3 overall
 * (regardless of gender) are M1, M2, F1 — verified by hand from `hours`.
 */
function eligibilityField() {
  return [
    makeFinisher({ bib: 'M1', gender: 'Male', ageGroup: '20-39', hours: 5 }),   // category overall #1
    makeFinisher({ bib: 'M2', gender: 'Male', ageGroup: '20-39', hours: 6 }),   // category overall #2
    makeFinisher({ bib: 'F1', gender: 'Female', ageGroup: '20-39', hours: 7 }), // category overall #3
    makeFinisher({ bib: 'M3', gender: 'Male', ageGroup: '20-39', hours: 8 }),   // overall #4 — division-eligible
    makeFinisher({ bib: 'M4', gender: 'Male', ageGroup: '20-39', hours: 9 }),   // overall #5
    makeFinisher({ bib: 'F2', gender: 'Female', ageGroup: '20-39', hours: 10 }), // overall #6
  ]
}

/**
 * A division (LGBTIQAN+ · 60 Plus) with exactly one member, who happens to be
 * the fastest in the category — so their division is left with zero eligible
 * award recipients after exclusion.
 */
function fullyExemptDivisionField() {
  return [
    makeFinisher({ bib: 'X1', gender: 'LGBTIQAN+', ageGroup: '60 Plus', hours: 4 }), // category overall #1, alone in its division
    makeFinisher({ bib: 'M1', gender: 'Male', ageGroup: '20-39', hours: 5 }),        // overall #2
    makeFinisher({ bib: 'M2', gender: 'Male', ageGroup: '20-39', hours: 6 }),        // overall #3
    makeFinisher({ bib: 'M3', gender: 'Male', ageGroup: '20-39', hours: 7 }),        // overall #4 — division-eligible
  ]
}

describe('buildMonitorPodium — division-eligibility (overall top-3 exclusion)', () => {
  it('excludes overall-exempt runners from their division and renumbers the rest', () => {
    const finishers = eligibilityField()
    const view = podium({ finishers })

    const maleDivision = view.cards.find((c) => c.label === 'MKT33 · ชาย · 20-39')
    expect(maleDivision.total).toBe(4) // M1,M2,M3,M4
    expect(maleDivision.exemptCount).toBe(2) // M1, M2
    expect(maleDivision.rows.map((r) => r.runner.bib)).toEqual(['M3', 'M4'])
    expect(maleDivision.rows.map((r) => r.awardRank)).toEqual([1, 2])

    const femaleDivision = view.cards.find((c) => c.label === 'MKT33 · หญิง · 20-39')
    expect(femaleDivision.total).toBe(2) // F1,F2
    expect(femaleDivision.exemptCount).toBe(1) // F1
    expect(femaleDivision.rows.map((r) => r.runner.bib)).toEqual(['F2'])
    expect(femaleDivision.rows.map((r) => r.awardRank)).toEqual([1])
  })

  it('never lets an overall-exempt bib appear in any division card', () => {
    const finishers = eligibilityField()
    const view = podium({ finishers })
    const allDivisionBibs = view.cards.flatMap((c) => c.rows.map((r) => r.runner.bib))
    expect(allDivisionBibs).not.toContain('M1')
    expect(allDivisionBibs).not.toContain('M2')
    expect(allDivisionBibs).not.toContain('F1')
  })

  it('leaves total (the badge count) unaffected by exclusion', () => {
    const view = podium({ finishers: eligibilityField() })
    const maleDivision = view.cards.find((c) => c.label === 'MKT33 · ชาย · 20-39')
    expect(maleDivision.total).toBe(4)
  })

  it('renders zero eligible rows (not a crash) when a division is fully consumed by exemption', () => {
    const view = podium({ finishers: fullyExemptDivisionField() })
    const soloDivision = view.cards.find((c) => c.label === 'MKT33 · LGBTIQAN+ · 60 Plus')
    expect(soloDivision).toBeDefined()
    expect(soloDivision.total).toBe(1)
    expect(soloDivision.exemptCount).toBe(1)
    expect(soloDivision.rows).toEqual([])

    const maleDivision = view.cards.find((c) => c.label === 'MKT33 · ชาย · 20-39')
    expect(maleDivision.total).toBe(3)
    expect(maleDivision.exemptCount).toBe(2) // X1's category overall #1 doesn't count here — only M1,M2 (overall #2,#3) are Male-division members who are exempt
    expect(maleDivision.rows.map((r) => r.runner.bib)).toEqual(['M3'])
  })
})

describe('buildMonitorOverall', () => {
  it('takes exactly the top N per category by rankCategory', () => {
    const finishers = field()
    const view = buildMonitorOverall({ finishers, ranks: computeRanks(finishers), filter: EMPTY_FILTER })
    const mkt33 = view.cards.find((c) => c.label === 'MKT33')
    const mkt50 = view.cards.find((c) => c.label === 'MKT50')
    expect(mkt33.rows.map((r) => r.runner.bib)).toEqual(['3301', '3302', '3303'])
    expect(mkt50.rows.map((r) => r.runner.bib)).toEqual(['5001', '5002', '5050'])
  })

  it('ignores gender/ageGroups/query filters — only category narrows it', () => {
    const finishers = field()
    const ranks = computeRanks(finishers)
    const unfiltered = buildMonitorOverall({ finishers, ranks, filter: EMPTY_FILTER })
    const genderFiltered = buildMonitorOverall({
      finishers, ranks, filter: { ...EMPTY_FILTER, gender: 'Female' },
    })
    expect(genderFiltered.cards).toEqual(unfiltered.cards)
  })

  it("category filter hides the other distance's overall card", () => {
    const finishers = field()
    const view = buildMonitorOverall({
      finishers, ranks: computeRanks(finishers), filter: { ...EMPTY_FILTER, category: 'MKT50' },
    })
    expect(view.cards.map((c) => c.label)).toEqual(['MKT50'])
  })

  it('returns no cards for an empty field', () => {
    const view = buildMonitorOverall({ finishers: [], ranks: {}, filter: EMPTY_FILTER })
    expect(view.cards).toEqual([])
    expect(view.cardCount).toBe(0)
  })
})
