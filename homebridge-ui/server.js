// homebridge-ui/server.js
const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// API URL
const API_BASE_URL = 'https://api.developer.sleep.me/v1';

/**
 * SleepMe UI Server class
 * Handles server-side operations for the plugin's custom UI
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();
    
    // Store recent logs for UI display
    this.recentLogs = [];
    this.maxLogEntries = 100;
    
    try {
      // Register request handlers
      this.onRequest('/config', this.getConfig.bind(this));
      this.onRequest('/saveConfig', this.saveConfig.bind(this));
      this.onRequest('/device/test', this.testDeviceConnection.bind(this));
      this.onRequest('/logs', this.getServerLogs.bind(this));
      
      // Log successful initialization
      this.log('SleepMe UI Server initialized successfully');
      
      // Signal that server is ready
      this.ready();
    } catch (err) {
      this.logError('Error initializing UI server', err);
      // Make sure we call ready even on error
      try {
        this.ready();
      } catch (readyError) {
        // Cannot do much if ready fails
        console.error('Failed to signal server ready state:', readyError);
      }
    }
  }

  /**
   * Enhanced logging method with error tracking
   * @param {string} message - Log message
   * @param {string} level - Log level (info, warn, error)
   */
  log(message, level = 'info') {
    // Create log entry
    const entry = {
      timestamp: new Date().toISOString(),
      context: 'SleepMeUI',
      message: message,
      level: level
    };
    
    // Add to recent logs (maintaining fixed size)
    this.recentLogs.unshift(entry);
    if (this.recentLogs.length > this.maxLogEntries) {
      this.recentLogs.pop();
    }
    
    // Output to console based on level
    if (level === 'error') {
      console.error(`[SleepMeUI] ${message}`);
    } else if (level === 'warn') {
      console.warn(`[SleepMeUI] ${message}`);
    } else {
      console.log(`[SleepMeUI] ${message}`);
    }
  }
  
  /**
   * Error logging helper with stack trace
   * @param {string} message - Error message
   * @param {Error} error - Error object
   */
  logError(message, error) {
    // Create error log entry with stack trace
    const entry = {
      timestamp: new Date().toISOString(),
      context: 'SleepMeUI',
      message: `${message}: ${error.message}`,
      level: 'error',
      stack: error.stack
    };
    
    // Add to recent logs
    this.recentLogs.unshift(entry);
    if (this.recentLogs.length > this.maxLogEntries) {
      this.recentLogs.pop();
    }
    
    // Output to console
    console.error(`[SleepMeUI] ${message}:`, error);
    
    // Push error event to UI for immediate notification
    try {
      this.pushEvent('server-error', { 
        message: error.message,
        time: new Date().toISOString()
      });
    } catch (pushError) {
      // Silent fail on push error
    }
  }

  /**
   * Get the current plugin configuration
   * @returns {Promise<Object>} Configuration object with success status and config data
   */
  async getConfig() {
    try {
      this.log('Getting plugin configuration');
      
      // Get the path to config.json - FIXED: use homebridgeConfigPath instead of api.user.configPath
      const configPath = this.homebridgeConfigPath;
      
      if (!configPath || !fs.existsSync(configPath)) {
        throw new Error(`Config file not found at path: ${configPath}`);
      }
      
      // Read and parse the config file
      const configData = fs.readFileSync(configPath, 'utf8');
      let homebridgeConfig;
      
      try {
        homebridgeConfig = JSON.parse(configData);
      } catch (parseError) {
        throw new Error(`Failed to parse config.json: ${parseError.message}`);
      }
      
      // Find our platform configuration
      let platformConfig = {};
      if (homebridgeConfig && Array.isArray(homebridgeConfig.platforms)) {
        const platform = homebridgeConfig.platforms.find(p => 
          p && p.platform === 'SleepMeSimple'
        );
        
        if (platform) {
          platformConfig = platform;
          this.log(`Found existing SleepMeSimple platform configuration`);
        } else {
          this.log('No existing SleepMeSimple platform found in config.json', 'warn');
        }
      } else {
        this.log('No platforms array found in config.json', 'warn');
      }
      
      return {
        success: true,
        config: platformConfig
      };
    } catch (error) {
      this.logError('Error getting config', error);
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
      
      this.log(`Saving configuration: ${JSON.stringify(config, null, 2)}`);
      
      // Ensure required platform properties
      config.platform = 'SleepMeSimple';
      config.name = config.name || 'SleepMe Simple';
      
      // Validate API token
      if (!config.apiToken) {
        throw new Error('API token is required');
      }
      
      // Validate polling interval range
      const pollingInterval = parseInt(config.pollingInterval, 10);
      if (isNaN(pollingInterval) || pollingInterval < 60 || pollingInterval > 300) {
        throw new Error('Polling interval must be between 60 and 300 seconds');
      }
      
      // Get the path to config.json - FIXED: use homebridgeConfigPath instead of api.user.configPath
      const configPath = this.homebridgeConfigPath;
      
      if (!configPath || !fs.existsSync(configPath)) {
        throw new Error(`Config file not found at path: ${configPath}`);
      }
      
      // Read and parse the config file
      const configData = fs.readFileSync(configPath, 'utf8');
      let homebridgeConfig;
      
      try {
        homebridgeConfig = JSON.parse(configData);
      } catch (parseError) {
        throw new Error(`Failed to parse config.json: ${parseError.message}`);
      }
      
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
        this.log('Updated existing SleepMeSimple platform configuration');
      } else {
        // Add new platform config
        homebridgeConfig.platforms.push(config);
        this.log('Added new SleepMeSimple platform configuration');
      }
      
      // Create backup of current config
      try {
        const backupPath = `${configPath}.backup`;
        fs.writeFileSync(backupPath, configData, 'utf8');
        this.log(`Created backup of previous config at ${backupPath}`);
      } catch (backupError) {
        this.log(`Failed to create config backup: ${backupError.message}`, 'warn');
        // Continue despite backup failure
      }
      
      // Write the updated config back to file
      fs.writeFileSync(configPath, JSON.stringify(homebridgeConfig, null, 4), 'utf8');
      this.log('Successfully wrote configuration to disk');
      
      // Notify UI of update
      this.pushEvent('config-updated', { timestamp: Date.now() });
      
      return {
        success: true,
        message: 'Configuration saved successfully'
      };
    } catch (error) {
      this.logError('Error saving config', error);
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
      
      // Extract device info for better user feedback
      const deviceInfo = devices.map(device => ({
        id: device.id,
        name: device.name || 'Unnamed Device',
        type: this.detectDeviceType(device)
      }));
      
      this.log(`Connection test successful. Found ${devices.length} device(s)`);
      
      return {
        success: true,
        devices: devices.length,
        deviceInfo: deviceInfo,
        message: `Connection successful. Found ${devices.length} device(s).`
      };
    } catch (error) {
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.message || error.message;
      
      this.logError(`API connection test failed with status ${statusCode}`, error);
      
      return {
        success: false,
        error: `API Error (${statusCode || 'unknown'}): ${errorMessage}`
      };
    }
  }
  
  /**
   * Detect device type from API response
   * @param {Object} device - Device data from API
   * @returns {string} Device type
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

  /**
   * Get server logs
   * @returns {Promise<Object>} Logs data
   */
  async getServerLogs() {
    try {
      // First include our internal UI server logs
      const uiLogs = [...this.recentLogs];
      
      // Get the path to the Homebridge storage directory
      const storagePath = this.homebridgeStoragePath;
      
      // Path to the log file
      const logPath = path.join(storagePath, 'logs', 'homebridge.log');
      
      let systemLogs = [];
      
      if (fs.existsSync(logPath)) {
        // Read the log file
        const logData = fs.readFileSync(logPath, 'utf8');
        
        // Split into lines and take the last 200
        const allLines = logData.split('\n').filter(line => line.trim());
        const recentLines = allLines.slice(Math.max(0, allLines.length - 200));
        
        // Only include SleepMe related logs
        const sleepMeLines = recentLines.filter(line => 
          line.includes('SleepMe') || 
          line.includes('sleepme')
        );
        
        // Take most recent 50 SleepMe lines
        const relevantLines = sleepMeLines.slice(0, 50);
        
        // Parse log lines
        systemLogs = relevantLines.map(line => {
          try {
            // Initialize with defaults
            let entry = {
              timestamp: new Date().toISOString(),
              context: 'homebridge',
              message: line,
              level: 'info'
            };
            
            // Try to extract timestamp in standard format [2023-03-27 10:15:30]
            const timestampMatch = line.match(/\[(.*?)\]/);
            if (timestampMatch && timestampMatch[1]) {
              try {
                const parsedDate = new Date(timestampMatch[1].trim());
                if (!isNaN(parsedDate.getTime())) {
                  entry.timestamp = parsedDate.toISOString();
                  line = line.substring(timestampMatch[0].length).trim();
                }
              } catch (e) {
                // Parsing failed, keep defaults
              }
            }
            
            // Try to extract context like [SleepMeSimple]
            const contextMatch = line.match(/\[(.*?)\]/);
            if (contextMatch && contextMatch[1]) {
              entry.context = contextMatch[1].trim();
              line = line.substring(contextMatch[0].length).trim();
            }
            
            // Determine log level
            if (line.includes('ERROR')) {
              entry.level = 'error';
            } else if (line.includes('WARN')) {
              entry.level = 'warn';
            }
            
            // Set cleaned message
            entry.message = line.replace(/\[(INFO|WARN|ERROR|DEBUG)\]/, '').trim();
            
            return entry;
          } catch (parseError) {
            // If parsing fails, return basic entry
            return {
              timestamp: new Date().toISOString(),
              context: 'homebridge',
              message: line,
              level: 'info'
            };
          }
        });
      }
      
      // Combine UI logs and system logs, sort by timestamp (newest first)
      const combinedLogs = [...uiLogs, ...systemLogs]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, this.maxLogEntries);
      
      return {
        success: true,
        logs: combinedLogs
      };
    } catch (error) {
      this.logError('Error getting logs', error);
      return {
        success: false,
        error: `Failed to retrieve logs: ${error.message || 'Unknown error'}`
      };
    }
  }
}

// Create and export a new instance
(() => {
  return new SleepMeUiServer();
})();