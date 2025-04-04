/**
 * Configuration handling functions for SleepMe Simple UI
 * Manages loading and saving of plugin configuration to Homebridge
 */

/**
 * Process schedules to ensure they match the expected schema format
 * @param {Array} schedules - Raw schedules from UI
 * @param {string} defaultUnit - Default temperature unit (C or F)
 * @returns {Array} Processed schedules
 */
function processSchedulesForSaving(schedules, defaultUnit = 'C') {
  if (!Array.isArray(schedules) || schedules.length === 0) {
    console.log('No schedules to process, returning empty array');
    return [];
  }
  
  console.log(`Processing ${schedules.length} schedules for saving`);
  
  // Create a deep copy to avoid modifying originals
  const processedSchedules = JSON.parse(JSON.stringify(schedules)).map((schedule, index) => {
    console.log(`Processing schedule ${index + 1}/${schedules.length}: ${schedule.type || 'unknown'} at ${schedule.time || 'unknown'}`);
    
    // Create base schedule with required properties and proper types
    const processed = {
      type: String(schedule.type || 'Everyday'),
      time: String(schedule.time || '00:00'),
      temperature: Number(schedule.temperature || 21),
      unit: String(schedule.unit || defaultUnit)
    };
    
    // Log for debugging
    console.log(`- Base processed schedule: type=${processed.type}, time=${processed.time}, temp=${processed.temperature}°${processed.unit}`);
    
    // Handle day property for Specific Day schedules
    if (processed.type === 'Specific Day') {
      if (schedule.day !== undefined) {
        processed.day = Number(schedule.day);
        console.log(`- Added day property: ${processed.day}`);
      } else {
        console.warn(`- Missing day property for Specific Day schedule`);
        // Default to Monday (1) as fallback
        processed.day = 1;
      }
    }
    
    // Add description if present (optional property)
    if (schedule.description) {
      processed.description = String(schedule.description);
      console.log(`- Added description: ${processed.description}`);
    }
    
    // Validate temperature ranges based on unit
    if (processed.unit === 'C' && (processed.temperature < 13 || processed.temperature > 46)) {
      console.warn(`- Temperature ${processed.temperature}°C out of range, clamping to valid range`);
      processed.temperature = Math.max(13, Math.min(46, processed.temperature));
    } else if (processed.unit === 'F' && (processed.temperature < 55 || processed.temperature > 115)) {
      console.warn(`- Temperature ${processed.temperature}°F out of range, clamping to valid range`);
      processed.temperature = Math.max(55, Math.min(115, processed.temperature));
    }
    
    return processed;
  });
  
  console.log(`Completed processing ${processedSchedules.length} schedules`);
  return processedSchedules;
}

/**
 * Validate and normalize loaded schedules
 * @param {Array} schedules - Schedules loaded from config
 * @param {string} defaultUnit - Default temperature unit
 * @returns {Array} Validated schedules
 */
function validateLoadedSchedules(schedules, defaultUnit = 'C') {
  if (!Array.isArray(schedules)) {
    console.warn('Loaded schedules is not an array');
    return [];
  }
  
  console.log(`Validating ${schedules.length} loaded schedules`);
  
  return schedules.map((schedule, index) => {
    // Create a verified copy with all required properties
    const verified = {
      type: schedule.type || 'Everyday',
      time: schedule.time || '00:00',
      temperature: Number(schedule.temperature || 21),
      unit: schedule.unit || defaultUnit
    };
    
    // Add day property if this is a specific day schedule
    if (verified.type === 'Specific Day' && schedule.day !== undefined) {
      verified.day = Number(schedule.day);
    }
    
    // Add description if present
    if (schedule.description) {
      verified.description = schedule.description;
    }
    
    // Add metadata for template schedules if present
    if (schedule.isFromTemplate) {
      verified.isFromTemplate = true;
      
      if (schedule.templateSource) {
        verified.templateSource = schedule.templateSource;
      }
      
      if (schedule.templateKey) {
        verified.templateKey = schedule.templateKey;
      }
    }
    
    console.log(`Validated schedule ${index + 1}: ${verified.type} at ${verified.time}, ${verified.temperature}°${verified.unit}`);
    return verified;
  });
}

