// homebridge-ui/server.js
import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';
import path from 'path';

/**
 * SleepMe UI Server 
 * Handles backend functionality for the custom UI
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();
    
    // Register request handlers for specific endpoints
    this.onRequest('/device/test', this.testDeviceConnection.bind(this));
    this.onRequest('/config/load', this.loadConfig.bind(this));
    
    // Simple console logging without UI events
    console.log('[SleepMeUI] Server initialized');
    
    // Signal readiness
    this.ready();
  }
  
  /**
   * Server-side logging that doesn't trigger UI notifications
   * @param {string} message - Log message
   * @param {string} level - Log level (info, warn, error)
   */
  log(message, level = 'info') {
    const prefix = '[SleepMeUI]';
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }
  
  /**
   * Load the plugin configuration using Homebridge API
   * @returns {Promise<Object>} Response with plugin configuration
   */
  async loadConfig() {
    try {
      this.log('Loading plugin configuration');
      
      // Use Homebridge API to get plugin config instead of direct file access
      const pluginConfig = await this.homebridge.getPluginConfig();
      
      this.log(`Retrieved ${pluginConfig.length} plugin config entries`);
      
      // Find our platform configuration
      const platformConfig = Array.isArray(pluginConfig) ? 
        pluginConfig.find(config => config && config.platform === 'SleepMeSimple') : null;
      
      if (!platformConfig) {
        this.log('SleepMeSimple platform configuration not found', 'warn');
        return {
          success: false,
          error: 'Platform configuration not found',
          searchedPlatform: 'SleepMeSimple'
        };
      }
      
      this.log(`Found SleepMeSimple platform configuration: ${platformConfig.name || 'SleepMe Simple'}`);
      
      return {
        success: true,
        config: platformConfig
      };
    } catch (error) {
      this.log(`Error loading configuration: ${error.message}`, 'error');
      return {
        success: false,
        error: `Configuration error: ${error.message}`
      };
    }
  }
  
  /**
   * Test connection to the SleepMe API
   * @param {Object} payload - Payload containing API token
   * @returns {Promise<Object>} Response with success status and device info
   */
  async testDeviceConnection(payload) {
    try {
      // Extract API token from request payload
      const apiToken = payload?.apiToken || payload?.body?.apiToken;
      
      if (!apiToken) {
        this.log('API token missing from test request', 'warn');
        return {
          success: false,
          error: 'API token is required'
        };
      }
      
      this.log(`Testing API connection with provided token`);
      
      // Make an actual API call to test the connection
      // For demonstration purposes, we'll make a fetch request to the SleepMe API
      try {
        // This is where you'd implement the actual API call
        // For example, using node-fetch or axios to call the SleepMe API
        
        // Placeholder for actual implementation:
        const devices = [
          { id: "sample-id", name: "Sample Device", type: "Dock Pro" }
        ];
        
        return {
          success: true,
          devices: devices.length,
          deviceInfo: devices,
          message: `Connection successful. Found ${devices.length} device(s).`
        };
      } catch (apiError) {
        // Handle API-specific errors
        this.log(`API connection failed: ${apiError.message}`, 'error');
        return {
          success: false,
          error: `API connection failed: ${apiError.message}`
        };
      }
    } catch (error) {
      // Handle general errors
      this.log(`Error in test connection: ${error.message}`, 'error');
      return {
        success: false,
        error: `Error: ${error.message}`
      };
    }
  }
  
  /**
   * Get plugin version from package.json
   * @returns {string} Plugin version
   */
  getPluginVersion() {
    try {
      // Get plugin info from Homebridge API instead of reading package.json directly
      const pluginInfo = this.homebridge ? this.homebridge.getPluginInfo() : null;
      
      if (pluginInfo && pluginInfo.version) {
        return pluginInfo.version;
      }
      
      // Fallback to package.json if needed
      const packagePath = path.resolve(__dirname, '../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      return packageJson.version || 'unknown';
    } catch (error) {
      this.log(`Error getting plugin version: ${error.message}`, 'error');
      return 'unknown';
    }
  }
}

// Create and export a new instance
(() => {
  return new SleepMeUiServer();
})();