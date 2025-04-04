import { HomebridgePluginUiServer, RequestError } from '@homebridge/plugin-ui-utils';

class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();
    
    // Set up the request handlers
    this.onRequest('/device/test', async (payload) => {
      console.log('Testing device connection with token', payload?.apiToken ? 'provided' : 'missing');
      if (!payload?.apiToken) {
        throw new RequestError('API token is required', { status: 400 });
      }
      return { 
        success: true,
        devices: 1,
        deviceInfo: [{ id: "sample-id", name: "Sample Device", type: "Dock Pro" }]
      };
    });
    
    this.onRequest('/config/load', async () => {
      console.log('Loading plugin configuration');
      try {
        const pluginConfig = await this.getPluginConfig();
        console.log('Got plugin config:', Array.isArray(pluginConfig) ? pluginConfig.length : 'not array');
        
        const platformConfig = Array.isArray(pluginConfig) ? 
          pluginConfig.find(config => config && config.platform === 'SleepMeSimple') : null;
        
        if (!platformConfig) {
          console.log('Platform config not found');
          return { success: false, error: 'Platform configuration not found' };
        }
        
        console.log('Found platform config:', platformConfig.name);
        return { success: true, config: platformConfig };
      } catch (error) {
        console.error('Error loading config:', error.message);
        return { success: false, error: `Configuration error: ${error.message}` };
      }
    });
    
    this.onRequest('/config/save', async (payload) => {
      console.log('Saving plugin configuration');
      try {
        if (!payload?.config) {
          throw new RequestError('Invalid configuration data', { status: 400 });
        }
        
        const pluginConfig = await this.getPluginConfig();
        const configData = payload.config;
        
        // Ensure required fields
        configData.platform = 'SleepMeSimple';
        configData.name = configData.name || 'SleepMe Simple';
        
        // Clean up schedules
        if (configData.enableSchedules === true) {
          if (!Array.isArray(configData.schedules)) {
            configData.schedules = [];
          }
        } else {
          configData.schedules = [];
        }
        
        // Find existing config
        const existingIndex = Array.isArray(pluginConfig) ? 
          pluginConfig.findIndex(c => c && c.platform === 'SleepMeSimple') : -1;
        
        let updatedConfig;
        if (existingIndex >= 0) {
          updatedConfig = [...pluginConfig];
          updatedConfig[existingIndex] = configData;
        } else {
          updatedConfig = Array.isArray(pluginConfig) ? [...pluginConfig, configData] : [configData];
        }
        
        await this.updatePluginConfig(updatedConfig);
        await this.savePluginConfig();
        
        return { success: true, message: 'Configuration saved successfully' };
      } catch (error) {
        console.error('Error saving config:', error.message);
        throw new RequestError(`Error saving configuration: ${error.message}`, { status: 500 });
      }
    });
    
    console.log('SleepMe UI Server initialized');
    this.ready();
  }
}

// Export as a default
export default (() => {
  return new SleepMeUiServer();
})();