/**
 * Convert temperature between Celsius and Fahrenheit
 * @param {number} value - Temperature value to convert
 * @param {string} fromUnit - Source unit ('C' or 'F')
 * @param {string} toUnit - Target unit ('C' or 'F')
 * @returns {number} Converted temperature
 */
function convertTemperature(value, fromUnit, toUnit) {
  if (fromUnit === toUnit) {
    return value;
  }
  
  if (fromUnit === 'C' && toUnit === 'F') {
    return (value * 9/5) + 32;
  } else if (fromUnit === 'F' && toUnit === 'C') {
    return (value - 32) * 5/9;
  }
  
  return value;
}

/**
 * Load the plugin configuration from Homebridge
 * @returns {Promise<Object>} Resolved with the loaded configuration
 */
window.loadConfig = async function() {
  try {
    console.log('Starting configuration loading process...');
    
    // Update status indicator
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = 'Loading configuration...';
      statusElement.className = 'status info';
      statusElement.classList.remove('hidden');
    }
    
    // Check if Homebridge API is available
    if (typeof homebridge === 'undefined' || typeof homebridge.request !== 'function') {
      throw new Error('Homebridge API not available. Please reload the page.');
    }
    
    // Request configuration from server
    console.log('Requesting configuration from server...');
    const response = await homebridge.request('/config/load');
    
    // Validate response
    if (!response) {
      throw new Error('No response received from server');
    }
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to load configuration');
    }
    
    if (!response.config) {
      throw new Error('Configuration data missing from response');
    }
    
    const config = response.config;
    console.log('Configuration loaded successfully:', config);
    
    // Populate form with loaded configuration
    try {
      populateFormWithConfig(config);
      
      // Update status indicator
      if (statusElement) {
        statusElement.textContent = 'Configuration loaded successfully';
        statusElement.className = 'status success';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
          statusElement.classList.add('hidden');
        }, 3000);
      }
      
      return config;
    } catch (populationError) {
      console.error('Error populating form:', populationError);
      
      // Update status indicator
      if (statusElement) {
        statusElement.textContent = `Error processing configuration: ${populationError.message}`;
        statusElement.className = 'status error';
      }
      
      throw populationError;
    }
  } catch (error) {
    console.error('Configuration loading error:', error);
    
    // Update status indicator
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = `Error loading configuration: ${error.message}`;
      statusElement.className = 'status error';
    }
    
    // Show error using NotificationManager if available
    if (typeof NotificationManager !== 'undefined') {
      NotificationManager.error(
        error.message,
        'Configuration Error'
      );
    }
    
    return {};
  }
};

/**
 * Helper function to populate form fields with configuration values
 * @param {Object} config - The configuration object
 */
