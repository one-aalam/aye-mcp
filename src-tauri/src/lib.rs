use tauri_plugin_sql::{Migration, MigrationKind};
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_url = "sqlite:aye_mcp.db";
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "CREATE TABLE IF NOT EXISTS chat_message (id text PRIMARY KEY NOT NULL, role text NOT NULL, content text NOT NULL, attachments json[], created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL);",
            kind: MigrationKind::Up,
        }
    ];
    
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().add_migrations(db_url, migrations).build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
