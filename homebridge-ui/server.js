const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');

class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    // Always call super() first
    super();
    
    // Register request handlers
    this.onRequest('/config/load', this.handleLoadConfig.bind(this));
    this.onRequest('/config/save', this.handleSaveConfig.bind(this));
    this.onRequest('/device/test', this.handleTestConnection.bind(this));
    
    // Signal readiness
    this.ready();
    
    console.log('SleepMe UI Server initialized');
  }
  
  async handleLoadConfig() {
    try {
      // Get plugin config using the proper method
      const pluginConfig = await this.getPluginConfig();
      
      // Find our platform configuration
      const platformConfig = pluginConfig.find(config => 
        config && config.platform === 'SleepMeSimple'
      );
      
      if (!platformConfig) {
        throw new RequestError('Platform configuration not found', { status: 404 });
      }
      
      return {
        success: true,
        config: platformConfig
      };
    } catch (error) {
      if (error instanceof RequestError) {
        throw error;
      }
      throw new RequestError(`Error loading configuration: ${error.message}`, { status: 500 });
    }
  }
  
  async handleSaveConfig(payload) {
    try {
      if (!payload || !payload.config) {
        throw new RequestError('Invalid configuration data', { status: 400 });
      }
      
      // Ensure required fields are present
      const configData = {
        ...payload.config,
        platform: 'SleepMeSimple',
        name: payload.config.name || 'SleepMe Simple'
      };
      
      // Get current plugin config
      const pluginConfig = await this.getPluginConfig();
      
      // Find index of existing config or -1 if not found
      const existingIndex = pluginConfig.findIndex(config => 
        config && config.platform === 'SleepMeSimple'
      );
      
      // Create updated config array
      let updatedConfig;
      if (existingIndex >= 0) {
        // Update existing config
        updatedConfig = [...pluginConfig];
        updatedConfig[existingIndex] = configData;
      } else {
        // Add new config
        updatedConfig = [...pluginConfig, configData];
      }
      
      // Update plugin config in memory
      await this.updatePluginConfig(updatedConfig);
      
      // Save to disk
      await this.savePluginConfig();
      
      // Get the config again to verify it was saved
      const verifyConfig = await this.getPluginConfig();
      const savedConfig = verifyConfig.find(config => 
        config && config.platform === 'SleepMeSimple'
      );
      
      if (!savedConfig) {
        throw new RequestError('Configuration was not saved properly', { status: 500 });
      }
      
      return {
        success: true,
        config: savedConfig
      };
    } catch (error) {
      if (error instanceof RequestError) {
        throw error;
      }
      throw new RequestError(`Error saving configuration: ${error.message}`, { status: 500 });
    }
  }
  
  async handleTestConnection(payload) {
    try {
      if (!payload || !payload.apiToken) {
        throw new RequestError('API token is required', { status: 400 });
      }
      
      // Placeholder for API test logic
      // In a real implementation, you'd make an actual API call here
      const devices = [
        { id: 'sample-device-1', name: 'Sample Device', type: 'Dock Pro' }
      ];
      
      return {
        success: true,
        devices: devices.length,
        deviceInfo: devices
      };
    } catch (error) {
      if (error instanceof RequestError) {
        throw error;
      }
      throw new RequestError(`Connection test failed: ${error.message}`, { status: 500 });
    }
  }
}

// Start the server
(() => {
  return new SleepMeUiServer();
})();