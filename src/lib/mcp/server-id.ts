export class ServerIdManager {
    private static readonly CONFIG_PREFIX = 'config_';
    private static readonly SEPARATOR = '__';
    
    // Server registry to maintain bidirectional mapping
    private static serverRegistry = new Map<string, { id: string; name: string; type: 'config' | 'manual' }>();
  
    /**
     * Create a server ID from server name
     * Uses a safe encoding to handle special characters
     */
    static createServerId(serverName: string, type: 'config' | 'manual' = 'config'): string {
      // Sanitize server name for use in ID
      const sanitizedName = this.sanitizeServerName(serverName);
      const serverId = type === 'config' 
        ? `${this.CONFIG_PREFIX}${sanitizedName}` 
        : sanitizedName;
      
      // Register the mapping
      this.serverRegistry.set(serverId, { id: serverId, name: serverName, type });
      
      return serverId;
    }
  
    /**
     * Extract server name from server ID
     * Returns null if ID format is invalid
     */
    static extractServerName(serverId: string): string | null {
      // First check registry
      const registered = this.serverRegistry.get(serverId);
      if (registered) {
        return registered.name;
      }
  
      // Fallback to parsing (for backward compatibility)
      if (serverId.startsWith(this.CONFIG_PREFIX)) {
        const name = serverId.slice(this.CONFIG_PREFIX.length);
        return this.desanitizeServerName(name);
      }
      
      return serverId; // Assume it's already a name for manual servers
    }
  
    /**
     * Check if server ID is from configuration
     */
    static isConfigServer(serverId: string): boolean {
      const registered = this.serverRegistry.get(serverId);
      if (registered) {
        return registered.type === 'config';
      }
      return serverId.startsWith(this.CONFIG_PREFIX);
    }
  
    /**
     * Get server display name (fallback to ID if name not found)
     */
    static getServerDisplayName(serverId: string): string {
      const name = this.extractServerName(serverId);
      return name || serverId;
    }
  
    /**
     * Sanitize server name for safe use in IDs
     */
    private static sanitizeServerName(name: string): string {
      return name
        .replace(/[^a-zA-Z0-9_-]/g, '_') // Replace special chars with underscore
        .replace(/__+/g, '_') // Collapse multiple underscores
        .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
    }
  
    /**
     * Reverse sanitization (best effort)
     */
    private static desanitizeServerName(sanitized: string): string {
      // This is lossy, which is why we prefer the registry
      return sanitized.replace(/_/g, ' ').trim();
    }
  
    /**
     * Register an existing server ID/name mapping
     */
    static registerServer(serverId: string, serverName: string, type: 'config' | 'manual' = 'config'): void {
      this.serverRegistry.set(serverId, { id: serverId, name: serverName, type });
    }
  
    /**
     * Unregister a server
     */
    static unregisterServer(serverId: string): void {
      this.serverRegistry.delete(serverId);
    }
  
    /**
     * Clear all registrations (useful for testing)
     */
    static clearRegistry(): void {
      this.serverRegistry.clear();
    }
  
    /**
     * Get all registered servers
     */
    static getAllServers(): Array<{ id: string; name: string; type: 'config' | 'manual' }> {
      return Array.from(this.serverRegistry.values());
    }
  
    /**
     * Validate server ID format
     */
    static isValidServerId(serverId: string): boolean {
      return typeof serverId === 'string' && serverId.length > 0 && !serverId.includes(this.SEPARATOR);
    }
  }
  
  // Export convenient functions for common use cases
  export const createConfigServerId = (name: string) => ServerIdManager.createServerId(name, 'config');
  export const createManualServerId = (name: string) => ServerIdManager.createServerId(name, 'manual');
  export const getServerName = (serverId: string) => ServerIdManager.getServerDisplayName(serverId);
  export const isConfigServer = (serverId: string) => ServerIdManager.isConfigServer(serverId);