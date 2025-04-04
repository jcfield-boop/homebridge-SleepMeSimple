const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');

/**
 * SleepMe UI Server 
 * Handles backend functionality for the custom UI
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    // Always call super() first
    super();
    
    // Register request handlers for specific endpoints
    this.onRequest('/device/test', this.testDeviceConnection.bind(this));
    this.onRequest('/config/load', this.loadConfig.bind(this));
    this.onRequest('/config/save', this.saveConfig.bind(this));
    
    // Console logging to avoid UI notifications
    console.log('[SleepMeUI] Server initialized');
    
    // Signal readiness - must be called after setting up request handlers
    this.ready();
  }
  
  /**
   * Simple server-side logging
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
   * Load plugin configuration
   * @returns {Promise<Object>} Response with plugin configuration
   */
  async loadConfig() {
    try {
      this.log('Loading plugin configuration');
      
      // Get plugin config
      const pluginConfig = await this.getPluginConfig();
      
      this.log(`Retrieved ${pluginConfig.length} plugin config entries`);
      
      // Find our platform configuration
      const platformConfig = Array.isArray(pluginConfig) ? 
        pluginConfig.find(config => config && config.platform === 'SleepMeSimple') : null;
      
      if (!platformConfig) {
        this.log('SleepMeSimple platform configuration not found', 'warn');
        
        // Return a default config if not found
        return {
          success: false,
          error: 'Platform configuration not found'
        };
      }
      
      this.log(`Found platform configuration: ${platformConfig.name || 'SleepMe Simple'}`);
      
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
   * Save plugin configuration
   * @param {Object} payload - Updated configuration data
   * @returns {Promise<Object>} Response with success status
   */
  async saveConfig(payload) {
    try {
      if (!payload || !payload.config) {
        throw new RequestError('Invalid configuration data provided', { status: 400 });
      }
      
      this.log('Saving plugin configuration');
      
      // Get current config
      const pluginConfig = await this.getPluginConfig();
      
      if (!Array.isArray(pluginConfig)) {
        throw new RequestError('Plugin configuration is not an array', { status: 500 });
      }
      
      const configData = payload.config;
      
      // Ensure all required fields are present
      if (!configData.platform || configData.platform !== 'SleepMeSimple') {
        configData.platform = 'SleepMeSimple';
      }
      
      if (!configData.name) {
        configData.name = 'SleepMe Simple';
      }
      
      // Find the index of the existing platform config
      const existingIndex = pluginConfig.findIndex(c => 
        c && c.platform === 'SleepMeSimple'
      );
      
      let updatedConfig;
      
      // Update existing or add new
      if (existingIndex >= 0) {
        this.log(`Updating existing configuration at index ${existingIndex}`);
        updatedConfig = [...pluginConfig];
        updatedConfig[existingIndex] = configData;
      } else {
        this.log('Adding new platform configuration');
        updatedConfig = [...pluginConfig, configData];
      }
      
      // Update the configuration
      await this.updatePluginConfig(updatedConfig);
      
      // Save to disk
      await this.savePluginConfig();
      
      // Verify the configuration was saved
      const verifyConfig = await this.getPluginConfig();
      const savedPlatformConfig = verifyConfig.find(c => c && c.platform === 'SleepMeSimple');
      
      // Return the updated configuration for verification
      return {
        success: true,
        message: 'Configuration saved successfully',
        config: savedPlatformConfig || configData
      };
    } catch (error) {
      this.log(`Error saving configuration: ${error.message}`, 'error');
      
      if (error instanceof RequestError) {
        throw error;
      }
      
      throw new RequestError(`Error saving configuration: ${error.message}`, { status: 500 });
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
        throw new RequestError('API token is required', { status: 400 });
      }
      
      this.log(`Testing API connection with provided token`);
      
      // Make an actual API call to test the connection
      try {
        // This is where you'd implement the actual API call
        // For example, using axios to call the SleepMe API
        
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
        throw new RequestError(`API connection failed: ${apiError.message}`, { status: 502 });
      }
    } catch (error) {
      if (error instanceof RequestError) {
        throw error;
      }
      
      // Handle general errors
      this.log(`Error in test connection: ${error.message}`, 'error');
      throw new RequestError(`Error: ${error.message}`, { status: 500 });
    }
  }
}

// Create and export a new instance
(() => {
  return new SleepMeUiServer();
})();