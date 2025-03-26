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
    this.onRequest('/saveConfig', this.saveConfig.bind(this));
    
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
   * This method doesn't use getPluginConfig() to avoid compatibility issues
   * @returns {Object} Current configuration or empty object if not found
   */
  async getConfig() {
    try {
      this.log('Get config request received');
      
      // Get the initial cached config from the Homebridge UI
      // This is safer than getPluginConfig() which may not be available
      let config = {};
      
      try {
        // Use the built-in homebridge-api for getting config
        // This should be more reliable than getPluginConfig
        const cachedConfig = await this.homebridgeApi.getPluginConfig();
        
        if (cachedConfig && cachedConfig[0]) {
          config = cachedConfig[0];
          this.log('Config retrieved from Homebridge API successfully');
        } else {
          this.log('No config found in Homebridge API');
        }
      } catch (err) {
        this.log(`Error getting config: ${err.message}`, true);
        // Use empty config
      }
      
      return {
        success: true,
        config: config
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
   * Save configuration to Homebridge
   * Uses the safer updatePluginConfig method to avoid API compatibility issues
   * @param {Object} payload Configuration to save
   * @returns {Object} Success or failure response
   */
  async saveConfig(payload) {
    try {
      this.log('Save config request received');
      
      if (!payload?.body?.config) {
        this.log('Missing config in request body', true);
        return {
          success: false,
          error: 'No configuration provided'
        };
      }
      
      const config = payload.body.config;
      
      // Make sure it's properly formatted
      if (!config.platform) {
        config.platform = "SleepMeSimple";
      }
      
      if (!config.name) {
        config.name = "SleepMe Simple";
      }
      
      // Handle schedules properly
      if (config.enableSchedules && Array.isArray(config.schedules)) {
        this.log(`Configuration contains ${config.schedules.length} schedules`);
      } else if (config.enableSchedules) {
        this.log('Schedules enabled but no schedules array found, creating empty array');
        config.schedules = [];
      }
      
      // Save to Homebridge config
      try {
        this.log('Saving configuration to Homebridge...');
        
        // Call the parent savePluginConfig method which is more robust
        await this.homebridgeApi.updatePluginConfig([config]);
        
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
  
  /**
   * Hook for handling plugin config updates
   * This simply makes sure we're printing useful logs when configs are updated
   */
  pluginConfigChanged() {
    this.log('Plugin config was changed externally');
  }
}

// Create and export server instance
export default new SleepMeUiServer();