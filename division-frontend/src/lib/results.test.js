import { describe, it, expect } from 'vitest'
import { ageGroupLabel, csvCell, genderLabel } from './raceData'
import {
  DEFAULT_GROUP_MODE,
  EMPTY_FILTER,
  FILTER_UNSPECIFIED,
  buildResultsView,
  computeRanks,
  filterFinishers,
  groupFinishers,
  resultsCsv,
  resultsCsvFilename,
} from './results'

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

/** Mirrors the real seed data's shape: two distances, three genders, a blank bracket. */
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

const view = (overrides = {}) => {
  const finishers = overrides.finishers ?? field()
  return buildResultsView({
    finishers,
    ranks: computeRanks(finishers),
    filter: overrides.filter ?? EMPTY_FILTER,
    groupBy: overrides.groupBy ?? DEFAULT_GROUP_MODE,
  })
}

describe('computeRanks', () => {
  it('ranks within each category independently', () => {
    const ranks = computeRanks(field())
    expect(ranks['3301'].overall).toBe(1)
    expect(ranks['3305'].overall).toBe(5)
    // MKT50's slowest overall runner is still 1st in MKT50.
    expect(ranks['5001'].overall).toBe(1)
    expect(ranks['5050'].overall).toBe(3)
  })

  it('counts gender rank only among the same gender in the same category', () => {
    const ranks = computeRanks(field())
    expect(ranks['3301'].gender).toBe(1)
    expect(ranks['3302'].gender).toBe(2)
    expect(ranks['3303'].gender).toBe(1)
    expect(ranks['5002'].gender).toBe(1)
  })

  it('keys the age rank on gender + age bracket', () => {
    const ranks = computeRanks([
      makeFinisher({ bib: 'A', gender: 'Male', ageGroup: '40-49', hours: 6 }),
      makeFinisher({ bib: 'B', gender: 'Female', ageGroup: '40-49', hours: 7 }),
      makeFinisher({ bib: 'C', gender: 'Male', ageGroup: '40-49', hours: 8 }),
    ])
    expect(ranks.A.age).toBe(1)
    expect(ranks.B.age).toBe(1)
    expect(ranks.C.age).toBe(2)
  })

  it('gives a blank age bracket its own real rank, not undefined', () => {
    const ranks = computeRanks(field())
    expect(ranks['5050'].age).toBe(1)
  })

  it('omits runners who have not finished', () => {
    const ranks = computeRanks([
      makeFinisher({ bib: '3301' }),
      { ...makeFinisher({ bib: '3399' }), finish: null },
    ])
    expect(ranks['3301']).toBeDefined()
    expect(ranks['3399']).toBeUndefined()
  })

  it('still ranks a category outside the CATEGORIES constant', () => {
    const ranks = computeRanks([
      makeFinisher({ bib: 'X1', category: 'MKT12', hours: 3 }),
      makeFinisher({ bib: 'X2', category: 'MKT12', hours: 4 }),
    ])
    expect(ranks.X1.overall).toBe(1)
    expect(ranks.X2.overall).toBe(2)
  })
})

describe('filterFinishers', () => {
  it('filters on each dimension alone', () => {
    const rows = field()
    expect(filterFinishers(rows, { ...EMPTY_FILTER, category: 'MKT50' }).map((r) => r.bib))
      .toEqual(['5001', '5002', '5050'])
    expect(filterFinishers(rows, { ...EMPTY_FILTER, gender: 'Female' }).map((r) => r.bib))
      .toEqual(['3303', '3304', '5002'])
    expect(filterFinishers(rows, { ...EMPTY_FILTER, ageGroups: ['40-49'] }).map((r) => r.bib))
      .toEqual(['3304'])
  })

  it('combines all three dimensions', () => {
    const rows = filterFinishers(field(), { category: 'MKT33', gender: 'Female', ageGroups: ['20-39'] })
    expect(rows.map((r) => r.bib)).toEqual(['3303'])
  })

  it('returns only blank-bracket runners for the unspecified sentinel', () => {
    const rows = filterFinishers(field(), { ...EMPTY_FILTER, ageGroups: [FILTER_UNSPECIFIED] })
    expect(rows.map((r) => r.bib)).toEqual(['5050'])
  })

  it('returns everything when every dimension is ANY', () => {
    expect(filterFinishers(field(), EMPTY_FILTER)).toHaveLength(8)
  })

  it('reports isFiltered and activeFilters for exactly the non-ANY dimensions', () => {
    const plain = view()
    expect(plain.isFiltered).toBe(false)
    expect(plain.activeFilters).toEqual([])

    const filtered = view({ filter: { category: 'MKT33', gender: 'Female', ageGroups: [] } })
    expect(filtered.isFiltered).toBe(true)
    expect(filtered.activeFilters).toEqual([
      { key: 'category', label: 'MKT33' },
      { key: 'gender', label: 'หญิง' },
    ])
  })

  it('labels the unspecified sentinel rather than showing a blank chip', () => {
    const v = view({ filter: { ...EMPTY_FILTER, ageGroups: [FILTER_UNSPECIFIED] } })
    expect(v.activeFilters).toEqual([{ key: 'ageGroup', label: 'ไม่ระบุ' }])
  })
})

