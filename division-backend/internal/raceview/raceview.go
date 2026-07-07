// Package raceview holds the Runner read-model shared by the scan and
// runner packages: frontend-shaped (matches division-frontend's Runner
// type in raceData.js) and derived from the append-only scan_events log,
// never from duplicate timestamp columns.
package raceview

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// Querier is satisfied by both *pgxpool.Pool and pgx.Tx, so callers can
// load a summary inside a transaction (scan.Apply) or outside one
// (runner.Handler's plain reads).
type Querier interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

// Runner is the wire shape used everywhere the frontend consumes a runner
// record — matches division-frontend/src/lib/raceData.js's Runner typedef.
type Runner struct {
	Bib         string            `json:"bib"`
	Barcode     string            `json:"barcode"`
	Name        string            `json:"name"`
	NameOnBib   string            `json:"nameOnBib"`
	Gender      string            `json:"gender"`
	AgeGroup    string            `json:"ageGroup"`
	Nationality string            `json:"nationality"`
	Category    string            `json:"category"`
	StartTime   *time.Time        `json:"startTime"`
	Checkin     *time.Time        `json:"checkin"`
	Cps         map[string]string `json:"cps"`
	Finish      *time.Time        `json:"finish"`
}

// LoadSummary assembles one runner's Runner, deriving checkin/cps/finish
// from the earliest VALID scan_events row per checkpoint code.
func LoadSummary(ctx context.Context, q Querier, runnerID string) (Runner, error) {
	var r Runner
	err := q.QueryRow(ctx, `
		select r.bib, coalesce(r.barcode, ''), r.name, coalesce(r.name_on_bib, ''),
		       coalesce(r.gender, ''), coalesce(r.age_group, ''), coalesce(r.nationality, ''),
		       coalesce(rc.code, ''), rc.mass_start_at
		from runners r
		left join race_categories rc on rc.id = r.category_id
		where r.id = $1
	`, runnerID).Scan(
		&r.Bib, &r.Barcode, &r.Name, &r.NameOnBib,
		&r.Gender, &r.AgeGroup, &r.Nationality,
		&r.Category, &r.StartTime,
	)
	if err != nil {
		return Runner{}, err
	}
	r.Cps = map[string]string{}

	rows, err := q.Query(ctx, `
		select checkpoint_code, min(scanned_at)
		from scan_events
		where runner_id = $1 and status = 'VALID'
		group by checkpoint_code
	`, runnerID)
	if err != nil {
		return Runner{}, err
	}
	defer rows.Close()

	for rows.Next() {
		var code string
		var at time.Time
		if err := rows.Scan(&code, &at); err != nil {
			return Runner{}, err
		}
		switch code {
		case "CHECKIN":
			t := at
			r.Checkin = &t
		case "FINISH":
			t := at
			r.Finish = &t
		default:
			r.Cps[code] = at.Format(time.RFC3339)
		}
	}

	return r, rows.Err()
}

// ListAll loads every runner's Runner summary in two queries total (runners
// + a grouped scan_events aggregate), not one round trip per runner.
func ListAll(ctx context.Context, q Querier) ([]Runner, error) {
	rows, err := q.Query(ctx, `
		select r.id, r.bib, coalesce(r.barcode, ''), r.name, coalesce(r.name_on_bib, ''),
		       coalesce(r.gender, ''), coalesce(r.age_group, ''), coalesce(r.nationality, ''),
		       coalesce(rc.code, ''), rc.mass_start_at
		from runners r
		left join race_categories rc on rc.id = r.category_id
		order by r.bib
	`)
	if err != nil {
		return nil, err
	}

	byID := map[string]*Runner{}
	order := []string{}
	for rows.Next() {
		var id string
		var r Runner
		if err := rows.Scan(
			&id, &r.Bib, &r.Barcode, &r.Name, &r.NameOnBib,
			&r.Gender, &r.AgeGroup, &r.Nationality,
			&r.Category, &r.StartTime,
		); err != nil {
			rows.Close()
			return nil, err
		}
		r.Cps = map[string]string{}
		byID[id] = &r
		order = append(order, id)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	evRows, err := q.Query(ctx, `
		select runner_id, checkpoint_code, min(scanned_at)
		from scan_events
		where status = 'VALID' and runner_id is not null
		group by runner_id, checkpoint_code
	`)
	if err != nil {
		return nil, err
	}
	defer evRows.Close()

	for evRows.Next() {
		var runnerID, code string
		var at time.Time
		if err := evRows.Scan(&runnerID, &code, &at); err != nil {
			return nil, err
		}
		r, ok := byID[runnerID]
		if !ok {
			continue
		}
		switch code {
		case "CHECKIN":
			t := at
			r.Checkin = &t
		case "FINISH":
			t := at
			r.Finish = &t
		default:
			r.Cps[code] = at.Format(time.RFC3339)
		}
	}
	if err := evRows.Err(); err != nil {
		return nil, err
	}

	out := make([]Runner, 0, len(order))
	for _, id := range order {
		out = append(out, *byID[id])
	}
	return out, nil
}
