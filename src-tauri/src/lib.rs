mod llm;
mod mcp;
use tauri_plugin_sql::{Migration, MigrationKind};
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_url = "sqlite:aye_mcp.db";
    let migrations = vec![
        // Migration 1: Create chat_threads table
        Migration {
            version: 1,
            description: "create_chat_threads_table",
            sql: r#"
                    CREATE TABLE IF NOT EXISTS chat_threads (
                        id TEXT PRIMARY KEY NOT NULL,
                        title TEXT NOT NULL,
                        description TEXT,
                        project_id TEXT,
                        model_provider TEXT NOT NULL DEFAULT '',
                        model_name TEXT NOT NULL DEFAULT '',
                        system_prompt TEXT,
                        tool_presets TEXT DEFAULT '[]', -- JSON array of tool IDs
                        settings TEXT DEFAULT '{}', -- JSON object for additional settings
                        message_count INTEGER DEFAULT 0,
                        total_tokens INTEGER DEFAULT 0,
                        is_archived BOOLEAN DEFAULT FALSE,
                        is_pinned BOOLEAN DEFAULT FALSE,
                        tags TEXT DEFAULT '[]', -- JSON array of tags,
                        last_message_at TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
                    );
                "#,
            kind: MigrationKind::Up,
        },
        // Migration 2: Create chat_messages table
        Migration {
            version: 2,
            description: "create_chat_messages_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id TEXT PRIMARY KEY NOT NULL,
                    thread_id TEXT NOT NULL,
                    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
                    content TEXT NOT NULL,
                    attachments TEXT DEFAULT '[]', -- JSON array of attachments
                    thinking TEXT DEFAULT '{}', -- JSON object for thinking process
                    tool_calls TEXT DEFAULT '[]', -- JSON array for tool calls
                    metadata TEXT DEFAULT '{}', -- JSON object for additional metadata
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE
                );
            "#,
            kind: MigrationKind::Up,
        },
        // Migration 3: Create projects table for future use
        Migration {
            version: 3,
            description: "create_projects_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    system_prompt TEXT,
                    default_model_provider TEXT NOT NULL DEFAULT 'openai',
                    default_model_name TEXT NOT NULL DEFAULT 'gpt-4',
                    tool_presets TEXT DEFAULT '[]', -- JSON array of tool IDs
                    settings TEXT DEFAULT '{}', -- JSON object
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    is_archived BOOLEAN DEFAULT FALSE
                );
            "#,
            kind: MigrationKind::Up,
        },
        // Migration 4: Create indexes for better performance
        Migration {
            version: 4,
            description: "create_performance_indexes",
            sql: r#"
                -- Indexes for chat_message table
                CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON chat_messages(thread_id);
                CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
                CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);
                
                -- Indexes for chat_threads table
                CREATE INDEX IF NOT EXISTS idx_chat_threads_created_at ON chat_threads(created_at);
                CREATE INDEX IF NOT EXISTS idx_chat_threads_updated_at ON chat_threads(updated_at);
                CREATE INDEX IF NOT EXISTS idx_chat_threads_project_id ON chat_threads(project_id);
                CREATE INDEX IF NOT EXISTS idx_chat_threads_pinned ON chat_threads(is_pinned);

                -- Index for projects
                CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
                CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(is_archived);
            "#,
            kind: MigrationKind::Up,
        },
        // Migration 5: Create triggers for timestamp updates
        Migration {
            version: 5,
            description: "create_timestamp_triggers",
            sql: r#"
                -- Trigger to update updated_at on chat_threads
                CREATE TRIGGER IF NOT EXISTS update_chat_threads_timestamp
                AFTER UPDATE ON chat_threads
                BEGIN
                    UPDATE chat_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END;
                
                -- Trigger to update updated_at on chat_message
                CREATE TRIGGER IF NOT EXISTS update_chat_message_timestamp
                AFTER UPDATE ON chat_messages
                BEGIN
                    UPDATE chat_messages SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END;
                
                -- Trigger to update thread metadata when messages are added/updated
                CREATE TRIGGER IF NOT EXISTS update_thread_on_message_insert
                AFTER INSERT ON chat_messages
                BEGIN
                    UPDATE chat_threads 
                    SET 
                        message_count = message_count + 1,
                        last_message_at = NEW.created_at,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = NEW.thread_id;
                END;
                
                -- Trigger to update thread metadata when messages are deleted
                CREATE TRIGGER IF NOT EXISTS update_thread_on_message_delete
                AFTER DELETE ON chat_messages
                BEGIN
                    UPDATE chat_threads 
                    SET 
                        message_count = message_count - 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = OLD.thread_id;
                END;
                
                -- Trigger to update projects timestamp
                CREATE TRIGGER IF NOT EXISTS update_projects_timestamp
                AFTER UPDATE ON projects
                BEGIN
                    UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END;
            "#,
            kind: MigrationKind::Up,
        },
        // Migration 6: Create default thread for existing messages
        Migration {
            version: 6,
            description: "create_default_thread_for_existing_messages",
            sql: r#"
                INSERT OR IGNORE INTO chat_threads (
                    id, 
                    title, 
                    description,
                    project_id,
                    model_provider,
                    model_name,
                    system_prompt,
                    created_at,
                    updated_at
                ) VALUES (
                    'default_thread',
                    'Default Conversation',
                    'Auto-created thread for existing messages',
                    'default_project',    
                    'openai',
                    'gpt-4',
                    '',
                    datetime('now'),
                    datetime('now')
                );
                
                -- Update message count for default thread
                UPDATE chat_threads 
                SET message_count = (
                    SELECT COUNT(*) FROM chat_messages WHERE thread_id = 'default_thread'
                ),
                last_message_at = (
                    SELECT MAX(created_at) FROM chat_messages WHERE thread_id = 'default_thread'
                )
                WHERE id = 'default_thread';
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "create_mcp_servers_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS mcp_servers (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    endpoint TEXT NOT NULL,
                    server_type TEXT NOT NULL DEFAULT 'stdio',
                    config TEXT DEFAULT '{}',
                    is_enabled BOOLEAN DEFAULT TRUE,
                    status TEXT DEFAULT 'disconnected',
                    last_connected_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "create_mcp_tools_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS mcp_tools (
                    id TEXT PRIMARY KEY,
                    server_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    schema TEXT NOT NULL,
                    is_enabled BOOLEAN DEFAULT TRUE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_tools_server ON mcp_tools(server_id);
            "#,
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        // .plugin(tauri_plugin_stronghold::Builder::with_argon2(&salt_path).build()?)
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(db_url, migrations)
                .build(),
        )
        .manage(mcp::init_mcp_manager())
        // .manage(llm::GenAIState::new())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            // LLM
            llm::select_provider,
            llm::send_message,
            llm::stream_message,
            llm::stop_streaming_message,

            llm::list_available_models,
            llm::update_config,
            llm::get_config,


            llm::test_model_connection,
            llm::get_model_info,
            llm::set_model_defaults,


            llm::add_auth_provider,
            llm::remove_auth_provider,

            // Provider key management
            llm::save_provider_key,
            llm::remove_provider_key,
            llm::get_provider_configs,
            llm::test_provider_connection,
            llm::load_provider_keys_from_stronghold,
            // MCP
            mcp::add_mcp_server,
            mcp::remove_mcp_server,
            mcp::call_mcp_tool,
            mcp::get_mcp_server_status,
            mcp::list_mcp_servers,
            mcp::get_all_mcp_tools,
        ])
        .setup(|app| {
            // Initialize Stronghold for secure key storage
            let salt_path = app.path().app_local_data_dir()
                .expect("could not resolve app local data path")
                .join("salt.txt");
            let _ = app.handle().plugin(
                tauri_plugin_stronghold::Builder::with_argon2(&salt_path).build()
            );

            let genai_state = llm::GenAIState::new();
            app.manage(genai_state);

            // Set up tracing for MCP SDK
            tracing_subscriber::fmt::init();
            llm::GenAIState::init_logging();
            tracing::info!("Optimized GenAI Tauri plugin initialized");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
