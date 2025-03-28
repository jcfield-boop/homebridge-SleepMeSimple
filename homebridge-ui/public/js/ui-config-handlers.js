/**
 * Configuration handling for SleepMe Simple Homebridge Plugin UI
 * Provides functions to load and save configuration data
 */

/**
 * Load configuration from Homebridge
 * Uses the Homebridge UI APIs to fetch plugin configuration
 * @returns {Promise<Object>} The loaded configuration object
 */
window.loadConfig = async function() {
  try {
    window.showLoading('Loading configuration...');
    
    // Ensure homebridge object is fully initialized
    await ensureHomebridgeReady();
    
    // Log homebridge info for debugging
    console.log('Homebridge plugin info:', homebridge.plugin);
    console.log('Homebridge server env:', homebridge.serverEnv);
    
    // Request direct config check from server
    try {
      const configCheck = await homebridge.request('/config/check');
      if (configCheck.success) {
        // Log to console only - no toast
        console.log('Server can access config.json directly:', configCheck);
      } else {
        console.warn('Server cannot access config.json directly:', configCheck);
      }
    } catch (checkError) {
      console.error('Config check error:', checkError);
    }
    
    // Get the plugin config using the Homebridge API
    console.log('Getting plugin config from Homebridge API...');
    const pluginConfig = await homebridge.getPluginConfig();
    console.log('Raw plugin config:', JSON.stringify(pluginConfig));
    
    // Find our platform configuration
    let config = {};
    if (Array.isArray(pluginConfig) && pluginConfig.length > 0) {
      // Try to find by exact platform name first
      const platformConfig = pluginConfig.find(cfg => 
        cfg && cfg.platform === 'SleepMeSimple');
      
      if (platformConfig) {
        config = platformConfig;
        console.log('Found SleepMeSimple platform config:', config);
      } else {
        console.warn('No SleepMeSimple platform found in config');
      }
    } else {
      console.warn('No plugin config found in API response');
    }
    
    // Wait for DOM elements to be available
    await waitForDOMElements();
    
    // Fill form fields with config values
    populateFormFields(config);
    
    window.hideLoading();
    return config;
  } catch (error) {
    console.error('Configuration loading error:', error);
    // Only show toast for critical config errors
    if (error.message.includes('API') || error.message.includes('token')) {
      window.showToast('error', 'Failed to load configuration: ' + error.message, 'Config Error');
    }
    window.hideLoading();
    return {};
  }
};

/**
 * Ensures the Homebridge API is fully initialized and ready
 * @returns {Promise<void>} Resolves when API is ready
 */
async function ensureHomebridgeReady() {
  return new Promise((resolve, reject) => {
    // Check if homebridge object exists
    if (typeof homebridge === 'undefined') {
      reject(new Error('Homebridge API not available - cannot load config'));
      return;
    }
    
    // If already ready, resolve immediately
    if (typeof homebridge.getPluginConfig === 'function') {
      console.log('Homebridge API already initialized');
      resolve();
      return;
    }
    
    // Wait for ready event with timeout
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for Homebridge API to initialize'));
    }, 10000);
    
    homebridge.addEventListener('ready', () => {
      clearTimeout(timeout);
      
      // Add delay to ensure full initialization
      setTimeout(() => {
        if (typeof homebridge.getPluginConfig === 'function') {
          console.log('Homebridge API now initialized');
          resolve();
        } else {
          reject(new Error('Homebridge API methods not available after ready event'));
        }
      }, 1000);
    });
  });
}

/**
 * Wait for all required DOM elements to be available
 * @returns {Promise<void>} Resolves when DOM elements are available
 */
async function waitForDOMElements() {
  const requiredElements = [
    'apiToken', 'unit', 'pollingInterval', 'logLevel', 'enableSchedules'
  ];
  
  return new Promise((resolve, reject) => {
    // If all elements already exist, resolve immediately
    if (requiredElements.every(id => document.getElementById(id))) {
      console.log('All required DOM elements already available');
      resolve();
      return;
    }
    
    let attempts = 0;
    const maxAttempts = 10;
    const checkInterval = 300;
    
    // Check periodically for elements
    const intervalId = setInterval(() => {
      attempts++;
      
      if (requiredElements.every(id => document.getElementById(id))) {
        console.log(`All required DOM elements now available after ${attempts} attempts`);
        clearInterval(intervalId);
        resolve();
      } else if (attempts >= maxAttempts) {
        const missing = requiredElements.filter(id => !document.getElementById(id));
        console.error(`Timed out waiting for DOM elements: ${missing.join(', ')}`);
        clearInterval(intervalId);
        reject(new Error(`DOM elements not available: ${missing.join(', ')}`));
      }
    }, checkInterval);
  });
}

