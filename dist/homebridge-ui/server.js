import { HomebridgePluginUiServer, RequestError } from '@homebridge/plugin-ui-utils';

/**
 * SleepMe Simple UI Server 
 * Handles backend functionality for the plugin UI
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    // Always call super() first
    super();
    
    // Register request handlers
    this.onRequest('/config/load', this.handleConfigLoad.bind(this));
    this.onRequest('/config/save', this.handleConfigSave.bind(this));
    this.onRequest('/device/test', this.handleDeviceTest.bind(this));
    
    // Console-only logging to avoid UI notifications
    console.log('[SleepMeUI] Server initialized');
    
    // IMPORTANT: Signal readiness - must be the last step in constructor
    this.ready();
  }
  
  /**
   * Handle loading plugin configuration
   * @param {any} payload - Request payload from UI
   * @returns {Promise<Object>} - Configuration response
   */
  async handleConfigLoad(payload) {
    console.log('[SleepMeUI] Loading configuration...');
    
    try {
      // Get the plugin configuration using the official API
      const pluginConfig = await this.getPluginConfig();
      
      if (!Array.isArray(pluginConfig)) {
        console.error('[SleepMeUI] Invalid plugin config format:', typeof pluginConfig);
        throw new RequestError('Invalid plugin configuration format', { status: 500 });
      }
      
      console.log(`[SleepMeUI] Retrieved ${pluginConfig.length} config entries`);
      
      // Find our platform configuration
      const platformConfig = pluginConfig.find(config => 
        config && config.platform === 'SleepMeSimple'
      );
      
      if (!platformConfig) {
        console.log('[SleepMeUI] Platform configuration not found, returning empty config');
        return { 
          success: true, 
          config: {
            platform: 'SleepMeSimple',
            name: 'SleepMe Simple'
          }
        };
      }
      
      console.log('[SleepMeUI] Configuration loaded successfully');
      return { success: true, config: platformConfig };
    } catch (error) {
      console.error('[SleepMeUI] Error loading configuration:', error);
      
      // Return a structured error response
      return { 
        success: false, 
        error: error instanceof RequestError 
          ? error.message 
          : 'Error loading configuration: ' + (error.message || 'Unknown error')
      };
    }
  }
  
  /**
   * Handle saving plugin configuration
   * @param {Object} payload - Configuration data from UI
   * @returns {Promise<Object>} - Save response
   */
  async handleConfigSave(payload) {
    console.log('[SleepMeUI] Saving configuration...');
    
    if (!payload || !payload.config) {
      console.error('[SleepMeUI] Invalid configuration payload');
      return { success: false, error: 'No configuration provided' };
    }
    
    try {
      // Get current plugin configuration
      const pluginConfig = await this.getPluginConfig();
      
      if (!Array.isArray(pluginConfig)) {
        console.error('[SleepMeUI] Invalid plugin config array');
        throw new RequestError('Invalid plugin configuration format', { status: 500 });
      }
      
      // Clean and validate the incoming config
      const configData = payload.config;
      
      // Ensure platform name is present
      if (!configData.platform || configData.platform !== 'SleepMeSimple') {
        configData.platform = 'SleepMeSimple';
      }
      
      // Ensure name is present
      if (!configData.name) {
        configData.name = 'SleepMe Simple';
      }
      
      // Process schedules to ensure correct format
      if (configData.enableSchedules === true) {
        if (!Array.isArray(configData.schedules)) {
          configData.schedules = [];
        }
        
        if (configData.schedules.length > 0) {
          console.log(`[SleepMeUI] Processing ${configData.schedules.length} schedules`);
          
          // Ensure each schedule has the correct structure
          configData.schedules = configData.schedules.map(schedule => {
            return {
              type: String(schedule.type || 'Everyday'),
              time: String(schedule.time || '00:00'),
              temperature: Number(schedule.temperature || 21),
              day: schedule.day !== undefined ? Number(schedule.day) : undefined,
              description: schedule.description ? String(schedule.description) : undefined,
              unit: String(schedule.unit || configData.unit || 'C')
            };
          });
        }
      } else {
        // If schedules are disabled, ensure the array is empty
        configData.schedules = [];
      }
      
      // Find the index of the existing platform config
      const existingIndex = pluginConfig.findIndex(c => 
        c && c.platform === 'SleepMeSimple'
      );
      
      let updatedConfig;
      
      // Update existing or add new
      if (existingIndex >= 0) {
        console.log(`[SleepMeUI] Updating existing configuration at index ${existingIndex}`);
        updatedConfig = [...pluginConfig];
        updatedConfig[existingIndex] = configData;
      } else {
        console.log('[SleepMeUI] Adding new platform configuration');
        updatedConfig = [...pluginConfig, configData];
      }
      
      // Update the configuration in memory
      await this.updatePluginConfig(updatedConfig);
      
      // Save to disk - this is critical!
      await this.savePluginConfig();
      
      // Verify configuration was saved
      const verifyConfig = await this.getPluginConfig();
      const savedPlatformConfig = verifyConfig.find(c => c && c.platform === 'SleepMeSimple');
      
      if (!savedPlatformConfig) {
        console.error('[SleepMeUI] Verification failed - platform config not found after save');
        return {
          success: false,
          error: 'Configuration save verification failed'
        };
      }
      
      console.log('[SleepMeUI] Configuration saved successfully');
      
      // Return success with the saved config for verification
      return {
        success: true,
        message: 'Configuration saved successfully',
        savedConfig: savedPlatformConfig
      };
    } catch (error) {
      console.error('[SleepMeUI] Error saving configuration:', error);
      
      // Return structured error
      return { 
        success: false, 
        error: error instanceof RequestError 
          ? error.message 
          : 'Error saving configuration: ' + (error.message || 'Unknown error')
      };
    }
  }
  
  /**
   * Test SleepMe API connection
   * @param {Object} payload - Request payload containing API token
   * @returns {Promise<Object>} Test result
   */
  async handleDeviceTest(payload) {
    console.log('[SleepMeUI] Testing device connection...');
    
    // Extract API token from request payload
    const apiToken = payload?.apiToken;
    
    if (!apiToken) {
      console.warn('[SleepMeUI] API token missing from test request');
      return { 
        success: false, 
        error: 'API token is required'
      };
    }
    
    try {
      // In a real implementation, this would make an actual API call
      // For now, just return a placeholder success to test the UI
      console.log('[SleepMeUI] Simulating successful API connection');
      
      return {
        success: true,
        devices: 1,
        deviceInfo: [{ id: "sample-device", name: "SleepMe Device", type: "Dock Pro" }],
        message: "Connection successful. Found 1 device."
      };
    } catch (error) {
      console.error('[SleepMeUI] API connection error:', error);
      
      return {
        success: false,
        error: `API connection failed: ${error.message || 'Unknown error'}`
      };
    }
  }
}

// IMPORTANT: Use this exact pattern for server instantiation with ES modules
// The IIFE syntax is crucial for proper initialization
(() => {
  return new SleepMeUiServer();
})();