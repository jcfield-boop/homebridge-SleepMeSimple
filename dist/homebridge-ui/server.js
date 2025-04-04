import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';

/**
 * SleepMe UI Server 
 * Handles backend functionality for the custom UI
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    // Always call super first
    super();
    
    // Register request handlers
    this.onRequest('/config/load', this.handleConfigLoad.bind(this));
    this.onRequest('/config/save', this.handleConfigSave.bind(this));
    this.onRequest('/device/test', this.handleDeviceTest.bind(this));
    
    console.log('[SleepMeUI] Server initialized');
    
    // Signal readiness AFTER setting up handlers
    this.ready();
  }
  
  /**
   * Handle config load request from UI
   */
  async handleConfigLoad() {
    console.log('[SleepMeUI] Config load requested');
    
    try {
      // This is the recommended method to get config according to docs
      const pluginConfig = await this.getPluginConfig();
      console.log(`[SleepMeUI] Config retrieved: ${pluginConfig.length} entries`);
      
      // Find our platform configuration
      const platformConfig = Array.isArray(pluginConfig) ? 
        pluginConfig.find(config => config && config.platform === 'SleepMeSimple') : null;
      
      if (!platformConfig) {
        console.log('[SleepMeUI] Platform config not found');
        return { 
          success: true, 
          config: {
            platform: 'SleepMeSimple',
            name: 'SleepMe Simple'
          }
        };
      }
      
      console.log('[SleepMeUI] Platform config found');
      return { success: true, config: platformConfig };
    } catch (error) {
      console.error('[SleepMeUI] Config load error:', error);
      return { 
        success: false, 
        error: `Error loading configuration: ${error.message || 'Unknown error'}`
      };
    }
  }
  
  /**
   * Handle config save request from UI
   */
  async handleConfigSave(payload) {
    console.log('[SleepMeUI] Config save requested');
    
    if (!payload || !payload.config) {
      return { success: false, error: 'Invalid configuration data' };
    }
    
    try {
      // Get current plugin config
      const pluginConfig = await this.getPluginConfig();
      
      if (!Array.isArray(pluginConfig)) {
        throw new Error('Invalid plugin configuration format');
      }
      
      // Find the index of the existing platform config
      const existingIndex = pluginConfig.findIndex(c => 
        c && c.platform === 'SleepMeSimple'
      );
      
      // Copy the array and update the config
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
      await this.updatePluginConfig(updatedConfig);
      
      // Save to disk - this is critical!
      await this.savePluginConfig();
      
      console.log('[SleepMeUI] Config saved successfully');
      return { 
        success: true, 
        message: 'Configuration saved successfully',
        savedConfig: payload.config
      };
    } catch (error) {
      console.error('[SleepMeUI] Config save error:', error);
      return { 
        success: false, 
        error: `Error saving configuration: ${error.message || 'Unknown error'}`
      };
    }
  }
  
  /**
   * Handle device test request from UI
   */
  async handleDeviceTest(payload) {
    console.log('[SleepMeUI] Device test requested');
    
    const apiToken = payload?.apiToken;
    if (!apiToken) {
      return { success: false, error: 'API token is required' };
    }
    
    // Return simple test result
    return {
      success: true,
      devices: 1,
      deviceInfo: [{ id: "sample-device", name: "Sample Device" }]
    };
  }
}

// Create an instance of the server - IIFE pattern
(() => {
  return new SleepMeUiServer();
})();