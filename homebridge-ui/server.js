// homebridge-ui/server.js
import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fsPromises } from 'fs';

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
      // Check if required assets exist
      this.checkRequiredAssets();
      
      // Register request handlers
      this.onRequest('/config', this.getConfig.bind(this));
      this.onRequest('/saveConfig', this.saveConfig.bind(this));
      this.onRequest('/device/test', this.testDeviceConnection.bind(this));
      
      this.log('SleepMe UI Server initialized');
      this.ready();
    } catch (err) {
      console.error('ERROR INITIALIZING SLEEPME UI SERVER:', err);
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
    const iconPath = path.join(__dirname, 'public', 'icons', 'sleepmebasic.png');
    
    try {
      if (fs.existsSync(iconPath)) {
        this.log(`Icon found at: ${iconPath}`);
      } else {
        this.log(`WARNING: Icon missing at: ${iconPath}`, 'warn');
        
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
   * @returns {Promise<Object>} Configuration object with success status and config data
   */
  async getConfig() {
    try {
      this.log('Retrieving plugin configuration');
      
      const configPath = this.getConfigPath();
      
      if (!configPath) {
        this.log('Could not determine config.json path', 'error');
        return {
          success: false,
          error: 'Could not determine config.json path'
        };
      }
      
      this.log(`Reading config from: ${configPath}`);
      
      const configFile = await fsPromises.readFile(configPath, 'utf8');
      const config = JSON.parse(configFile);
      
      this.log(`Successfully read config.json, file size: ${configFile.length} bytes`);
      
      let platformConfig = {};
      
      if (config && typeof config === 'object') {
        if (Array.isArray(config.platforms)) {
          this.log('Looking for SleepMeSimple in platforms array');
          
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
   * Get the path to the Homebridge config.json file
   * @returns {string|null} Path to config.json or null if not found
   */
  getConfigPath() {
    try {
      // Check if Homebridge UI Server provides the configPath method
      if (typeof this.homebridgeConfigPath === 'function') {
        const configPath = this.homebridgeConfigPath();
        this.log(`Config path from homebridgeConfigPath(): ${configPath}`);
        return configPath;
      }
      
      // Fallback to common paths
      const commonPaths = [
        // User level installation
        path.join(process.env.HOME || '', '.homebridge', 'config.json'),
        // System level installation
        '/var/lib/homebridge/config.json',
        // Docker common path
        '/homebridge/config.json',
        // Windows common path
        path.join(process.env.APPDATA || '', 'homebridge', 'config.json'),
        // Current working directory
        path.join(process.cwd(), 'config.json')
      ];
      
      // Check each path
      for (const configPath of commonPaths) {
        try {
          const stats = fs.statSync(configPath);
          if (stats.isFile()) {
            this.log(`Found config.json at: ${configPath}`);
            return configPath;
          }
        } catch (e) {
          // Path doesn't exist, continue to next one
        }
      }
      
      this.log('Could not find config.json in any common locations', 'warn');
      return null;
      
    } catch (error) {
      this.log(`Error determining config path: ${error.message}`, 'error');
      return null;
    }
  }

  /**
   * Save the plugin configuration - FIXED VERSION
   * @param {Object} payload - Configuration payload
   * @returns {Promise<Object>} Save result
   */
  async saveConfig(payload) {
    try {
      this.log('Saving plugin configuration');
      
      // Debug the actual payload structure received
      this.log(`Raw payload type: ${typeof payload}`);
      this.log(`Raw payload structure: ${JSON.stringify(payload ? Object.keys(payload) : 'undefined')}`);
      
      // Extract config properly based on observed request structure
      let config;
      
      if (payload && typeof payload === 'object') {
        // Check different possible locations of config data
        if (payload.body && payload.body.config) {
          // This is the most common structure from the UI
          config = payload.body.config;
          this.log('Found config in payload.body.config');
        } else if (payload.config) {
          // Alternative structure
          config = payload.config;
          this.log('Found config in payload.config');
        } else if (payload.platform === 'SleepMeSimple') {
          // The payload itself might be the config
          config = payload;
          this.log('Payload itself appears to be the config');
        } else {
          // Last resort - try to find any object with platform property
          const possibleConfig = this.findConfigObject(payload);
          if (possibleConfig) {
            config = possibleConfig;
            this.log('Found config object via deep search');
          } else {
            throw new Error('Could not locate configuration data in payload');
          }
        }
      } else {
        throw new Error('Invalid payload: not an object');
      }
      
      // Validate the extracted config
      if (!config || typeof config !== 'object') {
        throw new Error('Invalid configuration: not an object');
      }
      
      // Debug the extracted config (with API token redacted)
      const debugConfig = {...config};
      if (debugConfig.apiToken) {
        debugConfig.apiToken = '[REDACTED]';
      }
      this.log(`Extracted config: ${JSON.stringify(debugConfig, null, 2)}`);
      
      // Ensure required properties
      config.platform = 'SleepMeSimple';
      config.name = config.name || 'SleepMe Simple';
      
      // Validate API token
      if (!config.apiToken) {
        throw new Error('API token is required');
      }

      // Get the config path
      const configPath = this.getConfigPath();
      if (!configPath) {
        throw new Error('Could not determine config.json path');
      }
      
      this.log(`Will update config at: ${configPath}`);
      
      // Read the existing config file
      const configContent = await fsPromises.readFile(configPath, 'utf8');
      let fullConfig;
      
      try {
        fullConfig = JSON.parse(configContent);
      } catch (parseError) {
        this.log(`Error parsing config.json: ${parseError.message}`, 'error');
        throw new Error(`Invalid config.json syntax: ${parseError.message}`);
      }
      
      // Make sure platforms array exists
      if (!Array.isArray(fullConfig.platforms)) {
        fullConfig.platforms = [];
      }
      
      // Find existing platform config or prepare to add new one
      const platformIndex = fullConfig.platforms.findIndex(p => 
        p && p.platform === 'SleepMeSimple'
      );
      
      this.log(`Platform index in config: ${platformIndex}`);
      
      if (platformIndex >= 0) {
        // Update existing platform config
        fullConfig.platforms[platformIndex] = config;
        this.log('Updated existing platform configuration');
      } else {
        // Add new platform config
        fullConfig.platforms.push(config);
        this.log('Added new platform configuration');
      }
      
      // Write the updated config back to the file
      await fsPromises.writeFile(configPath, JSON.stringify(fullConfig, null, 4), 'utf8');
      
      this.log('Configuration saved successfully to disk');
      
      // Notify UI of update
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
   * Deep search for config object in payload
   * @param {Object} obj - Object to search
   * @returns {Object|null} Found config object or null
   */
  findConfigObject(obj) {
    // Check if this object is a config object
    if (obj && typeof obj === 'object' && obj.platform === 'SleepMeSimple') {
      return obj;
    }
    
    // Recursively search in object properties
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && typeof obj[key] === 'object' && obj[key] !== null) {
        const result = this.findConfigObject(obj[key]);
        if (result) {
          return result;
        }
      }
    }
    
    return null;
  }

  /**
   * Test the SleepMe API connection - FIXED VERSION
   * @param {Object} payload - Connection test payload
   * @returns {Promise<Object>} Connection test result
   */
  async testDeviceConnection(payload) {
    try {
      this.log('Testing device connection');
      
      // Debug payload structure
      this.log(`Test connection payload type: ${typeof payload}`);
      if (payload) {
        this.log(`Test connection payload keys: ${Object.keys(payload).join(', ')}`);
        
        // Check for nested body structure (common in some implementations)
        if (payload.body) {
          this.log(`Test connection payload.body keys: ${Object.keys(payload.body).join(', ')}`);
        }
      }
      
      // Extract apiToken with multiple fallbacks
      let apiToken;
      
      if (!payload) {
        throw new Error('Invalid payload: undefined or null');
      }
      
      if (typeof payload.apiToken === 'string') {
        apiToken = payload.apiToken;
        this.log('Found API token in payload.apiToken');
      } else if (payload.body && typeof payload.body.apiToken === 'string') {
        apiToken = payload.body.apiToken;
        this.log('Found API token in payload.body.apiToken');
      } else {
        // Last attempt: try to find API token in config
        try {
          const configResult = await this.getConfig();
          if (configResult.success && configResult.config && configResult.config.apiToken) {
            apiToken = configResult.config.apiToken;
            this.log('Found API token in stored configuration');
          }
        } catch (configError) {
          this.log(`Error getting config for API token: ${configError.message}`, 'error');
        }
      }
      
      if (!apiToken) {
        throw new Error('API token is required');
      }
      
      // Make API call to test connection
      this.log('Making API request to test connection');
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