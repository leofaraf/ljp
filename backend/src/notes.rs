use serde::{Deserialize, Serialize};
use native_db::*;
use native_model::{native_model, Model};
use chrono::NaiveDate;

#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
#[native_model(id = 2, version = 1)] // new model id for notes
#[native_db]
pub struct Note {
    #[primary_key]
    pub id: u64,

    // for listing all notes of a user
    #[secondary_key] 
    pub user_id: u32,

    // unique key composed as "{user_id}|{date}"
    #[secondary_key(unique)]
    pub note_key: String,

    // ISO date: "YYYY-MM-DD"
    pub date: String,

    pub content: String,
}

fn mk_note_key(user_id: u32, date: &str) -> String {
    format!("{user_id}|{date}")
}

#[derive(Deserialize)]
pub struct NoteCreate {
    date: String,     // "YYYY-MM-DD"
    content: String,
}

#[derive(Deserialize)]
pub struct NoteUpdate {
    date: String,     // "YYYY-MM-DD"
    content: String,
}

fn valid_date_ymd(s: &str) -> bool {
    NaiveDate::parse_from_str(s, "%Y-%m-%d").is_ok()
}

use axum::{Extension, Json, extract::{Path, State}, http::StatusCode};

use crate::{AppState, User};

pub async fn list_note_days(
    State(state): State<AppState>,
    Extension(user): Extension<User>,
) -> Result<Json<Vec<String>>, StatusCode> {
    let r = state.db.r_transaction().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Easiest and robust approach: scan all notes and filter by user_id
    let mut dates = Vec::<String>::new();
    for note in r.scan().primary::<Note>().unwrap().all().unwrap() {
        let note = note.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        if note.user_id == user.id {
            dates.push(note.date.clone());
        }
    }
    dates.sort();
    dates.dedup();

    Ok(Json(dates))
}

pub async fn create_note(
    State(state): State<AppState>,
    Extension(user): Extension<User>,
    Json(input): Json<NoteCreate>,
) -> Result<StatusCode, StatusCode> {
    if !valid_date_ymd(&input.date) {
        return Err(StatusCode::BAD_REQUEST);
    }

    let key = mk_note_key(user.id, &input.date);

    let r = state.db.r_transaction().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Ensure not already exists for this date
    for note_result in r.scan().primary::<Note>().unwrap().all().unwrap() {
        let note = note_result.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        if note.user_id == user.id && note.date == input.date {
            return Err(StatusCode::CONFLICT); // duplicate date
        }
    }

    // Insert new note
    let mut rw = state.db.rw_transaction().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let next_id = rw.scan().primary::<Note>().unwrap().all().unwrap().count() as u64 + 1;

    let note = Note {
        id: next_id,
        user_id: user.id,
        note_key: key,
        date: input.date,
        content: input.content,
    };

    rw.insert(note).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    rw.commit().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(StatusCode::CREATED)
}

pub async fn update_note(
    State(state): State<AppState>,
    Extension(user): Extension<User>,
    Json(input): Json<NoteUpdate>,
) -> Result<StatusCode, StatusCode> {
    if !valid_date_ymd(&input.date) {
        return Err(StatusCode::BAD_REQUEST);
    }

    let mut target_note: Option<Note> = None;
    let r = state.db.r_transaction().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Find note by date for this user
    for note_result in r.scan().primary::<Note>().unwrap().all().unwrap() {
        let note = note_result.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        if note.user_id == user.id && note.date == input.date {
            target_note = Some(note);
            break;
        }
    }

    let Some(old_note) = target_note else {
        return Err(StatusCode::NOT_FOUND);
    };

    // Update note content
    let mut new_note = old_note.clone();
    new_note.content = input.content;

    let mut rw = state.db.rw_transaction().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    rw.update(old_note, new_note)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    rw.commit().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn delete_note(
    State(state): State<AppState>,
    Extension(user): Extension<User>,
    Path(date): Path<String>,
) -> Result<StatusCode, StatusCode> {
    if !valid_date_ymd(&date) {
        return Err(StatusCode::BAD_REQUEST);
    }

    let mut target_note: Option<Note> = None;
    let r = state.db.r_transaction().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    for note_result in r.scan().primary::<Note>().unwrap().all().unwrap() {
        let note = note_result.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        if note.user_id == user.id && note.date == date {
            target_note = Some(note);
            break;
        }
    }

    let Some(note) = target_note else {
        return Err(StatusCode::NOT_FOUND);
    };

    let mut rw = state.db.rw_transaction().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    rw.remove(note).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    rw.commit().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(serde::Serialize)]
pub struct NoteResponse {
    date: String,
    content: String,
}

pub async fn get_note(
    State(state): State<AppState>,
    Extension(user): Extension<User>,
    Path(date): Path<String>,
) -> Result<Json<NoteResponse>, StatusCode> {
    if !valid_date_ymd(&date) {
        return Err(StatusCode::BAD_REQUEST);
    }

    let r = state.db.r_transaction().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // iterate to find note for current user + date
    for note_result in r.scan().primary::<Note>().unwrap().all().unwrap() {
        let note = note_result.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        if note.user_id == user.id && note.date == date {
            return Ok(Json(NoteResponse {
                date: note.date,
                content: note.content,
            }));
        }
    }

    Err(StatusCode::NOT_FOUND)
}
