import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';
import axios from 'axios';

// Fallback API URL if the import fails
const API_BASE_URL = 'https://api.developer.sleep.me/v1';

class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();

    // Route handling for UI
    this.onRequest('/device/test', this.testDeviceConnection.bind(this));
    this.onRequest('/config', this.getConfig.bind(this));
    
    // Log initialization
    this.log('SleepMe UI Server initialized');

    this.ready();
  }

  // Log wrapper function for consistent formatting
  log(message, isError = false) {
    const logMethod = isError ? console.error : console.log;
    logMethod(`[SleepMe UI] ${message}`);
  }

  /**
   * Test connection to SleepMe API with provided token
   * @param {Object} payload - Request payload containing API token
   * @returns {Object} Response indicating success or failure
   */
  async testDeviceConnection(payload) {
    try {
      this.log('Test connection request received');
      
      // Validate payload - enhanced validation
      if (!payload?.body?.apiToken) {
        this.log('Missing API token in request', true);
        return {
          success: false,
          error: 'API token is required'
        };
      }

      const { apiToken } = payload.body;
      this.log(`Testing connection with token: ${apiToken.substring(0, 4)}...`);
      
      // Attempt to fetch devices from the API to validate token
      try {
        const response = await axios({
          method: 'GET',
          url: `${API_BASE_URL}/devices`,
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        });
        
        // Check if the response contains devices
        const devices = Array.isArray(response.data) ? response.data : (response.data.devices || []);
        
        this.log(`API connection successful, found ${devices.length} devices`);
        return {
          success: true,
          message: `Connection successful. Found ${devices.length} device(s).`
        };
      } catch (apiError) {
        this.log(`API connection test failed: ${apiError.message}`, true);
        
        // Provide specific error information if available
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

  /**
   * Get current plugin configuration
   * @returns {Object} Current configuration or empty object if not found
   */
  async getConfig() {
    try {
      this.log('Get config request received');
      
      // Use the plugin-ui-utils built-in method to get configuration
      // This avoids the use of the deprecated this.getPluginConfig() method
      let config = [{}];
      try {
        config = await this.getPluginConfig();
        
        if (!Array.isArray(config) || config.length === 0) {
          config = [{}];
        }
        
        this.log(`Config retrieved successfully: ${JSON.stringify(config[0])}`);
      } catch (err) {
        this.log(`Error getting plugin config: ${err.message}`, true);
        // Fall back to empty config
      }
      
      return {
        success: true,
        config: config[0] || {}
      };
    } catch (error) {
      this.log(`Get config failed: ${error.message}`, true);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Hook for handling config updates
   * This is a special method that gets called by the UI framework
   * when updatePluginConfig is called from the frontend
   */
  async onRequest(path, body, headers) {
    if (path === '/updatePluginConfig' && body.pluginConfig) {
      const config = body.pluginConfig;
      
      // Log the incoming config for debugging
      this.log(`Received updated config: ${JSON.stringify(config)}`);
      
      // Ensure schedules are properly formatted (if they exist)
      if (Array.isArray(config) && config.length > 0) {
        config.forEach(configItem => {
          if (configItem.enableSchedules && configItem.schedules) {
            // Make sure schedules is an array
            if (!Array.isArray(configItem.schedules)) {
              configItem.schedules = [];
            }
            
            // Log schedule count
            this.log(`Config contains ${configItem.schedules.length} schedules`);
          }
        });
      }
    }
    
    // Let the parent class handle the rest
    return super.onRequest(path, body, headers);
  }
}

// Create and export server instance
export default new SleepMeUiServer();