/**
 * Populate form fields with configuration values
 * @param {Object} config - The configuration object
 */
function populateFormFields(config) {
  // Safely get DOM elements with logging
  const getElement = (id) => {
    const element = document.getElementById(id);
    if (!element) {
      console.warn(`Element ${id} not found in DOM`);
    }
    return element;
  };
  
  // Get form elements
  const apiTokenInput = getElement('apiToken');
  const unitSelect = getElement('unit');
  const pollingIntervalInput = getElement('pollingInterval');
  const logLevelSelect = getElement('logLevel');
  const enableSchedulesCheckbox = getElement('enableSchedules');
  const schedulesContainer = getElement('schedulesContainer');
  
  console.log('Setting form values from config:', {
    hasApiToken: !!config.apiToken,
    unit: config.unit,
    pollingInterval: config.pollingInterval,
    logLevel: config.logLevel,
    enableSchedules: config.enableSchedules,
    scheduleCount: Array.isArray(config.schedules) ? config.schedules.length : 0
  });
  
  // Set API token if available
  if (apiTokenInput && config.apiToken) {
    apiTokenInput.value = config.apiToken;
    console.log('API token loaded from config');
  } else if (apiTokenInput) {
    console.warn('No API token found in config');
    apiTokenInput.value = ''; // Ensure field is empty
  }
  
  // Set temperature unit if available
  if (unitSelect && config.unit) {
    unitSelect.value = config.unit;
    console.log(`Temperature unit set to ${config.unit}`);
  } else if (unitSelect) {
    unitSelect.value = 'C'; // Set default
  }
  // Set polling interval if available
  if (pollingIntervalInput && config.pollingInterval) {
    pollingIntervalInput.value = config.pollingInterval;
    console.log(`Polling interval set to ${config.pollingInterval}s`);
  } else if (pollingIntervalInput) {
    pollingIntervalInput.value = '90'; // Set default
  }
  
  // Set log level if available
  if (logLevelSelect && config.logLevel) {
    logLevelSelect.value = config.logLevel;
    console.log(`Log level set to ${config.logLevel}`);
  } else if (logLevelSelect) {
    logLevelSelect.value = 'normal'; // Set default
  }
  
  // Handle schedules
  if (enableSchedulesCheckbox) {
    const enableSchedules = config.enableSchedules === true;
    enableSchedulesCheckbox.checked = enableSchedules;
    
    if (schedulesContainer) {
      schedulesContainer.classList.toggle('hidden', !enableSchedules);
    }
    
    // Load schedules if available
    if (Array.isArray(config.schedules) && config.schedules.length > 0) {
      // Create a clean copy of schedules with unit info
      window.schedules = config.schedules.map(schedule => ({
        ...schedule,
        unit: schedule.unit || (unitSelect ? unitSelect.value : 'C')
      }));
      
      // Assign to global schedules variable for compatibility
      if (typeof window.renderScheduleList === 'function') {
        console.log('Rendering schedule list with', window.schedules.length, 'schedules');
        window.renderScheduleList();
      } else {
        console.warn('renderScheduleList function not available');
      }
      
      console.log(`Loaded ${window.schedules.length} schedules from config`);
    } else if (enableSchedules) {
      console.log('No schedules found in config but schedules are enabled');
      window.schedules = [];
    }
  }
  
  // Apply the updated temperature validation based on the loaded unit
  if (typeof window.updateTemperatureValidation === 'function') {
    window.updateTemperatureValidation();
  } else {
    console.warn('updateTemperatureValidation function not available');
  }
}

/**
 * Save configuration to Homebridge
 * @returns {Promise<void>}
 */
