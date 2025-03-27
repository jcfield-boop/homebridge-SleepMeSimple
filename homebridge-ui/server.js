// homebridge-ui/server.js
import { HomebridgePluginUiServer, RequestError } from '@homebridge/plugin-ui-utils';
import axios from 'axios';
import path from 'path';
import fs from 'fs';

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
    this.onRequest('/config', this.getConfig.bind(this));
    this.onRequest('/saveConfig', this.saveConfig.bind(this));
    this.onRequest('/device/test', this.testDeviceConnection.bind(this));
    this.onRequest('/logs', this.getServerLogs.bind(this));
    
    // Log initialization
    console.log('[SleepMeUI] SleepMe UI Server initialized');
    
    // IMPORTANT: Signal that the server is ready to accept requests
    // This must be called after all request handlers are registered
    this.ready();
  }
  
  // Helper logging methods
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
  
  // Get plugin configuration
  async getConfig() {
    try {
      this.log('Getting plugin configuration');
      
      // Access the config path directly from the parent class property
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
        const platform = homebridgeConfig.platforms.find(p => p && p.platform === 'SleepMeSimple');
        
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
  
  // Save plugin configuration
  async saveConfig(payload) {
    try {
      // Extract config from payload
      let config = null;
      
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
      
      // Access the config path directly from the parent class property
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
      const platformIndex = homebridgeConfig.platforms.findIndex(p => p && p.platform === 'SleepMeSimple');
      
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
  
  // Test API connection
  async testDeviceConnection(payload) {
    try {
      // Extract API token
      let apiToken = null;
      
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
      
      // Extract device info
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
  
  // Helper method to detect device type
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
  
  // Get server logs
  async getServerLogs() {
    try {
      // First include our internal UI server logs
      const uiLogs = [...this.recentLogs];
      
      // Access the storage path directly from the parent class property
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
// This pattern automatically creates an instance when the file is loaded
(() => {
  return new SleepMeUiServer();
})();