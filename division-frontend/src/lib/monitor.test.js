import { describe, it, expect } from 'vitest'
import { computeRanks, EMPTY_FILTER, FILTER_UNSPECIFIED } from './results'
import { MONITOR_TOP_N, buildMonitorPodium, diffIds } from './monitor'

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
      expect(row.rankAge).toBe(i + 1)
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

  it('gives the blank bracket a real card, never a dangling one', () => {
    const view = podium()
    const blank = view.cards.at(-1)
    expect(blank.label).toBe('MKT50 · LGBTIQAN+ · ไม่ระบุ')
    expect(blank.total).toBe(1)
    expect(blank.rows).toHaveLength(1)
    expect(blank.rows[0].runner.bib).toBe('5050')
  })

  it('FILTER_UNSPECIFIED isolates the blank bracket', () => {
    const view = podium({ filter: { ...EMPTY_FILTER, ageGroup: FILTER_UNSPECIFIED } })
    expect(view.cards).toHaveLength(1)
    expect(view.cards[0].rows.map((r) => r.runner.bib)).toEqual(['5050'])
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

    const filtered = podium({ filter: { category: 'MKT33', gender: 'Female', ageGroup: '' } })
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
