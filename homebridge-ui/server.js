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
   * This method reads the plugin configuration directly from the Homebridge config.json file
   * 
   * @returns {Promise<Object>} Configuration object with success status and config data
   */
  async getConfig() {
    try {
      this.log('Retrieving plugin configuration');
      
      // Try to get the config.json path from Homebridge
      const configPath = this.getConfigPath();
      
      if (!configPath) {
        this.log('Could not determine config.json path', 'error');
        return {
          success: false,
          error: 'Could not determine config.json path'
        };
      }
      
      this.log(`Reading config from: ${configPath}`);
      
      // Read and parse the config.json file
      const configFile = await fsPromises.readFile(configPath, 'utf8');
      const config = JSON.parse(configFile);
      
      this.log(`Successfully read config.json, file size: ${configFile.length} bytes`);
      
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
      
      this.log(`Extracted platform config: ${JSON.stringify(platformConfig, null, 2)}`);
      
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
   * This attempts multiple methods to find the config path
   * 
   * @returns {string|null} Path to config.json or null if not found
   */
  getConfigPath() {
    try {
      // First attempt: Use HomebridgePluginUiServer methods if available
      if (typeof this.homebridgeStoragePath === 'function') {
        const storagePath = this.homebridgeStoragePath();
        this.log(`Storage path from homebridgeStoragePath(): ${storagePath}`);
        return path.join(storagePath, 'config.json');
      }
      
      // Second attempt: Check common Homebridge paths
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
          // Check if file exists (synchronously for simplicity)
          const stats = fs.statSync(configPath);
          if (stats.isFile()) {
            this.log(`Found config.json at: ${configPath}`);
            return configPath;
          }
        } catch (e) {
          // Path doesn't exist, continue to next one
          this.log(`Path ${configPath} does not exist or is not accessible`);
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
   * Save the plugin configuration
   * @param {Object} payload - Configuration payload
   * @returns {Promise<Object>} Save result
   */

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
      throw new Error('Missing or invalid payload');
    }
    
    // Get the new config from the payload
    const newConfig = payload.config;
    
    this.log(`Received config to save: ${JSON.stringify(newConfig, null, 2)}`, 'info');
    
    // Ensure required platform properties are set
    newConfig.platform = newConfig.platform || 'SleepMeSimple';
    newConfig.name = newConfig.name || 'SleepMe Simple';
    
    // Validate API token
    if (!newConfig.apiToken) {
      throw new Error('API token is required');
    }

    // Convert enableSchedules to proper boolean if it's a string
    if (typeof newConfig.enableSchedules === 'string') {
      newConfig.enableSchedules = newConfig.enableSchedules === 'true';
    }

    // Validate schedules
    if (newConfig.enableSchedules === true) {
      if (!Array.isArray(newConfig.schedules)) {
        newConfig.schedules = [];
      }
      
      // Clean and validate each schedule
      newConfig.schedules = newConfig.schedules.map(schedule => ({
        type: String(schedule.type || 'Everyday'),
        time: String(schedule.time || '00:00'),
        temperature: Number(schedule.temperature || 21),
        unit: String(schedule.unit || 'C'),
        ...(schedule.type === 'Specific Day' ? { day: Number(schedule.day) } : {}),
        ...(schedule.description ? { description: String(schedule.description) } : {})
      }));
    } else if (newConfig.enableSchedules === false) {
      // Explicitly remove schedules when disabled
      delete newConfig.schedules;
    }
    
    // Ensure pollingInterval is a number
    if (newConfig.pollingInterval) {
      newConfig.pollingInterval = parseInt(String(newConfig.pollingInterval), 10);
    }
    
    // Get the current Homebridge config.json path
    // Use the official Homebridge method provided by the plugin-ui-utils
    const configPath = this.homebridgeConfigPath;
    
    if (!configPath) {
      throw new Error('Could not determine config.json path');
    }
    
    this.log(`Reading current config from: ${configPath}`);
    
    // Read and parse the config.json file
    const configFile = await fsPromises.readFile(configPath, 'utf8');
    let homebridgeConfig = JSON.parse(configFile);
    
    // Ensure platforms array exists
    if (!Array.isArray(homebridgeConfig.platforms)) {
      homebridgeConfig.platforms = [];
    }
    
    // Find the index of our platform in the config
    const platformIndex = homebridgeConfig.platforms.findIndex(
      p => p && p.platform === 'SleepMeSimple'
    );
    
    if (platformIndex >= 0) {
      // Update existing platform configuration
      this.log(`Updating existing platform at index ${platformIndex}`);
      homebridgeConfig.platforms[platformIndex] = newConfig;
    } else {
      // Add new platform configuration
      this.log('Adding new platform configuration');
      homebridgeConfig.platforms.push(newConfig);
    }
    
    // Write updated config back to file
    this.log('Writing updated config to file');
    await fsPromises.writeFile(configPath, JSON.stringify(homebridgeConfig, null, 4), 'utf8');
    
    this.log('Configuration saved successfully');
    
    // Push event to UI to notify of config change
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
export default new SleepMeUiServer();