function populateFormWithConfig(config) {
  console.log('Populating form with configuration...');
  
  try {
    // Get form elements - with null checks
    const apiTokenInput = document.getElementById('apiToken');
    const unitSelect = document.getElementById('unit');
    const pollingIntervalInput = document.getElementById('pollingInterval');
    const logLevelSelect = document.getElementById('logLevel');
    const enableSchedulesCheckbox = document.getElementById('enableSchedules');
    const schedulesContainer = document.getElementById('schedulesContainer');
    
    // Set API token
    if (apiTokenInput && config.apiToken) {
      console.log('Setting API token');
      apiTokenInput.value = config.apiToken;
    } else if (!apiTokenInput) {
      console.warn('API token input element not found');
    }
    
    // Set unit
    if (unitSelect && config.unit) {
      console.log(`Setting temperature unit: ${config.unit}`);
      unitSelect.value = config.unit;
    } else if (!unitSelect) {
      console.warn('Unit select element not found');
    } else if (!config.unit) {
      console.log('No unit in config, using default (C)');
      unitSelect.value = 'C';
    }
    
    // Set polling interval
    if (pollingIntervalInput && config.pollingInterval) {
      console.log(`Setting polling interval: ${config.pollingInterval}`);
      pollingIntervalInput.value = config.pollingInterval;
    } else if (!pollingIntervalInput) {
      console.warn('Polling interval input element not found');
    } else if (!config.pollingInterval) {
      console.log('No polling interval in config, using default (90)');
      pollingIntervalInput.value = '90';
    }
    
    // Set log level
    if (logLevelSelect && config.logLevel) {
      console.log(`Setting log level: ${config.logLevel}`);
      logLevelSelect.value = config.logLevel;
    } else if (!logLevelSelect) {
      console.warn('Log level select element not found');
    } else if (!config.logLevel) {
      console.log('No log level in config, using default (normal)');
      logLevelSelect.value = 'normal';
    }
    
    // Handle schedules configuration
    if (enableSchedulesCheckbox) {
      const enableSchedules = config.enableSchedules === true;
      console.log(`Setting enable schedules: ${enableSchedules}`);
      enableSchedulesCheckbox.checked = enableSchedules;
      
      // Show/hide schedules container
      if (schedulesContainer) {
        schedulesContainer.classList.toggle('hidden', !enableSchedules);
      } else {
        console.warn('Schedules container element not found');
      }
      
      // Load schedules if available and enabled
      if (enableSchedules && Array.isArray(config.schedules)) {
        console.log(`Loading ${config.schedules.length} schedules from configuration`);
        
        // Ensure window.schedules exists
        if (typeof window.schedules === 'undefined') {
          window.schedules = [];
        }
        
        // Validate and normalize schedules
        const currentUnit = unitSelect ? unitSelect.value : 'C';
        window.schedules = validateLoadedSchedules(config.schedules, currentUnit);
        
        console.log('Schedules loaded and processed:', window.schedules);
        
        // Initialize schedule display
        if (typeof window.renderScheduleList === 'function') {
          console.log('Rendering schedule list');
          window.renderScheduleList();
        } else {
          console.warn('renderScheduleList function not available');
        }
      } else if (enableSchedules) {
        console.log('Schedules enabled but no schedules found in configuration');
        window.schedules = [];
        
        // Still render empty list if function available
        if (typeof window.renderScheduleList === 'function') {
          window.renderScheduleList();
        }
      }
    } else {
      console.warn('Enable schedules checkbox element not found');
    }
    
    console.log('Form population complete');
  } catch (error) {
    console.error('Error during form population:', error);
    throw new Error(`Form population failed: ${error.message}`);
  }
}

/**
 * Save configuration to Homebridge
 * @returns {Promise<boolean>} True if save was successful
 */
