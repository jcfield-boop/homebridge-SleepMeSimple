// homebridge-ui/server.js
const { HomebridgePluginUiServer } = require('@homebridge/plugin-ui-utils');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Fallback API URL
const API_BASE_URL = 'https://api.developer.sleep.me/v1';

class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();
    
    try {
      // Check if required assets exist
      this.checkRequiredAssets();
      
      // Register request handlers with more comprehensive error handling
      this.onRequest('/config', this.getConfig.bind(this));
      this.onRequest('/saveConfig', this.saveConfig.bind(this));
      this.onRequest('/device/test', this.testDeviceConnection.bind(this));
      
      this.log('SleepMe UI Server initialized');
      this.ready();
    } catch (err) {
      console.error('ERROR INITIALIZING SERVER:', err);
    }
  }

  /**
   * Check if required UI assets exist
   */
  checkRequiredAssets() {
    const iconPath = path.resolve(__dirname, 'public/icons/sleepmebasic.png');
    
    try {
      if (fs.existsSync(iconPath)) {
        this.log('Icon found at: ' + iconPath);
      } else {
        this.log('WARNING: Icon missing at: ' + iconPath, 'warn');
      }
    } catch (err) {
      this.log('Error checking for UI assets: ' + err.message, 'error');
    }
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
      
      // Get the plugin configuration using the built-in method
      const pluginConfig = await this.readPluginConfig();
      
      this.log(`Configuration retrieved successfully`);
      
      return {
        success: true,
        config: pluginConfig || {}
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