describe('multi-select ageGroups', () => {
  it('returns the union of multiple selected brackets', () => {
    const rows = filterFinishers(field(), { ...EMPTY_FILTER, ageGroups: ['20-39', '40-49'] })
    // 20-39: 3301,3302,3303,5001,5002 · 40-49: 3304 — union, not intersection
    expect(rows.map((r) => r.bib).sort()).toEqual(['3301', '3302', '3303', '3304', '5001', '5002'].sort())
  })

  it('combines a real bracket with the unspecified sentinel', () => {
    const rows = filterFinishers(field(), { ...EMPTY_FILTER, ageGroups: ['60 Plus', FILTER_UNSPECIFIED] })
    expect(rows.map((r) => r.bib).sort()).toEqual(['3305', '5050'].sort())
  })

  it('empty array behaves as no constraint', () => {
    expect(filterFinishers(field(), { ...EMPTY_FILTER, ageGroups: [] })).toHaveLength(8)
  })

  it('describeFilter joins multiple selections with a comma', () => {
    const v = view({ filter: { ...EMPTY_FILTER, ageGroups: ['20-39', '50-59'] } })
    expect(v.activeFilters).toEqual([{ key: 'ageGroup', label: '20-39, 50-59' }])
  })

  it('resultsCsvFilename joins multiple ageGroups with +', () => {
    expect(resultsCsvFilename({ ...EMPTY_FILTER, ageGroups: ['20-39', '50-59'] }))
      .toBe('race-results-20-39+50-59.csv')
  })
})

describe('query filter', () => {
  it('matches by BIB substring', () => {
    // All of 3301-3305 share the '330' prefix in this fixture — substring
    // match is intentionally broad, so all five are expected here.
    const rows = filterFinishers(field(), { ...EMPTY_FILTER, query: '330' })
    expect(rows.map((r) => r.bib).sort()).toEqual(['3301', '3302', '3303', '3304', '3305'].sort())
  })

  it('matches by name case-insensitively', () => {
    const rows = filterFinishers(field(), { ...EMPTY_FILTER, query: 'runner 5050' })
    expect(rows.map((r) => r.bib)).toEqual(['5050'])
  })

  it('empty or whitespace query matches everything', () => {
    expect(filterFinishers(field(), { ...EMPTY_FILTER, query: '' })).toHaveLength(8)
    expect(filterFinishers(field(), { ...EMPTY_FILTER, query: '   ' })).toHaveLength(8)
  })

  it('combines with other dimensions (AND, not OR)', () => {
    const rows = filterFinishers(field(), { ...EMPTY_FILTER, category: 'MKT50', query: '3301' })
    expect(rows).toEqual([])
  })

  it('describeFilter/isFiltered reflect an active query', () => {
    const v = view({ filter: { ...EMPTY_FILTER, query: 'blake' } })
    expect(v.isFiltered).toBe(true)
    expect(v.activeFilters).toEqual([{ key: 'query', label: 'ค้นหา "blake"' }])
  })

  it('resultsCsvFilename excludes the query', () => {
    expect(resultsCsvFilename({ ...EMPTY_FILTER, category: 'MKT33', query: 'blake' }))
      .toBe('race-results-MKT33.csv')
  })
})

