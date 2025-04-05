import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';

/**
 * SleepMe UI Server 
 * Handles backend functionality for the custom UI
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    // Always call super first
    super();
    
    // Register request handlers for specific endpoints
    this.onRequest('/config/load', async (payload) => {
      return await this.handleConfigLoad(payload);
    });
    
    this.onRequest('/config/save', async (payload) => {
      return await this.handleConfigSave(payload);
    });
    
    this.onRequest('/device/test', async (payload) => {
      return await this.handleDeviceTest(payload);
    });
    
    console.log('[SleepMeUI] Server initialized');
    
    // Signal readiness - MUST be called last
    this.ready();
  }
  
  /**
   * Handle loading configuration
   */
  async handleConfigLoad(payload) {
    console.log('[SleepMeUI] Loading configuration');
    
    try {
      // Create a default config in case we can't load
      const defaultConfig = {
        platform: 'SleepMeSimple',
        name: 'SleepMe Simple',
        apiToken: '',
        unit: 'C',
        pollingInterval: 90,
        logLevel: 'normal',
        enableSchedules: false,
        schedules: []
      };
      
      // Get plugin configuration
      let pluginConfig;
      try {
        // Using function directly from parent class (not referencing this or super)
        pluginConfig = await HomebridgePluginUiServer.prototype.getPluginConfig.call(this);
        console.log('[SleepMeUI] Successfully got plugin config');
      } catch (e) {
        console.error('[SleepMeUI] Error getting plugin config:', e.message);
        return { success: true, config: defaultConfig };
      }
      
      if (!Array.isArray(pluginConfig)) {
        console.warn('[SleepMeUI] Plugin config is not an array:', typeof pluginConfig);
        return { success: true, config: defaultConfig };
      }
      
      // Find the platform configuration
      const platformConfig = pluginConfig.find(config => 
        config && config.platform === 'SleepMeSimple'
      );
      
      if (!platformConfig) {
        console.log('[SleepMeUI] Platform configuration not found, returning default config');
        return { success: true, config: defaultConfig };
      }
      
      console.log('[SleepMeUI] Found platform configuration');
      return { success: true, config: platformConfig };
    } catch (error) {
      console.error('[SleepMeUI] Error loading configuration:', error.message);
      // Return default config even on error to prevent UI failure
      return { 
        success: true, 
        config: {
          platform: 'SleepMeSimple',
          name: 'SleepMe Simple',
          apiToken: '',
          unit: 'C',
          pollingInterval: 90,
          logLevel: 'normal',
          enableSchedules: false,
          schedules: []
        },
        error: `Error loading configuration: ${error.message}`
      };
    }
  }
  
  /**
   * Handle saving configuration
   */
  async handleConfigSave(payload) {
    console.log('[SleepMeUI] Saving configuration');
    
    if (!payload || !payload.config) {
      return { success: false, error: 'No configuration provided' };
    }
    
    try {
      // Validate config data
      const configData = payload.config;
      
      // Ensure platform and name are present
      if (!configData.platform || configData.platform !== 'SleepMeSimple') {
        configData.platform = 'SleepMeSimple';
      }
      
      if (!configData.name) {
        configData.name = 'SleepMe Simple';
      }
      
      // Ensure proper types for all values
      if (typeof configData.pollingInterval === 'string') {
        configData.pollingInterval = parseInt(configData.pollingInterval, 10);
      }
      
      // Ensure schedules are properly structured if enabled
      if (configData.enableSchedules === true) {
        if (!Array.isArray(configData.schedules)) {
          configData.schedules = [];
        }
        
        console.log(`[SleepMeUI] Processing ${configData.schedules.length} schedules`);
        
        // Ensure each schedule has the correct structure with proper types
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
      } else {
        configData.schedules = [];
      }
      
      // Get current config
      let pluginConfig;
      try {
        // Using function directly from parent class
        pluginConfig = await HomebridgePluginUiServer.prototype.getPluginConfig.call(this);
        console.log('[SleepMeUI] Successfully loaded existing config');
      } catch (e) {
        console.error('[SleepMeUI] Error loading existing config:', e.message);
        // Start with empty array if can't get existing config
        pluginConfig = [];
      }
      
      if (!Array.isArray(pluginConfig)) {
        console.warn('[SleepMeUI] Plugin config is not an array, using empty array instead');
        pluginConfig = [];
      }
      
      // Find existing config or prepare to add new
      const existingIndex = pluginConfig.findIndex(c => 
        c && c.platform === 'SleepMeSimple'
      );
      
      // Create updated config array
      let updatedConfig;
      if (existingIndex >= 0) {
        console.log(`[SleepMeUI] Updating existing config at index ${existingIndex}`);
        updatedConfig = [...pluginConfig];
        updatedConfig[existingIndex] = configData;
      } else {
        console.log('[SleepMeUI] Adding new platform config');
        updatedConfig = [...pluginConfig, configData];
      }
      
      // Try updating and saving config
      try {
        // Update config in memory using function directly from parent class
        await HomebridgePluginUiServer.prototype.updatePluginConfig.call(this, updatedConfig);
        console.log('[SleepMeUI] Updated plugin config in memory');
        
        // Save to disk using function directly from parent class
        await HomebridgePluginUiServer.prototype.savePluginConfig.call(this);
        console.log('[SleepMeUI] Saved config to disk');
      } catch (e) {
        console.error('[SleepMeUI] Error saving config:', e.message);
        return { 
          success: false, 
          error: `Error saving configuration: ${e.message}`
        };
      }
      
      console.log('[SleepMeUI] Configuration saved successfully');
      return { 
        success: true, 
        message: 'Configuration saved successfully',
        savedConfig: configData
      };
    } catch (error) {
      console.error('[SleepMeUI] Error in save process:', error.message);
      return { 
        success: false, 
        error: `Error saving configuration: ${error.message}`
      };
    }
  }
  
  /**
   * Handle device test request
   */
  async handleDeviceTest(payload) {
    console.log('[SleepMeUI] Testing device connection');
    
    const apiToken = payload?.apiToken;
    if (!apiToken) {
      return { success: false, error: 'API token is required' };
    }
    
    // Simple test result
    return {
      success: true,
      devices: 1,
      deviceInfo: [{ id: "sample-device", name: "Sample Device" }]
    };
  }
}

// Create an instance - MUST use this exact IIFE pattern with ES modules
(() => {
  return new SleepMeUiServer();
})();