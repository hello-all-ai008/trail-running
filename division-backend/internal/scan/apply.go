package scan

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"trailrunning/division-backend/internal/raceview"
)

// stationLabel maps a checkpoint code to the label the frontend expects in
// Result.Station (matches raceData.js's STATIONS + cpName()).
func stationLabel(ctx context.Context, tx pgx.Tx, code string) string {
	switch code {
	case CodeCheckin:
		return "Check-in"
	case CodeFinish:
		return "Finish"
	default:
		var name string
		err := tx.QueryRow(ctx, `select name from checkpoints where code = $1 limit 1`, code).Scan(&name)
		if err != nil {
			return code
		}
		return name
	}
}

// statusForCode returns the runners.status value a VALID scan at this
// checkpoint code transitions the runner to.
func statusForCode(code string) string {
	switch code {
	case CodeCheckin:
		return "PRE_CHECKED_IN"
	case CodeFinish:
		return "FINISHED"
	default:
		return "ON_COURSE"
	}
}

// Apply runs one scan through the full validate → log → transition →
// live_progress pipeline as a single transaction. recordedBy is the
// authenticated staff user's Supabase Auth user id.
func Apply(ctx context.Context, pool *pgxpool.Pool, req Request, recordedBy string) (Result, error) {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return Result{}, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	scannedAt := time.Now()
	station := stationLabel(ctx, tx, req.CheckpointCode)
	value := normalizeValue(req.RawValue)

	runnerID, found, err := resolveRunnerID(ctx, tx, value)
	if err != nil {
		return Result{}, fmt.Errorf("resolve runner: %w", err)
	}
	if !found {
		if err := logScan(ctx, tx, req.RawValue, nil, req.CheckpointCode, req.StationID, recordedBy, OutcomeNotFound, "runner not found", scannedAt); err != nil {
			return Result{}, err
		}
		if err := tx.Commit(ctx); err != nil {
			return Result{}, fmt.Errorf("commit: %w", err)
		}
		return Result{Outcome: OutcomeNotFound, Station: station, Runner: nil, Time: scannedAt}, nil
	}

	// Lock the runner row for the rest of this transaction so two concurrent
	// scans of the same runner (e.g. two stations scanning the same BIB in
	// the same instant) can't both read decideOutcome's "not yet valid"
	// before either commits. A second concurrent Apply() blocks here until
	// the first transaction commits/rolls back, then correctly sees it.
	if _, err := tx.Exec(ctx, `select 1 from runners where id = $1 for update`, runnerID); err != nil {
		return Result{}, fmt.Errorf("lock runner: %w", err)
	}

	outcome, err := decideOutcome(ctx, pgxScanHistory{tx: tx}, runnerID, req.CheckpointCode)
	if err != nil {
		return Result{}, fmt.Errorf("decide outcome: %w", err)
	}

	if err := logScan(ctx, tx, req.RawValue, &runnerID, req.CheckpointCode, req.StationID, recordedBy, outcome, "", scannedAt); err != nil {
		return Result{}, err
	}

	if outcome == OutcomeOK {
		if err := transitionRunner(ctx, tx, runnerID, req.CheckpointCode); err != nil {
			return Result{}, fmt.Errorf("transition runner: %w", err)
		}
	}

	runner, err := raceview.LoadSummary(ctx, tx, runnerID)
	if err != nil {
		return Result{}, fmt.Errorf("load runner summary: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return Result{}, fmt.Errorf("commit: %w", err)
	}

	return Result{Outcome: outcome, Station: station, Runner: &runner, Time: scannedAt}, nil
}

// normalizeValue mirrors raceData.js's findRunner: uppercase, trim, strip
// the barcode's leading/trailing '*'.
func normalizeValue(raw string) string {
	v := strings.ToUpper(strings.TrimSpace(raw))
	return strings.ReplaceAll(v, "*", "")
}

func resolveRunnerID(ctx context.Context, tx pgx.Tx, value string) (string, bool, error) {
	var id string
	err := tx.QueryRow(ctx, `
		select id from runners
		where upper(bib) = $1 or upper(replace(barcode, '*', '')) = $1
		limit 1
	`, value).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	return id, true, nil
}

// scanHistory is the read dependency decideOutcome needs — kept as a
// 1-method interface so the business rules are unit-testable against a
// fake, without a live Postgres connection. pgxScanHistory below is the
// real implementation used by Apply.
type scanHistory interface {
	hasValidScan(ctx context.Context, runnerID, checkpointCode string) (bool, error)
}

// decideOutcome applies the business rules: not-checked-in for any
// checkpoint/finish scan before a valid CHECKIN, duplicate for a repeat
// valid scan at the same checkpoint code, otherwise ok.
func decideOutcome(ctx context.Context, history scanHistory, runnerID, checkpointCode string) (Outcome, error) {
	if checkpointCode != CodeCheckin {
		checkedIn, err := history.hasValidScan(ctx, runnerID, CodeCheckin)
		if err != nil {
			return "", err
		}
		if !checkedIn {
			return OutcomeNotCheckedIn, nil
		}
	}

	already, err := history.hasValidScan(ctx, runnerID, checkpointCode)
	if err != nil {
		return "", err
	}
	if already {
		return OutcomeDuplicate, nil
	}

	return OutcomeOK, nil
}

// pgxScanHistory implements scanHistory against a real transaction.
type pgxScanHistory struct{ tx pgx.Tx }

func (h pgxScanHistory) hasValidScan(ctx context.Context, runnerID, checkpointCode string) (bool, error) {
	var exists bool
	err := h.tx.QueryRow(ctx, `
		select exists(
			select 1 from scan_events
			where runner_id = $1 and checkpoint_code = $2 and status = 'VALID'
		)
	`, runnerID, checkpointCode).Scan(&exists)
	return exists, err
}

func logScan(ctx context.Context, tx pgx.Tx, rawValue string, runnerID *string, checkpointCode, stationID, recordedBy string, outcome Outcome, message string, scannedAt time.Time) error {
	_, err := tx.Exec(ctx, `
		insert into scan_events (raw_value, runner_id, checkpoint_code, status, message, station_id, recorded_by, scanned_at)
		values ($1, $2, $3, $4, nullif($5, ''), nullif($6, ''), nullif($7, '')::uuid, $8)
	`, rawValue, runnerID, checkpointCode, outcome.eventStatus(), message, stationID, recordedBy, scannedAt)
	return err
}

func transitionRunner(ctx context.Context, tx pgx.Tx, runnerID, checkpointCode string) error {
	newStatus := statusForCode(checkpointCode)
	_, err := tx.Exec(ctx, `update runners set status = $1, updated_at = now() where id = $2`, newStatus, runnerID)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `
		insert into live_progress (bib, name_on_bib, category_code, current_status, last_checkpoint_code, last_scanned_at, updated_at)
		select r.bib, r.name_on_bib, rc.code, r.status, $2, now(), now()
		from runners r
		left join race_categories rc on rc.id = r.category_id
		where r.id = $1
		on conflict (bib) do update set
			current_status = excluded.current_status,
			last_checkpoint_code = excluded.last_checkpoint_code,
			last_scanned_at = excluded.last_scanned_at,
			updated_at = excluded.updated_at
	`, runnerID, checkpointCode)
	return err
}