describe('groupFinishers', () => {
  const ranks = computeRanks(field())

  it('produces one group per distance in category mode', () => {
    const groups = groupFinishers(field(), ranks, 'category')
    expect(groups.map((g) => g.key)).toEqual(['MKT33|*|*', 'MKT50|*|*'])
    expect(groups.map((g) => g.count)).toEqual([5, 3])
    expect(groups.map((g) => g.label)).toEqual(['MKT33', 'MKT50'])
  })

  it('splits on gender in category+gender mode', () => {
    const groups = groupFinishers(field(), ranks, 'category+gender')
    expect(groups.map((g) => g.label)).toEqual([
      'MKT33 · ชาย',
      'MKT33 · หญิง',
      'MKT33 · LGBTIQAN+',
      'MKT50 · ชาย',
      'MKT50 · หญิง',
      'MKT50 · LGBTIQAN+',
    ])
    expect(groups.map((g) => g.count)).toEqual([2, 2, 1, 1, 1, 1])
  })

  it('splits on age bracket at full depth', () => {
    const groups = groupFinishers(field(), ranks, 'category+gender+age')
    expect(groups.map((g) => g.label)).toEqual([
      'MKT33 · ชาย · 20-39',
      'MKT33 · หญิง · 20-39',
      'MKT33 · หญิง · 40-49',
      'MKT33 · LGBTIQAN+ · 60 Plus',
      'MKT50 · ชาย · 20-39',
      'MKT50 · หญิง · 20-39',
      'MKT50 · LGBTIQAN+ · ไม่ระบุ',
    ])
  })

  it('orders categories by CATEGORIES regardless of input order', () => {
    const groups = groupFinishers(field().slice().reverse(), ranks, 'category')
    expect(groups.map((g) => g.category)).toEqual(['MKT33', 'MKT50'])
  })

  it('orders genders by GENDERS regardless of input order', () => {
    const groups = groupFinishers(field().slice().reverse(), ranks, 'category+gender')
    expect(groups.slice(0, 3).map((g) => g.gender)).toEqual(['Male', 'Female', 'LGBTIQAN+'])
  })

  it('orders age brackets by AGE_GROUPS with the blank bracket last', () => {
    const rows = [
      makeFinisher({ bib: 'B1', ageGroup: '' }),
      makeFinisher({ bib: 'B2', ageGroup: '60 Plus' }),
      makeFinisher({ bib: 'B3', ageGroup: '20-39' }),
      makeFinisher({ bib: 'B4', ageGroup: '50-59' }),
    ]
    const groups = groupFinishers(rows, computeRanks(rows), 'category+gender+age')
    expect(groups.map((g) => g.ageGroup)).toEqual(['20-39', '50-59', '60 Plus', ''])
  })

  it('sorts unknown vocabulary values after known ones, deterministically', () => {
    const rows = [
      makeFinisher({ bib: 'U1', gender: 'Nonbinary' }),
      makeFinisher({ bib: 'U2', gender: 'Male' }),
      makeFinisher({ bib: 'U3', gender: '' }),
    ]
    const groups = groupFinishers(rows, computeRanks(rows), 'category+gender')
    expect(groups.map((g) => g.gender)).toEqual(['Male', 'Nonbinary', ''])
  })

  it('sorts rows in a group by gun time with a BIB tie-break', () => {
    const tied = [
      makeFinisher({ bib: '3302', hours: 6 }),
      makeFinisher({ bib: '3301', hours: 6 }),
      makeFinisher({ bib: '3300', hours: 5 }),
    ]
    const order = (rows) =>
      groupFinishers(rows, computeRanks(rows), 'category')[0].rows.map((r) => r.runner.bib)
    expect(order(tied)).toEqual(['3300', '3301', '3302'])
    expect(order(tied.slice().reverse())).toEqual(['3300', '3301', '3302'])
  })

  it('never puts an empty string in labelParts', () => {
    const groups = groupFinishers(field(), ranks, 'category+gender+age')
    const blank = groups.at(-1)
    expect(blank.labelParts).toEqual(['MKT50', 'LGBTIQAN+', 'ไม่ระบุ'])
    expect(groups.flatMap((g) => g.labelParts)).not.toContain('')
  })
})

