// Package runner exposes read endpoints over the runner database:
// GET /runners (full list) and GET /runners/{bib}/report (one runner +
// rank, the data behind the e-Slip).
package runner

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"trailrunning/division-backend/internal/httpapi"
	"trailrunning/division-backend/internal/raceview"
	"trailrunning/division-backend/internal/results"
)

// Handler exposes GET /runners and GET /runners/{bib}/report.
type Handler struct {
	Pool *pgxpool.Pool
}

func (h Handler) List(w http.ResponseWriter, r *http.Request) {
	runners, err := raceview.ListAll(r.Context(), h.Pool)
	if err != nil {
		httpapi.WriteError(w, http.StatusInternalServerError, "load runners")
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, runners)
}

// report is the GET /runners/{bib}/report response — the e-Slip data.
type report struct {
	Runner raceview.Runner `json:"runner"`
	Rank   results.Rank    `json:"rank"`
}

func (h Handler) Report(w http.ResponseWriter, r *http.Request) {
	bib := r.PathValue("bib")

	runners, err := raceview.ListAll(r.Context(), h.Pool)
	if err != nil {
		httpapi.WriteError(w, http.StatusInternalServerError, "load runners")
		return
	}

	runner, found := findByBib(runners, bib)
	if !found {
		httpapi.WriteError(w, http.StatusNotFound, "runner not found")
		return
	}

	rank := results.ComputeRanks(runners)[bib]
	httpapi.WriteJSON(w, http.StatusOK, report{Runner: runner, Rank: rank})
}

func findByBib(runners []raceview.Runner, bib string) (raceview.Runner, bool) {
	for _, r := range runners {
		if r.Bib == bib {
			return r, true
		}
	}
	return raceview.Runner{}, false
}
