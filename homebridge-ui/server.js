import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';
import axios from 'axios';
import { API_BASE_URL } from '../dist/settings.js';

class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();

    // Route handling for UI
    this.onRequest('/device/test', this.testDeviceConnection.bind(this));
    this.onRequest('/config', this.getConfig.bind(this));
    this.onRequest('/save-config', this.saveConfig.bind(this));

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
   * @param {Object} payload - Request payload
   * @returns {Object} Response indicating success or failure
   */
  async testDeviceConnection(payload) {
    try {
      // Validate payload
      if (!payload || !payload.body || !payload.body.apiToken) {
        return {
          success: false,
          error: 'API token is required'
        };
      }

      const { apiToken } = payload.body;
      
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
   * @returns {Object} Current configuration
   */
  async getConfig() {
    try {
      const config = await this.getPluginConfig();
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
   * Validate schedule data format
   * @param {Array} schedules - Array of schedule objects
   * @returns {Boolean} Whether schedules are valid
   */
  validateSchedules(schedules) {
    if (!Array.isArray(schedules)) {
      return false;
    }
    
    return schedules.every(schedule => {
      // Check required fields
      if (!schedule.type || !schedule.time || schedule.temperature === undefined) {
        return false;
      }
      
      // Validate schedule type
      const validTypes = ['Everyday', 'Weekdays', 'Weekend', 'Specific Day'];
      if (!validTypes.includes(schedule.type)) {
        return false;
      }
      
      // Check day for specific day schedules
      if (schedule.type === 'Specific Day' && (schedule.day === undefined || schedule.day < 0 || schedule.day > 6)) {
        return false;
      }
      
      // Validate time format (HH:MM)
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(schedule.time)) {
        return false;
      }
      
      // Validate temperature range
      const temp = parseFloat(schedule.temperature);
      if (isNaN(temp) || temp < 13 || temp > 46) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Save updated plugin configuration
   * @param {Object} payload - Configuration data
   * @returns {Object} Response indicating success or failure
   */
  async saveConfig(payload) {
    try {
      if (!payload || !payload.body || !payload.body.config) {
        return { 
          success: false, 
          error: 'Invalid configuration data' 
        };
      }
      
      const { config } = payload.body;
      
      // Validate required fields
      if (!config.apiToken) {
        return {
          success: false,
          error: 'API token is required'
        };
      }
      
      // Validate numeric fields
      if (config.pollingInterval) {
        const pollingInterval = parseInt(config.pollingInterval, 10);
        if (isNaN(pollingInterval) || pollingInterval < 60 || pollingInterval > 300) {
          return {
            success: false,
            error: 'Polling interval must be between 60 and 300 seconds'
          };
        }
      }
      
      // Validate schedules if enabled
      if (config.enableSchedules && config.schedules) {
        if (!this.validateSchedules(config.schedules)) {
          return {
            success: false,
            error: 'Invalid schedule format'
          };
        }
      }
      
      await this.updatePluginConfig([config]);
      this.log(`Configuration saved successfully: ${config.enableSchedules ? config.schedules.length : 0} schedules`);
      
      return { success: true };
    } catch (error) {
      this.log(`Save config failed: ${error.message}`, true);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create and export server instance
export default new SleepMeUiServer();