window.saveConfig = async function() {
  try {
    window.showLoading('Saving configuration...');
    console.log('Starting save process...');
    
    // Verify Homebridge API is available
    await ensureHomebridgeReady();
    
    // Get current config to update
    console.log('Fetching current config...');
    const pluginConfig = await homebridge.getPluginConfig();
    console.log('Current plugin config:', pluginConfig);
    
    // Get values from form
    const getInputValue = (id) => {
      const element = document.getElementById(id);
      return element ? element.value : null;
    };
    
    const getCheckboxValue = (id) => {
      const element = document.getElementById(id);
      return element ? element.checked : false;
    };
    
    const apiToken = getInputValue('apiToken');
    const unit = getInputValue('unit');
    const pollingInterval = parseInt(getInputValue('pollingInterval'), 10);
    const logLevel = getInputValue('logLevel');
    const enableSchedules = getCheckboxValue('enableSchedules');
    
    // Validate required fields
    if (!apiToken) {
      window.showToast('error', 'API token is required', 'Validation Error');
      window.hideLoading();
      return;
    }
    
    // Validate polling interval
    if (isNaN(pollingInterval) || pollingInterval < 60 || pollingInterval > 300) {
      window.showToast('error', 'Polling interval must be between 60 and 300 seconds', 'Validation Error');
      window.hideLoading();
      return;
    }
    
    // Create updated config
    const config = {
      platform: 'SleepMeSimple',
      name: 'SleepMe Simple',
      apiToken,
      unit,
      pollingInterval,
      logLevel,
      enableSchedules
    };
    
    console.log('Prepared config object:', {...config, apiToken: '[REDACTED]'});
    
    // Add schedules if enabled
    if (enableSchedules && window.schedules && window.schedules.length > 0) {
      // Clean schedules for storage
      config.schedules = window.schedules.map(schedule => {
        // Create a clean schedule object
        const cleanSchedule = {
          type: schedule.type,
          time: schedule.time,
          temperature: parseFloat(schedule.temperature)
        };
        
        // Add day property for Specific Day schedules
        if (schedule.type === 'Specific Day' && schedule.day !== undefined) {
          cleanSchedule.day = parseInt(schedule.day, 10);
        }
        
        // Add optional description
        if (schedule.description) {
          cleanSchedule.description = schedule.description;
        }
        
        return cleanSchedule;
      });
      
      console.log(`Adding ${config.schedules.length} schedules to config`);
    }
    
    // Find current config position and update
    const existingConfigIndex = Array.isArray(pluginConfig) ? 
      pluginConfig.findIndex(cfg => cfg && cfg.platform === 'SleepMeSimple') : -1;

    let updatedConfig;
    if (existingConfigIndex >= 0) {
      // Replace existing config
      updatedConfig = [...pluginConfig];
      updatedConfig[existingConfigIndex] = config;
      console.log(`Updating existing config at index ${existingConfigIndex}`);
    } else if (Array.isArray(pluginConfig)) {
      // Add new config to array
      updatedConfig = [...pluginConfig, config];
      console.log('Adding new config to existing array');
    } else {
      // Create new config array
      updatedConfig = [config];
      console.log('Creating new config array');
    }
    
    // Update plugin config - IMPORTANT FIX HERE
    console.log('Updating plugin config...');
    try {
      const updateResult = await homebridge.updatePluginConfig(updatedConfig);
      console.log('Update result:', updateResult);
    } catch (updateError) {
      console.error('Error updating config:', updateError);
      window.showToast('error', `Update failed: ${updateError.message}`, 'Save Error');
      window.hideLoading();
      return;
    }
    
    // Save changes to disk
    console.log('Saving config to disk...');
    try {
      await homebridge.savePluginConfig();
      console.log('Config saved successfully');
      window.showToast('success', 'Configuration saved successfully', 'Save Complete');
    } catch (saveError) {
      console.error('Error saving config to disk:', saveError);
      window.showToast('error', `Save to disk failed: ${saveError.message}`, 'Save Error');
    }
    
    window.hideLoading();
  } catch (error) {
    console.error('Save configuration error:', error);
    window.showToast('error', 'Failed to save configuration: ' + error.message, 'Save Error');
    window.hideLoading();
  }
};