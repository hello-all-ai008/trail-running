/**
 * Results view logic — filtering, division grouping, ranking and CSV export
 * for the race-results page. Pure: no React, no DOM, no side effects.
 *
 * The demographic dimensions (category / gender / ageGroup) are the same ones
 * the public registration form collects, so a division here means the same
 * thing as a division on a sign-up sheet. Vocabulary lives in raceData.js.
 */

import {
  AGE_GROUPS,
  CATEGORIES,
  GENDERS,
  UNSPECIFIED,
  UNSPECIFIED_LABEL,
  ageGroupLabel,
  csvCell,
  fmtTime,
  fmtTotal,
  genderLabel,
  totalMs,
} from './raceData'

/** Filter value meaning "no constraint on this dimension". */
export const ANY = ''

/**
 * Filter value meaning "only records whose value is blank".
 * Load-bearing: '' is both this codebase's select convention for "all" AND a
 * real ageGroup value in the imported data (BIB 5050). Without a distinct
 * sentinel, picking "ไม่ระบุ" would silently return every runner.
 */
export const FILTER_UNSPECIFIED = '__none__'

export const GROUP_MODES = ['category', 'category+gender', 'category+gender+age']
export const DEFAULT_GROUP_MODE = 'category+gender+age'

export const EMPTY_FILTER = Object.freeze({ category: ANY, gender: ANY, ageGroups: [], query: '' })

const RANK_KEY_BY_MODE = {
  category: 'rankCategory',
  'category+gender': 'rankGender',
  'category+gender+age': 'rankAge',
}

/**
 * @typedef {Object} ResultRow
 * @property {import('./raceData').Runner} runner
 * @property {number|null} rankCategory  placing within the runner's category
 * @property {number|null} rankGender    placing within category + gender
 * @property {number|null} rankAge       placing within category + gender + age bracket
 * @property {string} genderText
 * @property {string} ageGroupText
 * @property {string} startText
 * @property {string} finishText
 * @property {string} totalText
 */

/**
 * @typedef {Object} ResultGroup
 * @property {string} key  stable React key, e.g. 'MKT33|Male|20-39'
 * @property {string} category
 * @property {string|null} gender    null when the mode does not split on gender
 * @property {string|null} ageGroup  null when the mode does not split on age ('' is a real value)
 * @property {string[]} labelParts   display parts; never contains an empty string
 * @property {string} label
 * @property {number} count
 * @property {ResultRow[]} rows
 */

/**
 * @typedef {Object} ResultsView
 * @property {ResultGroup[]} groups
 * @property {ResultRow[]} rows  flat, in display order
 * @property {number} total
 * @property {number} totalUnfiltered
 * @property {number} groupCount
 * @property {'rankCategory'|'rankGender'|'rankAge'} primaryRankKey
 * @property {Array<{ key: string, label: string }>} activeFilters
 * @property {boolean} isFiltered
 */

/**
 * Sort position of a value inside a known vocabulary: known values keep their
 * declared order, unknown values land after them, blank lands dead last.
 * @param {ReadonlyArray<string>} list
 * @param {string} value
 * @returns {number}
 */
function orderIndex(list, value) {
  if (value === UNSPECIFIED) return list.length + 1
  const i = list.indexOf(value)
  return i === -1 ? list.length : i
}

/** Gun time in ms, with unfinished/unstarted runners sorting last instead of NaN. */
function raceMs(runner) {
  return totalMs(runner) ?? Number.POSITIVE_INFINITY
}

/** Fastest first, BIB ascending as an explicit tie-break. */
function byTime(a, b) {
  return raceMs(a) - raceMs(b) || a.bib.localeCompare(b.bib)
}

/**
 * Placings for every finisher, always computed over the *whole* field — never
 * over a filtered subset, or filtering by gender would renumber everyone to 1.
 *
 * Categories come from the data rather than the CATEGORIES constant so a
 * backend category outside that list still gets ranked. Keys stay
 * `overall`/`gender`/`age` because ESlipModal reads them.
 * @param {ReadonlyArray<import('./raceData').Runner>} runners
 * @returns {Record<string, { overall: number, gender: number, age: number }>}
 */
export function computeRanks(runners) {
  const finished = runners.filter((r) => r.finish)
  const categories = [...new Set(finished.map((r) => r.category))].sort(
    (a, b) => orderIndex(CATEGORIES, a) - orderIndex(CATEGORIES, b) || a.localeCompare(b),
  )

  const map = {}
  categories.forEach((category) => {
    const byGender = {}
    const byAge = {}
    finished
      .filter((r) => r.category === category)
      .slice()
      .sort(byTime)
      .forEach((r, i) => {
        byGender[r.gender] = (byGender[r.gender] || 0) + 1
        const ageKey = `${r.gender}:${r.ageGroup}`
        byAge[ageKey] = (byAge[ageKey] || 0) + 1
        map[r.bib] = { overall: i + 1, gender: byGender[r.gender], age: byAge[ageKey] }
      })
  })
  return map
}

