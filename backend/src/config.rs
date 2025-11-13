use std::env;

use teloxide::types::ChatId;

pub fn load_tgbot_token() -> String {
    env::var("TELEGRAM_BOT_TOKEN")
        .expect("Missing TELEGRAM_BOT_TOKEN")
}

pub fn load_allowed_chat_ids() -> Vec<ChatId> {
    env::var("TELEGRAM_CHAT_IDS")
        .unwrap_or_default()
        .split(',')
        .filter(|s| !s.is_empty())
        .filter_map(|s| s.trim().parse::<i64>().ok())
        .map(ChatId)
        .collect()
}