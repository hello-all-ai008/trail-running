package scan

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"trailrunning/division-backend/internal/authz"
	"trailrunning/division-backend/internal/httpapi"
)

// Handler exposes POST /scan. Registered behind authz.RequireStaff — every
// scan is attributed to the authenticated staff member via recorded_by.
type Handler struct {
	Pool *pgxpool.Pool
}

func (h Handler) Post(w http.ResponseWriter, r *http.Request) {
	staff, ok := authz.FromContext(r.Context())
	if !ok {
		httpapi.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req Request
	if err := httpapi.DecodeJSON(r, &req); err != nil {
		httpapi.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.RawValue == "" || req.CheckpointCode == "" {
		httpapi.WriteError(w, http.StatusBadRequest, "rawValue and checkpointCode are required")
		return
	}

	result, err := Apply(r.Context(), h.Pool, req, staff.UserID)
	if err != nil {
		httpapi.WriteError(w, http.StatusInternalServerError, "scan failed")
		return
	}

	httpapi.WriteJSON(w, http.StatusOK, result)
}
