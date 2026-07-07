// Package results computes stats, gun-time rankings, and CSV export —
// the Go equivalent of division-frontend/src/hooks/useRaceState.js's
// stats/ranks/finishers useMemo blocks, so both sides agree on the numbers.
package results

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"trailrunning/division-backend/internal/raceview"
)

// Stats mirrors useRaceState.js's `stats` shape.
type Stats struct {
	Total        int `json:"total"`
	CheckedIn    int `json:"checkedIn"`
	OnCourse     int `json:"onCourse"`
	Finished     int `json:"finished"`
	CheckedInPct int `json:"checkedInPct"`
	FinishedPct  int `json:"finishedPct"`
}

// Rank mirrors useRaceState.js's per-bib rank entry.
type Rank struct {
	Overall int `json:"overall"`
	Gender  int `json:"gender,omitempty"`
	Age     int `json:"age,omitempty"`
}

// totalMs is Finish − Start (gun time), matching raceData.js's totalMs().
// Returns -1 if the runner hasn't finished or has no category start time.
func totalMs(r raceview.Runner) int64 {
	if r.Finish == nil || r.StartTime == nil {
		return -1
	}
	return r.Finish.Sub(*r.StartTime).Milliseconds()
}

// ComputeStats derives the dashboard tile numbers from the full runner list.
func ComputeStats(runners []raceview.Runner) Stats {
	s := Stats{Total: len(runners)}
	for _, r := range runners {
		if r.Checkin != nil {
			s.CheckedIn++
		}
		if r.Checkin != nil && r.Finish == nil {
			s.OnCourse++
		}
		if r.Finish != nil {
			s.Finished++
		}
	}
	if s.Total > 0 {
		s.CheckedInPct = s.CheckedIn * 100 / s.Total
	}
	if s.CheckedIn > 0 {
		s.FinishedPct = s.Finished * 100 / s.CheckedIn
	}
	return s
}

// ComputeRanks returns overall/gender/age rank within category for every
// finisher, matching useRaceState.js's `ranks` memo exactly (same
// category-then-gender-then-age ordering).
func ComputeRanks(runners []raceview.Runner) map[string]Rank {
	byCategory := map[string][]raceview.Runner{}
	for _, r := range runners {
		if r.Finish == nil {
			continue
		}
		byCategory[r.Category] = append(byCategory[r.Category], r)
	}

	out := map[string]Rank{}
	for _, finishers := range byCategory {
		sort.Slice(finishers, func(i, j int) bool { return totalMs(finishers[i]) < totalMs(finishers[j]) })

		byGender := map[string]int{}
		byAge := map[string]int{}
		for i, r := range finishers {
			rank := Rank{Overall: i + 1}
			byGender[r.Gender]++
			rank.Gender = byGender[r.Gender]
			ageKey := r.Gender + ":" + r.AgeGroup
			byAge[ageKey]++
			rank.Age = byAge[ageKey]
			out[r.Bib] = rank
		}
	}
	return out
}

// Finishers returns every finisher sorted by gun time (fastest first),
// matching useRaceState.js's `finishers` memo.
func Finishers(runners []raceview.Runner) []raceview.Runner {
	out := make([]raceview.Runner, 0, len(runners))
	for _, r := range runners {
		if r.Finish != nil {
			out = append(out, r)
		}
	}
	sort.Slice(out, func(i, j int) bool { return totalMs(out[i]) < totalMs(out[j]) })
	return out
}

// ExportCSV renders the finisher list as CSV text (UTF-8, no BOM — the
// frontend's downloadCSV() adds the BOM on the client side; this is the
// raw text for GET /results/export.csv).
func ExportCSV(runners []raceview.Runner) string {
	ranks := ComputeRanks(runners)
	finishers := Finishers(runners)

	var b strings.Builder
	b.WriteString("Rank,BIB,Name,Category,Gender,Start,Finish,TotalTime\n")
	for _, r := range finishers {
		rank := ranks[r.Bib]
		b.WriteString(fmt.Sprintf("%d,%s,%s,%s,%s,%s,%s,%s\n",
			rank.Overall, r.Bib, r.Name, r.Category, r.Gender,
			formatClock(r.StartTime), formatClock(r.Finish), formatDuration(totalMs(r)),
		))
	}
	return b.String()
}

// formatClock renders HH:MM:SS local time-of-day, matching raceData.js's
// fmtTime(). Empty string for a nil timestamp.
func formatClock(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("15:04:05")
}

// formatDuration renders a millisecond duration as HH:MM:SS, matching
// raceData.js's fmtDur()/fmtTotal(). Empty string for the "not finished" sentinel.
func formatDuration(ms int64) string {
	if ms < 0 {
		return ""
	}
	total := ms / 1000
	h := total / 3600
	m := (total % 3600) / 60
	s := total % 60
	return fmt.Sprintf("%02d:%02d:%02d", h, m, s)
}
