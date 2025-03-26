// homebridge-ui/server.js
import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';
import axios from 'axios';

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
      const response = await axios({
        method: 'GET',
        url: `${API_BASE_URL}/devices`,
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      const devices = Array.isArray(response.data) ? response.data : (response.data.devices || []);
      
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
      
      // Get all platforms from Homebridge config
      const homebridgeConfig = await this.homebridge.getPluginConfig();
      
      // Find our platform configuration
      let pluginConfig = {};
      if (Array.isArray(homebridgeConfig)) {
        // For multi-instance plugins
        pluginConfig = homebridgeConfig[0] || {};
      } else {
        // For single instance plugins
        pluginConfig = homebridgeConfig || {};
      }
      
      this.log('Plugin configuration retrieved successfully');
      return {
        success: true,
        config: pluginConfig
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
      
      const config = payload.body.config;
      
      // Ensure required fields
      if (!config.platform) {
        config.platform = "SleepMeSimple";
      }
      
      if (!config.name) {
        config.name = "SleepMe Simple";
      }
      
      // Validate schedules
      if (config.enableSchedules && !Array.isArray(config.schedules)) {
        config.schedules = [];
      }
      
      this.log(`Saving config: ${JSON.stringify(config, null, 2)}`);
      
      try {
        // Update the plugin config directly
        await this.homebridge.updatePluginConfig([config]);
        
        this.log('Configuration saved successfully');
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

// Initialize the server
export default () => new SleepMeUiServer();