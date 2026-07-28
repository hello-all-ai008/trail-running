/**
 * Live Monitor view logic — top-N podium cards and a recent-scan feed, both
 * grouped into the same award divisions (ระยะ × เพศ × รุ่นอายุ) results.js
 * already uses. Pure: no React, no DOM, no side effects.
 *
 * Deliberately thin over results.js: filtering, division ordering/labels and
 * the active-filter summary are never reimplemented here — they're called
 * through so this file cannot drift from results.js's behaviour.
 */

import {
  DEFAULT_GROUP_MODE,
  EMPTY_FILTER,
  buildResultsView,
  filterFinishers,
  groupFinishers,
} from './results'
import { findRunner } from './raceData'

export const MONITOR_TOP_N = 5

/** Overall Top-N per distance; also the division-eligibility cutoff (rankCategory <= this = exempt). */
export const OVERALL_TOP_N = 3

/**
 * @typedef {Object} MonitorCardData
 * @property {string} key
 * @property {string} label
 * @property {string[]} labelParts
 * @property {number} total          finishers in the division — NOT rows.length
 * @property {number} exemptCount    members excluded for being overall top-3 in their category
 * @property {import('./results').ResultRow[]} rows   award-eligible top N, rank ascending; each row also carries `awardRank` (1..N, monitor-local, not the same as `rankAge`)
 */

/**
 * @typedef {Object} MonitorFeedEntry
 * @property {string} id     `${bib}-${time}-${station}` — unique per scan
 * @property {string} time
 * @property {string} station
 * @property {string} bib
 * @property {string} name
 */

/**
 * @typedef {Object} MonitorFeedCard
 * @property {string} key
 * @property {string} label
 * @property {string[]} labelParts
 * @property {number} total   entries.length — badge count
 * @property {MonitorFeedEntry[]} entries   newest first, unlimited
 */

/**
 * Filter-only description of the current filter (active-filter chips + the
 * isFiltered flag), reusing buildResultsView's own derivation rather than
 * reimplementing it — passing an empty field costs nothing since that part
 * of the view depends only on `filter`, not on the finisher list.
 * @param {{ category: string, gender: string, ageGroups: string[], query: string }} filter
 * @returns {{ activeFilters: Array<{ key: string, label: string }>, isFiltered: boolean }}
 */
function filterMeta(filter) {
  const { activeFilters, isFiltered } = buildResultsView({
    finishers: [],
    ranks: {},
    filter,
    groupBy: DEFAULT_GROUP_MODE,
  })
  return { activeFilters, isFiltered }
}

/**
 * Division key at full depth — mirrors groupFinishers's own bucket key for
 * 'category+gender+age' mode exactly (category/gender/ageGroup all real
 * values at that depth, never the '*' placeholder shallower modes use).
 * @param {import('./raceData').Runner} runner
 * @returns {string}
 */
function divisionKey(runner) {
  return [runner.category, runner.gender, runner.ageGroup].join('|')
}

/**
 * Top-N-per-division podium: places 1..limit ranked by gun time, badge
 * carries the division's real finisher count (captured before slicing).
 *
 * Division-eligibility rule: a member whose `rankCategory` is within
 * OVERALL_TOP_N is overall-exempt — they belong to the new Overall Top-3
 * card instead (see buildMonitorOverall) and are removed entirely from
 * their division here. The remaining eligible members are renumbered
 * 1..N (gun-time order unchanged) as `awardRank` — a Monitor-local number,
 * distinct from and not replacing `rankAge` (Results/e-Slip keep counting
 * everyone).
 * @param {{
 *   finishers: ReadonlyArray<import('./raceData').Runner>,
 *   ranks: Record<string, { overall: number, gender: number, age: number }>,
 *   filter: { category: string, gender: string, ageGroups: string[], query: string },
 *   limit?: number
 * }} input
 * @returns {{ cards: MonitorCardData[], cardCount: number, shownCount: number, totalFinishers: number, activeFilters: Array<{ key: string, label: string }>, isFiltered: boolean }}
 */
export function buildMonitorPodium({ finishers, ranks, filter, limit = MONITOR_TOP_N }) {
  const view = buildResultsView({ finishers, ranks, filter, groupBy: DEFAULT_GROUP_MODE })

  const cards = view.groups.map((group) => {
    const eligible = []
    let exemptCount = 0
    group.rows.forEach((row) => {
      if (row.rankCategory != null && row.rankCategory <= OVERALL_TOP_N) {
        exemptCount += 1
      } else {
        eligible.push(row)
      }
    })
    const rows = eligible.slice(0, limit).map((row, i) => ({ ...row, awardRank: i + 1 }))

    return {
      key: group.key,
      label: group.label,
      labelParts: group.labelParts,
      total: group.count,
      exemptCount,
      rows,
    }
  })

  return {
    cards,
    cardCount: cards.length,
    shownCount: cards.reduce((sum, card) => sum + card.rows.length, 0),
    totalFinishers: finishers.length,
    activeFilters: view.activeFilters,
    isFiltered: view.isFiltered,
  }
}