window.saveConfig = async function() {
  try {
    console.log('Starting configuration save process...');
    
    // Update status indicator
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = 'Saving configuration...';
      statusElement.className = 'status info';
      statusElement.classList.remove('hidden');
    }
    
    // Check if Homebridge API is available
    if (typeof homebridge === 'undefined' || typeof homebridge.request !== 'function') {
      throw new Error('Homebridge API not available. Please reload the page.');
    }
    
    // Get form values with validation
    console.log('Collecting form values...');
    
    // Get API token
    const apiTokenInput = document.getElementById('apiToken');
    if (!apiTokenInput || !apiTokenInput.value.trim()) {
      throw new Error('API token is required');
    }
    const apiToken = apiTokenInput.value.trim();
    
    // Get other form values with defaults
    const unitSelect = document.getElementById('unit');
    const unit = unitSelect ? unitSelect.value : 'C';
    
    const pollingIntervalInput = document.getElementById('pollingInterval');
    const pollingIntervalValue = pollingIntervalInput ? pollingIntervalInput.value : '90';
    const pollingInterval = parseInt(pollingIntervalValue, 10);
    if (isNaN(pollingInterval) || pollingInterval < 60 || pollingInterval > 300) {
      throw new Error('Polling interval must be between 60 and 300 seconds');
    }
    
    const logLevelSelect = document.getElementById('logLevel');
    const logLevel = logLevelSelect ? logLevelSelect.value : 'normal';
    
    const enableSchedulesCheckbox = document.getElementById('enableSchedules');
    const enableSchedules = enableSchedulesCheckbox ? enableSchedulesCheckbox.checked : false;
    
    // Create configuration object
    console.log('Creating configuration object...');
    const config = {
      platform: 'SleepMeSimple',
      name: 'SleepMe Simple',
      apiToken,
      unit,
      pollingInterval,
      logLevel,
      enableSchedules
    };
    
    // Add advanced configuration if present
    if (typeof window.getAdvancedConfig === 'function') {
      try {
        const advancedConfig = window.getAdvancedConfig();
        if (advancedConfig && typeof advancedConfig === 'object') {
          config.advanced = advancedConfig;
          console.log('Added advanced configuration:', config.advanced);
        }
      } catch (advancedError) {
        console.warn('Error getting advanced configuration:', advancedError);
      }
    }
    
    // Process schedules if enabled
    if (enableSchedules) {
      console.log('Schedules are enabled, processing...');
      
      if (Array.isArray(window.schedules) && window.schedules.length > 0) {
        console.log(`Found ${window.schedules.length} schedules to process`);
        config.schedules = processSchedulesForSaving(window.schedules, unit);
      } else {
        console.log('No schedules found, setting empty array');
        config.schedules = [];
      }
    } else {
      console.log('Schedules are disabled, setting empty array');
      config.schedules = [];
    }
    
    // Log the final config for debugging (excluding sensitive data)
    const configForLog = {...config, apiToken: '***REDACTED***'};
    console.log('Final configuration to save:', JSON.stringify(configForLog, null, 2));
    
    // Save configuration
    console.log('Sending configuration to server...');
    const response = await homebridge.request('/config/save', { config });
    
    // Verify save was successful
    if (response && response.success) {
      console.log('Configuration successfully saved to disk');
      
      // Verify schedules were properly saved
      if (enableSchedules && response.config && Array.isArray(response.config.schedules)) {
        console.log(`Verified ${response.config.schedules.length} schedules saved successfully`);
        
        // Compare original count with saved count
        const originalCount = Array.isArray(window.schedules) ? window.schedules.length : 0;
        if (response.config.schedules.length !== originalCount) {
          console.warn(`Schedule count mismatch: ${originalCount} original vs ${response.config.schedules.length} saved`);
        }
      } else if (enableSchedules && response.config) {
        console.warn('Schedules were enabled but not found in saved configuration');
      }
      
      // Show success message
      if (statusElement) {
        statusElement.textContent = 'Configuration saved successfully';
        statusElement.className = 'status success';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
          statusElement.classList.add('hidden');
        }, 3000);
      }
      
      // Also show notification if available
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.success(
          'Configuration saved successfully', 
          'Configuration Management',
          { autoHide: true }
        );
      }
      
      return true;
    } else {
      // Handle save failure
      const errorMsg = (response && response.error) ? response.error : 'Failed to save configuration';
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error('Configuration save error:', error);
    
    // Update status indicator
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = `Error saving configuration: ${error.message}`;
      statusElement.className = 'status error';
    }
    
    // Show error notification if available
    if (typeof NotificationManager !== 'undefined') {
      NotificationManager.error(
        error.message,
        'Save Error'
      );
    }
    
    return false;
  }
};

/**
 * Test connection to the SleepMe API
 * @returns {Promise<void>}
 */
