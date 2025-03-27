// homebridge-ui/server.js
import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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
      // Register request handlers
      this.onRequest('/config', this.getConfig.bind(this));
      this.onRequest('/saveConfig', this.saveConfig.bind(this));
      this.onRequest('/device/test', this.testDeviceConnection.bind(this));
      this.onRequest('/logs', this.getServerLogs.bind(this));
      
      // Signal that server is ready
      this.ready();
    } catch (err) {
      console.error('Error in constructor:', err);
      // Just make sure we call ready even on error
      try {
        this.ready();
      } catch (readyError) {
        // Cannot do much if ready fails
      }
    }
  }

  /**
   * Get the current plugin configuration
   * @returns {Promise<Object>} Configuration object with success status and config data
   */
  async getConfig() {
    try {
      // Get the path to config.json
      const configPath = this.api.user.configPath();
      
      if (!configPath || !fs.existsSync(configPath)) {
        throw new Error(`Config file not found at path: ${configPath}`);
      }
      
      // Read and parse the config file
      const configData = fs.readFileSync(configPath, 'utf8');
      const homebridgeConfig = JSON.parse(configData);
      
      // Find our platform configuration
      let platformConfig = {};
      if (homebridgeConfig && Array.isArray(homebridgeConfig.platforms)) {
        const platform = homebridgeConfig.platforms.find(p => 
          p && p.platform === 'SleepMeSimple'
        );
        
        if (platform) {
          platformConfig = platform;
        }
      }
      
      return {
        success: true,
        config: platformConfig
      };
    } catch (error) {
      console.error('Error getting config:', error);
      return {
        success: false,
        error: `Failed to retrieve configuration: ${error.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Save the plugin configuration
   * @param {Object} payload - Configuration payload
   * @returns {Promise<Object>} Save result
   */
  async saveConfig(payload) {
    try {
      // Extract config from payload - handle all common formats
      let config = null;
      
      // Try different payload structures
      if (payload && payload.body && payload.body.config) {
        config = payload.body.config;
      } else if (payload && payload.config) {
        config = payload.config;
      } else if (payload && payload.platform === 'SleepMeSimple') {
        config = payload;
      }
      
      if (!config) {
        throw new Error('Invalid configuration data in payload');
      }
      
      // Ensure required platform properties
      config.platform = 'SleepMeSimple';
      config.name = config.name || 'SleepMe Simple';
      
      // Validate API token
      if (!config.apiToken) {
        throw new Error('API token is required');
      }

      // Get the path to config.json
      const configPath = this.api.user.configPath();
      
      if (!configPath || !fs.existsSync(configPath)) {
        throw new Error(`Config file not found at path: ${configPath}`);
      }
      
      // Read and parse the config file
      const configData = fs.readFileSync(configPath, 'utf8');
      const homebridgeConfig = JSON.parse(configData);
      
      // Ensure platforms array exists
      if (!homebridgeConfig.platforms) {
        homebridgeConfig.platforms = [];
      }
      
      // Find our platform configuration
      const platformIndex = homebridgeConfig.platforms.findIndex(p => 
        p && p.platform === 'SleepMeSimple'
      );
      
      if (platformIndex >= 0) {
        // Update existing platform config
        homebridgeConfig.platforms[platformIndex] = config;
      } else {
        // Add new platform config
        homebridgeConfig.platforms.push(config);
      }
      
      // Write the updated config back to file
      fs.writeFileSync(configPath, JSON.stringify(homebridgeConfig, null, 4), 'utf8');
      
      // Notify UI of update
      this.pushEvent('config-updated', { timestamp: Date.now() });
      
      return {
        success: true,
        message: 'Configuration saved successfully'
      };
    } catch (error) {
      console.error('Error saving config:', error);
      return {
        success: false,
        error: `Failed to save configuration: ${error.message || 'Unknown error'}`
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
      // Extract API token with multiple fallbacks
      let apiToken = null;
      
      // Try different payload structures
      if (payload && typeof payload.apiToken === 'string') {
        apiToken = payload.apiToken;
      } else if (payload && payload.body && typeof payload.body.apiToken === 'string') {
        apiToken = payload.body.apiToken;
      }
      
      // If no API token found in payload, try to get from stored config
      if (!apiToken) {
        const configResult = await this.getConfig();
        if (configResult.success && configResult.config && configResult.config.apiToken) {
          apiToken = configResult.config.apiToken;
        }
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
      
      return {
        success: true,
        devices: devices.length,
        message: `Connection successful. Found ${devices.length} device(s).`
      };
    } catch (error) {
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.message || error.message;
      
      return {
        success: false,
        error: `API Error (${statusCode || 'unknown'}): ${errorMessage}`
      };
    }
  }

  /**
   * Get server logs
   * @returns {Promise<Object>} Logs data
   */
  async getServerLogs() {
    try {
      // Get the path to the Homebridge storage directory
      const storagePath = this.api.user.storagePath();
      
      // Path to the log file
      const logPath = path.join(storagePath, 'logs', 'homebridge.log');
      
      let logs = [];
      
      if (fs.existsSync(logPath)) {
        // Read the log file
        const logData = fs.readFileSync(logPath, 'utf8');
        
        // Split into lines and take the last 100
        const allLines = logData.split('\n').filter(line => line.trim());
        const recentLines = allLines.slice(Math.max(0, allLines.length - 100));
        
        // Parse log lines
        logs = recentLines.map(line => {
          // Try to extract timestamp and message
          const timestamp = new Date().toLocaleString(); // Default if parsing fails
          let message = line;
          let context = 'homebridge';
          
          // Try to extract timestamp in standard format [2023-03-27 10:15:30]
          const timestampMatch = line.match(/\[(.*?)\]/);
          if (timestampMatch && timestampMatch[1]) {
            try {
              const parsedTimestamp = new Date(timestampMatch[1]);
              if (!isNaN(parsedTimestamp.getTime())) {
                message = line.substring(timestampMatch[0].length).trim();
              }
            } catch (e) {
              // Parsing failed, use defaults
            }
          }
          
          // Try to extract context like [SleepMeSimple]
          const contextMatch = message.match(/\[(.*?)\]/);
          if (contextMatch && contextMatch[1]) {
            context = contextMatch[1];
            message = message.substring(contextMatch[0].length).trim();
          }
          
          return {
            timestamp,
            context,
            message,
            level: line.includes('ERROR') ? 'error' : 
                  line.includes('WARN') ? 'warn' : 'info'
          };
        });
      }
      
      return {
        success: true,
        logs
      };
    } catch (error) {
      console.error('Error getting logs:', error);
      return {
        success: false,
        error: `Failed to retrieve logs: ${error.message || 'Unknown error'}`
      };
    }
  }
}

// Export the server instance
export default new SleepMeUiServer();