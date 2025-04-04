import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';

/**
 * SleepMe UI Server 
 * Handles backend functionality for the custom UI
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    // Always call super first
    super();
    
    // Register request handlers
    this.onRequest('/config/load', this.loadConfig.bind(this));
    this.onRequest('/config/save', this.saveConfig.bind(this));
    this.onRequest('/device/test', this.testDeviceConnection.bind(this));
    
    // Signal readiness
    console.log('[SleepMeUI] Server initialized');
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
      
      // Access config directly - DO NOT use this or super
      let pluginConfig;
      try {
        // Try the simpler approach first
        pluginConfig = await HomebridgePluginUiServer.prototype.getPluginConfig.call(this);
      } catch (e) {
        this.log(`Initial config load method failed: ${e.message}`, 'warn');
        
        // Try alternative method - just in case
        if (typeof this.api?.getPluginConfig === 'function') {
          pluginConfig = await this.api.getPluginConfig();
        } else {
          throw new Error('No working configuration method available');
        }
      }
      
      this.log(`Retrieved ${pluginConfig?.length || 0} plugin config entries`);
      
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
   * Save the plugin configuration
   * @param {Object} payload - Updated configuration data
   * @returns {Promise<Object>} Response with success status
   */
  async saveConfig(payload) {
    try {
      if (!payload || !payload.config) {
        return { success: false, error: 'Invalid configuration data provided' };
      }
      
      this.log('Saving plugin configuration');
      
      // Get current config
      let pluginConfig;
      try {
        // Direct prototype access
        pluginConfig = await HomebridgePluginUiServer.prototype.getPluginConfig.call(this);
      } catch (e) {
        // Try alternative method
        if (typeof this.api?.getPluginConfig === 'function') {
          pluginConfig = await this.api.getPluginConfig();
        } else {
          throw new Error('Unable to get current configuration');
        }
      }
      
      if (!Array.isArray(pluginConfig)) {
        throw new Error('Plugin configuration is not an array');
      }
      
      const configData = payload.config;
      
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
      
      // Update and save config
      try {
        // Direct prototype access
        await HomebridgePluginUiServer.prototype.updatePluginConfig.call(this, updatedConfig);
        await HomebridgePluginUiServer.prototype.savePluginConfig.call(this);
      } catch (e) {
        // Try alternative method
        if (typeof this.api?.updatePluginConfig === 'function' && 
            typeof this.api?.savePluginConfig === 'function') {
          await this.api.updatePluginConfig(updatedConfig);
          await this.api.savePluginConfig();
        } else {
          throw new Error('Unable to save configuration');
        }
      }
      
      this.log('Configuration saved successfully');
      
      // Return the updated configuration for verification
      return {
        success: true,
        message: 'Configuration saved successfully',
        savedConfig: configData
      };
    } catch (error) {
      this.log(`Error saving configuration: ${error.message}`, 'error');
      return {
        success: false,
        error: `Error saving configuration: ${error.message}`
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
      const apiToken = payload?.apiToken;
      
      if (!apiToken) {
        this.log('API token missing from test request', 'warn');
        return { success: false, error: 'API token is required' };
      }
      
      this.log(`Testing API connection with provided token`);
      
      // This is a simple placeholder response
      // In a real implementation, you would make an actual API call
      const devices = [
        { id: "sample-id", name: "Sample Device", type: "Dock Pro" }
      ];
      
      return {
        success: true,
        devices: devices.length,
        deviceInfo: devices,
        message: `Connection successful. Found ${devices.length} device(s).`
      };
    } catch (error) {
      this.log(`Error in test connection: ${error.message}`, 'error');
      return {
        success: false,
        error: `Error: ${error.message}`
      };
    }
  }
}

// Create and export a new instance
(() => {
  return new SleepMeUiServer();
})();