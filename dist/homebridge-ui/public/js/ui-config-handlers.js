/**
 * SleepMe Simple UI Configuration Handlers
 * Manages loading and saving of plugin configuration
 */

/**
 * Load configuration from server
 * @returns {Promise<Object>} The loaded configuration
 */
window.loadConfig = async function() {
  try {
    console.log('Starting configuration loading process...');
    
    // Show loading status if NotificationManager available
    if (typeof NotificationManager !== 'undefined') {
      NotificationManager.info('Loading configuration...', 'Please Wait');
    }
    
    // Check if homebridge API is available with fallbacks
    if (typeof homebridge === 'undefined') {
      console.error('Homebridge API not available');
      throw new Error('Homebridge API not available. Please try reloading the page.');
    }
    
    // Wrap request in try/catch with timeout
    let response;
    try {
      // Create a timeout promise to prevent hanging
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out')), 10000)
      );
      
      // Race the request against the timeout
      response = await Promise.race([
        typeof homebridge.request === 'function' 
          ? homebridge.request('/config/load') 
          : Promise.reject(new Error('homebridge.request is not a function')),
        timeout
      ]);
    } catch (requestError) {
      console.error('Error making request:', requestError);
      // Fall back to mock configuration
      return createMockConfig();
    }
    
    // Log the response for debugging
    console.log('Config load response:', response);
    
    if (!response || !response.success) {
      console.warn('Configuration load unsuccessful:', response?.error);
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.warning(
          (response?.error) || 'Unable to load configuration', 
          'Configuration Load'
        );
      }
      return createMockConfig();
    }
    
    const config = response.config || {};
    
    // Populate form with loaded configuration
    if (Object.keys(config).length > 0) {
      try {
        console.log('Populating form with config:', config);
        populateFormWithConfig(config);
        
        // If schedules exist, render them
        if (Array.isArray(config.schedules)) {
          console.log(`Loading ${config.schedules.length} schedules from config`);
          window.schedules = JSON.parse(JSON.stringify(config.schedules));
          
          if (typeof window.renderScheduleList === 'function') {
            window.renderScheduleList();
          } else {
            console.warn('renderScheduleList function not available');
          }
        } else {
          // Initialize empty schedules array if none exist
          window.schedules = [];
        }
        
        if (typeof NotificationManager !== 'undefined') {
          NotificationManager.success(
            'Configuration loaded successfully', 
            'Configuration Management',
            { autoHide: true }
          );
        }
        
        return config;
      } catch (populationError) {
        console.error('Error populating form:', populationError);
        if (typeof NotificationManager !== 'undefined') {
          NotificationManager.error(
            `Error processing configuration: ${populationError.message}`, 
            'Configuration Error'
          );
        }
        return createMockConfig();
      }
    } else {
      console.log('Received empty configuration, initializing defaults');
      // Initialize empty schedules array
      window.schedules = [];
      return createMockConfig();
    }
  } catch (error) {
    console.error('Unexpected configuration loading error:', error);
    if (typeof NotificationManager !== 'undefined') {
      NotificationManager.error(
        `Unexpected error loading configuration: ${error.message}`, 
        'System Error'
      );
    }
    return createMockConfig();
  }
};

/**
 * Helper function to populate form fields with configuration values
 * @param {Object} config - The platform configuration object
 */
function populateFormWithConfig(config) {
  console.log('Populating form fields with configuration...');
  
  try {
    // Get form elements with null checks
    const apiTokenInput = document.getElementById('apiToken');
    const unitSelect = document.getElementById('unit');
    const pollingIntervalInput = document.getElementById('pollingInterval');
    const logLevelSelect = document.getElementById('logLevel');
    const enableSchedulesCheckbox = document.getElementById('enableSchedules');
    const schedulesContainer = document.getElementById('schedulesContainer');
    
    // Set API token
    if (apiTokenInput && config.apiToken) {
      console.log('Setting API token field');
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
      
      // Show/hide schedules container based on checkbox state
      if (schedulesContainer) {
        schedulesContainer.classList.toggle('hidden', !enableSchedules);
      } else {
        console.warn('Schedules container element not found');
      }
    } else {
      console.warn('Enable schedules checkbox element not found');
    }
    
    // If advanced configuration exists, load it
    if (config.advanced) {
      loadAdvancedSettings(config.advanced);
    }
    
    console.log('Form population complete');
  } catch (error) {
    // Catch and log any errors during form population
    console.error('Error during form population:', error);
    throw new Error(`Form population failed: ${error.message}`);
  }
}

/**
 * Load advanced settings from configuration
 * @param {Object} advanced - Advanced configuration section
 */
function loadAdvancedSettings(advanced) {
  try {
    // Get form elements
    const warmHugIncrementInput = document.getElementById('warmHugIncrement');
    const warmHugDurationInput = document.getElementById('warmHugDuration');
    const unitSelect = document.getElementById('unit');
    
    // Set values if they exist
    if (warmHugIncrementInput && advanced.warmHugIncrement !== undefined) {
      // Calculate proper increment value based on units
      let incrementValue = advanced.warmHugIncrement;
      
      // If units don't match (stored in C, display in F)
      if (unitSelect && unitSelect.value === 'F') {
        // Convert C increment to F increment
        incrementValue = incrementValue * (9/5);
      }
      
      warmHugIncrementInput.value = incrementValue.toFixed(1);
    }
    
    if (warmHugDurationInput && advanced.warmHugDuration !== undefined) {
      warmHugDurationInput.value = advanced.warmHugDuration;
    }
    
    console.log('Advanced settings loaded successfully');
  } catch (error) {
    console.error('Error loading advanced settings:', error);
  }
}

