// homebridge-ui/server.js
const { HomebridgePluginUiServer } = require('@homebridge/plugin-ui-utils');
const fs = require('fs');
const path = require('path');

class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();
    
    console.log('[SleepMeUI] Initializing server...');
    
    // Log important paths immediately to help with debugging
    this.logPaths();
    
    // Register request handlers
    this.onRequest('/config/check', this.checkConfigFile.bind(this));
    this.onRequest('/config/raw', this.getRawConfig.bind(this));
    this.onRequest('/config/validate', this.validateConfig.bind(this));
    this.onRequest('/device/test', this.testDeviceConnection.bind(this));
    
    // Signal readiness
    this.ready();
    console.log('[SleepMeUI] Server initialized and ready');
  }
  
  logPaths() {
    console.log('[SleepMeUI] Homebridge paths:');
    console.log(`  - Config path: ${this.homebridgeConfigPath || 'unknown'}`);
    console.log(`  - Storage path: ${this.homebridgeStoragePath || 'unknown'}`);
    console.log(`  - UI version: ${this.homebridgeUiVersion || 'unknown'}`);
    
    // Check if the config file exists and is readable
    if (this.homebridgeConfigPath) {
      try {
        fs.accessSync(this.homebridgeConfigPath, fs.constants.R_OK);
        console.log('[SleepMeUI] ✓ Config file exists and is readable');
      } catch (error) {
        console.error('[SleepMeUI] ✗ Config file access error:', error.message);
      }
    }
  }
  
  async checkConfigFile() {
    console.log('[SleepMeUI] Checking config file...');
    try {
      if (!this.homebridgeConfigPath) {
        console.error('[SleepMeUI] Homebridge config path is not defined');
        return {
          success: false,
          error: 'Homebridge config path is not defined',
          path: 'unknown'
        };
      }
      
      console.log('[SleepMeUI] Config path:', this.homebridgeConfigPath);
      
      // Check if file exists
      if (!fs.existsSync(this.homebridgeConfigPath)) {
        console.error('[SleepMeUI] Config file does not exist');
        return {
          success: false,
          error: 'Config file does not exist',
          path: this.homebridgeConfigPath
        };
      }
      
      // Check if we can read it
      try {
        fs.accessSync(this.homebridgeConfigPath, fs.constants.R_OK);
      } catch (error) {
        console.error('[SleepMeUI] Config file is not readable:', error.message);
        return {
          success: false,
          error: `Config file is not readable: ${error.message}`,
          path: this.homebridgeConfigPath
        };
      }
      
      // Read and parse config
      const configContents = fs.readFileSync(this.homebridgeConfigPath, 'utf8');
      let config;
      
      try {
        config = JSON.parse(configContents);
      } catch (error) {
        console.error('[SleepMeUI] Config file is not valid JSON:', error.message);
        return {
          success: false,
          error: `Config file is not valid JSON: ${error.message}`,
          path: this.homebridgeConfigPath
        };
      }
      
      // Basic validation
      if (!config || typeof config !== 'object') {
        console.error('[SleepMeUI] Config is not an object');
        return {
          success: false,
          error: 'Config is not an object',
          content: typeof config
        };
      }
      
      // Check for platforms array
      if (!Array.isArray(config.platforms)) {
        console.warn('[SleepMeUI] No platforms array in config');
        return {
          success: true,
          platformFound: false,
          platforms: 0,
          path: this.homebridgeConfigPath
        };
      }
      
      // Look for our platform
      const platformNames = ['SleepMeSimple', 'sleepmebasic', 'sleepme', 'sleepme-simple'];
      const ourPlatform = config.platforms.find(p => 
        p && p.platform && platformNames.includes(p.platform.toLowerCase())
      );
      
      if (!ourPlatform) {
        console.warn('[SleepMeUI] Our platform not found in config');
        const availablePlatforms = config.platforms
          .filter(p => p && p.platform)
          .map(p => p.platform);
        
        return {
          success: true,
          platformFound: false,
          availablePlatforms,
          platforms: config.platforms.length,
          path: this.homebridgeConfigPath
        };
      }
      
      console.log('[SleepMeUI] Platform found:', ourPlatform.platform);
      
      // Return platform details
      return {
        success: true,
        platformFound: true,
        platformName: ourPlatform.platform,
        platformConfig: {
          name: ourPlatform.name || 'SleepMe Simple',
          hasApiToken: !!ourPlatform.apiToken,
          unit: ourPlatform.unit || 'C',
          pollingInterval: ourPlatform.pollingInterval || 90,
          logLevel: ourPlatform.logLevel || 'normal',
          enableSchedules: !!ourPlatform.enableSchedules,
          scheduleCount: Array.isArray(ourPlatform.schedules) ? ourPlatform.schedules.length : 0
        },
        path: this.homebridgeConfigPath
      };
    } catch (error) {
      console.error('[SleepMeUI] Error checking config file:', error);
      return {
        success: false,
        error: `Unexpected error: ${error.message}`,
        stack: error.stack,
        path: this.homebridgeConfigPath || 'unknown'
      };
    }
  }
  
  // Get raw config for debugging
  async getRawConfig() {
    try {
      if (!this.homebridgeConfigPath || !fs.existsSync(this.homebridgeConfigPath)) {
        return { success: false, error: 'Config file not found' };
      }
      
      const configContents = fs.readFileSync(this.homebridgeConfigPath, 'utf8');
      const config = JSON.parse(configContents);
      
      // Return sanitized config (without sensitive data)
      return {
        success: true,
        configStructure: {
          hasPlatforms: !!config.platforms,
          platformCount: config.platforms?.length || 0,
          platformNames: config.platforms?.map(p => p.platform).filter(Boolean) || [],
          hasBridge: !!config.bridge,
          hasAccessories: !!config.accessories,
          accessoryCount: config.accessories?.length || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // More extensive validation
  async validateConfig() {
    try {
      if (!this.homebridgeConfigPath || !fs.existsSync(this.homebridgeConfigPath)) {
        return { success: false, error: 'Config file not found' };
      }
      
      const configContents = fs.readFileSync(this.homebridgeConfigPath, 'utf8');
      let config;
      
      try {
        config = JSON.parse(configContents);
      } catch (error) {
        return { success: false, error: `Invalid JSON: ${error.message}` };
      }
      
      // Check platforms array
      if (!config.platforms || !Array.isArray(config.platforms)) {
        return { 
          success: false, 
          error: 'No platforms array in config',
          fix: 'Add a platforms array to your config.json'
        };
      }
      
      // Look for our platform
      const platformNames = ['SleepMeSimple', 'sleepmebasic', 'sleepme', 'sleepme-simple'];
      const ourPlatform = config.platforms.find(p => 
        p && p.platform && platformNames.includes(p.platform.toLowerCase())
      );
      
      if (!ourPlatform) {
        return { 
          success: false, 
          error: 'SleepMe platform not found in config',
          availablePlatforms: config.platforms.map(p => p.platform).filter(Boolean),
          fix: 'Add the SleepMeSimple platform to your config.json'
        };
      }
      
      // Check required fields
      const validation = {
        hasApiToken: !!ourPlatform.apiToken,
        hasName: !!ourPlatform.name,
        correctPlatformName: ourPlatform.platform === 'SleepMeSimple',
        enableSchedules: !!ourPlatform.enableSchedules,
        validSchedules: Array.isArray(ourPlatform.schedules)
      };
      
      const issues = [];
      
      if (!validation.hasApiToken) {
        issues.push('Missing API token');
      }
      
      if (!validation.correctPlatformName) {
        issues.push(`Platform name is "${ourPlatform.platform}" instead of "SleepMeSimple"`);
      }
      
      if (validation.enableSchedules && !validation.validSchedules) {
        issues.push('Schedules are enabled but schedules array is missing');
      }
      
      return {
        success: issues.length === 0,
        validation,
        issues: issues.length > 0 ? issues : null,
        platform: ourPlatform.platform
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Device test endpoint handler
  async testDeviceConnection(payload) {
    console.log('[SleepMeUI] Testing device connection...');
    try {
      const apiToken = payload.apiToken;
      
      if (!apiToken) {
        return {
          success: false,
          error: 'API token is required'
        };
      }
      
      // Here you would typically make an API call to SleepMe's service
      // For testing, we'll just return mock data
      return {
        success: true,
        devices: 2,
        deviceInfo: [
          { id: 'mock-device-1', name: 'Bedroom SleepMe', model: 'Dock Pro' },
          { id: 'mock-device-2', name: 'Guest Room SleepMe', model: 'OOLER' }
        ]
      };
    } catch (error) {
      console.error('[SleepMeUI] Device test error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export the UiServer
(() => {
  return new SleepMeUiServer();
})();