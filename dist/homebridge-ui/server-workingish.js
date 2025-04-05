import { HomebridgePluginUiServer, RequestError } from '@homebridge/plugin-ui-utils';

/**
 * SleepMe UI Server 
 * Handles backend functionality for the custom UI
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    // Always call super first
    super();
    
    // Immediately check if the inherited methods are available
    this._validateMethods();
    
    // Register request handlers for specific endpoints
    this.onRequest('/config/load', this.handleConfigLoad.bind(this));
    this.onRequest('/config/save', this.handleConfigSave.bind(this));
    this.onRequest('/device/test', this.handleDeviceTest.bind(this));
    
    console.log('[SleepMeUI] Server initialized');
    
    // Signal readiness - MUST be called last
    this.ready();
  }
  
  /**
   * Validate that required methods are available
   * This helps detect inheritance issues early
   */
  _validateMethods() {
    if (typeof this.getPluginConfig !== 'function') {
      console.error('[SleepMeUI] CRITICAL ERROR: this.getPluginConfig is not a function');
      console.error('[SleepMeUI] HomebridgePluginUiServer inheritance may be broken');
    } else {
      console.log('[SleepMeUI] Successfully validated HomebridgePluginUiServer methods');
    }
  }
  
  /**
   * Handle loading configuration with fallback mechanisms
   */
  async handleConfigLoad() {
    console.log('[SleepMeUI] Loading configuration');
    
    try {
      let pluginConfig;
      
      // Try multiple ways to get plugin config to handle potential inheritance issues
      try {
        if (typeof this.getPluginConfig === 'function') {
          // Primary method - use direct inheritance
          pluginConfig = await this.getPluginConfig();
          console.log('[SleepMeUI] Successfully got plugin config via this.getPluginConfig()');
        } else if (typeof super.getPluginConfig === 'function') {
          // Fallback 1 - try using super
          pluginConfig = await super.getPluginConfig();
          console.log('[SleepMeUI] Successfully got plugin config via super.getPluginConfig()');
        } else {
          // If both methods fail, return default config
          console.error('[SleepMeUI] Could not access getPluginConfig method, returning default config');
          return {
            success: true,
            config: this._createDefaultConfig()
          };
        }
      } catch (methodError) {
        console.error('[SleepMeUI] Error calling getPluginConfig:', methodError.message);
        return {
          success: true,
          config: this._createDefaultConfig()
        };
      }
      
      if (!Array.isArray(pluginConfig)) {
        console.warn('[SleepMeUI] Plugin config is not an array:', typeof pluginConfig);
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
        console.log('[SleepMeUI] Platform configuration not found, returning default config');
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
        error: `Error loading configuration: ${error.message}`
      };
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
  
  /**
   * Handle saving configuration with fallback approaches
   */
  async handleConfigSave(payload) {
    console.log('[SleepMeUI] Saving configuration');
    
    if (!payload || !payload.config) {
      throw new RequestError('No configuration provided', { status: 400 });
    }
    
    try {
      // Validate config data
      const configData = payload.config;
      
      // Process configuration (ensure correct structure & types)
      this._processConfigData(configData);
      
      let pluginConfig = [];
      let success = false;
      
      // Try to get current config with fallbacks
      try {
        if (typeof this.getPluginConfig === 'function') {
          pluginConfig = await this.getPluginConfig();
          success = true;
        } else if (typeof super.getPluginConfig === 'function') {
          pluginConfig = await super.getPluginConfig();
          success = true;
        }
      } catch (methodError) {
        console.error('[SleepMeUI] Error calling getPluginConfig:', methodError.message);
        // Continue with empty config
      }
      
      if (!Array.isArray(pluginConfig)) {
        console.warn('[SleepMeUI] Plugin config is not an array, initializing empty array');
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
      
      // Try to update config with fallbacks
      try {
        if (typeof this.updatePluginConfig === 'function') {
          await this.updatePluginConfig(updatedConfig);
          success = true;
        } else if (typeof super.updatePluginConfig === 'function') {
          await super.updatePluginConfig(updatedConfig);
          success = true;
        } else {
          console.error('[SleepMeUI] Could not access updatePluginConfig method');
          throw new Error('Cannot access configuration methods');
        }
      } catch (methodError) {
        console.error('[SleepMeUI] Error calling updatePluginConfig:', methodError.message);
        throw methodError;
      }
      
      // Try to save config with fallbacks
      try {
        if (typeof this.savePluginConfig === 'function') {
          await this.savePluginConfig();
          success = true;
        } else if (typeof super.savePluginConfig === 'function') {
          await super.savePluginConfig();
          success = true;
        } else {
          console.error('[SleepMeUI] Could not access savePluginConfig method');
          throw new Error('Cannot access configuration methods');
        }
      } catch (methodError) {
        console.error('[SleepMeUI] Error calling savePluginConfig:', methodError.message);
        throw methodError;
      }
      
      console.log('[SleepMeUI] Configuration saved successfully');
      return { 
        success: true, 
        message: 'Configuration saved successfully',
        savedConfig: configData
      };
    } catch (error) {
      console.error('[SleepMeUI] Error in save process:', error.message);
      throw new RequestError(`Error saving configuration: ${error.message}`, { status: 500 });
    }
  }
  
  /**
   * Process configuration data to ensure correct structure and types
   * @param {Object} configData - The configuration data to process
   */
  _processConfigData(configData) {
    // Ensure platform and name are present
    if (!configData.platform || configData.platform !== 'SleepMeSimple') {
      configData.platform = 'SleepMeSimple';
    }
    
    if (!configData.name) {
      configData.name = 'SleepMe Simple';
    }
    
    // Ensure proper types for all values
    if (typeof configData.pollingInterval === 'string') {
      configData.pollingInterval = parseInt(configData.pollingInterval, 10);
    }
    
    // Ensure schedules are properly structured if enabled
    if (configData.enableSchedules === true) {
      if (!Array.isArray(configData.schedules)) {
        configData.schedules = [];
      }
      
      console.log(`[SleepMeUI] Processing ${configData.schedules.length} schedules`);
      
      // Ensure each schedule has the correct structure with proper types
      configData.schedules = configData.schedules.map(schedule => {
        return {
          type: String(schedule.type || 'Everyday'),
          time: String(schedule.time || '00:00'),
          temperature: Number(schedule.temperature || 21),
          day: schedule.day !== undefined ? Number(schedule.day) : undefined,
          description: schedule.description ? String(schedule.description) : undefined,
          unit: String(schedule.unit || configData.unit || 'C')
        };
      });
    } else {
      configData.schedules = [];
    }
  }
  
  /**
   * Handle device test request
   */
  async handleDeviceTest(payload) {
    console.log('[SleepMeUI] Testing device connection');
    
    const apiToken = payload?.apiToken;
    if (!apiToken) {
      throw new RequestError('API token is required', { status: 400 });
    }
    
    // Here you would implement actual API testing code
    // For now just return a success message
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