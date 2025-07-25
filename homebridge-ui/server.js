const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');

/**
 * SleepMe UI Server 
 * Handles backend functionality for the custom UI
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();
    
    console.log('[SleepMeUI] Server constructor started');
    
    // Check inheritance immediately after super()
    setTimeout(() => {
      console.log('[SleepMeUI] Checking inherited methods...');
      console.log('[SleepMeUI] this.getPluginConfig type:', typeof this.getPluginConfig);
      console.log('[SleepMeUI] this.updatePluginConfig type:', typeof this.updatePluginConfig);
      console.log('[SleepMeUI] this.savePluginConfig type:', typeof this.savePluginConfig);
      
      if (typeof this.getPluginConfig !== 'function') {
        console.error('[SleepMeUI] CRITICAL ERROR: this.getPluginConfig is not a function');
        console.error('[SleepMeUI] HomebridgePluginUiServer inheritance may be broken');
      } else {
        console.log('[SleepMeUI] Successfully validated HomebridgePluginUiServer methods');
      }
    }, 100);
    
    // Register simplified request handlers
    this.onRequest('/config/load', this.handleConfigLoad.bind(this));
    this.onRequest('/config/save', this.handleConfigSave.bind(this));
    
    console.log('[SleepMeUI] Server initialized, calling ready()');
    this.ready();
  }
  
  /**
   * Handle loading configuration with basic error handling
   */
  async handleConfigLoad() {
    console.log('[SleepMeUI] Loading configuration');
    
    try {
      // Check if methods are available
      if (typeof this.getPluginConfig !== 'function') {
        console.error('[SleepMeUI] getPluginConfig not available, returning default');
        return {
          success: true,
          config: this._createDefaultConfig(),
          warning: 'Using default config - inheritance issue detected'
        };
      }
      
      const pluginConfig = await this.getPluginConfig();
      console.log('[SleepMeUI] Retrieved plugin config:', pluginConfig?.length, 'entries');
      
      if (!Array.isArray(pluginConfig)) {
        console.warn('[SleepMeUI] Plugin config is not an array');
        return { 
          success: true, 
          config: this._createDefaultConfig()
        };
      }
      
      // Find the platform configuration
      const platformConfig = pluginConfig.find(config => 
        config && config.platform === 'SleepMeSimple'
      );
      
      if (!platformConfig) {
        console.log('[SleepMeUI] Platform configuration not found');
        return { 
          success: true, 
          config: this._createDefaultConfig()
        };
      }
      
      console.log('[SleepMeUI] Found platform configuration');
      return { success: true, config: platformConfig };
      
    } catch (error) {
      console.error('[SleepMeUI] Error loading configuration:', error.message);
      return { 
        success: true, 
        config: this._createDefaultConfig(),
        error: error.message
      };
    }
  }
  
  /**
   * Handle saving configuration with basic error handling
   */
  async handleConfigSave(payload) {
    console.log('[SleepMeUI] Saving configuration');
    
    if (!payload || !payload.config) {
      throw new RequestError('No configuration provided', { status: 400 });
    }
    
    try {
      // Check if methods are available
      if (typeof this.getPluginConfig !== 'function' || 
          typeof this.updatePluginConfig !== 'function') {
        throw new RequestError('Configuration methods not available', { status: 500 });
      }
      
      const configData = payload.config;
      
      // Ensure basic structure
      configData.platform = 'SleepMeSimple';
      if (!configData.name) configData.name = 'SleepMe Simple';
      
      const pluginConfig = await this.getPluginConfig();
      console.log('[SleepMeUI] Current config has', pluginConfig?.length || 0, 'entries');
      
      const configArray = Array.isArray(pluginConfig) ? pluginConfig : [];
      
      // Find existing config or add new
      const existingIndex = configArray.findIndex(c => 
        c && c.platform === 'SleepMeSimple'
      );
      
      let updatedConfig;
      if (existingIndex >= 0) {
        updatedConfig = [...configArray];
        updatedConfig[existingIndex] = configData;
      } else {
        updatedConfig = [...configArray, configData];
      }
      
      await this.updatePluginConfig(updatedConfig);
      console.log('[SleepMeUI] Configuration updated successfully');
      
      return { 
        success: true, 
        message: 'Configuration saved successfully'
      };
      
    } catch (error) {
      console.error('[SleepMeUI] Error saving configuration:', error.message);
      throw new RequestError(`Error saving configuration: ${error.message}`, { status: 500 });
    }
  }
  
  /**
   * Create a default configuration object
   */
  _createDefaultConfig() {
    return {
      platform: 'SleepMeSimple',
      name: 'SleepMe Simple',
      apiToken: '',
      unit: 'C',
      pollingInterval: 90,
      logLevel: 'normal',
      enableSchedules: false,
      schedules: []
    };
  }
}

// Create and export the server instance
(() => {
  console.log('[SleepMeUI] Creating server instance...');
  return new SleepMeUiServer();
})();