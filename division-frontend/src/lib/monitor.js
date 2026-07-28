/**
 * Live Monitor view logic — top-N podium cards and a recent-scan feed, both
 * grouped into the same award divisions (ระยะ × เพศ × รุ่นอายุ) results.js
 * already uses. Pure: no React, no DOM, no side effects.
 *
 * Deliberately thin over results.js: filtering, division ordering/labels and
 * the active-filter summary are never reimplemented here — they're called
 * through so this file cannot drift from results.js's behaviour.
 */

import { DEFAULT_GROUP_MODE, buildResultsView, filterFinishers, groupFinishers } from './results'
import { findRunner } from './raceData'

export const MONITOR_TOP_N = 5

/**
 * @typedef {Object} MonitorCardData
 * @property {string} key
 * @property {string} label
 * @property {string[]} labelParts
 * @property {number} total          finishers in the division — NOT rows.length
 * @property {import('./results').ResultRow[]} rows   top N, rank ascending
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
 * @param {{ category: string, gender: string, ageGroup: string }} filter
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
 * @param {{
 *   finishers: ReadonlyArray<import('./raceData').Runner>,
 *   ranks: Record<string, { overall: number, gender: number, age: number }>,
 *   filter: { category: string, gender: string, ageGroup: string },
 *   limit?: number
 * }} input
 * @returns {{ cards: MonitorCardData[], cardCount: number, shownCount: number, totalFinishers: number, activeFilters: Array<{ key: string, label: string }>, isFiltered: boolean }}
 */
export function buildMonitorPodium({ finishers, ranks, filter, limit = MONITOR_TOP_N }) {
  const view = buildResultsView({ finishers, ranks, filter, groupBy: DEFAULT_GROUP_MODE })

  const cards = view.groups.map((group) => ({
    key: group.key,
    label: group.label,
    labelParts: group.labelParts,
    total: group.count,
    rows: group.rows.slice(0, limit),
  }))

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
 * Recent-scan feed: every accepted (`ok: true`) scan, resolved to its
 * runner's division and bucketed the same way the podium groups divisions.
 * Rejected scans are excluded — this is a live board, not the audit trail.
 * @param {{
 *   runners: ReadonlyArray<import('./raceData').Runner>,
 *   scanLog: ReadonlyArray<import('./raceEngine').LogEntry>,
 *   filter: { category: string, gender: string, ageGroup: string }
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
