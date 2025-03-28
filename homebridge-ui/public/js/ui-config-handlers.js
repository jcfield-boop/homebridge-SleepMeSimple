/**
 * Configuration handling for SleepMe Simple Homebridge Plugin UI
 * Provides functions to load and save configuration data
 */

/**
 * Load configuration from Homebridge
 * Uses the Homebridge UI APIs to fetch plugin configuration
 * @returns {Promise<Object>} The loaded configuration object
 */
async function loadConfig() {
  try {
    showLoading('Loading configuration...');
    
    // Ensure homebridge object is fully initialized
    await ensureHomebridgeReady();
    
    // Log homebridge info for debugging
    console.log('Homebridge plugin info:', homebridge.plugin);
    console.log('Homebridge server env:', homebridge.serverEnv);
    
    // Request direct config check from server
    try {
      const configCheck = await homebridge.request('/config/check');
      if (configCheck.success) {
        showToast('success', 'Server can access config.json directly', 'Config Check');
        console.log('Server config check result:', configCheck);
      } else {
        showToast('warning', 'Server cannot access config.json directly', 'Config Warning');
        console.warn('Server config check warning:', configCheck);
      }
    } catch (checkError) {
      console.error('Config check error:', checkError);
      showToast('warning', 'Config check failed: ' + checkError.message, 'Config Warning');
    }
    
    // Get the plugin config using the Homebridge API
    let retries = 0;
    let pluginConfig = null;
    let retryDelay = 1000;
    
    // Try up to 3 times to load the config with increasing delay
    while (retries < 3 && !pluginConfig) {
      try {
        console.log(`Attempt ${retries + 1}/3 to get plugin config...`);
        pluginConfig = await homebridge.getPluginConfig();
        
        console.log('Raw plugin config:', JSON.stringify(pluginConfig));
        showToast('success', 'Configuration retrieved successfully', 'Config Loaded');
      } catch (configError) {
        retries++;
        console.error(`Config load attempt ${retries} failed:`, configError);
        showToast('warning', `Config load attempt ${retries} failed: ${configError.message}`, 'Retry');
        
        if (retries < 3) {
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay *= 2; // Double the delay for each retry
        } else {
          throw new Error(`Failed to load config after ${retries} attempts: ${configError.message}`);
        }
      }
    }
    
    // Find our platform configuration with more forgiving matching
    let config = {};
    if (Array.isArray(pluginConfig) && pluginConfig.length > 0) {
      // Try to find by exact platform name
      let platformConfig = pluginConfig.find(cfg => 
        cfg && cfg.platform && cfg.platform.toLowerCase() === 'sleepmebasic');
      
      // If not found, try the alternative name
      if (!platformConfig) {
        platformConfig = pluginConfig.find(cfg => 
          cfg && cfg.platform && cfg.platform.toLowerCase() === 'sleepme' || 
          cfg.platform === 'SleepMeSimple');
      }
      
      // If still not found, take the first platform config
      if (!platformConfig && pluginConfig.length > 0) {
        platformConfig = pluginConfig.find(cfg => cfg && cfg.platform) || pluginConfig[0];
      }
      
      config = platformConfig || {};
      
      console.log('Found platform config:', config);
      showToast('success', 'Found configuration in API response', 'Config Found');
    } else {
      console.warn('No plugin config found in API response');
      showToast('info', 'No existing configuration found, using defaults', 'New Config');
    }
    
    // Wait for DOM elements to be available
    await waitForDOMElements();
    
    // Fill form fields with config values
    populateFormFields(config);
    
    hideLoading();
    return config;
  } catch (error) {
    console.error('Configuration loading error:', error);
    showToast('error', 'Failed to load configuration: ' + error.message, 'Config Error');
    hideLoading();
    return {};
  }
}

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
    showToast('info', 'API token loaded from config', 'Config');
  } else if (apiTokenInput) {
    console.warn('No API token found in config');
  }
  
  // Set temperature unit if available
  if (unitSelect && config.unit) {
    unitSelect.value = config.unit;
    showToast('info', `Temperature unit set to ${config.unit}`, 'Config');
  }
  
  // Set polling interval if available
  if (pollingIntervalInput && config.pollingInterval) {
    pollingIntervalInput.value = config.pollingInterval;
    showToast('info', `Polling interval set to ${config.pollingInterval}s`, 'Config');
  }
  
  // Set log level if available
  if (logLevelSelect && config.logLevel) {
    logLevelSelect.value = config.logLevel;
    showToast('info', `Log level set to ${config.logLevel}`, 'Config');
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
      schedules = [...window.schedules];
      
      // Render schedule list if the function exists
      if (typeof renderScheduleList === 'function') {
        console.log('Rendering schedule list with', schedules.length, 'schedules');
        renderScheduleList();
      } else {
        console.warn('renderScheduleList function not available');
      }
      
      showToast('info', `Loaded ${schedules.length} schedules from config`, 'Schedules');
    } else if (enableSchedules) {
      console.log('No schedules found in config but schedules are enabled');
      window.schedules = [];
      schedules = [];
      showToast('info', 'No existing schedules found', 'Schedules');
    }
  }
  
  // Apply the updated temperature validation based on the loaded unit
  if (typeof updateTemperatureValidation === 'function') {
    updateTemperatureValidation();
  } else {
    console.warn('updateTemperatureValidation function not available');
  }
}

