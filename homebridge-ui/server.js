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
      
      // Use try-catch with fallback to empty config
      let config = [{}];
      try {
        config = await this.homebridge.getPluginConfig();
        if (!Array.isArray(config) || config.length === 0) {
          config = [{}];
        }
      } catch (err) {
        this.log(`Error getting plugin config: ${err.message}`, true);
        // Fall back to empty config
      }
      
      this.log('Config retrieved successfully');
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
      if (!/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/.test(schedule.time)) {
        return false;
      }
      
      // Validate temperature range based on unit
      const temp = parseFloat(schedule.temperature);
      if (isNaN(temp)) {
        return false;
      }
      
      // Check temperature range
      if (schedule.unit === 'C' && (temp < 13 || temp > 46)) {
        return false;
      } else if (schedule.unit === 'F' && (temp < 55 || temp > 115)) {
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
      this.log('Save config request received');
      
      // Validate payload structure
      if (!payload?.body?.config) {
        this.log('Invalid configuration data received', true);
        return { 
          success: false, 
          error: 'Invalid configuration data' 
        };
      }
      
      const { config } = payload.body;
      
      // Validate required fields
      if (!config.apiToken) {
        this.log('API token missing in configuration', true);
        return {
          success: false,
          error: 'API token is required'
        };
      }
      
      // Validate numeric fields
      if (config.pollingInterval) {
        const pollingInterval = parseInt(config.pollingInterval, 10);
        if (isNaN(pollingInterval) || pollingInterval < 60 || pollingInterval > 300) {
          this.log('Invalid polling interval', true);
          return {
            success: false,
            error: 'Polling interval must be between 60 and 300 seconds'
          };
        }
      }
      
      // Validate schedules if enabled
      if (config.enableSchedules && config.schedules) {
        if (!this.validateSchedules(config.schedules)) {
          this.log('Invalid schedule data', true);
          return {
            success: false,
            error: 'Invalid schedule format'
          };
        }
      }
      
      try {
        // Ensure platform property is present and correct
        if (!config.platform) {
          config.platform = "SleepMeSimple";
        }
        
        await this.homebridge.updatePluginConfig([config]);
        this.log(`Configuration saved successfully: ${config.enableSchedules ? (config.schedules?.length || 0) : 0} schedules`);
        
        return { success: true };
      } catch (saveError) {
        this.log(`Error saving to Homebridge: ${saveError.message}`, true);
        return {
          success: false,
          error: `Error saving to Homebridge: ${saveError.message}`
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

// Create and export server instance
export default new SleepMeUiServer();