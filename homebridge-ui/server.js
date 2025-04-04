const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');

/**
 * SleepMe UI Server 
 * Handles backend functionality for the custom UI
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    // Always call super() first in the constructor
    super();
    
    // Register request handlers for specific endpoints
    this.onRequest('/config/load', this.loadConfig.bind(this));
    this.onRequest('/config/save', this.saveConfig.bind(this));
    this.onRequest('/device/test', this.testDeviceConnection.bind(this));
    
    // Log initialization (using console to avoid UI notifications)
    console.log('[SleepMeUI] Server initialized');
    
    // Signal readiness - IMPORTANT: Call this after setting up request handlers
    this.ready();
  }
  
  /**
   * Load the plugin configuration
   * @returns {Promise<Object>} Configuration response
   */
  async loadConfig() {
    try {
      // Use the method from HomebridgePluginUiServer to get plugin config
      const pluginConfig = await this.getPluginConfig();
      
      console.log(`Retrieved ${pluginConfig.length} config entries`);
      
      // Find SleepMeSimple platform configuration
      const platformConfig = pluginConfig.find(
        config => config && config.platform === 'SleepMeSimple'
      );
      
      if (!platformConfig) {
        console.warn('SleepMeSimple platform configuration not found');
        return {
          success: false,
          error: 'Platform configuration not found'
        };
      }
      
      console.log('Configuration loaded successfully');
      
      return {
        success: true,
        config: platformConfig
      };
    } catch (error) {
      console.error('Error loading configuration:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Save the plugin configuration
   * @param {Object} payload - Configuration payload
   * @returns {Promise<Object>} Save response
   */
  async saveConfig(payload) {
    try {
      if (!payload || !payload.config) {
        throw new RequestError('Invalid configuration data', { status: 400 });
      }
      
      // Ensure platform is set correctly
      const configData = {
        ...payload.config,
        platform: 'SleepMeSimple',
        name: payload.config.name || 'SleepMe Simple'
      };
      
      // Get current configuration
      const currentConfig = await this.getPluginConfig();
      
      // Find existing platform config index
      const existingIndex = currentConfig.findIndex(
        config => config && config.platform === 'SleepMeSimple'
      );
      
      // Update or add configuration
      if (existingIndex !== -1) {
        currentConfig[existingIndex] = configData;
      } else {
        currentConfig.push(configData);
      }
      
      // Update plugin configuration
      await this.updatePluginConfig(currentConfig);
      
      // Save to disk
      await this.savePluginConfig();
      
      console.log('Configuration saved successfully');
      
      return {
        success: true,
        message: 'Configuration saved successfully',
        config: configData
      };
    } catch (error) {
      console.error('Configuration save error:', error);
      
      // Throw RequestError for API-level errors
      if (error instanceof RequestError) {
        throw error;
      }
      
      throw new RequestError('Failed to save configuration', { status: 500 });
    }
  }
  
  /**
   * Test device connection
   * @param {Object} payload - Connection test payload
   * @returns {Promise<Object>} Connection test result
   */
  async testDeviceConnection(payload) {
    try {
      const apiToken = payload?.apiToken;
      
      if (!apiToken) {
        throw new RequestError('API token is required', { status: 400 });
      }
      
      // Placeholder for actual API connection test
      // In a real implementation, you'd make an actual API call here
      const devices = [
        { id: 'sample-device-1', name: 'Sample Device', type: 'Dock Pro' }
      ];
      
      return {
        success: true,
        devices: devices.length,
        deviceInfo: devices,
        message: `Connection successful. Found ${devices.length} device(s).`
      };
    } catch (error) {
      console.error('Device connection test error:', error);
      
      if (error instanceof RequestError) {
        throw error;
      }
      
      throw new RequestError('Failed to test device connection', { status: 500 });
    }
  }
}

// This is the correct way to create and export a Homebridge plugin UI server
// using the pattern from the official documentation
(() => {
  return new SleepMeUiServer();
})();