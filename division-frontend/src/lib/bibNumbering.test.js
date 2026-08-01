import { describe, it, expect } from 'vitest'
import { generateBibNumbers, distanceFromCategory, countRunnersByDistance } from './bibNumbering'

describe('generateBibNumbers', () => {
  it('produces sequential BIBs matching the 50km reference example', () => {
    const bibs = generateBibNumbers({ prefix: '5', totalDigits: 4, startSeq: 1 }, 3)
    expect(bibs).toEqual(['5001', '5002', '5003'])
  })

  it('produces sequential BIBs matching the 33km reference example', () => {
    const bibs = generateBibNumbers({ prefix: '3', totalDigits: 4, startSeq: 1 }, 2)
    expect(bibs).toEqual(['3001', '3002'])
  })

  it('supports a multi-character prefix with a shorter sequence width', () => {
    const bibs = generateBibNumbers({ prefix: '80', totalDigits: 4, startSeq: 1 }, 2)
    expect(bibs).toEqual(['8001', '8002'])
  })

  it('honors a non-1 starting sequence', () => {
    const bibs = generateBibNumbers({ prefix: '5', totalDigits: 4, startSeq: 15 }, 2)
    expect(bibs).toEqual(['5015', '5016'])
  })

  it('clamps sequence width to at least 1 digit when the prefix reaches totalDigits', () => {
    const bibs = generateBibNumbers({ prefix: '1000', totalDigits: 4, startSeq: 1 }, 2)
    expect(bibs).toEqual(['10001', '10002'])
  })

  it('does not pad the sequence beyond its natural width once it overflows', () => {
    const bibs = generateBibNumbers({ prefix: '5', totalDigits: 4, startSeq: 999 }, 2)
    expect(bibs).toEqual(['5999', '51000'])
  })
})

describe('distanceFromCategory', () => {
  it('extracts the numeric distance from a 33km category code', () => {
    expect(distanceFromCategory('MKT33')).toBe(33)
  })

  it('extracts the numeric distance from a 50km category code', () => {
    expect(distanceFromCategory('MKT50')).toBe(50)
  })

  it('returns null when the category has no digits', () => {
    expect(distanceFromCategory('NODIGITS')).toBe(null)
  })
})

describe('countRunnersByDistance', () => {
  const runners = [{ category: 'MKT33' }, { category: 'MKT33' }, { category: 'MKT50' }]

  it('counts runners whose category matches the given distance', () => {
    expect(countRunnersByDistance(runners, 33)).toBe(2)
  })

  it('returns 0 when no runner matches the given distance', () => {
    expect(countRunnersByDistance(runners, 100)).toBe(0)
  })
})
