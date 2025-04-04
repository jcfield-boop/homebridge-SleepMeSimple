import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';

class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();
    
    // Register the essential endpoints
    this.onRequest('/config/load', async () => {
      console.log('Loading configuration...');
      try {
        // This is the key method that needs to work
        const pluginConfig = await this.getPluginConfig();
        console.log('Config loaded successfully:', pluginConfig ? 'yes' : 'no');
        
        const platformConfig = Array.isArray(pluginConfig) ? 
          pluginConfig.find(config => config && config.platform === 'SleepMeSimple') : null;
        
        return { success: true, config: platformConfig || {} };
      } catch (error) {
        console.error('Config loading error:', error.message);
        return { success: false, error: error.message };
      }
    });
    
    this.onRequest('/config/save', async (payload) => {
      console.log('Saving configuration...');
      if (!payload || !payload.config) {
        return { success: false, error: 'No configuration provided' };
      }
      
      try {
        // These are the key methods that need to work
        const pluginConfig = await this.getPluginConfig();
        const index = Array.isArray(pluginConfig) ? 
          pluginConfig.findIndex(c => c && c.platform === 'SleepMeSimple') : -1;
        
        let updatedConfig;
        if (index >= 0) {
          updatedConfig = [...pluginConfig];
          updatedConfig[index] = payload.config;
        } else {
          updatedConfig = [...(Array.isArray(pluginConfig) ? pluginConfig : []), payload.config];
        }
        
        await this.updatePluginConfig(updatedConfig);
        await this.savePluginConfig();
        
        return { success: true };
      } catch (error) {
        console.error('Config saving error:', error.message);
        return { success: false, error: error.message };
      }
    });
    
    this.onRequest('/device/test', async (payload) => {
      return { 
        success: true, 
        devices: 1,
        deviceInfo: [{ id: "test-id", name: "Test Device" }]
      };
    });
    
    console.log('SleepMe UI Server initialized');
    this.ready();
  }
}

// Create the server instance using the correct pattern
(() => {
  return new SleepMeUiServer();
})();