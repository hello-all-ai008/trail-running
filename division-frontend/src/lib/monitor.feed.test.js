import { describe, it, expect } from 'vitest'
import { EMPTY_FILTER } from './results'
import { buildMonitorFeed } from './monitor'

const START = '2024-09-15T05:30:00'

/** Minimal deterministic runner — no timing fields required for the feed. */
function makeRunner({ bib, gender = 'Male', ageGroup = '20-39', category = 'MKT33' }) {
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
    checkin: null,
    cps: {},
    finish: null,
  }
}

function scan({ bib, name, time, station = 'Finish', ok = true }) {
  return { time, station, bib, name: name ?? `RUNNER ${bib}`, ok }
}

describe('buildMonitorFeed', () => {
  it('groups accepted scans by the resolved runner division', () => {
    const runners = [
      makeRunner({ bib: '3301' }),
      makeRunner({ bib: '3302', gender: 'Female' }),
    ]
    const scanLog = [
      scan({ bib: '3301', time: '2024-09-15T10:00:00Z', station: 'Finish' }),
      scan({ bib: '3302', time: '2024-09-15T10:05:00Z', station: 'A1 Mae Kha Nin' }),
    ]
    const view = buildMonitorFeed({ runners, scanLog, filter: EMPTY_FILTER })
    expect(view.cards.map((c) => c.label).sort()).toEqual([
      'MKT33 · ชาย · 20-39',
      'MKT33 · หญิง · 20-39',
    ])
    expect(view.cardCount).toBe(2)
  })

  it('excludes ok: false entries', () => {
    const runners = [makeRunner({ bib: '3301' })]
    const scanLog = [
      scan({ bib: '3301', time: '2024-09-15T10:00:00Z' }),
      scan({ bib: '3301', time: '2024-09-15T10:01:00Z', ok: false }),
    ]
    const view = buildMonitorFeed({ runners, scanLog, filter: EMPTY_FILTER })
    expect(view.cards[0].total).toBe(1)
  })

  it('badge total equals entries.length, unsliced', () => {
    const runners = [makeRunner({ bib: '3301' })]
    const scanLog = Array.from({ length: 8 }, (_, i) =>
      scan({ bib: '3301', time: `2024-09-15T10:${String(i).padStart(2, '0')}:00Z` }),
    )
    const view = buildMonitorFeed({ runners, scanLog, filter: EMPTY_FILTER })
    expect(view.cards[0].total).toBe(8)
    expect(view.cards[0].entries).toHaveLength(8)
  })

  it('sorts entries newest first regardless of scanLog order', () => {
    const runners = [makeRunner({ bib: '3301' })]
    const scanLog = [
      scan({ bib: '3301', time: '2024-09-15T10:00:00Z' }),
      scan({ bib: '3301', time: '2024-09-15T12:00:00Z' }),
      scan({ bib: '3301', time: '2024-09-15T11:00:00Z' }),
    ]
    const view = buildMonitorFeed({ runners, scanLog, filter: EMPTY_FILTER })
    expect(view.cards[0].entries.map((e) => e.time)).toEqual([
      '2024-09-15T12:00:00Z',
      '2024-09-15T11:00:00Z',
      '2024-09-15T10:00:00Z',
    ])
  })

  it('gives one bib scanning at two stations two distinct entries with distinct ids', () => {
    const runners = [makeRunner({ bib: '3301' })]
    const scanLog = [
      scan({ bib: '3301', time: '2024-09-15T06:00:00Z', station: 'Check-in' }),
      scan({ bib: '3301', time: '2024-09-15T10:00:00Z', station: 'Finish' }),
    ]
    const view = buildMonitorFeed({ runners, scanLog, filter: EMPTY_FILTER })
    const ids = view.cards[0].entries.map((e) => e.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('excludes an unmatched bib without throwing', () => {
    const runners = [makeRunner({ bib: '3301' })]
    const scanLog = [scan({ bib: '9999', time: '2024-09-15T10:00:00Z' })]
    expect(() => buildMonitorFeed({ runners, scanLog, filter: EMPTY_FILTER })).not.toThrow()
    const view = buildMonitorFeed({ runners, scanLog, filter: EMPTY_FILTER })
    expect(view.cards).toEqual([])
  })

  it('applies the filter to scan entries via the resolved runner', () => {
    const runners = [
      makeRunner({ bib: '3301', category: 'MKT33' }),
      makeRunner({ bib: '5001', category: 'MKT50' }),
    ]
    const scanLog = [
      scan({ bib: '3301', time: '2024-09-15T10:00:00Z' }),
      scan({ bib: '5001', time: '2024-09-15T10:01:00Z' }),
    ]
    const view = buildMonitorFeed({ runners, scanLog, filter: { ...EMPTY_FILTER, category: 'MKT50' } })
    expect(view.cards).toHaveLength(1)
    expect(view.cards[0].entries[0].bib).toBe('5001')
  })

  it('sorts a blank ageGroup division last, same as podium', () => {
    const runners = [
      makeRunner({ bib: '3301', ageGroup: '60 Plus' }),
      makeRunner({ bib: '3302', ageGroup: '' }),
      makeRunner({ bib: '3303', ageGroup: '20-39' }),
    ]
    const scanLog = [
      scan({ bib: '3301', time: '2024-09-15T10:00:00Z' }),
      scan({ bib: '3302', time: '2024-09-15T10:01:00Z' }),
      scan({ bib: '3303', time: '2024-09-15T10:02:00Z' }),
    ]
    const view = buildMonitorFeed({ runners, scanLog, filter: EMPTY_FILTER })
    expect(view.cards.map((c) => c.label)).toEqual([
      'MKT33 · ชาย · 20-39',
      'MKT33 · ชาย · 60 Plus',
      'MKT33 · ชาย · ไม่ระบุ',
    ])
  })

  it('returns no cards for an empty scan log', () => {
    const view = buildMonitorFeed({ runners: [makeRunner({ bib: '3301' })], scanLog: [], filter: EMPTY_FILTER })
    expect(view.cards).toEqual([])
    expect(view.cardCount).toBe(0)
  })
})
