// homebridge-ui/server.js
import { HomebridgePluginUiServer, RequestError } from '@homebridge/plugin-ui-utils';
import axios from 'axios';

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
    
    // Log initialization
    this.log('SleepMe UI Server initialized');
    
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
  
  /**
   * Get server logs for debugging
   * @returns {Promise<Object>} Object with success status and logs array
   */
  async getServerLogs() {
    try {
      // Return our internal UI server logs
      return {
        success: true,
        logs: [...this.recentLogs]
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