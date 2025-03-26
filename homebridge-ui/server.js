// homebridge-ui/server.js
import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';
import axios from 'axios';

// Fallback API URL
const API_BASE_URL = 'https://api.developer.sleep.me/v1';

class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();

    // Register request handlers for UI endpoints
    this.onRequest('/device/test', this.testDeviceConnection.bind(this));
    this.onRequest('/config', this.getConfig.bind(this));
    this.onRequest('/saveConfig', this.saveConfig.bind(this));
    
    this.log('SleepMe UI Server initialized');
    this.ready(); // Signal that the server is ready
  }

  // Helper method for consistent logging
  log(message, isError = false) {
    const logMethod = isError ? console.error : console.log;
    logMethod(`[SleepMe UI] ${message}`);
  }

  // Test the connection to the SleepMe API with the provided token
  async testDeviceConnection(payload) {
    try {
      this.log('Test connection request received');
      
      // Validate input
      if (!payload?.body?.apiToken) {
        this.log('Missing API token in request', true);
        return {
          success: false,
          error: 'API token is required'
        };
      }

      const { apiToken } = payload.body;
      this.log(`Testing connection with token: ${apiToken.substring(0, 4)}...`);
      
      try {
        // Make request to SleepMe API to verify the token
        const response = await axios({
          method: 'GET',
          url: `${API_BASE_URL}/devices`,
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10-second timeout
        });
        
        // Handle different API response formats
        const devices = Array.isArray(response.data) ? response.data : (response.data.devices || []);
        
        this.log(`API connection successful, found ${devices.length} devices`);
        return {
          success: true,
          message: `Connection successful. Found ${devices.length} device(s).`
        };
      } catch (apiError) {
        this.log(`API connection test failed: ${apiError.message}`, true);
        
        const statusCode = apiError.response?.status;
        const errorMessage = apiError.response?.data?.message || apiError.message;
        
        return {
          success: false,
          error: `API Error (${statusCode || 'unknown'}): ${errorMessage}`
        };
      }
    } catch (error) {
      this.log(`Device connection test failed: ${error.message}`, true);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Retrieve the current plugin configuration
  async getConfig() {
    try {
      this.log('Get config request received');
      
      // Get current configuration using the proper method
      const pluginConfig = await this.getPluginConfig();
      
      this.log('Configuration retrieved successfully');
      return {
        success: true,
        config: pluginConfig || {}
      };
    } catch (error) {
      this.log(`Get config failed: ${error.message}`, true);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Save the updated plugin configuration
  async saveConfig(payload) {
    try {
      this.log('Save config request received');
      
      // Validate input
      if (!payload?.body?.config) {
        this.log('Missing config in request body', true);
        return {
          success: false,
          error: 'No configuration provided'
        };
      }
      
      const config = payload.body.config;
      
      // Ensure required fields are present
      if (!config.platform) {
        config.platform = "SleepMeSimple";
      }
      
      if (!config.name) {
        config.name = "SleepMe Simple";
      }
      
      // Handle schedules configuration
      if (config.enableSchedules && Array.isArray(config.schedules)) {
        this.log(`Configuration contains ${config.schedules.length} schedules`);
      } else if (config.enableSchedules) {
        config.schedules = [];
      }
      
      try {
        this.log('Saving configuration to Homebridge...');
        
        // Update configuration using the proper method
        await this.updatePluginConfig(config);
        
        // Also notify UI clients that config has changed
        this.pushEvent('save-config', { config: config });
        
        this.log('Configuration saved successfully');
        return {
          success: true,
          message: 'Configuration saved successfully'
        };
      } catch (error) {
        this.log(`Error saving configuration: ${error.message}`, true);
        return {
          success: false,
          error: `Error saving configuration: ${error.message}`
        };
      }
    } catch (error) {
      this.log(`Save config failed: ${error.message}`, true);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create and export an instance of the server
export default new SleepMeUiServer();