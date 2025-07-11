# MCP Configuration System

## Overview

The `aye_mcp_config.json` file allows you to define MCP servers that should be automatically started when the application launches. This file is stored in your application's data directory and will be created with sensible defaults if it doesn't exist.

## Configuration File Location

The configuration file is automatically created at:
- **macOS**: `~/Library/Application Support/com.aye-mcp.app/aye_mcp_config.json`
- **Windows**: `%APPDATA%\com.aye-mcp.app\aye_mcp_config.json`
- **Linux**: `~/.local/share/com.aye-mcp.app/aye_mcp_config.json`

## Configuration Format

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/username/Desktop",
        "/Users/username/Downloads"
      ],
      "description": "File system operations server",
      "enabled": true,
      "timeout": 30000,
      "retries": 3
    },
    "brave_search": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-brave-search"
      ],
      "description": "Web search capabilities",
      "enabled": false,
      "timeout": 15000,
      "retries": 2,
      "env": {
        "BRAVE_API_KEY": "your-api-key-here"
      }
    },
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      "description": "GitHub integration server",
      "enabled": false,
      "timeout": 20000,
      "retries": 2,
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token-here"
      }
    }
  },
  "globalSettings": {
    "timeout": 30000,
    "retries": 3,
    "logLevel": "info",
    "enableMetrics": true
  }
}
```

## Server Configuration Options

### Required Fields

- **`command`**: The executable command to run the MCP server
- **`args`**: Array of command line arguments

### Optional Fields

- **`description`**: Human-readable description of the server
- **`enabled`**: Whether to start this server automatically (default: `true`)
- **`timeout`**: Connection timeout in milliseconds (default: 30000)
- **`retries`**: Number of connection retry attempts (default: 3)
- **`env`**: Environment variables to set for the server process
- **`cwd`**: Working directory for the server process

## Popular MCP Servers

### File System Server
```json
"filesystem": {
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-filesystem",
    "/path/to/allowed/directory1",
    "/path/to/allowed/directory2"
  ],
  "description": "Provides file system read/write operations"
}
```

### Brave Search Server
```json
"brave_search": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-brave-search"],
  "env": {
    "BRAVE_API_KEY": "your-brave-api-key"
  },
  "description": "Web search using Brave Search API"
}
```

### GitHub Server
```json
"github": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "your-github-token"
  },
  "description": "GitHub repository operations"
}
```

### PostgreSQL Server
```json
"postgres": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-postgres"],
  "env": {
    "POSTGRES_CONNECTION_STRING": "postgresql://user:password@localhost:5432/database"
  },
  "description": "PostgreSQL database operations"
}
```

### Slack Server
```json
"slack": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-slack"],
  "env": {
    "SLACK_BOT_TOKEN": "xoxb-your-slack-bot-token"
  },
  "description": "Slack integration for messaging"
}
```

## Global Settings

- **`timeout`**: Default timeout for all servers (milliseconds)
- **`retries`**: Default retry count for all servers
- **`logLevel`**: Logging level (`debug`, `info`, `warn`, `error`)
- **`enableMetrics`**: Whether to collect performance metrics

## Environment Variables

You can use environment variables in your configuration by referencing them in the `env` object:

```json
{
  "env": {
    "API_KEY": "${YOUR_API_KEY}",
    "DATABASE_URL": "${DATABASE_CONNECTION_STRING}"
  }
}
```

## Security Considerations

1. **API Keys**: Store sensitive API keys in environment variables rather than directly in the config file
2. **File Permissions**: The config file should have restricted permissions (600)
3. **Path Restrictions**: File system servers should only be given access to necessary directories

## Troubleshooting

### Server Won't Start
1. Check that the MCP server package is installed: `npm list -g @modelcontextprotocol/server-*`
2. Verify command and arguments are correct
3. Check environment variables are set
4. Review application logs for error details

### Connection Timeouts
1. Increase timeout value for slow-starting servers
2. Check network connectivity for remote servers
3. Verify server dependencies are installed

### Permission Errors
1. Ensure the application has necessary file system permissions
2. Check that specified directories exist and are accessible
3. Verify environment variables contain valid credentials

## Managing Configuration

### Via Settings UI
Use the built-in settings interface to:
- Add/remove servers
- Enable/disable servers
- Edit server configuration
- Test server connections

### Manual Editing
You can directly edit the `aye_mcp_config.json` file, but remember to restart the application or use the "Reload Configuration" button for changes to take effect.