/**
 * True when a runner's value satisfies one filter dimension.
 * @param {string} value
 * @param {string} filterValue
 */
function matches(value, filterValue) {
  if (filterValue === ANY) return true
  if (filterValue === FILTER_UNSPECIFIED) return value === UNSPECIFIED
  return value === filterValue
}

/**
 * True when a runner's ageGroup satisfies a multi-select filter. Empty
 * selection = no constraint. FILTER_UNSPECIFIED may appear as one element
 * among real brackets, so "20-39 + ไม่ระบุ" is expressible together.
 * @param {string} value
 * @param {string[]|undefined} selected
 */
function matchesAgeGroups(value, selected) {
  const list = selected ?? []
  if (list.length === 0) return true
  return list.some((s) => (s === FILTER_UNSPECIFIED ? value === UNSPECIFIED : value === s))
}

/**
 * True when a runner's BIB or name contains the (trimmed, lowercased) query.
 * Empty/whitespace-only query matches everything.
 * @param {import('./raceData').Runner} runner
 * @param {string|undefined} query
 */
function matchesQuery(runner, query) {
  const q = (query ?? '').trim().toLowerCase()
  if (!q) return true
  return runner.bib.toLowerCase().includes(q) || runner.name.toLowerCase().includes(q)
}

/**
 * @param {ReadonlyArray<import('./raceData').Runner>} finishers
 * @param {{ category: string, gender: string, ageGroups: string[], query: string }} filter
 * @returns {Array<import('./raceData').Runner>}
 */
export function filterFinishers(finishers, filter) {
  return finishers.filter(
    (r) =>
      matches(r.category, filter.category) &&
      matches(r.gender, filter.gender) &&
      matchesAgeGroups(r.ageGroup, filter.ageGroups) &&
      matchesQuery(r, filter.query),
  )
}

/**
 * @param {import('./raceData').Runner} runner
 * @param {Record<string, { overall: number, gender: number, age: number }>} ranks
 * @returns {ResultRow}
 */
function toRow(runner, ranks) {
  const rank = ranks[runner.bib]
  return {
    runner,
    rankCategory: rank?.overall ?? null,
    rankGender: rank?.gender ?? null,
    rankAge: rank?.age ?? null,
    genderText: genderLabel(runner.gender),
    ageGroupText: ageGroupLabel(runner.ageGroup),
    startText: fmtTime(runner.startTime),
    finishText: fmtTime(runner.finish),
    totalText: fmtTotal(runner),
  }
}

/**
 * Split finishers into award divisions. Grouping is always at least by category
 * because every rank is category-scoped and a 33 km time is not comparable to a
 * 50 km one — an ungrouped, cross-category list is what makes a rank column lie.
 * @param {ReadonlyArray<import('./raceData').Runner>} runners
 * @param {Record<string, { overall: number, gender: number, age: number }>} ranks
 * @param {string} mode  one of GROUP_MODES
 * @returns {ResultGroup[]}
 */
export function groupFinishers(runners, ranks, mode) {
  const safeMode = GROUP_MODES.includes(mode) ? mode : DEFAULT_GROUP_MODE
  const splitsGender = safeMode !== 'category'
  const splitsAge = safeMode === 'category+gender+age'

  const buckets = new Map()
  runners.forEach((runner) => {
    const gender = splitsGender ? runner.gender : null
    const ageGroup = splitsAge ? runner.ageGroup : null
    const key = [runner.category, gender ?? '*', ageGroup ?? '*'].join('|')

    let bucket = buckets.get(key)
    if (!bucket) {
      const labelParts = [runner.category]
      if (splitsGender) labelParts.push(genderLabel(runner.gender))
      if (splitsAge) labelParts.push(ageGroupLabel(runner.ageGroup))
      bucket = {
        key,
        category: runner.category,
        gender,
        ageGroup,
        labelParts,
        label: labelParts.join(' · '),
        members: [],
      }
      buckets.set(key, bucket)
    }
    bucket.members.push(runner)
  })

  return [...buckets.values()]
    .sort(compareGroups)
    .map((bucket) => {
      const rows = bucket.members.slice().sort(byTime).map((r) => toRow(r, ranks))
      return {
        key: bucket.key,
        category: bucket.category,
        gender: bucket.gender,
        ageGroup: bucket.ageGroup,
        labelParts: bucket.labelParts,
        label: bucket.label,
        count: rows.length,
        rows,
      }
    })
}

