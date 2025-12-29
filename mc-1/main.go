package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

type server struct {
	db *pgxpool.Pool
}

type user struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
}

type namedNote struct {
	ID      int    `json:"id"`
	UserID  int    `json:"-"`
	Name    string `json:"name"`
	Content string `json:"content"`
}

type notePayload struct {
	Name    string `json:"name"`
	Content string `json:"content"`
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Printf("no .env file loaded: %v", err)
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("connect db: %v", err)
	}
	defer pool.Close()

	if err := ensureSchema(context.Background(), pool); err != nil {
		log.Fatalf("ensure schema: %v", err)
	}

	s := &server{db: pool}

	mux := http.NewServeMux()
	mux.HandleFunc("/me", s.handleMe)
	mux.HandleFunc("/notes", s.handleNotes)
	mux.HandleFunc("/notes/", s.handleNoteByName)

	addr := ":" + valueOrDefault(os.Getenv("PORT"), "8080")
	log.Printf("mc-1 listening on %s", addr)

	handler := corsMiddleware(loggingMiddleware(mux))

	if err := http.ListenAndServe(addr, handler); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("server error: %v", err)
	}
}

func (s *server) handleMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	u, err := s.authUser(r.Context(), r.Header.Get("Authorization"))
	if err != nil {
		status := http.StatusUnauthorized
		if errors.Is(err, errAuthInternal) {
			status = http.StatusInternalServerError
		}
		http.Error(w, err.Error(), status)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(u); err != nil {
		log.Printf("encode response: %v", err)
	}
}

// handleNotes manages list (GET) and create (POST).
func (s *server) handleNotes(w http.ResponseWriter, r *http.Request) {
	u, err := s.authUser(r.Context(), r.Header.Get("Authorization"))
	if err != nil {
		status := http.StatusUnauthorized
		if errors.Is(err, errAuthInternal) {
			status = http.StatusInternalServerError
		}
		http.Error(w, err.Error(), status)
		return
	}

	switch r.Method {
	case http.MethodGet:
		s.listNotes(w, r, u)
	case http.MethodPost:
		s.createNote(w, r, u)
	default:
		w.Header().Set("Allow", http.MethodGet+", "+http.MethodPost)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleNoteByName manages get/update/delete for a named note.
func (s *server) handleNoteByName(w http.ResponseWriter, r *http.Request) {
	u, err := s.authUser(r.Context(), r.Header.Get("Authorization"))
	if err != nil {
		status := http.StatusUnauthorized
		if errors.Is(err, errAuthInternal) {
			status = http.StatusInternalServerError
		}
		http.Error(w, err.Error(), status)
		return
	}

	name, err := extractNoteName(r.URL.Path)
	if err != nil {
		http.Error(w, "invalid note name", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		s.getNote(w, r, u, name)
	case http.MethodPut:
		s.updateNote(w, r, u, name)
	case http.MethodDelete:
		s.deleteNote(w, r, u, name)
	default:
		w.Header().Set("Allow", http.MethodGet+", "+http.MethodPut+", "+http.MethodDelete)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *server) listNotes(w http.ResponseWriter, r *http.Request, u user) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	rows, err := s.db.Query(ctx, "select name from named_notes where user_id = $1 order by name asc", u.ID)
	if err != nil {
		log.Printf("list notes: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var names []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			log.Printf("scan list: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		names = append(names, name)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(names)
}

func (s *server) createNote(w http.ResponseWriter, r *http.Request, u user) {
	var payload notePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(payload.Name) == "" {
		http.Error(w, "name required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	_, err := s.db.Exec(ctx, `
        insert into named_notes (user_id, name, content)
        values ($1, $2, $3)
        on conflict (user_id, name) do nothing
    `, u.ID, payload.Name, payload.Content)
	if err != nil {
		log.Printf("create note: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "created"})
}

func (s *server) getNote(w http.ResponseWriter, r *http.Request, u user, name string) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	var note namedNote
	err := s.db.QueryRow(ctx, `
        select id, user_id, name, content
        from named_notes
        where user_id = $1 and name = $2
    `, u.ID, name).Scan(&note.ID, &note.UserID, &note.Name, &note.Content)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		http.NotFound(w, r)
		return
	case err != nil:
		log.Printf("get note: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(note)
}

func (s *server) updateNote(w http.ResponseWriter, r *http.Request, u user, name string) {
	var payload notePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	ct, err := s.db.Exec(ctx, `
        update named_notes
        set content = $3
        where user_id = $1 and name = $2
    `, u.ID, name, payload.Content)
	if err != nil {
		log.Printf("update note: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if ct.RowsAffected() == 0 {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

func (s *server) deleteNote(w http.ResponseWriter, r *http.Request, u user, name string) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	ct, err := s.db.Exec(ctx, `
        delete from named_notes
        where user_id = $1 and name = $2
    `, u.ID, name)
	if err != nil {
		log.Printf("delete note: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if ct.RowsAffected() == 0 {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

var errAuthInternal = errors.New("internal error")

func (s *server) authUser(ctx context.Context, authHeader string) (user, error) {
	token := parseToken(authHeader)
	if token == "" {
		return user{}, errors.New("missing or invalid bearer token")
	}

	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var u user
	err := s.db.QueryRow(ctx, "select id, username from users where token = $1", token).Scan(&u.ID, &u.Username)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return user{}, errors.New("invalid token")
	case err != nil:
		log.Printf("query user: %v", err)
		return user{}, errAuthInternal
	default:
		return u, nil
	}
}

func parseToken(header string) string {
	if header == "" {
		return ""
	}

	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}

	return strings.TrimSpace(parts[1])
}

func valueOrDefault(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func ensureSchema(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
        create table if not exists named_notes (
            id serial primary key,
            user_id integer not null references users(id) on delete cascade,
            name text not null,
            content text not null,
            created_at timestamptz default now()
        );
        create unique index if not exists idx_named_notes_user_name on named_notes(user_id, name);
    `)
	return err
}

func extractNoteName(path string) (string, error) {
	trimmed := strings.TrimPrefix(path, "/notes/")
	if trimmed == "" || trimmed == path {
		return "", errors.New("missing name")
	}
	decoded, err := url.PathUnescape(trimmed)
	if err != nil {
		return "", err
	}
	return decoded, nil
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s (%v)", r.Method, r.URL.Path, time.Since(start))
	})
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
