use tauri_plugin_sql::{Migration, MigrationKind};

mod indexer;
mod thumbnails;
mod vault;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "init schema v2",
        sql: include_str!("../migrations/0001_init.sql"),
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:draw-study.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            vault::create_plan_folders,
            vault::delete_plan_folder,
            vault::read_text_file,
            vault::import_study,
            vault::delete_file,
            indexer::scan_vault,
            thumbnails::generate_thumbnail
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
