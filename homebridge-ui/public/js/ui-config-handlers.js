/**
 * Load configuration from Homebridge
 * Uses the proper Homebridge UI APIs to fetch plugin configuration
 */
async function loadConfig() {
  try {
    showLoading('Loading configuration...');
    
    // Make sure homebridge object is available and initialized
    if (typeof homebridge === 'undefined') {
      throw new Error('Homebridge API not available - cannot load config');
    }
    
    if (typeof homebridge.getPluginConfig !== 'function') {
      throw new Error('Homebridge getPluginConfig method not available');
    }
    
    showToast('info', 'Fetching plugin configuration...', 'Config');
    
    // Request direct config check from server - this is optional but helpful
    try {
      const configCheck = await homebridge.request('/config/check');
      if (configCheck.success) {
        showToast('success', 'Server can access config.json directly', 'Config Check');
      } else {
        showToast('warning', 'Server cannot access config.json directly', 'Config Warning');
      }
    } catch (checkError) {
      // Don't fail on this error, it's just informational
      showToast('warning', 'Config check failed: ' + checkError.message, 'Config Warning');
    }
    
    // This is the critical part - get the plugin config using the Homebridge API
    let retries = 0;
    let pluginConfig = null;
    
    // Try up to 3 times to load the config
    while (retries < 3 && !pluginConfig) {
      try {
        pluginConfig = await homebridge.getPluginConfig();
        showToast('success', 'Configuration retrieved successfully', 'Config Loaded');
      } catch (configError) {
        retries++;
        showToast('warning', `Config load attempt ${retries} failed: ${configError.message}`, 'Retry');
        
        if (retries < 3) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw new Error(`Failed to load config after ${retries} attempts: ${configError.message}`);
        }
      }
    }
    
    // Find our platform configuration (should be the first/only one)
    let config = {};
    if (Array.isArray(pluginConfig) && pluginConfig.length > 0) {
      config = pluginConfig.find(cfg => cfg.platform === 'SleepMeSimple') || pluginConfig[0] || {};
      showToast('success', 'Found configuration in API response', 'Config Found');
    } else {
      showToast('info', 'No existing configuration found, using defaults', 'New Config');
    }
    
    // Fill form fields with config values
    const apiTokenInput = document.getElementById('apiToken');
    const unitSelect = document.getElementById('unit');
    const pollingIntervalInput = document.getElementById('pollingInterval');
    const logLevelSelect = document.getElementById('logLevel');
    const enableSchedulesCheckbox = document.getElementById('enableSchedules');
    const schedulesContainer = document.getElementById('schedulesContainer');
    
    // Set API token if available
    if (apiTokenInput && config.apiToken) {
      apiTokenInput.value = config.apiToken;
      showToast('info', 'API token loaded from config', 'Config');
    } else if (apiTokenInput) {
      showToast('warning', 'No API token found in config', 'Config');
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
      if (Array.isArray(config.schedules)) {
        // Define schedules with global scope
        window.schedules = config.schedules.map(schedule => ({
          ...schedule,
          unit: schedule.unit || (unitSelect ? unitSelect.value : 'C') // Set unit if not present
        }));
        
        // Render schedule list if the function exists
        if (typeof renderScheduleList === 'function') {
          renderScheduleList();
        }
        
        showToast('info', `Loaded ${window.schedules.length} schedules from config`, 'Schedules');
      } else if (enableSchedules) {
        showToast('info', 'No existing schedules found', 'Schedules');
      }
    }
    
    // Apply the updated temperature validation based on the loaded unit
    if (typeof updateTemperatureValidation === 'function') {
      updateTemperatureValidation();
    }
    
    hideLoading();
    return config;
  } catch (error) {
    showToast('error', 'Failed to load configuration: ' + error.message, 'Config Error');
    hideLoading();
    return {};
  }
}

/**
 * Save configuration to Homebridge
 * Uses the proper Homebridge UI APIs to update plugin configuration
 */
async function saveConfig() {
  try {
    showLoading('Saving configuration...');
    showToast('info', 'Starting save process...', 'Save Config');
    
    // Verify Homebridge API is available
    if (typeof homebridge === 'undefined' || typeof homebridge.getPluginConfig !== 'function') {
      throw new Error('Homebridge API not available for saving configuration');
    }
    
    // Get current config to update
    showToast('info', 'Fetching current config...', 'Save Step 1');
    const pluginConfig = await homebridge.getPluginConfig();
    
    // Get values from form
    const apiToken = document.getElementById('apiToken').value;
    const unit = document.getElementById('unit').value;
    const pollingInterval = parseInt(document.getElementById('pollingInterval').value, 10);
    const logLevel = document.getElementById('logLevel').value;
    const enableSchedules = document.getElementById('enableSchedules').checked;
    
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
      
      showToast('info', `Added ${config.schedules.length} schedules to config`, 'Schedules');
    }
    
    // Critical part 1: Update config via homebridge API
    showToast('info', 'Calling updatePluginConfig...', 'Save Step 3');
    const existingConfig = Array.isArray(pluginConfig) ? 
      pluginConfig.find(cfg => cfg.platform === 'SleepMeSimple') : null;
    
    if (existingConfig) {
      // Find the index of the existing config
      const configIndex = pluginConfig.findIndex(cfg => cfg.platform === 'SleepMeSimple');
      if (configIndex >= 0) {
        // Replace the existing config
        const updatedConfig = [...pluginConfig];
        updatedConfig[configIndex] = config;
        await homebridge.updatePluginConfig(updatedConfig);
        showToast('info', 'Updated existing configuration', 'Config Update');
      } else {
        // This shouldn't happen, but handle it anyway
        await homebridge.updatePluginConfig([...pluginConfig, config]);
        showToast('info', 'Added new configuration', 'Config Create');
      }
    } else if (Array.isArray(pluginConfig)) {
      // Add new config to array
      await homebridge.updatePluginConfig([...pluginConfig, config]);
      showToast('info', 'Added new configuration', 'Config Create');
    } else {
      // Create new config array
      await homebridge.updatePluginConfig([config]);
      showToast('info', 'Created new configuration array', 'Config Create');
    }
    
    // Critical part 2: Save changes to disk
    showToast('info', 'Calling savePluginConfig...', 'Save Step 4');
    await homebridge.savePluginConfig();
    
    // Verify config was saved via the server
    try {
      await homebridge.request('/config/check');
      showToast('success', 'Configuration verified by server', 'Config Verified');
    } catch (verifyError) {
      showToast('warning', 'Could not verify configuration: ' + verifyError.message, 'Verify Warning');
      // Continue despite verification error
    }
    
    hideLoading();
    showToast('success', 'Configuration saved successfully', 'Save Complete');
  } catch (error) {
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
}

/**
 * Hide loading indicator
 */
function hideLoading() {
  if (typeof homebridge !== 'undefined' && typeof homebridge.hideSpinner === 'function') {
    homebridge.hideSpinner();
  }
}

/**
 * Show toast notification
 * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
 * @param {string} message - Toast message
 * @param {string} title - Toast title
 * @param {Function} callback - Optional callback function
 */
function showToast(type, message, title, callback) {
  if (!homebridge || !homebridge.toast) {
    // Fallback if homebridge toast not available
    console.log(`Toast (${type}): ${title} - ${message}`);
    return;
  }

  if (homebridge.toast[type]) {
    homebridge.toast[type](message, title);
  } else {
    homebridge.toast.info(message, title);
  }

  if (typeof callback === 'function') {
    setTimeout(callback, 2000);
  }
}