window.testConnection = async function() {
  try {
    console.log('Testing API connection...');
    
    // Update status indicator
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = 'Testing API connection...';
      statusElement.className = 'status info';
      statusElement.classList.remove('hidden');
    }
    
    // Get API token
    const apiTokenInput = document.getElementById('apiToken');
    if (!apiTokenInput || !apiTokenInput.value.trim()) {
      throw new Error('API token is required');
    }
    const apiToken = apiTokenInput.value.trim();
    
    // Test connection
    console.log('Sending test request to server...');
    const response = await homebridge.request('/device/test', { apiToken });
    
    if (response && response.success) {
      const deviceCount = response.devices || 0;
      const deviceInfo = response.deviceInfo || [];
      const deviceNames = deviceInfo.map(d => d.name).join(', ');
      
      console.log(`Connection test successful: ${deviceCount} device(s) found: ${deviceNames}`);
      
      // Display success message
      const successMessage = deviceCount > 0 
        ? `Connection successful! Found ${deviceCount} device(s): ${deviceNames}`
        : 'Connection successful, but no devices found';
      
      if (statusElement) {
        statusElement.textContent = successMessage;
        statusElement.className = 'status success';
      }
      
      // Also show notification if available
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.success(
          successMessage,
          'API Test'
        );
      }
    } else {
      // Handle test failure
      const errorMsg = (response && response.error) ? response.error : 'Connection test failed';
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error('Connection test error:', error);
    
    // Update status indicator
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = `Connection test failed: ${error.message}`;
      statusElement.className = 'status error';
    }
    
    // Show error notification if available
    if (typeof NotificationManager !== 'undefined') {
      NotificationManager.error(
        error.message,
        'API Test Error'
      );
    }
  }
};

/**
 * Helper function to find the SleepMeSimple platform config
 * @param {Array} pluginConfig - The plugin configuration array
 * @returns {Object|null} - The platform configuration or null
 */
function findPlatformConfig(pluginConfig) {
  if (!Array.isArray(pluginConfig)) {
    return null;
  }
  
  return pluginConfig.find(cfg => cfg && cfg.platform === 'SleepMeSimple') || null;
}

/**
 * Get advanced settings configuration 
 * This can be extended to handle any additional settings
 * @returns {Object} Advanced configuration object
 */
window.getAdvancedConfig = function() {
  try {
    console.log('Getting advanced configuration...');
    
    const advancedConfig = {};
    
    // Get Warm Hug settings
    const warmHugIncrement = document.getElementById('warmHugIncrement');
    const warmHugDuration = document.getElementById('warmHugDuration');
    const unitSelect = document.getElementById('unit');
    
    if (warmHugIncrement && !isNaN(parseFloat(warmHugIncrement.value))) {
      let increment = parseFloat(warmHugIncrement.value);
      
      // Validate range based on unit
      const currentUnit = unitSelect ? unitSelect.value : 'C';
      if (currentUnit === 'C') {
        // Validate and clamp to Celsius range
        if (increment < 0.5) increment = 0.5;
        if (increment > 5) increment = 5;
      } else {
        // Convert from Fahrenheit to Celsius for storage
        increment = convertTemperature(increment, 'F', 'C');
        // Validate and clamp to Celsius range (stored in Celsius)
        if (increment < 0.5) increment = 0.5;
        if (increment > 5) increment = 5;
      }
      
      advancedConfig.warmHugIncrement = increment;
      console.log(`Set Warm Hug increment: ${increment}°C/min`);
    }
    
    if (warmHugDuration && !isNaN(parseInt(warmHugDuration.value))) {
      let duration = parseInt(warmHugDuration.value);
      // Validate and clamp duration
      if (duration < 5) duration = 5;
      if (duration > 60) duration = 60;
      
      advancedConfig.warmHugDuration = duration;
      console.log(`Set Warm Hug duration: ${duration} minutes`);
    }
    
    return advancedConfig;
  } catch (error) {
    console.error('Error getting advanced configuration:', error);
    return {};
  }
};