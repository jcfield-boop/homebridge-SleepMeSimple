import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';

class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    // Must call super first
    super();
    
    // Basic request handlers
    this.onRequest('/config/load', async () => {
      console.log('[SleepMeUI] Configuration load requested');
      try {
        // Get plugin config directly from parent class method
        const pluginConfig = await super.getPluginConfig();
        console.log(`[SleepMeUI] Retrieved config: ${JSON.stringify(pluginConfig)}`);
        
        // Find our platform configuration
        const platformConfig = Array.isArray(pluginConfig) 
          ? pluginConfig.find(config => config && config.platform === 'SleepMeSimple')
          : null;
        
        if (!platformConfig) {
          console.log('[SleepMeUI] Platform config not found, returning empty object');
          return { success: true, config: {} };
        }
        
        console.log('[SleepMeUI] Configuration loaded successfully');
        return { success: true, config: platformConfig };
      } catch (error) {
        console.error('[SleepMeUI] Config load error:', error.message);
        return { success: false, error: `Error loading configuration: ${error.message}` };
      }
    });
    
    this.onRequest('/config/save', async (payload) => {
      console.log('[SleepMeUI] Save configuration requested');
      if (!payload || !payload.config) {
        return { success: false, error: 'No configuration provided' };
      }
      
      try {
        // Use parent class methods directly with super
        const pluginConfig = await super.getPluginConfig();
        
        if (!Array.isArray(pluginConfig)) {
          throw new Error('Invalid plugin configuration format');
        }
        
        // Find index of existing config or -1 if not found
        const existingIndex = pluginConfig.findIndex(config => 
          config && config.platform === 'SleepMeSimple'
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
        await super.updatePluginConfig(updatedConfig);
        
        // Save to disk
        await super.savePluginConfig();
        
        return { 
          success: true, 
          message: 'Configuration saved successfully',
          savedConfig: payload.config
        };
      } catch (error) {
        console.error('[SleepMeUI] Config save error:', error.message);
        return { success: false, error: `Error saving configuration: ${error.message}` };
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
    
    // IMPORTANT: Signal that we're ready
    this.ready();
  }
}

// Create an instance of the server
(() => {
  return new SleepMeUiServer();
})();