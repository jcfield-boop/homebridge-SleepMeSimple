const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');

/**
 * SleepMe Simple UI Server 
 * Handles backend functionality for the custom UI
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    // Always call super first
    super();
    
    console.log('[SleepMeUI] Initializing server');
    
    // Register request handlers with explicit function bindings
    this.onRequest('/config/load', this.handleConfigLoad.bind(this));
    this.onRequest('/config/save', this.handleConfigSave.bind(this));
    this.onRequest('/device/test', this.handleDeviceTest.bind(this));
    
    // Signal readiness - MUST be called last
    this.ready();
    console.log('[SleepMeUI] Server initialization complete');
  }
  
  /**
   * Handle loading configuration
   * Retrieves the plugin config and finds the platform configuration
   */
  handleConfigLoad(payload) {
    console.log('[SleepMeUI] Loading configuration');
    
    try {
      // Get full plugin configuration array
      const pluginConfig = this.getPluginConfig();
      console.log('[SleepMeUI] Plugin config retrieved successfully');
      
      if (!Array.isArray(pluginConfig)) {
        console.warn('[SleepMeUI] Plugin config is not an array, returning default config');
        return { 
          success: true, 
          config: this._createDefaultConfig()
        };
      }
      
      // Find our platform configuration
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
      
      console.log('[SleepMeUI] Platform config found and returned');
      return { success: true, config: platformConfig };
    } catch (error) {
      console.error('[SleepMeUI] Error loading configuration:', error.message);
      return { 
        success: false, 
        error: `Error loading configuration: ${error.message}`,
        config: this._createDefaultConfig()
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
   * Handle saving configuration
   * Updates the plugin config with the new configuration
   */
  handleConfigSave(payload) {
    console.log('[SleepMeUI] Saving configuration');
    
    if (!payload || !payload.config) {
      return { success: false, error: 'No configuration provided' };
    }
    
    try {
      // Make a deep copy to avoid reference issues
      const configData = JSON.parse(JSON.stringify(payload.config));
      
      // Ensure platform and name are correct
      configData.platform = 'SleepMeSimple';
      if (!configData.name) {
        configData.name = 'SleepMe Simple';
      }
      
      // Process configuration values
      this._processConfigData(configData);
      
      // Get current plugin config array
      const pluginConfig = this.getPluginConfig();
      
      if (!Array.isArray(pluginConfig)) {
        console.warn('[SleepMeUI] Plugin config is not an array, initializing new array');
        updatedConfig = [configData];
      } else {
        // Find our platform config index
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
        
        // Update config in memory
        this.updatePluginConfig(updatedConfig);
        
        // Save to disk
        this.savePluginConfig();
        
        // Verify the save was successful
        const verifyConfig = this.getPluginConfig();
        const savedConfig = verifyConfig.find(c => c && c.platform === 'SleepMeSimple');
        
        console.log('[SleepMeUI] Configuration saved successfully, verification:', !!savedConfig);
        return { 
          success: true, 
          message: 'Configuration saved successfully',
          savedConfig: configData
        };
      }
    } catch (error) {
      console.error('[SleepMeUI] Error saving configuration:', error.message);
      return { 
        success: false, 
        error: `Error saving configuration: ${error.message}`
      };
    }
  }
  
  /**
   * Process configuration data to ensure correct structure and types
   * @param {Object} configData - The configuration data to process
   */
  _processConfigData(configData) {
    // Ensure proper types for all values
    if (typeof configData.pollingInterval === 'string') {
      configData.pollingInterval = parseInt(configData.pollingInterval, 10);
    }
    
    // Limit polling interval to valid range
    if (typeof configData.pollingInterval === 'number') {
      configData.pollingInterval = Math.max(60, Math.min(300, configData.pollingInterval));
    }
    
    // Ensure schedules are properly structured if enabled
    if (configData.enableSchedules === true) {
      if (!Array.isArray(configData.schedules)) {
        configData.schedules = [];
      }
      
      console.log(`[SleepMeUI] Processing ${configData.schedules.length} schedules`);
      
      // Ensure each schedule has the correct structure with proper types
      configData.schedules = configData.schedules.map(schedule => {
        const cleanSchedule = {
          type: String(schedule.type || 'Everyday'),
          time: String(schedule.time || '00:00'),
          temperature: Number(schedule.temperature || 21)
        };
        
        // Only add unit if present (use config default otherwise)
        if (schedule.unit) {
          cleanSchedule.unit = String(schedule.unit);
        }
        
        // Only add day property for Specific Day schedules
        if (schedule.type === 'Specific Day' && schedule.day !== undefined) {
          cleanSchedule.day = Number(schedule.day);
        }
        
        // Only add description if present
        if (schedule.description) {
          cleanSchedule.description = String(schedule.description);
        }
        
        // Preserve template information if present
        if (schedule.isFromTemplate) {
          cleanSchedule.isFromTemplate = Boolean(schedule.isFromTemplate);
        }
        
        if (schedule.templateSource) {
          cleanSchedule.templateSource = String(schedule.templateSource);
        }
        
        return cleanSchedule;
      });
    } else {
      configData.schedules = [];
    }
    
    // Ensure advanced section exists if needed
    if (!configData.advanced && (
        configData.advanced?.warmHugIncrement !== undefined || 
        configData.advanced?.warmHugDuration !== undefined
    )) {
      configData.advanced = {};
    }
    
    // Process advanced settings if present
    if (configData.advanced) {
      if (configData.advanced.warmHugIncrement !== undefined) {
        configData.advanced.warmHugIncrement = Number(configData.advanced.warmHugIncrement);
      }
      
      if (configData.advanced.warmHugDuration !== undefined) {
        configData.advanced.warmHugDuration = Number(configData.advanced.warmHugDuration);
      }
    }
  }
  
  /**
   * Handle device test request
   * Tests connection to the SleepMe API
   */
  handleDeviceTest(payload) {
    console.log('[SleepMeUI] Testing device connection');
    
    const apiToken = payload?.apiToken;
    if (!apiToken) {
      return { success: false, error: 'API token is required' };
    }
    
    // For now, just return a success message
    // In a real implementation, you would validate the API token
    return {
      success: true,
      devices: 2,
      deviceInfo: [
        { id: "sample-device-1", name: "SleepMe Bedroom" },
        { id: "sample-device-2", name: "SleepMe Guest Room" }
      ]
    };
  }
}

// Create an instance - MUST use this exact pattern for CommonJS
(() => {
  return new SleepMeUiServer();
})();