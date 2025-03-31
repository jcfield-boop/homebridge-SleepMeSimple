// homebridge-ui/server.js - Fixed version to prevent automatic checks

import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';

// API URL
const API_BASE_URL = 'https://api.developer.sleep.me/v1';

/**
 * SleepMe UI Server class
 * Fixed to prevent automatic notifications and events
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    // Call super first to initialize the parent class
    super();
    
    // CRITICAL: Immediately block all automatic events by overriding methods
    this._blockAutomaticEvents();
    
    // Register ONLY explicit request handlers (no automatic operations)
    this.onRequest('/device/test', this.testDeviceConnection.bind(this));
    this.onRequest('/config/check', this.checkConfigFile.bind(this));
    
    // Log to console only, never send events to UI
    console.log('[SleepMeUI] Server initialized');
    
    // Signal readiness but don't trigger any UI events
    this.ready();
  }
  
  /**
   * Block ALL automatic events by completely overriding event-triggering methods
   * This is the most comprehensive approach to prevent unwanted UI notifications
   * @private
   */
  _blockAutomaticEvents() {
    // 1. Completely disable the pushEvent method 
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
    
    // 4. Override any other methods that might trigger events
    if (this._setupPolling) {
      this._setupPolling = function() {
        console.log('[SleepMeUI] Automatic polling prevented');
        return;
      };
    }
    
    // 5. Override any initialization methods that might trigger events
    if (this.init) {
      const originalInit = this.init;
      this.init = function() {
        console.log('[SleepMeUI] Intercepted init call');
        // Call original but prevent any automatic operations
        const result = originalInit.apply(this, arguments);
        // Re-disable events after init
        this._blockAutomaticEvents();
        return result;
      };
    }
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
      if (!fs.existsSync(configPath)) {
        this.log('Config file not found', 'warn');
        return {
          success: false,
          message: 'Config file not found',
          path: configPath
        };
      }
      
      // Read file contents as string
      const configContents = fs.readFileSync(configPath, 'utf8');
      
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
      let devices = [];
      if (Array.isArray(response.data)) {
        devices = response.data;
      } else if (response.data && response.data.devices && Array.isArray(response.data.devices)) {
        devices = response.data.devices;
      }
      
      // Extract device info
      const deviceInfo = devices.map(device => ({
        id: device.id,
        name: device.name || 'Unnamed Device',
        type: this.detectDeviceType(device)
      }));
      
      return {
        success: true,
        devices: devices.length,
        deviceInfo: deviceInfo,
        message: `Connection successful. Found ${devices.length} device(s).`
      };
    } catch (error) {
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.message || error.message;
      
      this.log(`API connection test failed with status ${statusCode}`, 'error');
      
      return {
        success: false,
        error: `API Error (${statusCode || 'unknown'}): ${errorMessage}`
      };
    }
  }
  
  /**
   * Helper method to detect device type from API response
   * @param {Object} device - Device data from API
   * @returns {string} Detected device type
   */
  detectDeviceType(device) {
    if (!device) return 'Unknown';
    
    // Check attachments first
    if (Array.isArray(device.attachments)) {
      if (device.attachments.includes('CHILIPAD_PRO')) return 'ChiliPad Pro';
      if (device.attachments.includes('OOLER')) return 'OOLER';
      if (device.attachments.includes('DOCK_PRO')) return 'Dock Pro';
    }
    
    // Check model field 
    if (device.model) {
      const model = String(device.model);
      if (model.includes('DP')) return 'Dock Pro';
      if (model.includes('OL')) return 'OOLER';
      if (model.includes('CP')) return 'ChiliPad';
    }
    
    // Check about.model if available
    if (device.about && device.about.model) {
      const model = String(device.about.model);
      if (model.includes('DP')) return 'Dock Pro';
      if (model.includes('OL')) return 'OOLER';
      if (model.includes('CP')) return 'ChiliPad';
    }
    
    return 'Unknown SleepMe Device';
  }
}

// Create and export a new instance
(() => {
  return new SleepMeUiServer();
})();