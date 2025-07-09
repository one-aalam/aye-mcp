use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;

pub const LATEST_PROTOCOL_VERSION: &str = "2024-11-05";
// Import rust-mcp-sdk components
use rust_mcp_sdk::{
    error::SdkResult,
    mcp_client::{client_runtime, ClientHandler, ClientRuntime},
    schema::{
        CallToolRequestParams, ClientCapabilities, Implementation, InitializeRequestParams,
        ListToolsRequestParams,
    },
    McpClient, StdioTransport, TransportOptions,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPServerConfig {
    pub id: String,
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
    pub cwd: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPServerStatus {
    pub id: String,
    pub name: String,
    pub status: String, // "connected" | "disconnected" | "error" | "connecting"
    pub tools: Vec<MCPTool>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPTool {
    pub name: String,
    pub description: Option<String>,
    pub schema: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPToolCallRequest {
    pub server_id: String,
    pub tool_name: String,
    pub arguments: serde_json::Map<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPToolCallResponse {
    pub success: bool,
    pub content: Vec<serde_json::Value>,
    pub error: Option<String>,
}

// Custom client handler (minimal implementation)
pub struct AyeMCPClientHandler;

#[async_trait::async_trait]
impl ClientHandler for AyeMCPClientHandler {
    // Use default implementations for all methods
    // The SDK provides sensible defaults
}

// Connection wrapper
pub struct MCPConnection {
    pub config: MCPServerConfig,
    pub client: Arc<ClientRuntime>,
    pub status: Arc<RwLock<String>>,
    pub tools: Arc<RwLock<Vec<MCPTool>>>,
}

impl MCPConnection {
    pub async fn new(config: MCPServerConfig) -> SdkResult<Self> {
        // Step 1: Define client details
        let client_details = InitializeRequestParams {
            capabilities: ClientCapabilities::default(),
            client_info: Implementation {
                name: "aye-mcp".to_string(),
                version: "0.1.0".to_string(),
            },
            protocol_version: LATEST_PROTOCOL_VERSION.into(),
        };

        // Step 2: Create transport with server launch
        let transport = StdioTransport::create_with_server_launch(
            &config.command,
            config.args.clone(),
            config
                .cwd
                .clone()
                .map(|cwd| HashMap::from([("cwd".to_string(), cwd)])),
            TransportOptions::default(),
        )?;

        // Step 3: Create handler
        let handler = AyeMCPClientHandler;

        // Step 4: Create client
        let client = client_runtime::create_client(client_details, transport, handler);

        Ok(Self {
            config,
            client,
            status: Arc::new(RwLock::new("disconnected".to_string())),
            tools: Arc::new(RwLock::new(Vec::new())),
        })
    }

    pub async fn connect(&self) -> SdkResult<()> {
        // Update status
        *self.status.write().await = "connecting".to_string();
        // Start the client (this connects to the server)
        self.client.clone().start().await?;
        // Update status
        *self.status.write().await = "connected".to_string();

        // Load tools
        self.load_tools().await?;
        println!(
            "Connected to MCP server: {} and discovered {} tools",
            self.config.name,
            self.tools.read().await.len()
        );

        Ok(())
    }

    pub async fn disconnect(&self) -> SdkResult<()> {
        *self.status.write().await = "disconnected".to_string();
        // The client will be dropped and connections cleaned up automatically
        Ok(())
    }

    pub async fn load_tools(&self) -> SdkResult<()> {
        if let Ok(tools_result) = self
            .client
            .list_tools(Some(ListToolsRequestParams::default()))
            .await
        {
            let mcp_tools: Vec<MCPTool> = tools_result
                .tools
                .into_iter()
                .map(|tool| MCPTool {
                    name: tool.name,
                    description: tool.description,
                    schema: serde_json::to_value(&tool.input_schema).unwrap_or_default(),
                })
                .collect();

            *self.tools.write().await = mcp_tools;
        }
        Ok(())
    }

    pub async fn call_tool(
        &self,
        tool_name: &str,
        arguments: serde_json::Map<String, serde_json::Value>,
    ) -> SdkResult<MCPToolCallResponse> {
        let request = CallToolRequestParams {
            name: tool_name.to_string(),
            arguments: Some(arguments),
        };

        match self.client.call_tool(request).await {
            Ok(result) => {
                let content: Vec<serde_json::Value> = result
                    .content
                    .into_iter()
                    .map(|content_item| serde_json::to_value(content_item).unwrap_or_default())
                    .collect();

                Ok(MCPToolCallResponse {
                    success: true,
                    content,
                    error: None,
                })
            }
            Err(e) => Ok(MCPToolCallResponse {
                success: false,
                content: vec![],
                error: Some(e.to_string()),
            }),
        }
    }

    pub async fn get_status(&self) -> MCPServerStatus {
        let status = self.status.read().await.clone();
        let tools = self.tools.read().await.clone();

        println!("Server status: {}", status);
        println!("Server tools: {}", tools.len());

        MCPServerStatus {
            id: self.config.id.clone(),
            name: self.config.name.clone(),
            status,
            tools,
            error: None,
        }
    }
}

// MCP manager
pub struct MCPManager {
    connections: Arc<DashMap<String, Arc<MCPConnection>>>,
}

impl MCPManager {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(DashMap::new()),
        }
    }

    pub async fn add_server(&self, config: MCPServerConfig) -> Result<(), String> {
        let server_id = config.id.clone();

        // Create connection
        let connection = MCPConnection::new(config)
            .await
            .map_err(|e| format!("Failed to create MCP connection: {}", e))?;

        let connection = Arc::new(connection);

        // Store connection
        self.connections
            .insert(server_id.clone(), connection.clone());

        // Connect in background
        let connection_clone = connection.clone();
        let server_id_clone = server_id.clone();

        tokio::spawn(async move {
            if let Err(e) = connection_clone.connect().await {
                eprintln!("Failed to connect to MCP server {}: {}", server_id_clone, e);
                // Update status to error
                *connection_clone.status.write().await = "error".to_string();
            }
        });

        Ok(())
    }

    pub async fn remove_server(&self, server_id: &str) -> Result<(), String> {
        if let Some((_, connection)) = self.connections.remove(server_id) {
            connection
                .disconnect()
                .await
                .map_err(|e| format!("Failed to disconnect: {}", e))?;
        }
        Ok(())
    }

    pub async fn call_tool(
        &self,
        request: MCPToolCallRequest,
    ) -> Result<MCPToolCallResponse, String> {
        let connection = self
            .connections
            .get(&request.server_id)
            .ok_or_else(|| format!("Server {} not found", request.server_id))?;

        println!(
            "Calling tool {} on server {} with arguments: {:#?}",
            request.tool_name, request.server_id, request.arguments
        );

        connection
            .call_tool(&request.tool_name, request.arguments)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn get_server_status(&self, server_id: &str) -> Option<MCPServerStatus> {
        if let Some(connection) = self.connections.get(server_id) {
            Some(connection.get_status().await)
        } else {
            None
        }
    }

    pub async fn list_servers(&self) -> Vec<MCPServerStatus> {
        let mut statuses = Vec::new();

        for entry in self.connections.iter() {
            let status = entry.value().get_status().await;
            statuses.push(status);
        }

        statuses
    }

    pub async fn get_all_tools(&self) -> Vec<(String, Vec<MCPTool>)> {
        let mut all_tools = Vec::new();

        for entry in self.connections.iter() {
            let server_id = entry.key().clone();
            let tools = entry.value().tools.read().await.clone();
            if !tools.is_empty() {
                all_tools.push((server_id, tools));
            }
        }

        all_tools
    }
}

// Tauri commands - much simpler now
#[tauri::command]
pub async fn add_mcp_server(
    state: State<'_, MCPManager>,
    config: MCPServerConfig,
) -> Result<(), String> {
    state.add_server(config).await
}

#[tauri::command]
pub async fn remove_mcp_server(
    state: State<'_, MCPManager>,
    server_id: String,
) -> Result<(), String> {
    state.remove_server(&server_id).await
}

#[tauri::command]
pub async fn call_mcp_tool(
    state: State<'_, MCPManager>,
    request: MCPToolCallRequest,
) -> Result<MCPToolCallResponse, String> {
    state.call_tool(request).await
}

#[tauri::command]
pub async fn get_mcp_server_status(
    state: State<'_, MCPManager>,
    server_id: String,
) -> Result<Option<MCPServerStatus>, String> {
    Ok(state.get_server_status(&server_id).await)
}

#[tauri::command]
pub async fn list_mcp_servers(
    state: State<'_, MCPManager>,
) -> Result<Vec<MCPServerStatus>, String> {
    Ok(state.list_servers().await)
}

#[tauri::command]
pub async fn get_all_mcp_tools(
    state: State<'_, MCPManager>,
) -> Result<Vec<(String, Vec<MCPTool>)>, String> {
    Ok(state.get_all_tools().await)
}

// Initialize the MCP manager
pub fn init_mcp_manager() -> MCPManager {
    MCPManager::new()
}