/**
 * @typedef {Object} MonitorOverallCard
 * @property {string} key
 * @property {string} label   the category, e.g. 'MKT33'
 * @property {import('./results').ResultRow[]} rows   places 1..limit by rankCategory
 */

/**
 * Overall Top N per distance, all genders/ages combined. rankCategory already
 * *is* this placing, so no new ranking logic — just a shallower grouping and
 * a smaller slice.
 *
 * Deliberately filtered on category only: gender/ageGroups/query in `filter`
 * are ignored even if set, because "overall, all genders/ages" is contradicted
 * by filtering on gender or age. The category chip still applies, so
 * narrowing to one distance hides the other's overall card.
 * @param {{
 *   finishers: ReadonlyArray<import('./raceData').Runner>,
 *   ranks: Record<string, { overall: number, gender: number, age: number }>,
 *   filter: { category: string },
 *   limit?: number
 * }} input
 * @returns {{ cards: MonitorOverallCard[], cardCount: number }}
 */
export function buildMonitorOverall({ finishers, ranks, filter, limit = OVERALL_TOP_N }) {
  const categoryOnlyFilter = { ...EMPTY_FILTER, category: filter.category }
  const view = buildResultsView({ finishers, ranks, filter: categoryOnlyFilter, groupBy: 'category' })

  const cards = view.groups
    .map((group) => ({
      key: group.key,
      label: group.label,
      rows: group.rows.filter((row) => row.rankCategory != null && row.rankCategory <= limit),
    }))
    .filter((card) => card.rows.length > 0)

  return { cards, cardCount: cards.length }
}

/**
 * Recent-scan feed: every accepted (`ok: true`) scan, resolved to its
 * runner's division and bucketed the same way the podium groups divisions.
 * Rejected scans are excluded — this is a live board, not the audit trail.
 * @param {{
 *   runners: ReadonlyArray<import('./raceData').Runner>,
 *   scanLog: ReadonlyArray<import('./raceEngine').LogEntry>,
 *   filter: { category: string, gender: string, ageGroups: string[], query: string }
 * }} input
 * @returns {{ cards: MonitorFeedCard[], cardCount: number, activeFilters: Array<{ key: string, label: string }>, isFiltered: boolean }}
 */
export function buildMonitorFeed({ runners, scanLog, filter }) {
  const { activeFilters, isFiltered } = filterMeta(filter)

  const matched = scanLog
    .filter((entry) => entry.ok)
    .map((entry) => ({ entry, runner: findRunner(runners, entry.bib) }))
    .filter(({ runner }) => runner && filterFinishers([runner], filter).length > 0)

  if (matched.length === 0) {
    return { cards: [], cardCount: 0, activeFilters, isFiltered }
  }

  // Order/labels come from the same division grouping results.js uses.
  // Ranks aren't needed here — feed cards never show a rank number — so an
  // empty rank map is passed and the resulting rows are otherwise unused.
  const uniqueRunners = [...new Map(matched.map(({ runner }) => [runner.bib, runner])).values()]
  const groups = groupFinishers(uniqueRunners, {}, 'category+gender+age')

  const entriesByKey = new Map()
  matched.forEach(({ entry, runner }) => {
    const key = divisionKey(runner)
    const list = entriesByKey.get(key) ?? []
    list.push({
      id: `${entry.bib}-${entry.time}-${entry.station}`,
      time: entry.time,
      station: entry.station,
      bib: entry.bib,
      name: entry.name,
    })
    entriesByKey.set(key, list)
  })

  const cards = groups
    .map((group) => {
      const entries = (entriesByKey.get(group.key) ?? [])
        .slice()
        .sort((a, b) => new Date(b.time) - new Date(a.time))
      return {
        key: group.key,
        label: group.label,
        labelParts: group.labelParts,
        total: entries.length,
        entries,
      }
    })
    .filter((card) => card.total > 0)

  return { cards, cardCount: cards.length, activeFilters, isFiltered }
}

/**
 * Ids present in `nextIds` but not in `prevIds`. Generic over the id shape so
 * both the podium (`id = bib`) and the feed (`id = ${bib}-${time}-${station}`)
 * reuse it. Treating a first render as "100 new arrivals" is the caller's
 * responsibility (see useRecentArrivals) — this function just does a normal
 * set difference.
 * @param {Set<string>|ReadonlyArray<string>} prevIds
 * @param {Set<string>|ReadonlyArray<string>} nextIds
 * @returns {Set<string>}
 */
export function diffIds(prevIds, nextIds) {
  const prevSet = prevIds instanceof Set ? prevIds : new Set(prevIds ?? [])
  const nextList = nextIds instanceof Set ? nextIds : new Set(nextIds ?? [])

  const added = new Set()
  nextList.forEach((id) => {
    if (!prevSet.has(id)) added.add(id)
  })
  return added
}
