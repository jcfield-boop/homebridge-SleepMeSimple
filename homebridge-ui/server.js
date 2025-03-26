// homebridge-ui/server.js
const { HomebridgePluginUiServer } = require('@homebridge/plugin-ui-utils');
const axios = require('axios');

// Fallback API URL
const API_BASE_URL = 'https://api.developer.sleep.me/v1';

class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();

    // Register request handlers
    this.onRequest('/device/test', this.testDeviceConnection.bind(this));
    this.onRequest('/config', this.getConfig.bind(this));
    this.onRequest('/saveConfig', this.saveConfig.bind(this));
    
    this.log('SleepMe UI Server initialized');
    this.ready();
  }

  log(message, isError = false) {
    const logMethod = isError ? console.error : console.log;
    logMethod(`[SleepMe UI] ${message}`);
  }

  async testDeviceConnection(payload) {
    this.log('Test connection request received');
    
    if (!payload || !payload.body || !payload.body.apiToken) {
      this.log('Missing API token in request', true);
      return {
        success: false,
        error: 'API token is required'
      };
    }

    const { apiToken } = payload.body;
    this.log(`Testing connection with token: ${apiToken.substring(0, 4)}...`);
    
    try {
      // Make API call to test connection
      const response = await axios({
        method: 'GET',
        url: `${API_BASE_URL}/devices`,
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      // Handle different API response formats
      let devices = [];
      if (Array.isArray(response.data)) {
        devices = response.data;
      } else if (response.data && typeof response.data === 'object') {
        devices = response.data.devices || [];
      }
      
      this.log(`API connection successful, found ${devices.length} devices`);
      return {
        success: true,
        message: `Connection successful. Found ${devices.length} device(s).`
      };
    } catch (apiError) {
      const statusCode = apiError.response?.status;
      const errorMessage = apiError.response?.data?.message || apiError.message;
      
      this.log(`API connection test failed: ${errorMessage}`, true);
      return {
        success: false,
        error: `API Error (${statusCode || 'unknown'}): ${errorMessage}`
      };
    }
  }

  async getConfig() {
    try {
      this.log('Getting plugin configuration');
      
      // Get plugin config from cache, not async method
      const pluginConfig = this.getPluginConfig();
      
      this.log('Plugin configuration retrieved');
      return {
        success: true,
        config: pluginConfig || {}
      };
    } catch (error) {
      this.log(`Failed to get plugin configuration: ${error.message}`, true);
      return {
        success: false,
        error: `Failed to get configuration: ${error.message}`
      };
    }
  }
  
  async saveConfig(payload) {
    try {
      this.log('Save config request received');
      
      if (!payload || !payload.body || !payload.body.config) {
        this.log('Missing config in request body', true);
        return {
          success: false,
          error: 'No configuration provided'
        };
      }
      
      const newConfig = payload.body.config;
      
      // Ensure required fields
      if (!newConfig.platform) {
        newConfig.platform = "SleepMeSimple";
      }
      
      if (!newConfig.name) {
        newConfig.name = "SleepMe Simple";
      }
      
      // Validate schedules
      if (newConfig.enableSchedules && !Array.isArray(newConfig.schedules)) {
        newConfig.schedules = [];
      }
      
      this.log(`Saving config with token: ${newConfig.apiToken ? newConfig.apiToken.substring(0, 4) + '...' : 'none'}`);
      
      try {
        // Save the configuration
        await this.updatePluginConfig(newConfig);
        
        this.log('Configuration saved successfully');
        
        // Notify UI of the updated config
        await this.pushEvent('save-config', { success: true });
        
        return {
          success: true,
          message: 'Configuration saved successfully'
        };
      } catch (saveError) {
        this.log(`Error saving configuration: ${saveError.message}`, true);
        return {
          success: false,
          error: `Failed to save configuration: ${saveError.message}`
        };
      }
    } catch (error) {
      this.log(`Save config failed: ${error.message}`, true);
      return {
        success: false,
        error: `Error: ${error.message}`
      };
    }
  }
}

// Export the server instance (CommonJS style)
module.exports = new SleepMeUiServer();