import { HomebridgePluginUiServer, RequestError } from '@homebridge/plugin-ui-utils';

class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    // Always call super() first to properly initialize parent class
    super();
    
    // Register request handlers
    this.onRequest('/config/load', this.handleConfigLoad.bind(this));
    this.onRequest('/config/save', this.handleConfigSave.bind(this));
    this.onRequest('/device/test', this.handleDeviceTest.bind(this));
    
    // Log initialization without triggering UI notifications
    console.log('SleepMe UI Server initialized');
    
    // Always call this.ready() last to signal UI we're ready
    this.ready();
  }
  
  /**
   * Handle loading the plugin configuration
   */
  async handleConfigLoad() {
    console.log('Loading configuration...');
    try {
      // Get the complete plugin config from Homebridge
      const pluginConfig = await this.getPluginConfig();
      console.log(`Retrieved ${Array.isArray(pluginConfig) ? pluginConfig.length : 0} config entries`);
      
      // Find our platform config
      const platformConfig = Array.isArray(pluginConfig) ? 
        pluginConfig.find(config => config && config.platform === 'SleepMeSimple') : null;
      
      if (!platformConfig) {
        console.log('Platform config not found, returning empty object');
        return { success: true, config: {} };
      }
      
      console.log('Configuration loaded successfully');
      return { success: true, config: platformConfig };
    } catch (error) {
      console.error('Error loading configuration:', error.message);
      return { success: false, error: error.message || 'Unknown error loading configuration' };
    }
  }
  
  /**
   * Handle saving the plugin configuration
   */
  async handleConfigSave(payload) {
    console.log('Saving configuration...');
    if (!payload || !payload.config) {
      return { success: false, error: 'No configuration provided' };
    }
    
    try {
      // Get the current config
      const pluginConfig = await this.getPluginConfig();
      
      if (!Array.isArray(pluginConfig)) {
        throw new Error('Invalid plugin configuration format');
      }
      
      // Find index of existing config or -1 if not found
      const existingIndex = pluginConfig.findIndex(config => 
        config && config.platform === 'SleepMeSimple'
      );
      
      // Create a new array with the updated config
      let updatedConfig;
      if (existingIndex >= 0) {
        // Update existing config
        updatedConfig = [...pluginConfig];
        updatedConfig[existingIndex] = payload.config;
      } else {
        // Add new config
        updatedConfig = [...pluginConfig, payload.config];
      }
      
      // Update the config in memory
      await this.updatePluginConfig(updatedConfig);
      
      // Save to disk
      await this.savePluginConfig();
      
      // Return success response
      return { 
        success: true, 
        message: 'Configuration saved successfully',
        savedConfig: payload.config
      };
    } catch (error) {
      console.error('Error saving configuration:', error.message);
      return { success: false, error: error.message || 'Unknown error saving configuration' };
    }
  }
  
  /**
   * Handle device connection test
   */
  async handleDeviceTest(payload) {
    console.log('Testing device connection...');
    const apiToken = payload?.apiToken;
    
    if (!apiToken) {
      return { success: false, error: 'API token is required' };
    }
    
    try {
      // This is a simplified placeholder
      // In a real implementation, you would make an actual API call to verify the token
      return { 
        success: true, 
        devices: 1,
        deviceInfo: [{ id: "test-id", name: "Test Device" }]
      };
    } catch (error) {
      console.error('Error testing device connection:', error.message);
      return { success: false, error: error.message || 'Error connecting to device' };
    }
  }
}

// Create and export a new instance
(() => {
  return new SleepMeUiServer();
})();