mod schema;
mod models;

use axum::{
    routing::{get, post, delete, put},
    extract::{State, Path},
    Json, Router, Extension,
    middleware::Next,
    http::StatusCode,
    body::Body,
};
use diesel::prelude::*;
use diesel::r2d2::{ConnectionManager, Pool};
use dotenvy::dotenv;
use tower_http::cors::{Any, CorsLayer};
use uuid::Uuid;
use argon2::{
    Argon2, PasswordHash, PasswordVerifier, PasswordHasher,
    password_hash::SaltString,
};
use chrono::NaiveDate;

use crate::schema::{users, notes};
use crate::models::*;

type DbPool = Pool<ConnectionManager<PgConnection>>;

#[derive(Clone)]
struct AppState {
    pool: DbPool,
}

// ------------------------- PASSWORD HASHING -------------------------

fn hash_password(password: &str) -> String {
    let salt = SaltString::generate(&mut rand_core::OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .unwrap()
        .to_string()
}

fn verify_password(password: &str, hash: &str) -> bool {
    let parsed = PasswordHash::new(hash).unwrap();
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok()
}

// ------------------------- REQUEST STRUCTS -------------------------

#[derive(serde::Deserialize)]
struct RegisterRequest {
    username: String,
    password: String,
}

#[derive(serde::Deserialize)]
struct LoginRequest {
    username: String,
    password: String,
}

// ------------------------- MAIN -------------------------

#[tokio::main]
async fn main() {
    dotenv().ok();

    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL missing");

    let manager = ConnectionManager::<PgConnection>::new(database_url);
    let pool = Pool::builder().build(manager).unwrap();

    let state = AppState { pool };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_headers(Any)
        .allow_methods(Any);

    let public = Router::new()
        .route("/register", post(register))
        .route("/login", post(login));

    let protected = Router::new()
        .route("/me", get(me))
        .route("/notes", post(create_note).put(update_note))
        .route("/notes/days", get(list_note_days))
        .route("/notes/{date}", get(get_note).delete(delete_note))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            auth_middleware,
        ));

    let app = public
        .merge(protected)
        .layer(cors)
        .with_state(state);


    println!("🚀 Server running at http://127.0.0.1:3000");

    axum::serve(
        tokio::net::TcpListener::bind("127.0.0.1:3000")
            .await
            .unwrap(),
        app,
    )
    .await
    .unwrap();
}

// ------------------------- AUTH MIDDLEWARE -------------------------

async fn auth_middleware(
    State(state): State<AppState>,
    mut req: axum::extract::Request<Body>,
    next: Next,
) -> Result<axum::response::Response, StatusCode> {
    let token = req
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))
        .map(|s| s.to_string());

    let Some(token) = token else {
        return Err(StatusCode::UNAUTHORIZED);
    };

    let mut conn = state.pool.get().unwrap();

    let user = users::table
        .filter(users::token.eq(token))
        .first::<User>(&mut conn)
        .optional()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if let Some(user) = user {
        req.extensions_mut().insert(user);
        Ok(next.run(req).await)
    } else {
        Err(StatusCode::UNAUTHORIZED)
    }
}

// ------------------------- HANDLERS -------------------------

async fn register(
    State(state): State<AppState>,
    Json(input): Json<RegisterRequest>,
) -> Result<Json<&'static str>, StatusCode> {
    let mut conn = state.pool.get().unwrap();

    let hashed = hash_password(&input.password);

    let new_user = NewUser {
        username: input.username,
        password_hash: hashed,
    };

    diesel::insert_into(users::table)
        .values(&new_user)
        .execute(&mut conn)
        .map_err(|_| StatusCode::CONFLICT)?;

    Ok(Json("Registered"))
}

async fn login(
    State(state): State<AppState>,
    Json(input): Json<LoginRequest>,
) -> Result<Json<String>, StatusCode> {
    let mut conn = state.pool.get().unwrap();

    let user = users::table
        .filter(users::username.eq(&input.username))
        .first::<User>(&mut conn)
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    if !verify_password(&input.password, &user.password_hash) {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let new_token = Uuid::new_v4().to_string();

    diesel::update(users::table.find(user.id))
        .set(users::token.eq(&new_token))
        .execute(&mut conn)
        .unwrap();

    Ok(Json(new_token))
}

async fn me(Extension(user): Extension<User>) -> Json<User> {
    Json(user)
}

// ------------------------- NOTES -------------------------

async fn create_note(
    Extension(user): Extension<User>,
    State(state): State<AppState>,
    Json(note): Json<NewNoteInput>,
) -> Result<Json<&'static str>, StatusCode> {
    let mut conn = state.pool.get().unwrap();

    let new_note = NewNote {
        user_id: user.id,
        note_date: note.note_date,
        content: note.content,
    };

    diesel::insert_into(notes::table)
        .values(&new_note)
        .execute(&mut conn)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json("saved"))
}

async fn get_note(
    Extension(user): Extension<User>,
    State(state): State<AppState>,
    Path(date): Path<String>,
) -> Json<Option<Note>> {
    let mut conn = state.pool.get().unwrap();

    let date = NaiveDate::parse_from_str(&date, "%Y-%m-%d").unwrap();

    let note = notes::table
        .filter(notes::user_id.eq(user.id))
        .filter(notes::note_date.eq(date))
        .first::<Note>(&mut conn)
        .optional()
        .unwrap();

    Json(note)
}

async fn update_note(
    Extension(user): Extension<User>,
    State(state): State<AppState>,
    Json(input): Json<UpdateNote>,
) -> Result<Json<&'static str>, StatusCode> {
    let mut conn = state.pool.get().unwrap();

    let date = chrono::Utc::now().naive_utc().date();

    diesel::update(
        notes::table
            .filter(notes::user_id.eq(user.id))
            .filter(notes::note_date.eq(date)),
    )
    .set(notes::content.eq(input.content))
    .execute(&mut conn)
    .unwrap();

    Ok(Json("updated"))
}

async fn delete_note(
    Extension(user): Extension<User>,
    State(state): State<AppState>,
    Path(date): Path<String>,
) -> Result<Json<&'static str>, StatusCode> {
    let mut conn = state.pool.get().unwrap();

    let date = NaiveDate::parse_from_str(&date, "%Y-%m-%d").unwrap();

    diesel::delete(
        notes::table
            .filter(notes::user_id.eq(user.id))
            .filter(notes::note_date.eq(date)),
    )
    .execute(&mut conn)
    .unwrap();

    Ok(Json("deleted"))
}

async fn list_note_days(
    Extension(user): Extension<User>,
    State(state): State<AppState>,
) -> Json<Vec<String>> {
    let mut conn = state.pool.get().unwrap();

    let days = notes::table
        .filter(notes::user_id.eq(user.id))
        .select(notes::note_date)
        .load::<NaiveDate>(&mut conn)
        .unwrap()
        .into_iter()
        .map(|d| d.to_string())
        .collect::<Vec<_>>();

    Json(days)
}
