const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');

/**
 * SleepMe UI Server 
 * Handles backend functionality for the custom UI
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();
    
    console.log('[SleepMeUI] Starting custom UI server...');
    
    // Add debugging for inheritance
    this.checkInheritance();
    
    // Register request handlers
    this.onRequest('/config/load', this.loadConfig.bind(this));
    this.onRequest('/config/save', this.saveConfig.bind(this));
    
    console.log('[SleepMeUI] Custom UI server ready');
    this.ready();
  }
  
  /**
   * Check if inheritance is working properly
   */
  checkInheritance() {
    console.log('[SleepMeUI] Checking inheritance...');
    console.log('[SleepMeUI] getPluginConfig available:', typeof this.getPluginConfig === 'function');
    console.log('[SleepMeUI] updatePluginConfig available:', typeof this.updatePluginConfig === 'function');
    
    if (typeof this.getPluginConfig !== 'function') {
      console.error('[SleepMeUI] CRITICAL: getPluginConfig method not inherited');
    } else {
      console.log('[SleepMeUI] Inheritance working correctly');
    }
  }
  
  /**
   * Load plugin configuration
   */
  async loadConfig() {
    console.log('[SleepMeUI] Loading configuration...');
    
    try {
      if (typeof this.getPluginConfig !== 'function') {
        throw new Error('getPluginConfig method not available');
      }
      
      const pluginConfig = await this.getPluginConfig();
      console.log('[SleepMeUI] Retrieved plugin config array with', pluginConfig?.length || 0, 'entries');
      
      if (!Array.isArray(pluginConfig)) {
        console.warn('[SleepMeUI] Plugin config is not an array, using default');
        return { success: true, config: this.getDefaultConfig() };
      }
      
      // Find our platform config
      const sleepMeConfig = pluginConfig.find(config => 
        config && config.platform === 'SleepMeSimple'
      );
      
      if (!sleepMeConfig) {
        console.log('[SleepMeUI] No existing config found, using default');
        return { success: true, config: this.getDefaultConfig() };
      }
      
      console.log('[SleepMeUI] Found existing configuration');
      return { success: true, config: sleepMeConfig };
      
    } catch (error) {
      console.error('[SleepMeUI] Error loading config:', error.message);
      return { 
        success: false, 
        error: error.message,
        config: this.getDefaultConfig()
      };
    }
  }
  
  /**
   * Save plugin configuration
   */
  async saveConfig(payload) {
    console.log('[SleepMeUI] Saving configuration...');
    
    if (!payload || !payload.config) {
      throw new RequestError('No configuration provided', { status: 400 });
    }
    
    try {
      if (typeof this.getPluginConfig !== 'function' || 
          typeof this.updatePluginConfig !== 'function') {
        throw new Error('Configuration methods not available');
      }
      
      const newConfig = payload.config;
      
      // Ensure required fields
      newConfig.platform = 'SleepMeSimple';
      if (!newConfig.name) newConfig.name = 'SleepMe Simple';
      
      // Get current plugin config array
      const pluginConfig = await this.getPluginConfig();
      const configArray = Array.isArray(pluginConfig) ? pluginConfig : [];
      
      // Find and replace or add new config
      const existingIndex = configArray.findIndex(c => 
        c && c.platform === 'SleepMeSimple'
      );
      
      if (existingIndex >= 0) {
        configArray[existingIndex] = newConfig;
        console.log('[SleepMeUI] Updated existing config');
      } else {
        configArray.push(newConfig);
        console.log('[SleepMeUI] Added new config');
      }
      
      // Save the updated config
      // CRITICAL: Must call both methods to persist to disk
      await this.updatePluginConfig(configArray);
      console.log('[SleepMeUI] Configuration updated in memory');

      await this.savePluginConfig();
      console.log('[SleepMeUI] Configuration saved to disk');

      return {
        success: true,
        message: 'Configuration saved successfully'
      };
      
    } catch (error) {
      console.error('[SleepMeUI] Error saving config:', error.message);
      throw new RequestError(`Failed to save configuration: ${error.message}`, { status: 500 });
    }
  }
  
  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      platform: 'SleepMeSimple',
      name: 'SleepMe Simple',
      apiToken: '',
      unit: 'C',
      pollingInterval: 90,
      logLevel: 'normal',
      interfaceMode: 'hybrid',
      enableSchedules: false,
      schedules: []
    };
  }
}

// Export the server instance
(() => {
  console.log('[SleepMeUI] Initializing SleepMe Custom UI Server...');
  try {
    return new SleepMeUiServer();
  } catch (error) {
    console.error('[SleepMeUI] Failed to initialize server:', error.message);
    throw error;
  }
})();