describe('buildResultsView', () => {
  it('keeps group counts consistent with the flat row list', () => {
    const v = view()
    expect(v.groups.reduce((sum, g) => sum + g.count, 0)).toBe(v.total)
    expect(v.total).toBe(8)
    expect(v.totalUnfiltered).toBe(8)
    expect(v.groupCount).toBe(7)
  })

  it('picks the primary rank column from the grouping depth', () => {
    expect(view({ groupBy: 'category' }).primaryRankKey).toBe('rankCategory')
    expect(view({ groupBy: 'category+gender' }).primaryRankKey).toBe('rankGender')
    expect(view({ groupBy: 'category+gender+age' }).primaryRankKey).toBe('rankAge')
  })

  it('does not renumber ranks when filtered', () => {
    const v = view({ filter: { ...EMPTY_FILTER, gender: 'Female' } })
    const row = v.rows.find((r) => r.runner.bib === '3303')
    expect(row.rankCategory).toBe(3)
    expect(row.rankGender).toBe(1)
  })

  it('falls back to the default depth for an unrecognised groupBy', () => {
    const bogus = view({ groupBy: 'category+shoe-size' })
    const fallback = view({ groupBy: DEFAULT_GROUP_MODE })
    expect(bogus.groups.map((g) => g.key)).toEqual(fallback.groups.map((g) => g.key))
    expect(bogus.primaryRankKey).toBe(fallback.primaryRankKey)
  })

  it('returns no groups for an empty field', () => {
    const v = view({ finishers: [] })
    expect(v.groups).toEqual([])
    expect(v.total).toBe(0)
  })

  it('sorts a finisher with no start time last and formats its total as an em dash', () => {
    const finishers = [
      makeFinisher({ bib: 'F1', hours: 6 }),
      { ...makeFinisher({ bib: 'F2' }), startTime: null },
    ]
    const v = view({ finishers, groupBy: 'category' })
    expect(v.rows.map((r) => r.runner.bib)).toEqual(['F1', 'F2'])
    expect(v.rows[1].totalText).toBe('—')
  })
})

describe('resultsCsv', () => {
  it('emits the agreed header line', () => {
    expect(resultsCsv(view()).split('\n')[0]).toBe(
      'Category,Gender,AgeGroup,RankCategory,RankGender,RankAgeGroup,BIB,Name,Start,Finish,TotalTime',
    )
  })

  it('follows display order and exports the blank bracket as an empty field', () => {
    const lines = resultsCsv(view()).split('\n').slice(1)
    const v = view()
    expect(lines).toHaveLength(v.total)
    expect(lines[0].startsWith('MKT33,Male,20-39,1,1,1,3301,')).toBe(true)
    expect(lines.at(-1).startsWith('MKT50,LGBTIQAN+,,3,1,1,5050,')).toBe(true)
  })

  it('quotes fields containing a comma, quote, line break or edge whitespace', () => {
    expect(csvCell('SOMCHAI, JR.')).toBe('"SOMCHAI, JR."')
    expect(csvCell('SAY "HI"')).toBe('"SAY ""HI"""')
    expect(csvCell('LINE1\nLINE2')).toBe('"LINE1\nLINE2"')
    expect(csvCell('LINE1\r\nLINE2')).toBe('"LINE1\r\nLINE2"')
    expect(csvCell(' PADDED')).toBe('" PADDED"')
    expect(csvCell('PADDED ')).toBe('"PADDED "')
    expect(csvCell('PLAIN')).toBe('PLAIN')
    expect(csvCell(null)).toBe('')
  })

  it('actually applies the quoting to a name containing a comma', () => {
    const finishers = [{ ...makeFinisher({ bib: '3301' }), name: 'SOMCHAI, JR.' }]
    const csv = resultsCsv(view({ finishers }))
    expect(csv.split('\n')[1]).toContain('"SOMCHAI, JR."')
    expect(csv.split('\n')[1].split(',')).toHaveLength(12) // 11 fields, comma inside quotes
  })

  it('names the file after the active filter', () => {
    expect(resultsCsvFilename(EMPTY_FILTER)).toBe('race-results.csv')
    expect(resultsCsvFilename({ category: 'MKT33', gender: 'LGBTIQAN+', ageGroups: ['60 Plus'] }))
      .toBe('race-results-MKT33-LGBTIQAN-60-Plus.csv')
    expect(resultsCsvFilename({ ...EMPTY_FILTER, ageGroups: [FILTER_UNSPECIFIED] }))
      .toBe('race-results-unspecified.csv')
  })
})

describe('display labels', () => {
  it('translates known genders and passes unknown ones through', () => {
    expect(genderLabel('Male')).toBe('ชาย')
    expect(genderLabel('Female')).toBe('หญิง')
    expect(genderLabel('LGBTIQAN+')).toBe('LGBTIQAN+')
    expect(genderLabel('Nonbinary')).toBe('Nonbinary')
    expect(genderLabel('')).toBe('ไม่ระบุ')
  })

  it('leaves age brackets untranslated but labels the blank one', () => {
    expect(ageGroupLabel('60 Plus')).toBe('60 Plus')
    expect(ageGroupLabel('')).toBe('ไม่ระบุ')
  })
})
