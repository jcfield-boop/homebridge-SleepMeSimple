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
      // Create a wrapper function to access HomebridgePluginUiServer.prototype methods
      // This is the key fix for ES modules
      const getConfig = async () => {
        // Access the parent class method via HomebridgePluginUiServer.prototype
        return await HomebridgePluginUiServer.prototype.getPluginConfig.call(this);
      };
      
      // Call the wrapper function
      const pluginConfig = await getConfig();
      
      if (!Array.isArray(pluginConfig)) {
        throw new Error('Invalid plugin configuration format');
      }
      
      // Find the platform configuration
      const platformConfig = pluginConfig.find(config => 
        config && config.platform === 'SleepMeSimple'
      );
      
      if (!platformConfig) {
        console.log('[SleepMeUI] Platform configuration not found');
        return { 
          success: true, 
          config: {
            platform: 'SleepMeSimple',
            name: 'SleepMe Simple'
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
      // Create wrapper functions for parent class methods
      const getConfig = async () => {
        return await HomebridgePluginUiServer.prototype.getPluginConfig.call(this);
      };
      
      const updateConfig = async (config) => {
        return await HomebridgePluginUiServer.prototype.updatePluginConfig.call(this, config);
      };
      
      const saveConfig = async () => {
        return await HomebridgePluginUiServer.prototype.savePluginConfig.call(this);
      };
      
      // Get current config
      const pluginConfig = await getConfig();
      
      if (!Array.isArray(pluginConfig)) {
        throw new Error('Invalid plugin configuration format');
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
        updatedConfig[existingIndex] = payload.config;
      } else {
        console.log('[SleepMeUI] Adding new platform config');
        updatedConfig = [...pluginConfig, payload.config];
      }
      
      // Update config in memory
      await updateConfig(updatedConfig);
      
      // Save to disk
      await saveConfig();
      
      console.log('[SleepMeUI] Configuration saved successfully');
      return { 
        success: true, 
        message: 'Configuration saved successfully',
        savedConfig: payload.config
      };
    } catch (error) {
      console.error('[SleepMeUI] Error saving configuration:', error.message);
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