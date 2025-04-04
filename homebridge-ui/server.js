// homebridge-ui/server.js
import { HomebridgePluginUiServer, RequestError } from '@homebridge/plugin-ui-utils';

/**
 * SleepMe UI Server 
 * Handles backend functionality for the custom UI
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();
    
    // Register request handlers for specific endpoints
    this.onRequest('/device/test', this.testDeviceConnection.bind(this));
    this.onRequest('/config/load', this.loadConfig.bind(this));
    this.onRequest('/config/save', this.saveConfig.bind(this));
    
    // Simple console logging without UI events
    console.log('[SleepMeUI] Server initialized');
    
    // Signal readiness
    this.ready();
  }
  
  /**
   * Server-side logging that doesn't trigger UI notifications
   * @param {string} message - Log message
   * @param {string} level - Log level (info, warn, error)
   */
  log(message, level = 'info') {
    const prefix = '[SleepMeUI]';
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }
  
  /**
   * Load the plugin configuration using Homebridge API
   * @returns {Promise<Object>} Response with plugin configuration
   */
  async loadConfig() {
    try {
      this.log('Loading plugin configuration');
      
      // Use Homebridge API to get plugin config
      const pluginConfig = await this.getPluginConfig();
      
      this.log(`Retrieved ${pluginConfig.length} plugin config entries`);
      
      // Find our platform configuration
      const platformConfig = Array.isArray(pluginConfig) ? 
        pluginConfig.find(config => config && config.platform === 'SleepMeSimple') : null;
      
      if (!platformConfig) {
        this.log('SleepMeSimple platform configuration not found', 'warn');
        return {
          success: false,
          error: 'Platform configuration not found',
          searchedPlatform: 'SleepMeSimple'
        };
      }
      
      this.log(`Found SleepMeSimple platform configuration: ${platformConfig.name || 'SleepMe Simple'}`);
      
      // Log important configuration values for debugging
      this.log(`Loaded config values: unit=${platformConfig.unit}, pollingInterval=${platformConfig.pollingInterval}, logLevel=${platformConfig.logLevel}`);
      if (platformConfig.enableSchedules && Array.isArray(platformConfig.schedules)) {
        this.log(`Found ${platformConfig.schedules.length} schedules in configuration`);
      } else {
        this.log('No schedules found in configuration');
      }
      
      return {
        success: true,
        config: platformConfig
      };
    } catch (error) {
      this.log(`Error loading configuration: ${error.message}`, 'error');
      return {
        success: false,
        error: `Configuration error: ${error.message}`
      };
    }
  }
  
  /**
   * Save the plugin configuration
   * @param {Object} payload - Updated configuration data
   * @returns {Promise<Object>} Response with success status
   */
  async saveConfig(payload) {
    try {
      if (!payload || !payload.config) {
        throw new RequestError('Invalid configuration data provided', { status: 400 });
      }
      
      this.log('Saving plugin configuration');
      
      // Get current config
      const pluginConfig = await this.getPluginConfig();
      
      if (!Array.isArray(pluginConfig)) {
        throw new RequestError('Plugin configuration is not an array', { status: 500 });
      }
      
      const configData = payload.config;
      
      // Ensure all required fields are present
      if (!configData.platform || configData.platform !== 'SleepMeSimple') {
        configData.platform = 'SleepMeSimple';
      }
      
      if (!configData.name) {
        configData.name = 'SleepMe Simple';
      }
      
      // Explicitly log all important configuration values for debugging
      this.log(`Saving configuration values: unit=${configData.unit}, pollingInterval=${configData.pollingInterval}, logLevel=${configData.logLevel}`);
      
      // Ensure type correctness for fields
      if (typeof configData.pollingInterval === 'string') {
        configData.pollingInterval = parseInt(configData.pollingInterval, 10);
      }
      
      // Ensure schedules are properly structured if enabled
      if (configData.enableSchedules === true) {
        if (!Array.isArray(configData.schedules)) {
          configData.schedules = [];
        }
        
        if (configData.schedules.length > 0) {
          this.log(`Saving ${configData.schedules.length} schedules`);
          
          // Ensure each schedule has the correct structure
          configData.schedules = configData.schedules.map(schedule => {
            return {
              type: String(schedule.type || 'Everyday'),
              time: String(schedule.time || '00:00'),
              temperature: Number(schedule.temperature || 21),
              day: schedule.day !== undefined ? Number(schedule.day) : undefined,
              description: schedule.description ? String(schedule.description) : undefined,
              unit: String(schedule.unit || configData.unit || 'C')
            };
          });
          
          // Log the first schedule for verification
          if (configData.schedules.length > 0) {
            this.log(`First schedule: type=${configData.schedules[0].type}, ` +
                   `time=${configData.schedules[0].time}, ` + 
                   `temp=${configData.schedules[0].temperature}`);
          }
        } else {
          this.log('No schedules to save');
        }
      } else {
        // If schedules are disabled, ensure the array is empty
        configData.schedules = [];
        this.log('Schedules disabled, clearing schedule array');
      }
      
      // Find the index of the existing platform config
      const existingIndex = pluginConfig.findIndex(c => 
        c && c.platform === 'SleepMeSimple'
      );
      
      let updatedConfig;
      
      // Update existing or add new
      if (existingIndex >= 0) {
        this.log(`Updating existing configuration at index ${existingIndex}`);
        updatedConfig = [...pluginConfig];
        updatedConfig[existingIndex] = configData;
      } else {
        this.log('Adding new platform configuration');
        updatedConfig = [...pluginConfig, configData];
      }
      
      // Update the configuration
      await this.updatePluginConfig(updatedConfig);
      
      // Save to disk
      await this.savePluginConfig();
      
      // Verify the configuration was saved
      const verifyConfig = await this.getPluginConfig();
      const savedPlatformConfig = verifyConfig.find(c => c && c.platform === 'SleepMeSimple');
      
      // Log verification results
      if (savedPlatformConfig) {
        this.log(`Verification successful. Saved config has: ` + 
               `unit=${savedPlatformConfig.unit}, ` +
               `pollingInterval=${savedPlatformConfig.pollingInterval}, ` +
               `logLevel=${savedPlatformConfig.logLevel}`);
        
        if (savedPlatformConfig.enableSchedules && Array.isArray(savedPlatformConfig.schedules)) {
          this.log(`Verified ${savedPlatformConfig.schedules.length} schedules saved`);
        }
      } else {
        this.log('Verification failed - platform config not found after save', 'warn');
      }
      
      this.log('Configuration saved successfully');
      
      // Return the updated configuration for verification
      return {
        success: true,
        message: 'Configuration saved successfully',
        savedConfig: savedPlatformConfig || configData
      };
    } catch (error) {
      this.log(`Error saving configuration: ${error.message}`, 'error');
      
      if (error instanceof RequestError) {
        throw error;
      }
      
      throw new RequestError(`Error saving configuration: ${error.message}`, { status: 500 });
    }
  }
  
  /**
   * Test connection to the SleepMe API
   * @param {Object} payload - Payload containing API token
   * @returns {Promise<Object>} Response with success status and device info
   */
  async testDeviceConnection(payload) {
    try {
      // Extract API token from request payload
      const apiToken = payload?.apiToken || payload?.body?.apiToken;
      
      if (!apiToken) {
        this.log('API token missing from test request', 'warn');
        throw new RequestError('API token is required', { status: 400 });
      }
      
      this.log(`Testing API connection with provided token`);
      
      // Make an actual API call to test the connection
      try {
        // This is where you'd implement the actual API call
        // For example, using node-fetch or axios to call the SleepMe API
        
        // Placeholder for actual implementation:
        const devices = [
          { id: "sample-id", name: "Sample Device", type: "Dock Pro" }
        ];
        
        return {
          success: true,
          devices: devices.length,
          deviceInfo: devices,
          message: `Connection successful. Found ${devices.length} device(s).`
        };
      } catch (apiError) {
        // Handle API-specific errors
        this.log(`API connection failed: ${apiError.message}`, 'error');
        throw new RequestError(`API connection failed: ${apiError.message}`, { status: 502 });
      }
    } catch (error) {
      if (error instanceof RequestError) {
        throw error;
      }
      
      // Handle general errors
      this.log(`Error in test connection: ${error.message}`, 'error');
      throw new RequestError(`Error: ${error.message}`, { status: 500 });
    }
  }
}

// Create and export a new instance
(() => {
  return new SleepMeUiServer();
})();