/** Category order, then gender order, then age-bracket order; blank last. */
function compareGroups(a, b) {
  return (
    orderIndex(CATEGORIES, a.category) - orderIndex(CATEGORIES, b.category) ||
    a.category.localeCompare(b.category) ||
    orderIndex(GENDERS, a.gender ?? '') - orderIndex(GENDERS, b.gender ?? '') ||
    (a.gender ?? '').localeCompare(b.gender ?? '') ||
    orderIndex(AGE_GROUPS, a.ageGroup ?? '') - orderIndex(AGE_GROUPS, b.ageGroup ?? '') ||
    (a.ageGroup ?? '').localeCompare(b.ageGroup ?? '')
  )
}

/**
 * @param {{ category: string, gender: string, ageGroups: string[], query: string }} filter
 * @returns {Array<{ key: string, label: string }>}
 */
function describeFilter(filter) {
  const parts = []
  if (filter.category !== ANY) parts.push({ key: 'category', label: filter.category })
  if (filter.gender !== ANY) {
    parts.push({
      key: 'gender',
      label: filter.gender === FILTER_UNSPECIFIED ? UNSPECIFIED_LABEL : genderLabel(filter.gender),
    })
  }
  const ageGroups = filter.ageGroups ?? []
  if (ageGroups.length > 0) {
    const label = ageGroups
      .map((v) => (v === FILTER_UNSPECIFIED ? UNSPECIFIED_LABEL : ageGroupLabel(v)))
      .join(', ')
    parts.push({ key: 'ageGroup', label })
  }
  const query = (filter.query ?? '').trim()
  if (query) parts.push({ key: 'query', label: `ค้นหา "${query}"` })
  return parts
}

/**
 * The single entry point the results page calls.
 * @param {{
 *   finishers: ReadonlyArray<import('./raceData').Runner>,
 *   ranks: Record<string, { overall: number, gender: number, age: number }>,
 *   filter: { category: string, gender: string, ageGroups: string[], query: string },
 *   groupBy: string
 * }} input
 * @returns {ResultsView}
 */
export function buildResultsView({ finishers, ranks, filter, groupBy }) {
  const matched = filterFinishers(finishers, filter)
  const groups = groupFinishers(matched, ranks, groupBy)
  const rows = groups.flatMap((g) => g.rows)
  const activeFilters = describeFilter(filter)

  return {
    groups,
    rows,
    total: rows.length,
    totalUnfiltered: finishers.length,
    groupCount: groups.length,
    primaryRankKey: RANK_KEY_BY_MODE[groupBy] ?? RANK_KEY_BY_MODE[DEFAULT_GROUP_MODE],
    activeFilters,
    isFiltered: activeFilters.length > 0,
  }
}

const CSV_HEADER =
  'Category,Gender,AgeGroup,RankCategory,RankGender,RankAgeGroup,BIB,Name,Start,Finish,TotalTime'

/**
 * Flat CSV of the current view, in the same order as the screen. Emits the raw
 * DB vocabulary (`Male`, `LGBTIQAN+`, `20-39`, '' for a blank bracket) rather
 * than the Thai display labels, so the file round-trips back into the
 * `gender`/`age_group` columns — do not swap these for the UI labels.
 * @param {ResultsView} view
 * @returns {string}
 */
export function resultsCsv(view) {
  const lines = view.rows.map(({ runner, rankCategory, rankGender, rankAge }) =>
    [
      runner.category,
      runner.gender,
      runner.ageGroup,
      rankCategory ?? '',
      rankGender ?? '',
      rankAge ?? '',
      runner.bib,
      runner.name,
      fmtTime(runner.startTime),
      fmtTime(runner.finish),
      fmtTotal(runner),
    ]
      .map(csvCell)
      .join(','),
  )
  return [CSV_HEADER, ...lines].join('\n')
}

/**
 * Filter-aware filename so staff can export several division sheets without
 * overwriting each other.
 * @param {{ category: string, gender: string, ageGroups: string[], query: string }} filter
 * @returns {string}
 */
export function resultsCsvFilename(filter) {
  const slug = (value) =>
    String(value === FILTER_UNSPECIFIED ? 'unspecified' : value)
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  const parts = []
  if (filter.category !== ANY) parts.push(slug(filter.category))
  if (filter.gender !== ANY) parts.push(slug(filter.gender))
  const ageGroups = filter.ageGroups ?? []
  if (ageGroups.length > 0) parts.push(ageGroups.map(slug).join('+'))
  // query is intentionally excluded — free text is a poor filename component

  return ['race-results', ...parts].join('-') + '.csv'
}