/**
 * Create a mock configuration with reasonable defaults
 * Used when configuration can't be loaded
 */
function createMockConfig() {
  console.log('Creating default mock configuration');
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
 * Save configuration to Homebridge
 * @returns {Promise<void>}
 */
window.saveConfig = async function() {
  try {
    console.log('Starting configuration save process...');
    if (typeof NotificationManager !== 'undefined') {
      NotificationManager.info('Saving configuration...', 'Please Wait');
    }
    
    // STEP 1: Check if Homebridge API is available
    if (typeof homebridge === 'undefined' || 
        typeof homebridge.request !== 'function') {
        
      console.error('Homebridge API not available for saving configuration');
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.error(
          'Homebridge API not available. Please reload the page.', 
          'Save Error'
        );
      }
      return;
    }
    
    // STEP 2: Get values from form with validation
    console.log('Collecting form values...');
    
    // Get and validate API token
    const apiToken = document.getElementById('apiToken')?.value;
    if (!apiToken) {
      console.error('API token is required');
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.error(
          'API token is required', 
          'Validation Error'
        );
      }
      return;
    }
    
    // Get other form values with defaults
    const unit = document.getElementById('unit')?.value || 'C';
    const pollingInterval = parseInt(document.getElementById('pollingInterval')?.value || '90', 10);
    const logLevel = document.getElementById('logLevel')?.value || 'normal';
    const enableSchedules = document.getElementById('enableSchedules')?.checked || false;
    
    // Validate polling interval
    if (isNaN(pollingInterval) || pollingInterval < 60 || pollingInterval > 300) {
      console.error('Invalid polling interval:', pollingInterval);
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.error(
          'Polling interval must be between 60 and 300 seconds', 
          'Validation Error'
        );
      }
      return;
    }
    
    // STEP 3: Create updated configuration object
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
    
    // STEP 4: Add schedules if enabled
    if (enableSchedules && Array.isArray(window.schedules)) {
      console.log(`Adding ${window.schedules.length} schedules to configuration`);
      
      // Process schedules to ensure proper format
      config.schedules = window.schedules.map(schedule => {
        // Create a clean schedule object with only the properties defined in the schema
        const cleanSchedule = {
          type: String(schedule.type || 'Everyday'),
          time: String(schedule.time || '00:00'),
          temperature: Number(schedule.temperature || 21)
        };
        
        // Add unit property if it exists
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
        
        // Preserve template information
        if (schedule.isFromTemplate) {
          cleanSchedule.isFromTemplate = Boolean(schedule.isFromTemplate);
        }
        
        if (schedule.templateSource) {
          cleanSchedule.templateSource = String(schedule.templateSource);
        }
        
        // Log processed schedule for debugging
        console.log(`Processed schedule: ${cleanSchedule.type} at ${cleanSchedule.time}: ${cleanSchedule.temperature}°${cleanSchedule.unit || unit}`);
        
        return cleanSchedule;
      });
    } else {
      console.log('No schedules to add or schedules disabled');
      config.schedules = [];
    }
    
    // STEP 5: Get advanced settings
    const advancedSettings = getAdvancedSettings();
    if (advancedSettings) {
      config.advanced = advancedSettings;
    }
    
    // STEP 6: Save configuration
    console.log('Sending configuration to server...');
    try {
      // Create a timeout promise
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Save request timed out')), 10000)
      );
      
      // Send request with timeout
      const response = await Promise.race([
        homebridge.request('/config/save', { config }),
        timeout
      ]);
      
      if (!response || !response.success) {
        console.error('Save response error:', response?.error);
        if (typeof NotificationManager !== 'undefined') {
          NotificationManager.error(
            response?.error || 'Unknown error saving configuration',
            'Save Error'
          );
        }
        return;
      }
      
      console.log('Configuration saved successfully');
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.success(
          'Configuration saved successfully',
          'Configuration Saved',
          { autoHide: true }
        );
      }
    } catch (requestError) {
      console.error('Error sending save request:', requestError);
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.error(
          `Error saving configuration: ${requestError.message}`,
          'Save Error'
        );
      }
    }
  } catch (error) {
    // Global error handler
    console.error('Error saving configuration:', error);
    if (typeof NotificationManager !== 'undefined') {
      NotificationManager.error(
        `Error saving configuration: ${error.message}`, 
        'Save Failed'
      );
    }
  }
};

/**
 * Get advanced settings from form
 * @returns {Object|null} Advanced settings object or null if none
 */
function getAdvancedSettings() {
  // Get form elements
  const warmHugIncrementInput = document.getElementById('warmHugIncrement');
  const warmHugDurationInput = document.getElementById('warmHugDuration');
  const unitSelect = document.getElementById('unit');
  
  // Initialize result
  let hasAdvancedSettings = false;
  const advancedSettings = {};
  
  // Process warm hug increment
  if (warmHugIncrementInput && warmHugIncrementInput.value) {
    let increment = parseFloat(warmHugIncrementInput.value);
    
    // Check if we need to convert from F to C
    if (unitSelect && unitSelect.value === 'F') {
      // Convert F increment to C increment for storage
      increment = increment * (5/9);
    }
    
    // Round to one decimal place
    advancedSettings.warmHugIncrement = Math.round(increment * 10) / 10;
    hasAdvancedSettings = true;
  }
  
  // Process warm hug duration
  if (warmHugDurationInput && warmHugDurationInput.value) {
    advancedSettings.warmHugDuration = parseInt(warmHugDurationInput.value, 10);
    hasAdvancedSettings = true;
  }
  
  return hasAdvancedSettings ? advancedSettings : null;
}