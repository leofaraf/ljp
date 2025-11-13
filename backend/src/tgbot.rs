use std::{env, time::Duration};

use teloxide::{
    dptree::deps, net::Download, prelude::*, types::{InputFile, Message}, utils::command::BotCommands
};
use diesel::prelude::*;
use tokio::time::interval;
use crate::{
    AppState, HandleResult, config, models::{NewNote, Note, User}, schema::{notes, users}
};
use chrono::{Local, NaiveDate};
use serde::{Serialize, Deserialize};

// -------- BOT COMMANDS -------- //

#[derive(Serialize, Deserialize)]
struct DbExport {
    users: Vec<User>,
    notes: Vec<Note>,
}

#[derive(BotCommands, Clone)]
#[command(rename_rule = "lowercase", description = "Available commands:")]
pub enum Command {
    #[command(description = "Start the bot")]
    Start,

    #[command(description = "Show help")]
    Help,

    #[command(description = "Export notes")]
    Export,

    #[command(description = "Import notes")]
    Import,
}

// -------- NOTE EXPORT STRUCT -------- //

#[derive(Serialize, Deserialize)]
pub struct ExportedNote {
    pub date: String,
    pub content: String,
}

// -------- TELEGRAM BOT ENTRYPOINT -------- //

pub async fn start_bot(state: AppState) {
    let bot = Bot::new(config::load_tgbot_token());

    let allowed_chat_ids: Vec<ChatId> = config::load_allowed_chat_ids();

    let state = state.clone();
    let allowed_clone = allowed_chat_ids.clone();

    Dispatcher::builder(bot, 
        Update::filter_message()
            .filter(move |msg: Message| {
                allowed_clone.contains(&msg.chat.id)
            })
            .branch(
                dptree::entry()
                .filter_command::<Command>()
                .branch(dptree::case![Command::Start].endpoint(handle_start))
                .branch(dptree::case![Command::Help].endpoint(handle_help))
                .branch(dptree::case![Command::Import].endpoint(handle_import))
                .branch(dptree::case![Command::Export].endpoint(handle_export)),
            )
            .branch(
                dptree::entry()
                .filter(|msg: Message| msg.document().is_some())
                .endpoint(handle_import_file)
            )
    )
    .dependencies(deps![state])
    .enable_ctrlc_handler() // graceful shutdown
    .build()
    .dispatch()
    .await;
}

async fn handle_start(bot: Bot, msg: Message) -> HandleResult<()> {
    bot.send_message(msg.chat.id, "Welcome! Use /help.")
        .await?;
    Ok(())
}

async fn handle_help(bot: Bot, msg: Message) -> HandleResult<()> {
    bot.send_message(msg.chat.id, Command::descriptions().to_string()).await?;
    Ok(())
}

pub async fn handle_export(bot: Bot, msg: Message, state: AppState) -> HandleResult<()> {
    let chat_id = msg.chat.id;
    let mut conn = state.pool.get()?;

    // ----- Load everything -----
    let all_users: Vec<User> = users::table.load(&mut conn)?;
    let all_notes: Vec<Note> = notes::table.load(&mut conn)?;

    let dump = DbExport {
        users: all_users,
        notes: all_notes,
    };

    // ----- Serialize -----
    let json = serde_json::to_string_pretty(&dump)?;

    // ----- Send -----
    bot.send_document(
        chat_id,
        InputFile::memory(json.into_bytes()).file_name(export_filename())
    )
    .await?;

    Ok(())
}

async fn handle_import(bot: Bot, msg: Message) -> HandleResult<()> {
    bot.send_message(msg.chat.id, "Send your JSON notes file.").await?;
    Ok(())
}

pub async fn handle_import_file(
    bot: Bot,
    msg: Message,
    state: AppState,
) -> HandleResult<()> {
    let chat_id = msg.chat.id;

    // ---- Ensure file exists ----
    let doc = msg.document().ok_or("No file attached")?;

    // ---- Download file ----
    let file = bot.get_file(&doc.file.id).await?;

    let mut bytes = Vec::new();
    bot.download_file(&file.path, &mut bytes).await?;

    // ---- Parse JSON ----
    let imported: DbExport = serde_json::from_slice(&bytes)?;

    // ---- DB connection ----
    let mut conn = state.pool.get()?;

    // ---- WIPE OLD DATA ---- //
    diesel::delete(notes::table).execute(&mut conn)?;
    diesel::delete(users::table).execute(&mut conn)?;

    // ---- INSERT USERS ---- //
    diesel::insert_into(users::table)
        .values(&imported.users)
        .execute(&mut conn)?;

    // ---- INSERT NOTES ---- //
    diesel::insert_into(notes::table)
        .values(&imported.notes)
        .execute(&mut conn)?;

    // ---- DONE ---- //
    bot.send_message(chat_id, "✅ Database REPLACED successfully (wipe & import)")
        .await?;

    Ok(())
}

pub async fn start_daily_backups(state: AppState) {
    loop {
        // run backup
        if let Err(e) = run_daily_export(state.clone()).await {
            eprintln!("Daily backup error: {}", e);
        }
        
        tokio::time::sleep(Duration::from_secs(24 * 60 * 60)).await; // 24 hours
    }
}

fn export_filename() -> String {
    let date = Local::now().format("%Y-%m-%d").to_string();
    format!("db_export_{}.json", date)
}

pub async fn run_daily_export(state: AppState) -> HandleResult<()> {
    use crate::schema::{users, notes};
    let bot = Bot::new(config::load_tgbot_token());
    let chat_ids = config::load_allowed_chat_ids(); // same list used by commands

    let mut conn = state.pool.get()?;

    // ----- Load everything (IDENTICAL to handle_export) -----
    let all_users: Vec<User> = users::table.load(&mut conn)?;
    let all_notes: Vec<Note> = notes::table.load(&mut conn)?;

    let dump = DbExport {
        users: all_users,
        notes: all_notes,
    };

    // ----- Serialize (IDENTICAL) -----
    let json = serde_json::to_string_pretty(&dump)?;

    let file = InputFile::memory(json.into_bytes()).file_name(export_filename());

    // ----- Send to each allowed chat (difference) -----
    for chat_id in chat_ids {
        bot.send_document(chat_id, file.clone()).await?;
    }

    Ok(())
}