/**
 * Save configuration to Homebridge
 * @returns {Promise<void>}
 */
async function saveConfig() {
  try {
    showLoading('Saving configuration...');
    showToast('info', 'Starting save process...', 'Save Config');
    
    // Verify Homebridge API is available
    await ensureHomebridgeReady();
    
    // Get current config to update
    showToast('info', 'Fetching current config...', 'Save Step 1');
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
      showToast('error', 'API token is required', 'Validation Error');
      hideLoading();
      return;
    }
    
    // Validate polling interval
    if (isNaN(pollingInterval) || pollingInterval < 60 || pollingInterval > 300) {
      showToast('error', 'Polling interval must be between 60 and 300 seconds', 'Validation Error');
      hideLoading();
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
    showToast('info', 'Config object prepared...', 'Save Step 2');
    
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
      showToast('info', `Added ${config.schedules.length} schedules to config`, 'Schedules');
    }
    
    // Find current config position and update
    const existingConfigIndex = Array.isArray(pluginConfig) ? 
      pluginConfig.findIndex(cfg => cfg.platform === 'SleepMeSimple') : -1;

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
    
    // Update plugin config
    showToast('info', 'Calling updatePluginConfig...', 'Save Step 3');
    await homebridge.updatePluginConfig(updatedConfig);
    
    // Save changes to disk
    showToast('info', 'Calling savePluginConfig...', 'Save Step 4');
    await homebridge.savePluginConfig();
    
    // Verify config was saved
    try {
      const verifyResult = await homebridge.request('/config/check');
      console.log('Config verification result:', verifyResult);
      
      if (verifyResult.success && verifyResult.platformFound) {
        showToast('success', 'Configuration verified by server', 'Config Verified');
      } else {
        showToast('warning', 'Server verification inconclusive', 'Verify Warning');
      }
    } catch (verifyError) {
      console.error('Verification error:', verifyError);
      showToast('warning', 'Could not verify configuration: ' + verifyError.message, 'Verify Warning');
    }
    
    hideLoading();
    showToast('success', 'Configuration saved successfully', 'Save Complete');
  } catch (error) {
    console.error('Save configuration error:', error);
    showToast('error', 'Failed to save configuration: ' + error.message, 'Save Error');
    hideLoading();
  }
}

/**
 * Show loading indicator with message
 * @param {string} message - Message to display
 */
function showLoading(message) {
  if (typeof homebridge !== 'undefined' && typeof homebridge.showSpinner === 'function') {
    homebridge.showSpinner();
  }
  showToast('info', message, 'Loading...');
  console.log('Loading:', message);
}

/**
 * Hide loading indicator
 */
function hideLoading() {
  if (typeof homebridge !== 'undefined' && typeof homebridge.hideSpinner === 'function') {
    homebridge.hideSpinner();
  }
  console.log('Loading complete');
}

/**
 * Show toast notification
 * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
 * @param {string} message - Toast message
 * @param {string} title - Toast title
 * @param {Function} callback - Optional callback function
 */
function showToast(type, message, title, callback) {
  // Log to console for debugging
  const logMethod = type === 'error' ? console.error : 
                   type === 'warning' ? console.warn : console.log;
  
  logMethod(`${title}: ${message}`);
  
  // Display toast if homebridge is available
  if (homebridge && homebridge.toast) {
    if (homebridge.toast[type]) {
      homebridge.toast[type](message, title);
    } else {
      homebridge.toast.info(message, title);
    }
  }

  if (typeof callback === 'function') {
    setTimeout(callback, 2000);
  }
}