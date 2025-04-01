// homebridge-ui/server.js
import { HomebridgePluginUiServer, RequestError } from '@homebridge/plugin-ui-utils';
import { readFileSync, existsSync, writeFileSync } from 'fs';
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
    
    // Prevent automatic events immediately after initialization
    this._preventAutomaticEvents();
    
    // Existing request handlers
    this.onRequest('/device/test', this.testDeviceConnection.bind(this));
    this.onRequest('/config/check', this.checkConfigFile.bind(this));
    
    // NEW: Added configuration management endpoints
    this.onRequest('/config/load', this.loadConfig.bind(this));
    this.onRequest('/config/save', this.saveConfig.bind(this));
    this.onRequest('/config/validate', this.validateConfig.bind(this));
    
    // Simple console logging without UI events
    console.log('[SleepMeUI] Server initialized');
    
    // Signal readiness
    this.ready();
  }
  
  // ... [All previous methods remain unchanged]

  /**
   * Load the SleepMe Simple platform configuration
   * @returns {Promise<Object>} Configuration object
   */
  async loadConfig() {
    try {
      const configPath = this.homebridgeConfigPath;
      
      // Read and parse config file
      const configContent = readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      
      // Find SleepMe Simple platform configuration
      const platformNames = ['SleepMeSimple', 'sleepmebasic', 'sleepme', 'sleepme-simple'];
      const platformConfig = config.platforms?.find(platform => 
        platform && platformNames.some(name => 
          platform.platform.toLowerCase() === name.toLowerCase()
        )
      );
      
      if (!platformConfig) {
        return {
          success: false,
          error: 'SleepMe Simple platform configuration not found'
        };
      }
      
      return {
        success: true,
        config: platformConfig
      };
    } catch (error) {
      console.error('Config load error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save configuration for SleepMe Simple platform
   * @param {Object} payload - Configuration to save
   * @returns {Promise<Object>} Save result
   */
  async saveConfig(payload) {
    try {
      if (!payload || !payload.config) {
        return {
          success: false,
          error: 'Invalid configuration payload'
        };
      }
      
      const configPath = this.homebridgeConfigPath;
      
      // Read current config
      const configContent = readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      
      // Find existing platform config index
      const platformNames = ['SleepMeSimple', 'sleepmebasic', 'sleepme', 'sleepme-simple'];
      const platformIndex = config.platforms.findIndex(platform => 
        platform && platformNames.some(name => 
          platform.platform.toLowerCase() === name.toLowerCase()
        )
      );
      
      // Prepare updated platform config
      const updatedPlatformConfig = {
        ...payload.config,
        platform: 'SleepMeSimple'  // Ensure consistent platform name
      };
      
      // Update or add platform config
      if (platformIndex !== -1) {
        config.platforms[platformIndex] = updatedPlatformConfig;
      } else {
        config.platforms.push(updatedPlatformConfig);
      }
      
      // Write updated config
      writeFileSync(configPath, JSON.stringify(config, null, 2));
      
      return {
        success: true,
        config: updatedPlatformConfig
      };
    } catch (error) {
      console.error('Config save error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate configuration before saving
   * @param {Object} payload - Configuration to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateConfig(payload) {
    try {
      const config = payload.config;
      const errors = [];

      // Validate required fields
      if (!config.apiToken) {
        errors.push('API Token is required');
      }

      // Temperature unit validation
      const validUnits = ['C', 'F'];
      if (config.unit && !validUnits.includes(config.unit)) {
        errors.push('Invalid temperature unit. Must be C or F.');
      }

      // Polling interval validation
      if (config.pollingInterval) {
        const interval = Number(config.pollingInterval);
        if (isNaN(interval) || interval < 60 || interval > 300) {
          errors.push('Polling interval must be between 60 and 300 seconds');
        }
      }

      // Schedule validation if present
      if (config.schedules && Array.isArray(config.schedules)) {
        config.schedules.forEach((schedule, index) => {
          if (!schedule.type || !schedule.time || !schedule.temperature) {
            errors.push(`Schedule at index ${index} is missing required fields`);
          }
        });
      }

      return {
        success: errors.length === 0,
        errors: errors,
        config: errors.length === 0 ? config : null
      };
    } catch (error) {
      console.error('Config validation error:', error);
      return {
        success: false,
        errors: [error.message]
      };
    }
  }
}

// Create and export a new instance
(() => {
  return new SleepMeUiServer();
})();