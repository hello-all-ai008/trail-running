// Package scan implements the shared check-in / checkpoint / finish scan
// core used by every station. Business rules mirror
// division-frontend/src/lib/raceEngine.js: duplicate scans are rejected
// and logged, checkpoint/finish scans before check-in are rejected and
// logged, first valid scan always wins.
package scan

import "trailrunning/division-backend/internal/raceview"

// Checkpoint codes accepted by Apply. CHECKIN and FINISH are the two
// fixed endpoints; A1-A3 are the on-course checkpoints seeded in
// supabase/migrations/0002_seed.sql.
const (
	CodeCheckin = "CHECKIN"
	CodeFinish  = "FINISH"
)

// Outcome values match the frontend's App.jsx noticeFor() switch exactly,
// so the wire format needs no translation layer on the client.
type Outcome string

const (
	OutcomeOK           Outcome = "ok"
	OutcomeDuplicate    Outcome = "duplicate"
	OutcomeNotCheckedIn Outcome = "not-checked-in"
	OutcomeNotFound     Outcome = "not-found"
)

// eventStatus is the scan_events.status enum value for a given Outcome.
func (o Outcome) eventStatus() string {
	switch o {
	case OutcomeOK:
		return "VALID"
	case OutcomeDuplicate:
		return "DUPLICATE"
	case OutcomeNotCheckedIn:
		return "NOT_CHECKED_IN"
	default:
		return "INVALID"
	}
}

// Request is the POST /scan body.
type Request struct {
	RawValue       string `json:"rawValue"`
	CheckpointCode string `json:"checkpointCode"` // "CHECKIN" | "A1" | "A2" | "A3" | "FINISH"
	StationID      string `json:"stationId"`
}

// Result is the POST /scan response body.
type Result struct {
	Outcome Outcome          `json:"outcome"`
	Station string           `json:"station"`
	Runner  *raceview.Runner `json:"runner"`
}
