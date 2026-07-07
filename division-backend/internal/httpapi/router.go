// Package httpapi wires the HTTP router and shared middleware.
package httpapi

import (
	"log/slog"
	"net/http"
	"time"
)

// Deps are the handler dependencies the router wires up. Kept as an
// interface-free struct since this is a single-binary service, not a
// pluggable framework.
type Deps struct {
	Auth interface {
		RequireStaff(http.Handler) http.Handler
	}
	RegisterRoutes func(mux *http.ServeMux, requireStaff func(http.Handler) http.Handler)
}

// NewRouter builds the top-level handler: logging + CORS, then routes.
func NewRouter(deps Deps) http.Handler {
	mux := http.NewServeMux()
	deps.RegisterRoutes(mux, deps.Auth.RequireStaff)

	var handler http.Handler = mux
	handler = withCORS(handler)
	handler = withLogging(handler)
	return handler
}

func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		slog.Info("request", "method", r.Method, "path", r.URL.Path, "duration_ms", time.Since(start).Milliseconds())
	})
}

// withCORS allows the Vite dev server / deployed frontend origin to call
// this API with an Authorization header. Origin is intentionally permissive
// at this stage (no cookies/credentials are used — auth is a bearer token
// the browser must attach explicitly), tightened once a frontend domain is fixed.
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
