package scan

import (
	"context"
	"testing"
)

// fakeHistory is an in-memory scanHistory for testing decideOutcome without
// a live Postgres connection — mirrors raceEngine.test.js's pure-function
// approach on the frontend.
type fakeHistory struct {
	valid map[string]bool // "runnerID:checkpointCode" -> has a VALID scan
}

func newFakeHistory() *fakeHistory {
	return &fakeHistory{valid: map[string]bool{}}
}

func (f *fakeHistory) markValid(runnerID, checkpointCode string) {
	f.valid[runnerID+":"+checkpointCode] = true
}

func (f *fakeHistory) hasValidScan(_ context.Context, runnerID, checkpointCode string) (bool, error) {
	return f.valid[runnerID+":"+checkpointCode], nil
}

func TestDecideOutcome_FirstCheckinIsOK(t *testing.T) {
	h := newFakeHistory()
	outcome, err := decideOutcome(context.Background(), h, "r1", CodeCheckin)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if outcome != OutcomeOK {
		t.Errorf("got %q, want %q", outcome, OutcomeOK)
	}
}

func TestDecideOutcome_DuplicateCheckinRejected(t *testing.T) {
	h := newFakeHistory()
	h.markValid("r1", CodeCheckin)

	outcome, err := decideOutcome(context.Background(), h, "r1", CodeCheckin)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if outcome != OutcomeDuplicate {
		t.Errorf("got %q, want %q", outcome, OutcomeDuplicate)
	}
}

func TestDecideOutcome_CheckpointBeforeCheckinRejected(t *testing.T) {
	h := newFakeHistory()

	outcome, err := decideOutcome(context.Background(), h, "r1", "A1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if outcome != OutcomeNotCheckedIn {
		t.Errorf("got %q, want %q", outcome, OutcomeNotCheckedIn)
	}
}

func TestDecideOutcome_FinishBeforeCheckinRejected(t *testing.T) {
	h := newFakeHistory()

	outcome, err := decideOutcome(context.Background(), h, "r1", CodeFinish)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if outcome != OutcomeNotCheckedIn {
		t.Errorf("got %q, want %q", outcome, OutcomeNotCheckedIn)
	}
}

func TestDecideOutcome_CheckpointAfterCheckinIsOK(t *testing.T) {
	h := newFakeHistory()
	h.markValid("r1", CodeCheckin)

	outcome, err := decideOutcome(context.Background(), h, "r1", "A1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if outcome != OutcomeOK {
		t.Errorf("got %q, want %q", outcome, OutcomeOK)
	}
}

func TestDecideOutcome_DuplicateCheckpointRejected_FirstScanWins(t *testing.T) {
	h := newFakeHistory()
	h.markValid("r1", CodeCheckin)
	h.markValid("r1", "A1")

	outcome, err := decideOutcome(context.Background(), h, "r1", "A1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if outcome != OutcomeDuplicate {
		t.Errorf("got %q, want %q", outcome, OutcomeDuplicate)
	}
}

func TestDecideOutcome_DuplicateFinishRejected(t *testing.T) {
	h := newFakeHistory()
	h.markValid("r1", CodeCheckin)
	h.markValid("r1", CodeFinish)

	outcome, err := decideOutcome(context.Background(), h, "r1", CodeFinish)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if outcome != OutcomeDuplicate {
		t.Errorf("got %q, want %q", outcome, OutcomeDuplicate)
	}
}

func TestDecideOutcome_CheckpointsAreIndependentPerRunner(t *testing.T) {
	h := newFakeHistory()
	h.markValid("r1", CodeCheckin)
	h.markValid("r1", "A1")

	// Different runner, no scans yet — must not see r1's history.
	outcome, err := decideOutcome(context.Background(), h, "r2", "A1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if outcome != OutcomeNotCheckedIn {
		t.Errorf("got %q, want %q", outcome, OutcomeNotCheckedIn)
	}
}

func TestNormalizeValue_StripsBarcodeAsterisksAndWhitespace(t *testing.T) {
	cases := map[string]string{
		"*3315*": "3315",
		" 3315 ": "3315",
		"a3315":  "A3315",
		"":       "",
	}
	for in, want := range cases {
		if got := normalizeValue(in); got != want {
			t.Errorf("normalizeValue(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestStatusForCode(t *testing.T) {
	cases := map[string]string{
		CodeCheckin: "PRE_CHECKED_IN",
		"A1":        "ON_COURSE",
		"A2":        "ON_COURSE",
		CodeFinish:  "FINISHED",
	}
	for code, want := range cases {
		if got := statusForCode(code); got != want {
			t.Errorf("statusForCode(%q) = %q, want %q", code, got, want)
		}
	}
}
