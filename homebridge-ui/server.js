// homebridge-ui/server.js
import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file path (ESM replacement for __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// API URL
const API_BASE_URL = 'https://api.developer.sleep.me/v1';

/**
 * SleepMe UI Server class
 * Handles server-side operations for the plugin's custom UI
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();
    
    try {
      // Register request handlers
      this.onRequest('/config', this.getConfig.bind(this));
      this.onRequest('/saveConfig', this.saveConfig.bind(this));
      this.onRequest('/device/test', this.testDeviceConnection.bind(this));
      
      // Signal that server is ready
      this.ready();
    } catch (err) {
      console.error('Error initializing server:', err);
      // Just make sure we call ready even on error
      try {
        this.ready();
      } catch (readyError) {
        // Cannot do much if ready fails
        console.error('Error calling ready:', readyError);
      }
    }
  }

  /**
   * Get the current plugin configuration
   * This method fetches the config using the API provided by HomebridgePluginUiServer
   * @returns {Promise<Object>} Configuration object with success status and config data
   */
  async getConfig() {
    try {
      // Use the homebridgeApi property to access the API methods
      const pluginConfig = await this.homebridgeApi.getPluginConfig();
      
      // Extract our platform configuration
      // For platform plugins, config is an array of platform configs
      // Find the config with platform = 'SleepMeSimple'
      let platformConfig = {};
      
      if (Array.isArray(pluginConfig) && pluginConfig.length > 0) {
        // Find our platform in the plugins array
        const platform = pluginConfig.find(p => 
          p && p.platform === 'SleepMeSimple'
        );
        
        if (platform) {
          platformConfig = platform;
        } else if (pluginConfig[0]) {
          // If no platform config found but there is at least one config, use the first one
          platformConfig = pluginConfig[0];
        }
      }
      
      return {
        success: true,
        config: platformConfig
      };
    } catch (error) {
      console.error('Error getting config:', error);
      return {
        success: false,
        error: `Failed to retrieve configuration: ${error.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Save the plugin configuration
   * This method uses the API provided by HomebridgePluginUiServer to update the config
   * @param {Object} payload - Configuration payload
   * @returns {Promise<Object>} Save result
   */
  async saveConfig(payload) {
    try {
      // Extract config from payload - handle all common formats
      let config = null;
      
      // Try different payload structures
      if (payload && payload.body && payload.body.config) {
        config = payload.body.config;
      } else if (payload && payload.config) {
        config = payload.config;
      } else if (payload && payload.platform === 'SleepMeSimple') {
        config = payload;
      }
      
      if (!config) {
        throw new Error('Invalid configuration data in payload');
      }
      
      // Ensure required platform properties
      config.platform = 'SleepMeSimple';
      config.name = config.name || 'SleepMe Simple';
      
      // Validate API token
      if (!config.apiToken) {
        throw new Error('API token is required');
      }

      // Get the current plugin config using the homebridgeApi
      const pluginConfig = await this.homebridgeApi.getPluginConfig();
      
      // Determine how to update the config based on existing configs
      let updatedConfig = [];
      
      if (Array.isArray(pluginConfig) && pluginConfig.length > 0) {
        // Find if our platform config already exists
        const platformIndex = pluginConfig.findIndex(p => 
          p && p.platform === 'SleepMeSimple'
        );
        
        if (platformIndex >= 0) {
          // Update existing platform config
          updatedConfig = [...pluginConfig];
          updatedConfig[platformIndex] = config;
        } else {
          // Add new platform config
          updatedConfig = [...pluginConfig, config];
        }
      } else {
        // No existing config, create new array with just our config
        updatedConfig = [config];
      }
      
      // Save the updated config using the homebridgeApi
      await this.homebridgeApi.updatePluginConfig(updatedConfig);
      
      // Trigger a save to config.json if needed
      // Only use this when necessary as it triggers file writes
      await this.homebridgeApi.savePluginConfig();
      
      // Notify UI of update
      this.pushEvent('config-updated', { timestamp: Date.now() });
      
      return {
        success: true,
        message: 'Configuration saved successfully'
      };
    } catch (error) {
      console.error('Error saving config:', error);
      return {
        success: false,
        error: `Failed to save configuration: ${error.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Test the SleepMe API connection
   * @param {Object} payload - Connection test payload
   * @returns {Promise<Object>} Connection test result
   */
  async testDeviceConnection(payload) {
    try {
      // Extract API token with multiple fallbacks
      let apiToken = null;
      
      // Try different payload structures
      if (payload && typeof payload.apiToken === 'string') {
        apiToken = payload.apiToken;
      } else if (payload && payload.body && typeof payload.body.apiToken === 'string') {
        apiToken = payload.body.apiToken;
      }
      
      // If no API token found in payload, try to get from stored config
      if (!apiToken) {
        const configResult = await this.getConfig();
        if (configResult.success && configResult.config && configResult.config.apiToken) {
          apiToken = configResult.config.apiToken;
        }
      }
      
      if (!apiToken) {
        throw new Error('API token is required');
      }
      
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
      const devices = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.devices || []);
      
      return {
        success: true,
        devices: devices.length,
        message: `Connection successful. Found ${devices.length} device(s).`
      };
    } catch (error) {
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.message || error.message;
      
      return {
        success: false,
        error: `API Error (${statusCode || 'unknown'}): ${errorMessage}`
      };
    }
  }
}

// Export the server instance
export default new SleepMeUiServer();