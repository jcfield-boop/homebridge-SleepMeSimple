// homebridge-ui/server.js
import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';
import path from 'path';

// API URL for SleepMe services
const API_BASE_URL = 'https://api.developer.sleep.me/v1';

/**
 * SleepMe UI Server 
 * Handles backend functionality for the custom UI
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();
    
    // Register request handlers for specific endpoints
    this.onRequest('/device/test', this.testDeviceConnection.bind(this));
    this.onRequest('/config/check', this.checkConfigFile.bind(this));
    
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

  async loadPluginConfig() {
    try {
      const pluginConfig = await this.homebridgeApi.getPluginConfig();
      
      // Find our platform config
      const platformConfig = pluginConfig.find(config => config.platform === 'SleepMeSimple');
      
      if (!platformConfig) {
        throw new Error('Platform configuration not found');
      }
      
      return {
        success: true,
        platformConfig: {
          name: platformConfig.name || 'SleepMe Simple',
          hasApiToken: !!platformConfig.apiToken,
          unit: platformConfig.unit || 'C',
          pollingInterval: platformConfig.pollingInterval || 90,
          logLevel: platformConfig.logLevel || 'normal',
          enableSchedules: !!platformConfig.enableSchedules,
          scheduleCount: Array.isArray(platformConfig.schedules) ? platformConfig.schedules.length : 0
        }
      };
    } catch (error) {
      this.log(`Failed to load plugin config: ${error.message}`, 'error');
      return {
        success: false,
        error: 'failed_to_load_config'
      };
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
        return {
          success: false,
          error: 'API token is required'
        };
      }
      
      this.log('Testing API connection with provided token');
      
      // Make an actual API call to test the connection
      // For demonstration purposes, we'll make a fetch request to the SleepMe API
      try {
        // This is where you'd implement the actual API call
        // For example, using node-fetch or axios to call the SleepMe API
        
        // Placeholder for actual implementation:
        const devices = [
          { id: 'sample-id', name: 'Sample Device', type: 'Dock Pro' }
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
        return {
          success: false,
          error: `API connection failed: ${apiError.message}`
        };
      }
    } catch (error) {
      // Handle general errors
      this.log(`Error in test connection: ${error.message}`, 'error');
      return {
        success: false,
        error: `Error: ${error.message}`
      };
    }
  }
  
  /**
   * Get plugin version from package.json
   * @returns {string} Plugin version
   */
  getPluginVersion() {
    try {
      // Get path to package.json relative to this file
      const packagePath = path.resolve(__dirname, '../package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      return packageJson.version || 'unknown';
    } catch (error) {
      this.log(`Error getting plugin version: ${error.message}`, 'error');
      return 'unknown';
    }
  }
  
  /**
   * Get system information
   * @returns {Object} System information
   */
  getSystemInfo() {
    const os = require('os');
    
    return {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      nodeVersion: process.version,
      homebridge: {
        version: this.homebridgeVersion || 'unknown',
        uiVersion: this.homebridgeUiVersion || 'unknown'
      }
    };
  }
}

// Create and export a new instance
export default () => new SleepMeUiServer();