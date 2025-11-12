CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_date DATE NOT NULL,
    content TEXT NOT NULL
);

CREATE INDEX idx_notes_user_date ON notes(user_id, note_date);