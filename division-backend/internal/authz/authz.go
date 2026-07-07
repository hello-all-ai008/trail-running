// Package authz verifies Supabase Auth JWTs and resolves the calling
// staff member's role. Go trusts Supabase's JWKS for signature
// verification — no shared secret lives in this service's env.
package authz

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type contextKey string

const staffContextKey contextKey = "staff"

// Staff identifies the authenticated caller for downstream handlers.
type Staff struct {
	UserID string
	Role   string // "admin" | "staff"
}

// Verifier checks bearer tokens against Supabase's JWKS and looks up the
// caller's staff_users row.
type Verifier struct {
	keyfunc jwt.Keyfunc
	pool    *pgxpool.Pool
}

// NewVerifier fetches (and background-refreshes) the Supabase project's
// JWKS from <supabaseURL>/auth/v1/.well-known/jwks.json.
func NewVerifier(ctx context.Context, pool *pgxpool.Pool, supabaseURL string) (*Verifier, error) {
	jwksURL := strings.TrimRight(supabaseURL, "/") + "/auth/v1/.well-known/jwks.json"
	kf, err := keyfunc.NewDefaultCtx(ctx, []string{jwksURL})
	if err != nil {
		return nil, fmt.Errorf("fetch JWKS: %w", err)
	}
	return &Verifier{keyfunc: kf.Keyfunc, pool: pool}, nil
}

// RequireStaff is HTTP middleware: rejects missing/invalid tokens with 401
// and callers with no staff_users row with 403. On success it attaches the
// resolved Staff to the request context.
func (v *Verifier) RequireStaff(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, err := v.verify(r)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		staff, err := v.lookupStaff(r.Context(), userID)
		if err != nil {
			http.Error(w, "forbidden: not a staff account", http.StatusForbidden)
			return
		}

		ctx := context.WithValue(r.Context(), staffContextKey, staff)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (v *Verifier) verify(r *http.Request) (string, error) {
	header := r.Header.Get("Authorization")
	token, ok := strings.CutPrefix(header, "Bearer ")
	if !ok || token == "" {
		return "", errors.New("missing bearer token")
	}

	claims := jwt.MapClaims{}
	parsed, err := jwt.ParseWithClaims(token, claims, v.keyfunc)
	if err != nil || !parsed.Valid {
		return "", fmt.Errorf("invalid token: %w", err)
	}

	sub, ok := claims["sub"].(string)
	if !ok || sub == "" {
		return "", errors.New("token missing sub claim")
	}
	return sub, nil
}

func (v *Verifier) lookupStaff(ctx context.Context, userID string) (Staff, error) {
	var role string
	err := v.pool.QueryRow(ctx,
		`select role from staff_users where user_id = $1`, userID,
	).Scan(&role)
	if err != nil {
		return Staff{}, fmt.Errorf("lookup staff_users: %w", err)
	}
	return Staff{UserID: userID, Role: role}, nil
}

// FromContext retrieves the Staff attached by RequireStaff.
func FromContext(ctx context.Context) (Staff, bool) {
	staff, ok := ctx.Value(staffContextKey).(Staff)
	return staff, ok
}
