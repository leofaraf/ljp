// @generated automatically by Diesel CLI.

diesel::table! {
    named_notes (id) {
        id -> Int4,
        user_id -> Int4,
        name -> Text,
        content -> Text,
        created_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    notes (id) {
        id -> Int4,
        user_id -> Int4,
        note_date -> Date,
        content -> Text,
    }
}

diesel::table! {
    users (id) {
        id -> Int4,
        username -> Text,
        password_hash -> Text,
        token -> Nullable<Text>,
    }
}

diesel::joinable!(named_notes -> users (user_id));
diesel::joinable!(notes -> users (user_id));

diesel::allow_tables_to_appear_in_same_query!(named_notes, notes, users,);
