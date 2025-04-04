import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';

// Create a minimal server that just initializes properly
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();
    
    // Set up minimal handlers
    this.onRequest('/config/load', async () => {
      console.log('[Server] Loading configuration...');
      try {
        const config = await this.getPluginConfig();
        console.log('[Server] Got config:', config ? 'success' : 'failed');
        
        const platformConfig = Array.isArray(config) ? 
          config.find(item => item && item.platform === 'SleepMeSimple') : null;
          
        return { 
          success: !!platformConfig, 
          config: platformConfig || {} 
        };
      } catch (error) {
        console.error('[Server] Config error:', error.message);
        return { success: false, error: error.message };
      }
    });
    
    this.onRequest('/config/save', async (payload) => {
      console.log('[Server] Saving configuration...');
      try {
        if (!payload || !payload.config) {
          return { success: false, error: 'No configuration provided' };
        }
        
        const config = await this.getPluginConfig();
        if (!Array.isArray(config)) {
          return { success: false, error: 'Invalid plugin configuration' };
        }
        
        const index = config.findIndex(c => c && c.platform === 'SleepMeSimple');
        let newConfig;
        
        if (index >= 0) {
          newConfig = [...config];
          newConfig[index] = payload.config;
        } else {
          newConfig = [...config, payload.config];
        }
        
        await this.updatePluginConfig(newConfig);
        await this.savePluginConfig();
        
        return { success: true };
      } catch (error) {
        console.error('[Server] Save error:', error.message);
        return { success: false, error: error.message };
      }
    });
    
    this.onRequest('/device/test', async (payload) => {
      return { 
        success: true,
        devices: 1,
        deviceInfo: [{ id: "sample-id", name: "Sample Device" }]
      };
    });
    
    console.log('[Server] Initialization complete - server ready');
    this.ready();
  }
}

// Export the server instance
export default new SleepMeUiServer();