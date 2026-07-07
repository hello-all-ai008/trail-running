package results

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"trailrunning/division-backend/internal/httpapi"
	"trailrunning/division-backend/internal/raceview"
)

// Handler exposes GET /stats, GET /results, and GET /results/export.csv.
type Handler struct {
	Pool *pgxpool.Pool
}

func (h Handler) Stats(w http.ResponseWriter, r *http.Request) {
	runners, err := raceview.ListAll(r.Context(), h.Pool)
	if err != nil {
		httpapi.WriteError(w, http.StatusInternalServerError, "load runners")
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, ComputeStats(runners))
}

// resultsResponse bundles finishers + ranks the same way ResultsPage.jsx
// consumes them (two props derived from one useRaceState() call).
type resultsResponse struct {
	Finishers []raceview.Runner `json:"finishers"`
	Ranks     map[string]Rank   `json:"ranks"`
}

func (h Handler) List(w http.ResponseWriter, r *http.Request) {
	runners, err := raceview.ListAll(r.Context(), h.Pool)
	if err != nil {
		httpapi.WriteError(w, http.StatusInternalServerError, "load runners")
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, resultsResponse{
		Finishers: Finishers(runners),
		Ranks:     ComputeRanks(runners),
	})
}

func (h Handler) ExportCSV(w http.ResponseWriter, r *http.Request) {
	runners, err := raceview.ListAll(r.Context(), h.Pool)
	if err != nil {
		httpapi.WriteError(w, http.StatusInternalServerError, "load runners")
		return
	}
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="race-results.csv"`)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("\uFEFF")) // UTF-8 BOM so Excel renders Thai text correctly
	_, _ = w.Write([]byte(ExportCSV(runners)))
}
