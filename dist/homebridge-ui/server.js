import { HomebridgePluginUiServer, RequestError } from '@homebridge/plugin-ui-utils';

/**
 * SleepMe UI Server
 * Implements the HomebridgePluginUiServer interface with robust configuration handling
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    // Always call super first (required)
    super();
    
    // Register request handlers with inline functions (not method references)
    this.onRequest('/config/load', async () => {
      return await this.loadConfiguration();
    });
    
    this.onRequest('/config/save', async (payload) => {
      return await this.saveConfiguration(payload);
    });
    
    this.onRequest('/device/test', async (payload) => {
      return await this.testDeviceConnection(payload);
    });
    
    // Add version tracking for better debugging
    this.serverVersion = '1.0.0';
    
    // Log successful initialization
    console.log('[SleepMeUI] Server initialized');
    
    // Signal readiness - MUST be called last
    this.ready();
  }
  
  /**
   * Load configuration with robust error handling
   */
  async loadConfiguration() {
    console.log('[SleepMeUI] Loading configuration');
    
    try {
      // Get plugin configuration using the parent class method
      const pluginConfig = await this.getPluginConfig();
      console.log('[SleepMeUI] Plugin config loaded successfully', 
        Array.isArray(pluginConfig) ? `(${pluginConfig.length} items)` : '(not an array)');
      
      if (!Array.isArray(pluginConfig)) {
        throw new Error('Plugin configuration is not an array');
      }
      
      // Find the platform configuration
      const platformConfig = pluginConfig.find(config => 
        config && config.platform === 'SleepMeSimple'
      );
      
      if (platformConfig) {
        console.log('[SleepMeUI] Found platform configuration');
        return { success: true, config: platformConfig };
      } else {
        console.log('[SleepMeUI] Platform configuration not found, returning default');
        return { success: true, config: this.createDefaultConfig() };
      }
    } catch (error) {
      console.error('[SleepMeUI] Error loading configuration:', error.message);
      
      // Return default config on error with error info
      return { 
        success: true, 
        config: this.createDefaultConfig(),
        error: `Error loading configuration: ${error.message}`
      };
    }
  }
  
  /**
   * Create a default configuration
   */
  createDefaultConfig() {
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
   * Save configuration with validation and error handling
   */
  async saveConfiguration(payload) {
    console.log('[SleepMeUI] Saving configuration');
    
    if (!payload || !payload.config) {
      throw new RequestError('Missing configuration data', { status: 400 });
    }
    
    try {
      // Ensure we're working with a deep copy to avoid reference issues
      const configData = JSON.parse(JSON.stringify(payload.config));
      
      // Process the configuration for proper storage
      this.processConfigData(configData);
      
      // Get the current plugin configuration
      const pluginConfig = await this.getPluginConfig();
      
      if (!Array.isArray(pluginConfig)) {
        throw new Error('Plugin configuration is not an array');
      }
      
      // Find or create our platform configuration
      const existingIndex = pluginConfig.findIndex(c => 
        c && c.platform === 'SleepMeSimple'
      );
      
      // Create a new plugin config array
      const updatedConfig = [...pluginConfig];
      
      if (existingIndex >= 0) {
        // Update existing entry
        console.log(`[SleepMeUI] Updating existing config at index ${existingIndex}`);
        updatedConfig[existingIndex] = configData;
      } else {
        // Add new entry
        console.log('[SleepMeUI] Adding new platform config');
        updatedConfig.push(configData);
      }
      
      // Update the configuration in memory
      await this.updatePluginConfig(updatedConfig);
      console.log('[SleepMeUI] Configuration updated in memory');
      
      // Save to disk
      await this.savePluginConfig();
      console.log('[SleepMeUI] Configuration saved to disk');
      
      // Verify configuration was saved correctly
      const verificationConfig = await this.getPluginConfig();
      const verifiedPlatform = verificationConfig.find(c => c && c.platform === 'SleepMeSimple');
      
      if (!verifiedPlatform) {
        throw new Error('Configuration verification failed');
      }
      
      return { 
        success: true, 
        message: 'Configuration saved successfully'
      };
    } catch (error) {
      console.error('[SleepMeUI] Error saving configuration:', error.message);
      throw new RequestError(`Failed to save configuration: ${error.message}`, { status: 500 });
    }
  }
  
  /**
   * Process configuration data for storage
   */
  processConfigData(configData) {
    // Ensure required fields with proper types
    if (!configData.platform || configData.platform !== 'SleepMeSimple') {
      configData.platform = 'SleepMeSimple';
    }
    
    if (!configData.name) {
      configData.name = 'SleepMe Simple';
    }
    
    // Convert string numbers to actual numbers
    if (typeof configData.pollingInterval === 'string') {
      configData.pollingInterval = parseInt(configData.pollingInterval, 10);
    }
    
    // Process schedules if enabled
    if (configData.enableSchedules === true) {
      if (!Array.isArray(configData.schedules)) {
        configData.schedules = [];
      }
      
      console.log(`[SleepMeUI] Processing ${configData.schedules.length} schedules`);
      
      // Ensure each schedule has correct structure and types
      configData.schedules = configData.schedules.map(schedule => {
        // Create a clean schedule object with only schema-defined properties
        const cleanedSchedule = {
          type: String(schedule.type || 'Everyday'),
          time: String(schedule.time || '00:00'),
          temperature: Number(schedule.temperature || 21)
        };
        
        // Only add optional properties if they exist
        if (schedule.day !== undefined) {
          cleanedSchedule.day = Number(schedule.day);
        }
        
        if (schedule.description) {
          cleanedSchedule.description = String(schedule.description);
        }
        
        if (schedule.unit) {
          cleanedSchedule.unit = String(schedule.unit);
        }
        
        return cleanedSchedule;
      });
    } else {
      // Always ensure schedules is an array even when disabled
      configData.schedules = [];
    }
    
    // Log the processed data
    console.log('[SleepMeUI] Configuration processed successfully');
  }
  
  /**
   * Test device connection with API token
   */
  async testDeviceConnection(payload) {
    console.log('[SleepMeUI] Testing device connection');
    
    if (!payload || !payload.apiToken) {
      throw new RequestError('API token is required', { status: 400 });
    }
    
    // This is a placeholder. In a real implementation, this would:
    // 1. Make an API call to SleepMe using the provided token
    // 2. Return actual device information
    
    // For now, return a simulated success response
    return {
      success: true,
      devices: 2,
      deviceInfo: [
        { id: "device-1", name: "SleepMe Bedroom" },
        { id: "device-2", name: "SleepMe Guest Room" }
      ]
    };
  }
}

// Create an instance using IIFE - this is the correct pattern for ES modules
(() => {
  return new SleepMeUiServer();
})();