// homebridge-ui/server.js
import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// API URL
const API_BASE_URL = 'https://api.developer.sleep.me/v1';

/**
 * SleepMe UI Server class
 * Handles server-side operations for the plugin's custom UI
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    // Must call super first to initialize the parent class
    super();
    
    // Initialize storage
    this.recentLogs = [];
    this.maxLogEntries = 100;
    
    // Register request handlers
    this.onRequest('/device/test', this.testDeviceConnection.bind(this));
    this.onRequest('/logs', this.getServerLogs.bind(this));
    this.onRequest('/config/check', this.checkConfigFile.bind(this));
    
    // Log initialization
    this.log('SleepMe UI Server initialized');
    
    // Immediately check the config file and send result to UI
    setTimeout(() => {
      this.checkConfigAndPush().catch(err => 
        this.logError('Failed initial config check', err)
      );
    }, 1000);
    
    // IMPORTANT: Signal that the server is ready to accept requests
    // This must be called after all request handlers are registered
    this.ready();
  }
  
  /**
   * Check the config file and push status to UI
   * This helps verify if we can read the config.json file directly
   */
  async checkConfigAndPush() {
    try {
      const configResult = await this.checkConfigFile();
      // Push config status to UI as an event
      this.pushEvent('config-status', configResult);
      return configResult;
    } catch (error) {
      this.logError('Failed to check config file', error);
      // Push error event to UI
      this.pushEvent('server-error', {
        message: `Config check failed: ${error.message}`,
        time: new Date().toISOString()
      });
      throw error;
    }
  }
  
  /**
   * Check if we can access the config.json file
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
      
      // Check if our plugin is in the config
      const platforms = config.platforms || [];
      const ourPlatform = platforms.find(p => p.platform === 'SleepMeSimple');
      
      this.log(`Config file checked: Platform found: ${!!ourPlatform}`);
      
      return {
        success: true,
        platformFound: !!ourPlatform,
        platformConfig: ourPlatform ? {
          name: ourPlatform.name || 'SleepMe Simple',
          hasApiToken: !!ourPlatform.apiToken,
          unit: ourPlatform.unit || 'C',
          pollingInterval: ourPlatform.pollingInterval || 90,
          scheduleCount: Array.isArray(ourPlatform.schedules) ? ourPlatform.schedules.length : 0
        } : null,
        path: configPath
      };
    } catch (error) {
      this.logError(`Error checking config file: ${error.message}`, error);
      return {
        success: false,
        error: error.message,
        path: this.homebridgeConfigPath || 'unknown'
      };
    }
  }
  
  // Helper logging methods (keeping the same logic)
  log(message, level = 'info') {
    const entry = {
      timestamp: new Date().toISOString(),
      context: 'SleepMeUI',
      message: message,
      level: level
    };
    
    this.recentLogs.unshift(entry);
    if (this.recentLogs.length > this.maxLogEntries) {
      this.recentLogs.pop();
    }
    
    if (level === 'error') {
      console.error(`[SleepMeUI] ${message}`);
    } else if (level === 'warn') {
      console.warn(`[SleepMeUI] ${message}`);
    } else {
      console.log(`[SleepMeUI] ${message}`);
    }
  }
  
  logError(message, error) {
    const entry = {
      timestamp: new Date().toISOString(),
      context: 'SleepMeUI',
      message: `${message}: ${error.message}`,
      level: 'error',
      stack: error.stack
    };
    
    this.recentLogs.unshift(entry);
    if (this.recentLogs.length > this.maxLogEntries) {
      this.recentLogs.pop();
    }
    
    console.error(`[SleepMeUI] ${message}:`, error);
    
    try {
      this.pushEvent('server-error', { 
        message: error.message,
        time: new Date().toISOString()
      });
    } catch (pushError) {
      // Silent fail on push error
    }
  }
  
  // Rest of implementation remains the same...
}

// Create and export a new instance
(() => {
  return new SleepMeUiServer();
})();