# mc-1

Small Go microservice that reuses the Rust backend's auth model. It can return the current user's name and manage named logbook entries.

## What it does
- Accepts `Authorization: Bearer <token>` like the Rust service.
- Looks up the matching `users` row in Postgres.
- Responds with `{"id":<int>,"username":"<name>"}` or `401` when the token is missing/invalid.
- Manages named logbook entries (per user) via `/notes`:
  - `GET /notes` → list note names for the user.
  - `POST /notes` → create a note `{name, content}` (no-op if that name already exists).
  - `GET /notes/{name}` → fetch the note.
  - `PUT /notes/{name}` → update content.
  - `DELETE /notes/{name}` → delete the note.
  - Automatically creates table `named_notes` with unique `(user_id, name)` if missing.

## Configuration
- `DATABASE_URL` (required): Postgres URL, e.g. `postgres://myuser:mypassword@db:5432/mydatabase`.
- `PORT` (optional): Port to listen on. Defaults to `8080`.

## Run locally
```sh
cd mc-1
go run .
```
Then call:
```sh
curl -H "Authorization: Bearer <token>" http://localhost:8080/me

# list logbook note names
curl -H "Authorization: Bearer <token>" http://localhost:8080/notes

# create
curl -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"name":"trip-plan","content":"pack bag"}' \
  http://localhost:8080/notes

# get
curl -H "Authorization: Bearer <token>" http://localhost:8080/notes/trip-plan

# update
curl -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -X PUT -d '{"content":"pack bag + charger"}' \
  http://localhost:8080/notes/trip-plan

# delete
curl -H "Authorization: Bearer <token>" -X DELETE \
  http://localhost:8080/notes/trip-plan
```
