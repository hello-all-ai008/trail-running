import { describe, it, expect } from 'vitest'
import { findRunner, totalMs, fmtDur, statusOf } from './raceData'
import { applyCheckin, applyCheckpoint, applyFinish, seedScanLog } from './raceEngine'

/** Minimal deterministic fixture — same shape as runners.json records. */
function makeRunner(overrides = {}) {
  return {
    bib: '3381',
    barcode: '*3381*',
    name: 'JANTARABOON KIANGCHAIPAIPHANA',
    nameOnBib: 'JANTARABOON.K',
    gender: 'Male',
    ageGroup: '20-39',
    nationality: 'Thai',
    category: 'MKT33',
    startTime: '2024-09-15T05:30:00',
    checkin: null,
    cps: {},
    finish: null,
    ...overrides,
  }
}

function seed(overrides = {}) {
  return { runners: [makeRunner(overrides)], scanLog: [] }
}

const T = '2024-09-15T06:00:00.000Z'

describe('applyCheckin', () => {
  it('stamps check-in and logs ok, without mutating input', () => {
    const state = seed()
    const { state: next, result } = applyCheckin(state, '3381', T)

    expect(result.outcome).toBe('ok')
    expect(next.runners[0].checkin).toBe(T)
    expect(next.scanLog[0]).toMatchObject({ bib: '3381', station: 'Check-in', ok: true })
    // input untouched
    expect(state.runners[0].checkin).toBeNull()
    expect(state.scanLog).toHaveLength(0)
  })

  it('rejects duplicate check-in and keeps first time', () => {
    const state = seed({ checkin: '2024-09-15T05:28:00' })
    const { state: next, result } = applyCheckin(state, '3381', T)

    expect(result.outcome).toBe('duplicate')
    expect(next.runners[0].checkin).toBe('2024-09-15T05:28:00')
    expect(next.scanLog[0]).toMatchObject({ ok: false, msg: 'ซ้ำ' })
  })

  it('rejects unknown BIB and logs not-found', () => {
    const { state: next, result } = applyCheckin(seed(), '9999', T)
    expect(result.outcome).toBe('not-found')
    expect(next.scanLog[0]).toMatchObject({ bib: '9999', ok: false, msg: 'ไม่พบ' })
  })

  it('accepts barcode form *3381*', () => {
    const { result } = applyCheckin(seed(), '*3381*', T)
    expect(result.outcome).toBe('ok')
    expect(result.runner.bib).toBe('3381')
  })
})

describe('applyCheckpoint', () => {
  it('rejects checkpoint scan before check-in', () => {
    const { state: next, result } = applyCheckpoint(seed(), '3381', 'A1', T)
    expect(result.outcome).toBe('not-checked-in')
    expect(next.runners[0].cps).toEqual({})
    // cpName() falls back to the raw id when CHECKPOINTS has no matching
    // entry — expected, since CHECKPOINTS is empty until real event
    // checkpoints are configured (see raceData.js).
    expect(next.scanLog[0]).toMatchObject({ ok: false, msg: 'ยังไม่เช็คอิน', station: 'A1' })
  })

  it('stamps checkpoint after check-in; duplicate per CP rejected', () => {
    const state = seed({ checkin: '2024-09-15T05:28:00' })
    const first = applyCheckpoint(state, '3381', 'A1', T)
    expect(first.result.outcome).toBe('ok')
    expect(first.state.runners[0].cps.A1).toBe(T)

    const again = applyCheckpoint(first.state, '3381', 'A1', '2024-09-15T07:00:00.000Z')
    expect(again.result.outcome).toBe('duplicate')
    expect(again.state.runners[0].cps.A1).toBe(T) // first wins
  })
})

describe('applyFinish', () => {
  it('rejects finish before check-in', () => {
    const { result } = applyFinish(seed(), '3381', T)
    expect(result.outcome).toBe('not-checked-in')
  })

  it('stamps finish after check-in; first finish wins', () => {
    const state = seed({ checkin: '2024-09-15T05:28:00' })
    const first = applyFinish(state, '3381', T)
    expect(first.result.outcome).toBe('ok')
    expect(first.state.runners[0].finish).toBe(T)

    const again = applyFinish(first.state, '3381', '2024-09-15T09:00:00.000Z')
    expect(again.result.outcome).toBe('duplicate')
    expect(again.state.runners[0].finish).toBe(T)
  })
})

describe('gun-time total (matches Excel Time Result)', () => {
  it('computes Finish − Start, not Finish − Check-in', () => {
    const r = makeRunner({
      checkin: '2024-09-15T05:28:15',
      finish: '2024-09-15T08:52:37',
    })
    // 05:30:00 -> 08:52:37 = 03:22:37 gun time (Excel spot-check for BIB 3381)
    expect(fmtDur(r.startTime, r.finish)).toBe('03:22:37')
    expect(totalMs(r)).toBe((3 * 3600 + 22 * 60 + 37) * 1000)
  })
})

describe('statusOf / findRunner / seedScanLog', () => {
  it('walks status through the workflow', () => {
    expect(statusOf(makeRunner()).key).toBe('REGISTERED')
    expect(statusOf(makeRunner({ checkin: T })).key).toBe('CHECKED_IN')
    expect(statusOf(makeRunner({ checkin: T, cps: { A1: T } })).label).toBe('At A1')
    expect(statusOf(makeRunner({ checkin: T, finish: T })).key).toBe('FINISHED')
  })

  it('findRunner matches bib and barcode', () => {
    const runners = [makeRunner()]
    expect(findRunner(runners, ' 3381 ')?.bib).toBe('3381')
    expect(findRunner(runners, '*3381*')?.bib).toBe('3381')
    expect(findRunner(runners, '0000')).toBeUndefined()
  })

  it('seeds audit log from existing timestamps, newest first', () => {
    const runners = [
      makeRunner({ checkin: '2024-09-15T05:28:00', cps: { A1: '2024-09-15T06:30:00' }, finish: '2024-09-15T08:52:37' }),
    ]
    const log = seedScanLog(runners)
    expect(log).toHaveLength(3)
    expect(log[0].station).toBe('Finish')
    expect(log[2].station).toBe('Check-in')
  })
})
