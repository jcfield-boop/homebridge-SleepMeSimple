const { HomebridgePluginUiServer } = require('@homebridge/plugin-ui-utils');

// your class MUST extend the HomebridgePluginUiServer
class UiServer extends HomebridgePluginUiServer {
  constructor () { 
    // super must be called first
    super();

    // Example: create api endpoint request handlers
    this.onRequest('/hello', async () => {
      return { hello: 'world' };
    });
    
    this.onRequest('/config/load', this.handleLoadConfig.bind(this));
    this.onRequest('/config/save', this.handleSaveConfig.bind(this));
    this.onRequest('/device/test', this.handleTestDevice.bind(this));

    // this.ready() must be called to let the UI know you are ready to accept api calls
    this.ready();
  }

  async handleLoadConfig() {
    try {
      const pluginConfig = await this.getPluginConfig();
      const platformConfig = pluginConfig.find(config => config && config.platform === 'SleepMeSimple');
      
      if (!platformConfig) {
        return {
          success: false,
          error: 'Configuration not found'
        };
      }
      
      return {
        success: true,
        config: platformConfig
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async handleSaveConfig(payload) {
    try {
      if (!payload || !payload.config) {
        return {
          success: false,
          error: 'Invalid configuration data'
        };
      }
      
      const pluginConfig = await this.getPluginConfig();
      const existingIndex = pluginConfig.findIndex(config => config && config.platform === 'SleepMeSimple');
      
      if (existingIndex >= 0) {
        pluginConfig[existingIndex] = payload.config;
      } else {
        pluginConfig.push(payload.config);
      }
      
      await this.updatePluginConfig(pluginConfig);
      await this.savePluginConfig();
      
      return {
        success: true,
        config: payload.config
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async handleTestDevice(payload) {
    try {
      const apiToken = payload?.apiToken;
      
      if (!apiToken) {
        return {
          success: false,
          error: 'API token is required'
        };
      }
      
      // Placeholder implementation
      return {
        success: true,
        devices: 1,
        deviceInfo: [
          { id: 'sample-id', name: 'Sample Device', type: 'Dock Pro' }
        ]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// start the instance of the class
(() => {
  return new UiServer();
})();