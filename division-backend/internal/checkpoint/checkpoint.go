// Package checkpoint serves the static-ish checkpoint list per category.
package checkpoint

import (
	"context"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"trailrunning/division-backend/internal/httpapi"
)

// Checkpoint is the wire shape returned by GET /checkpoints.
type Checkpoint struct {
	ID           string `json:"id"`
	CategoryCode string `json:"categoryCode"`
	Code         string `json:"code"`
	Name         string `json:"name"`
	SequenceNo   int    `json:"sequenceNo"`
}

// Handler exposes GET /checkpoints.
type Handler struct {
	Pool *pgxpool.Pool
}

func (h Handler) List(w http.ResponseWriter, r *http.Request) {
	out, err := ListAll(r.Context(), h.Pool)
	if err != nil {
		httpapi.WriteError(w, http.StatusInternalServerError, "query checkpoints")
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, out)
}

// ListAll fetches every checkpoint across all categories, ordered for display.
func ListAll(ctx context.Context, pool *pgxpool.Pool) ([]Checkpoint, error) {
	rows, err := pool.Query(ctx, `
		select c.id, rc.code, c.code, c.name, c.sequence_no
		from checkpoints c
		join race_categories rc on rc.id = c.category_id
		order by rc.code, c.sequence_no
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Checkpoint{}
	for rows.Next() {
		var cp Checkpoint
		if err := rows.Scan(&cp.ID, &cp.CategoryCode, &cp.Code, &cp.Name, &cp.SequenceNo); err != nil {
			return nil, err
		}
		out = append(out, cp)
	}
	return out, rows.Err()
}
