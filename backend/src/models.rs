use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use chrono::{NaiveDate, DateTime, Utc};

use crate::schema::{users, notes, named_notes};

// -------- USERS --------

#[derive(Queryable, Insertable, Identifiable, Serialize, Deserialize, Clone, Debug)]
#[diesel(table_name = users)]
pub struct User {
    pub id: i32,
    pub username: String,
    pub password_hash: String,
    pub token: Option<String>,
}

#[derive(Insertable)]
#[diesel(table_name = users)]
pub struct NewUser {
    pub username: String,
    pub password_hash: String,
}

// -------- NOTES --------

#[derive(Queryable, Insertable, Identifiable, Associations, Serialize, Deserialize)]
#[diesel(table_name = notes)]
#[diesel(belongs_to(User))]
pub struct Note {
    pub id: i32,
    pub user_id: i32,
    pub note_date: NaiveDate,
    pub content: String,
}

#[derive(Insertable, Deserialize, Debug)]
#[diesel(table_name = notes)]
pub struct NewNote {
    pub user_id: i32,
    pub note_date: NaiveDate,
    pub content: String,
}

#[derive(serde::Deserialize)]
pub struct NewNoteInput {
    pub note_date: NaiveDate,
    pub content: String,
}

#[derive(Deserialize)]
pub struct UpdateNote {
    pub note_date: NaiveDate,
    pub content: String,
}

// -------- NAMED NOTES --------

#[derive(Queryable, Insertable, Identifiable, Associations, Serialize, Deserialize, Clone)]
#[diesel(table_name = named_notes)]
#[diesel(belongs_to(User))]
pub struct NamedNote {
    pub id: i32,
    pub user_id: i32,
    pub name: String,
    pub content: String,
    pub created_at: Option<DateTime<Utc>>,
}
