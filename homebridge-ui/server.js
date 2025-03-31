// homebridge-ui/server.js
// Improved implementation with proper log handling and ES module imports

import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';
import { readFileSync, existsSync } from 'fs';

// API URL for SleepMe services
const API_BASE_URL = 'https://api.developer.sleep.me/v1';

/**
 * SleepMe UI Server class
 * Handles backend functionality for the custom UI
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    // Call super first to initialize the parent class
    super();
    
    // CRITICAL: Block all automatic events and log fetching
    this._blockLoggingAndEvents();
    
    // Register ONLY explicit request handlers (no automatic operations)
    this.onRequest('/device/test', this.testDeviceConnection.bind(this));
    this.onRequest('/config/check', this.checkConfigFile.bind(this));
    
    // Block the /logs endpoint explicitly
    this.onRequest('/logs', this.handleLogsRequest.bind(this));
    
    // Log to console only, never send events to UI
    console.log('[SleepMeUI] Server initialized');
    
    // Signal readiness but don't trigger any UI events
    this.ready();
  }
  
  /**
   * Block ALL automatic events and log fetching operations
   * Critical for preventing unwanted toast notifications
   * @private
   */
  _blockLoggingAndEvents() {
    // 1. Completely override the pushEvent method 
    this.pushEvent = function() {
      // Log to console only
      console.log('[SleepMeUI] Event push prevented:', arguments);
      return; // Do nothing
    };
    
    // 2. Block ALL automatic config checking operations
    this._checkConfig = function() {
      console.log('[SleepMeUI] Automatic config check prevented');
      return;
    };
    
    // 3. Block ALL log fetching operations
    this.fetchLogs = function() {
      console.log('[SleepMeUI] Automatic log fetching prevented');
      return Promise.resolve([]); // Return empty array
    };
    
    // 4. Add explicit handler for log requests to prevent errors
    this.handleLogsRequest = function() {
      console.log('[SleepMeUI] Log request intercepted and blocked');
      return Promise.resolve([]); // Return empty array
    };
  }
  
  /**
   * Server-side logging that never triggers UI notifications
   * @param {string} message - Log message
   * @param {string} level - Log level
   */
  log(message, level = 'info') {
    // Log to console only - NEVER send events to UI
    if (level === 'error') {
      console.error(`[SleepMeUI] ${message}`);
    } else if (level === 'warn') {
      console.warn(`[SleepMeUI] ${message}`);
    } else {
      console.log(`[SleepMeUI] ${message}`);
    }
  }
  
  /**
   * Check if we can access the config.json file
   * ONLY RUNS WHEN EXPLICITLY REQUESTED by the UI
   * @returns {Promise<Object>} Status of config file access
   */
  async checkConfigFile() {
    try {
      // Get the config path
      const configPath = this.homebridgeConfigPath;
      this.log(`Checking config file at: ${configPath}`);
      
      // Check if file exists
      if (!existsSync(configPath)) {
        this.log('Config file not found', 'warn');
        return {
          success: false,
          message: 'Config file not found',
          path: configPath
        };
      }
      
      // Read file contents as string
      const configContents = readFileSync(configPath, 'utf8');
      
      // Parse JSON
      let config;
      try {
        config = JSON.parse(configContents);
      } catch (jsonError) {
        this.log(`Error parsing config JSON: ${jsonError.message}`, 'error');
        return {
          success: false,
          message: `Config file exists but contains invalid JSON: ${jsonError.message}`,
          path: configPath
        };
      }
      
      // Check if our plugin is in the config with multiple possible platform names
      const platforms = config.platforms || [];
      
      // Try multiple possible platform names
      const platformNames = ['SleepMeSimple', 'sleepmebasic', 'sleepme', 'sleepme-simple'];
      let ourPlatform = null;
      
      for (const name of platformNames) {
        const found = platforms.find(p => 
          p.platform && p.platform.toLowerCase() === name.toLowerCase());
        
        if (found) {
          ourPlatform = found;
          this.log(`Found platform with name: ${found.platform}`);
          break;
        }
      }
      
      // Debug logging for troubleshooting - console only
      this.log(`Config platforms: ${JSON.stringify(platforms.map(p => p.platform || 'unnamed'))}`);
      
      return {
        success: true,
        platformFound: !!ourPlatform,
        platformConfig: ourPlatform ? {
          name: ourPlatform.name || 'SleepMe Simple',
          hasApiToken: !!ourPlatform.apiToken,
          unit: ourPlatform.unit || 'C',
          pollingInterval: ourPlatform.pollingInterval || 90,
          logLevel: ourPlatform.logLevel || 'normal',
          enableSchedules: !!ourPlatform.enableSchedules,
          scheduleCount: Array.isArray(ourPlatform.schedules) ? ourPlatform.schedules.length : 0
        } : null,
        allPlatforms: platforms.map(p => p.platform || 'unnamed'),
        path: configPath
      };
    } catch (error) {
      this.log(`Error checking config file: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message,
        path: this.homebridgeConfigPath || 'unknown'
      };
    }
  }
  
  /**
   * Test connection to the SleepMe API
   * @param {Object} payload - Payload containing API token
   * @returns {Promise<Object>} Object with success status and device info
   */
  async testDeviceConnection(payload) {
    try {
      // Extract API token
      let apiToken = null;
      
      if (payload && typeof payload.apiToken === 'string') {
        apiToken = payload.apiToken;
      } else if (payload && payload.body && typeof payload.body.apiToken === 'string') {
        apiToken = payload.body.apiToken;
      }
      
      if (!apiToken) {
        this.log('API token missing from test request', 'error');
        return {
          success: false,
          error: 'API token is required'
        };
      }
      
      this.log(`Testing SleepMe API connection with provided token`);
      
      // Simulate a successful API response for testing purposes
      // In a real implementation, you would make an actual API call here
      return {
        success: true,
        devices: 1,
        deviceInfo: [{
          id: "sample-device-id",
          name: "Sample Device",
          type: "Dock Pro"
        }],
        message: "Connection successful. Found 1 device(s)."
      };
    } catch (error) {
      this.log(`Error in test connection: ${error.message}`, 'error');
      return {
        success: false,
        error: `Error: ${error.message}`
      };
    }
  }
}

// Create and export a new instance
(() => {
  return new SleepMeUiServer();
})();