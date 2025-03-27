// homebridge-ui/server.js
const { HomebridgePluginUiServer } = require('@homebridge/plugin-ui-utils');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Fallback API URL
const API_BASE_URL = 'https://api.developer.sleep.me/v1';

class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();

    // Register request handlers with more comprehensive error handling
    this.onRequest('/config', this.getConfig.bind(this));
    this.onRequest('/saveConfig', this.saveConfig.bind(this));
    this.onRequest('/device/test', this.testDeviceConnection.bind(this));
    
    this.log('SleepMe UI Server initialized');
    this.ready();
  }

  /**
   * Enhanced logging method with log levels
   * @param {string} message - Log message
   * @param {'info'|'warn'|'error'} level - Log level
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [SleepMe UI] [${level.toUpperCase()}] ${message}`;
    
    switch(level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }

  /**
   * Get the current plugin configuration
   * @returns {Promise<Object>} Configuration object
   */
  async getConfig() {
    try {
      this.log('Retrieving plugin configuration');
      
      // Use the built-in method to get plugin config
      const config = await this.getPluginConfig();
      
      this.log(`Configuration retrieved: ${JSON.stringify(config)}`);
      
      return {
        success: true,
        config: config || {}
      };
    } catch (error) {
      this.log(`Error retrieving configuration: ${error.message}`, 'error');
      return {
        success: false,
        error: `Failed to retrieve configuration: ${error.message}`
      };
    }
  }

  /**
   * Save the plugin configuration
   * @param {Object} payload - Configuration payload
   * @returns {Promise<Object>} Save result
   */
  async saveConfig(payload) {
    try {
      this.log('Saving plugin configuration');
      
      // Validate payload
      if (!payload || !payload.config) {
        throw new Error('Invalid configuration payload');
      }
      
      const config = payload.config;
      
      // Ensure required platform properties are set
      config.platform = config.platform || 'SleepMeSimple';
      config.name = config.name || 'SleepMe Simple';
      
      // Validate and sanitize configuration
      if (!config.apiToken) {
        throw new Error('API token is required');
      }

      // Validate schedules
if (config.enableSchedules && !Array.isArray(config.schedules)) {
  config.schedules = [];
} else if (!config.enableSchedules) {
  // Explicitly remove schedules when disabled
  delete config.schedules;
}
      
      // Use the built-in method to save plugin configuration
      await this.updatePluginConfig(config);
      
      this.log('Configuration saved successfully');
      
      // Emit a configuration updated event
      this.emit('config-updated', config);
      
      return {
        success: true,
        message: 'Configuration saved successfully'
      };
    } catch (error) {
      this.log(`Error saving configuration: ${error.message}`, 'error');
      return {
        success: false,
        error: `Failed to save configuration: ${error.message}`
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
      this.log('Testing device connection');
      
      if (!payload || !payload.apiToken) {
        throw new Error('API token is required');
      }
      
      const { apiToken } = payload;
      
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
      
      this.log(`API connection test successful. Found ${devices.length} devices`);
      
      return {
        success: true,
        devices: devices.length,
        message: `Connection successful. Found ${devices.length} device(s).`
      };
    } catch (error) {
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.message || error.message;
      
      this.log(`API connection test failed: ${errorMessage}`, 'error');
      
      return {
        success: false,
        error: `API Error (${statusCode || 'unknown'}): ${errorMessage}`
      };
    }
  }
}

// Export the server instance
module.exports = new SleepMeUiServer();