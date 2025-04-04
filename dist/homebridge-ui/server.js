import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';

/**
 * SleepMe UI Server 
 * Handles backend functionality for the custom UI
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    // Always call super first before any other operations
    super();
    
    // Register request handlers for specific endpoints - using arrow functions to maintain proper 'this' binding
    this.onRequest('/config/load', async () => {
      console.log('[SleepMeUI] Loading configuration...');
      
      try {
        // Explicitly access the prototype method
        const getConfig = Object.getPrototypeOf(this).getPluginConfig;
        if (typeof getConfig !== 'function') {
          throw new Error('getPluginConfig not available on parent prototype');
        }
        
        // Call the method with proper this binding
        const pluginConfig = await getConfig.call(this);
        console.log(`[SleepMeUI] Retrieved ${pluginConfig?.length || 0} config entries`);
        
        // Find our platform configuration
        const platformConfig = Array.isArray(pluginConfig) 
          ? pluginConfig.find(config => config && config.platform === 'SleepMeSimple')
          : null;
        
        if (!platformConfig) {
          console.log('[SleepMeUI] Platform configuration not found, returning empty object');
          return { success: true, config: {} };
        }
        
        console.log('[SleepMeUI] Configuration loaded successfully');
        return { success: true, config: platformConfig };
      } catch (error) {
        console.error('[SleepMeUI] Config load error:', error);
        return { 
          success: false, 
          error: `Error loading configuration: ${error.message || 'Unknown error'}`
        };
      }
    });
    
    this.onRequest('/config/save', async (payload) => {
      console.log('[SleepMeUI] Saving configuration...');
      
      if (!payload || !payload.config) {
        return { success: false, error: 'No configuration provided' };
      }
      
      try {
        // Get prototype methods with proper binding
        const getConfig = Object.getPrototypeOf(this).getPluginConfig;
        const updateConfig = Object.getPrototypeOf(this).updatePluginConfig;
        const saveConfig = Object.getPrototypeOf(this).savePluginConfig;
        
        if (!getConfig || !updateConfig || !saveConfig) {
          throw new Error('Required configuration methods not available');
        }
        
        // Get current plugin configuration
        const pluginConfig = await getConfig.call(this);
        
        if (!Array.isArray(pluginConfig)) {
          throw new Error('Invalid plugin configuration format');
        }
        
        // Find index of existing config or -1 if not found
        const existingIndex = pluginConfig.findIndex(c => 
          c && c.platform === 'SleepMeSimple'
        );
        
        // Create a new array with the updated config
        let updatedConfig;
        if (existingIndex >= 0) {
          updatedConfig = [...pluginConfig];
          updatedConfig[existingIndex] = payload.config;
        } else {
          updatedConfig = [...pluginConfig, payload.config];
        }
        
        // Update the config in memory
        await updateConfig.call(this, updatedConfig);
        
        // Save to disk
        await saveConfig.call(this);
        
        console.log('[SleepMeUI] Configuration saved successfully');
        
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
    });
    
    this.onRequest('/device/test', async (payload) => {
      console.log('[SleepMeUI] Device test requested');
      
      const apiToken = payload?.apiToken;
      if (!apiToken) {
        return { success: false, error: 'API token is required' };
      }
      
      // Simple test response without real API call
      return { 
        success: true, 
        devices: 1,
        deviceInfo: [{ id: "test-id", name: "Test Device" }]
      };
    });
    
    // IMPORTANT: Signal that we're ready - must be last step in constructor
    this.ready();
  }
}

// Create an instance of the server
(() => {
  return new SleepMeUiServer();
})();