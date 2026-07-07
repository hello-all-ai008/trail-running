// Command api runs the Trail Running Timing System's HTTP API: staff-authed
// scan ingestion plus read endpoints for runners/checkpoints/results.
package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"trailrunning/division-backend/internal/authz"
	"trailrunning/division-backend/internal/checkpoint"
	"trailrunning/division-backend/internal/config"
	"trailrunning/division-backend/internal/db"
	"trailrunning/division-backend/internal/httpapi"
	"trailrunning/division-backend/internal/results"
	"trailrunning/division-backend/internal/runner"
	"trailrunning/division-backend/internal/scan"
)

func main() {
	if err := run(); err != nil {
		slog.Error("fatal", "error", err)
		os.Exit(1)
	}
}

func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		return err
	}

	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	verifier, err := authz.NewVerifier(ctx, pool, cfg.SupabaseURL)
	if err != nil {
		return err
	}

	scanHandler := scan.Handler{Pool: pool}
	runnerHandler := runner.Handler{Pool: pool}
	checkpointHandler := checkpoint.Handler{Pool: pool}
	resultsHandler := results.Handler{Pool: pool}

	router := httpapi.NewRouter(httpapi.Deps{
		Auth: verifier,
		RegisterRoutes: func(mux *http.ServeMux, requireStaff func(http.Handler) http.Handler) {
			mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			})

			mux.Handle("POST /scan", requireStaff(http.HandlerFunc(scanHandler.Post)))
			mux.Handle("GET /runners", requireStaff(http.HandlerFunc(runnerHandler.List)))
			mux.Handle("GET /runners/{bib}/report", requireStaff(http.HandlerFunc(runnerHandler.Report)))
			mux.Handle("GET /checkpoints", requireStaff(http.HandlerFunc(checkpointHandler.List)))
			mux.Handle("GET /stats", requireStaff(http.HandlerFunc(resultsHandler.Stats)))
			mux.Handle("GET /results", requireStaff(http.HandlerFunc(resultsHandler.List)))
			mux.Handle("GET /results/export.csv", requireStaff(http.HandlerFunc(resultsHandler.ExportCSV)))
		},
	})

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()

	slog.Info("listening", "port", cfg.Port)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return err
	}
	return nil
}
