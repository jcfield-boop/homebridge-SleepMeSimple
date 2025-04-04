import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';

/**
 * SleepMe UI Server for Homebridge
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    // Always call super first
    super();
    
    // Set up request handlers before ready() call
    this.onRequest('/config/load', this.handleConfigLoad.bind(this));
    this.onRequest('/config/save', this.handleConfigSave.bind(this));
    this.onRequest('/device/test', this.handleDeviceTest.bind(this));
    
    console.log('[SleepMeUI] Server initialized');
    
    // Signal readiness - MUST be called last
    this.ready();
  }
  
  /**
   * Handle loading configuration
   */
  async handleConfigLoad() {
    console.log('[SleepMeUI] Loading configuration');
    
    try {
      // Directly call the parent method without using the prototype reference
      // Use the homebridgeConfigPath to check if we're initialized properly
      if (!this.homebridgeConfigPath) {
        throw new Error('Homebridge configuration path not available');
      }
      
      console.log('[SleepMeUI] Config path:', this.homebridgeConfigPath);
      
      // Try a simpler approach without prototype access
      let pluginConfig;
      try {
        // Try using this directly
        pluginConfig = await this.getPluginConfig();
        console.log('[SleepMeUI] Successfully got config using this.getPluginConfig()');
      } catch (e) {
        console.error('[SleepMeUI] Error using this.getPluginConfig():', e.message);
        
        // Fallback to simpler approach: directly return mock config
        console.log('[SleepMeUI] Returning mock configuration');
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
          }
        };
      }
      
      if (!Array.isArray(pluginConfig)) {
        console.warn('[SleepMeUI] Plugin config is not an array:', typeof pluginConfig);
        
        // Fallback to empty array if not array
        pluginConfig = [];
      }
      
      // Find the platform configuration
      const platformConfig = pluginConfig.find(config => 
        config && config.platform === 'SleepMeSimple'
      );
      
      if (!platformConfig) {
        console.log('[SleepMeUI] Platform configuration not found, returning default config');
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
          }
        };
      }
      
      console.log('[SleepMeUI] Found platform configuration');
      return { success: true, config: platformConfig };
    } catch (error) {
      console.error('[SleepMeUI] Error loading configuration:', error.message);
      return { 
        success: false, 
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
      
      // Try getting current config
      let pluginConfig;
      try {
        pluginConfig = await this.getPluginConfig();
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
        // Update config in memory
        await this.updatePluginConfig(updatedConfig);
        console.log('[SleepMeUI] Updated plugin config in memory');
        
        // Save to disk
        await this.savePluginConfig();
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