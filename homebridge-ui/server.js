// homebridge-ui/server.js
import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file path (ESM replacement for __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fallback API URL
const API_BASE_URL = 'https://api.developer.sleep.me/v1';

/**
 * SleepMe UI Server class
 * Handles server-side operations for the plugin's custom UI
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();
    
    try {
      // Check if required assets exist
      this.checkRequiredAssets();
      
      // Register request handlers with improved error handling
      this.onRequest('/config', this.getConfig.bind(this));
      this.onRequest('/saveConfig', this.saveConfig.bind(this));
      this.onRequest('/device/test', this.testDeviceConnection.bind(this));
      
      this.log('SleepMe UI Server initialized');
      
      // Signal that server is ready - CRITICAL for UI loading
      this.ready();
    } catch (err) {
      // Better error logging
      console.error('ERROR INITIALIZING SLEEPME UI SERVER:', err);
      
      // Still attempt to signal ready to avoid hanging UI
      try {
        this.ready();
      } catch (readyError) {
        console.error('Failed to signal server ready:', readyError);
      }
    }
  }

  /**
   * Check if required UI assets exist
   */
  checkRequiredAssets() {
    // Use path.join for cross-platform compatibility
    const iconPath = path.join(__dirname, 'public', 'icons', 'sleepmebasic.png');
    
    try {
      // Check if icon exists and log appropriately
      if (fs.existsSync(iconPath)) {
        this.log(`Icon found at: ${iconPath}`);
      } else {
        this.log(`WARNING: Icon missing at: ${iconPath}`, 'warn');
        
        // Try to create the directory structure if it doesn't exist
        const iconDir = path.dirname(iconPath);
        if (!fs.existsSync(iconDir)) {
          fs.mkdirSync(iconDir, { recursive: true });
          this.log(`Created icons directory: ${iconDir}`);
        }
      }
    } catch (err) {
      this.log(`Error checking for UI assets: ${err.message}`, 'error');
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
   * Uses the Homebridge UI APIs to access the config
   * 
   * @returns {Promise<Object>} Configuration object with success status and config data
   */
  async getConfig() {
    try {
      this.log('Retrieving plugin configuration');
      
      // Get the Homebridge config.json path using the proper UI API
      const configPath = this.homebridgeConfigPath();
      
      if (!configPath) {
        this.log('Could not determine config.json path', 'error');
        return {
          success: false,
          error: 'Could not determine config.json path'
        };
      }
      
      this.log(`Reading config from: ${configPath}`);
      
      // Use the API to get the current configuration
      const config = await this.readHomebridgeConfig();
      
      if (!config) {
        throw new Error('Failed to read Homebridge configuration');
      }
      
      this.log('Successfully read Homebridge configuration');
      
      // Extract our platform configuration
      let platformConfig = {};
      
      if (config && typeof config === 'object') {
        if (Array.isArray(config.platforms)) {
          this.log('Looking for SleepMeSimple in platforms array');
          
          // Find our platform in the platforms array
          const platform = config.platforms.find(p => 
            p && p.platform === 'SleepMeSimple'
          );
          
          if (platform) {
            this.log('Found SleepMeSimple platform in config.json');
            platformConfig = platform;
          } else {
            this.log('SleepMeSimple platform not found in config.json');
          }
        }
      }
      
      return {
        success: true,
        config: platformConfig
      };
    } catch (error) {
      this.log(`Error retrieving configuration: ${error.message}`, 'error');
      if (error.stack) {
        this.log(`Stack trace: ${error.stack}`, 'error');
      }
      
      return {
        success: false,
        error: `Failed to retrieve configuration: ${error.message}`
      };
    }
  }

  /**
   * Save the plugin configuration
   * Uses the Homebridge UI APIs for updating the config
   * @param {Object} payload - Configuration payload
   * @returns {Promise<Object>} Save result
   */
  async saveConfig(payload) {
    try {
      this.log('Saving plugin configuration');
      
      // Log raw payload type for debugging
      this.log(`Raw payload type: ${typeof payload}`);
      
      // Properly extract the config object depending on payload structure
      // In the Homebridge Plugin UI, the payload should have a standard structure
      let config;
      
      if (!payload) {
        throw new Error('Payload is undefined or null');
      }
      
      // The body property contains the actual data in Homebridge UI requests
      if (payload.body && typeof payload.body === 'object') {
        this.log('Found payload.body object');
        
        // The config property should contain our platform configuration
        if (payload.body.config && typeof payload.body.config === 'object') {
          this.log('Found config in payload.body.config');
          config = payload.body.config;
        } else {
          // If we can't find the expected structure, log what we did find
          this.log('No config in payload.body, available keys: ' + 
            Object.keys(payload.body).join(', '), 'warn');
          
          throw new Error('Missing config property in payload.body');
        }
      } else if (payload.config && typeof payload.config === 'object') {
        // Alternative structure sometimes used
        this.log('Found config directly in payload.config');
        config = payload.config;
      } else if (payload.platform === 'SleepMeSimple') {
        // Direct platform config object
        this.log('Found platform config directly in payload');
        config = payload;
      } else {
        // If none of the above, log the payload structure for debugging
        this.log('Unexpected payload structure: ' + JSON.stringify(Object.keys(payload)), 'warn');
        throw new Error('Missing config property in payload');
      }
      
      // Ensure required platform properties are set
      config.platform = 'SleepMeSimple';
      config.name = config.name || 'SleepMe Simple';
      
      // Validate API token
      if (!config.apiToken) {
        throw new Error('API token is required');
      }

      // Normalize boolean values (handle string representations)
      if (typeof config.enableSchedules === 'string') {
        config.enableSchedules = config.enableSchedules.toLowerCase() === 'true';
      }

      // Process schedules if enabled
      if (config.enableSchedules === true) {
        if (!Array.isArray(config.schedules)) {
          config.schedules = [];
          this.log('Creating empty schedules array for enabled schedules');
        }
        
        // Validate and normalize each schedule entry
        this.log(`Processing ${config.schedules.length} schedules`);
        config.schedules = config.schedules.map((schedule, index) => {
          // Ensure we have valid schedule object
          if (!schedule || typeof schedule !== 'object') {
            this.log(`Invalid schedule at index ${index}, using defaults`, 'warn');
            return {
              type: 'Everyday',
              time: '00:00',
              temperature: 21,
              unit: 'C'
            };
          }
          
          // Create normalized schedule with consistent types
          return {
            type: String(schedule.type || 'Everyday'),
            time: String(schedule.time || '00:00'),
            temperature: Number(schedule.temperature || 21),
            unit: String(schedule.unit || 'C'),
            ...(schedule.type === 'Specific Day' ? { day: Number(schedule.day) } : {}),
            ...(schedule.description ? { description: String(schedule.description) } : {})
          };
        });
      } else if (config.enableSchedules === false) {
        // Explicitly remove schedules when disabled
        delete config.schedules;
        this.log('Schedules disabled, removing schedules property');
      }
      
      // Process numeric values
      if (config.pollingInterval !== undefined) {
        config.pollingInterval = parseInt(String(config.pollingInterval), 10);
        if (isNaN(config.pollingInterval)) {
          config.pollingInterval = 90; // Default if parsing fails
        }
      }
      
      // Use the appropriate Homebridge UI API to update the config
      // This will handle placing our platform config in the right place
      this.log('Saving configuration with updatePluginConfig API');
      await this.updatePluginConfig([config]);
      
      this.log('Configuration updated successfully');
      
      // Notify UI of config change
      this.pushEvent('config-updated', { timestamp: Date.now() });
      
      return {
        success: true,
        message: 'Configuration saved successfully'
      };
    } catch (error) {
      this.log(`Error saving configuration: ${error.message}`, 'error');
      if (error.stack) {
        this.log(`Stack trace: ${error.stack}`, 'error');
      }
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
      
      // Extract API token from payload.body for consistency with other handlers
      let apiToken;
      
      if (payload.body && payload.body.apiToken) {
        apiToken = payload.body.apiToken;
      } else if (payload.apiToken) {
        apiToken = payload.apiToken;
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
export default new SleepMeUiServer();