/**
 * Load configuration from Homebridge
 * Uses the proper Homebridge UI APIs to fetch plugin configuration
 * @returns {Promise<Object>} Loaded plugin configuration
 * @throws {Error} If loading fails
 */
async function loadConfig() {
  try {
    showLoading('Loading configuration...');
    
    // Ensure homebridge object is available and ready
    if (typeof homebridge === 'undefined') {
      throw new Error('Homebridge object is not available');
    }
    
    if (typeof homebridge.getPluginConfig !== 'function') {
      throw new Error('Homebridge API not properly initialized');
    }
    
    // Request direct config check from server
    try {
      showToast('info', 'Checking if server can access config.json...', 'Config Check');
      const configCheck = await homebridge.request('/config/check');
      if (configCheck.success) {
        showToast('success', 'Server can access config.json directly', 'Config Check');
        if (configCheck.platformFound) {
          showToast('info', `Found SleepMeSimple in config.json with ${configCheck.platformConfig.scheduleCount} schedules`, 'Config File');
        } else {
          showToast('warning', 'SleepMeSimple platform not found in config.json', 'Config File');
        }
      } else {
        showToast('warning', `Cannot access config.json directly: ${configCheck.error || 'Unknown error'}`, 'Config Check');
      }
    } catch (checkError) {
      showToast('warning', 'Failed to check config file: ' + checkError.message, 'Config Check');
      // Continue anyway, as we'll try to use the Homebridge API
    }
    
    // Use the Homebridge API to get plugin config
    showToast('info', 'Loading configuration via Homebridge API...', 'Loading Config');
    
    // Get the plugin config with retry logic
    let pluginConfig = null;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        pluginConfig = await homebridge.getPluginConfig();
        break; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw error; // Max retries reached, propagate error
        }
        
        // Wait before retrying (exponential backoff)
        const delayMs = 1000 * Math.pow(2, retryCount);
        showToast('warning', `Retry ${retryCount}/${maxRetries} after ${delayMs/1000}s...`, 'Config Retry');
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    showToast('success', 'Successfully retrieved configuration via API', 'Config Loaded');
    
    // Log what we received
    if (Array.isArray(pluginConfig)) {
      showToast('info', `Retrieved ${pluginConfig.length} config blocks`, 'Config Count');
    } else {
      showToast('warning', 'Retrieved config is not an array', 'Config Format');
    }
    
    // Find our platform configuration (should be the first/only one)
    let config = {};
    if (Array.isArray(pluginConfig) && pluginConfig.length > 0) {
      // Find the SleepMeSimple platform config
      const platformConfig = pluginConfig.find(cfg => cfg.platform === 'SleepMeSimple');
      
      if (platformConfig) {
        config = platformConfig;
        showToast('success', 'Found existing configuration in API response', 'Config Found');
        showToast('info', `Config has API token: ${!!config.apiToken}, Unit: ${config.unit || 'not set'}`, 'Config Details');
      } else if (pluginConfig.length > 0) {
        // Fall back to the first config
        config = pluginConfig[0];
        showToast('warning', 'SleepMeSimple platform not found, using first config block', 'Config Warning');
      } else {
        showToast('info', 'No existing configuration found, using defaults', 'New Config');
      }
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
      showToast('info', 'API token loaded from config', 'API Token');
    } else if (apiTokenInput) {
      showToast('warning', 'No API token found in config', 'API Token');
    }
    
    // Set temperature unit if available
    if (unitSelect && config.unit) {
      unitSelect.value = config.unit;
      showToast('info', `Temperature unit set to ${config.unit}`, 'Unit');
    }
    
    // Set polling interval if available
    if (pollingIntervalInput && config.pollingInterval) {
      pollingIntervalInput.value = config.pollingInterval;
      showToast('info', `Polling interval set to ${config.pollingInterval}s`, 'Polling');
    }
    
    // Set log level if available
    if (logLevelSelect && config.logLevel) {
      logLevelSelect.value = config.logLevel;
      showToast('info', `Log level set to ${config.logLevel}`, 'Log Level');
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
        // Create a deep copy of schedules to avoid reference issues
        schedules = JSON.parse(JSON.stringify(config.schedules)).map(schedule => ({
          ...schedule,
          unit: schedule.unit || (unitSelect ? unitSelect.value : 'C') // Set unit if not present
        }));
        
        // Render schedule list if function is available
        if (typeof renderScheduleList === 'function') {
          renderScheduleList();
        }
        
        showToast('info', `Loaded ${schedules.length} schedules from config`, 'Schedules');
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
    hideLoading();
    showToast('error', 'Failed to load configuration: ' + error.message, 'Config Error');
    throw error; // Re-throw to allow the caller to handle
  }
}

/**
 * Check directly if config is loaded
 * @returns {Promise<boolean>} True if config is loaded
 */
async function checkDirectConfigStatus() {
  try {
    const response = await homebridge.request('/config/check');
    if (response && response.success) {
      showToast('success', 'Config file is accessible by server', 'Config Status');
      return true;
    } else {
      showToast('warning', 'Config file is not accessible by server', 'Config Status');
      return false;
    }
  } catch (error) {
    showToast('error', 'Failed to check config status: ' + error.message, 'Config Error');
    return false;
  }
}

/**
 * Save configuration to Homebridge
 * Uses the proper Homebridge UI APIs to update plugin configuration
 * @returns {Promise<boolean>} True if save was successful
 */
async function saveConfig() {
  try {
    showLoading('Saving configuration...');
    showToast('info', 'Starting save process...', 'Save Config');
    
    // Get current config to update
    showToast('info', 'Fetching current config...', 'Save Step 1');
    const pluginConfig = await homebridge.getPluginConfig();
    
    // Get values from form
    const apiTokenInput = document.getElementById('apiToken');
    const unitSelect = document.getElementById('unit');
    const pollingIntervalInput = document.getElementById('pollingInterval');
    const logLevelSelect = document.getElementById('logLevel');
    const enableSchedulesCheckbox = document.getElementById('enableSchedules');
    
    // Validate that required elements exist
    if (!apiTokenInput || !unitSelect || !pollingIntervalInput || 
        !logLevelSelect || !enableSchedulesCheckbox) {
      showToast('error', 'Some form elements could not be found', 'UI Error');
      hideLoading();
      return false;
    }
    
    const apiToken = apiTokenInput.value;
    const unit = unitSelect.value;
    const pollingInterval = parseInt(pollingIntervalInput.value, 10);
    const logLevel = logLevelSelect.value;
    const enableSchedules = enableSchedulesCheckbox.checked;
    
    // Validate required fields
    if (!apiToken) {
      showToast('error', 'API token is required', 'Validation Error');
      hideLoading();
      return false;
    }
    
    // Validate polling interval
    if (isNaN(pollingInterval) || pollingInterval < 60 || pollingInterval > 300) {
      showToast('error', 'Polling interval must be between 60 and 300 seconds', 'Validation Error');
      hideLoading();
      return false;
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
    if (enableSchedules && schedules.length > 0) {
      // Clean schedules for storage
      config.schedules = schedules.map(schedule => {
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
    
    // Update config via homebridge API with retry logic
    let updateSuccess = false;
    let saveSuccess = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    // Retry loop for updatePluginConfig
    while (retryCount < maxRetries && !updateSuccess) {
      try {
        showToast('info', `Calling updatePluginConfig (attempt ${retryCount + 1})...`, 'Save Step 3');
        
        // Find existing config index
        let existingIndex = -1;
        if (Array.isArray(pluginConfig)) {
          existingIndex = pluginConfig.findIndex(cfg => cfg.platform === 'SleepMeSimple');
        }
        
        // Prepare new config array
        let newConfig = [];
        if (existingIndex >= 0) {
          // Update existing config
          newConfig = [...pluginConfig];
          newConfig[existingIndex] = config;
          await homebridge.updatePluginConfig(newConfig);
          showToast('info', 'Updated existing configuration', 'Config Update');
        } else {
          // Create new config or append to existing
          if (Array.isArray(pluginConfig)) {
            newConfig = [...pluginConfig, config];
          } else {
            newConfig = [config];
          }
          await homebridge.updatePluginConfig(newConfig);
          showToast('info', 'Created new configuration', 'Config Create');
        }
        
        updateSuccess = true;
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw new Error(`Failed to update config after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retrying (exponential backoff)
        const delayMs = 1000 * Math.pow(2, retryCount);
        showToast('warning', `Config update failed, retry ${retryCount}/${maxRetries} after ${delayMs/1000}s...`, 'Config Retry');
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    // Retry loop for savePluginConfig
    retryCount = 0;
    while (retryCount < maxRetries && !saveSuccess) {
      try {
        showToast('info', `Calling savePluginConfig (attempt ${retryCount + 1})...`, 'Save Step 4');
        await homebridge.savePluginConfig();
        saveSuccess = true;
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw new Error(`Failed to save config after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retrying (exponential backoff)
        const delayMs = 1000 * Math.pow(2, retryCount);
        showToast('warning', `Config save failed, retry ${retryCount}/${maxRetries} after ${delayMs/1000}s...`, 'Save Retry');
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    // Verify config was saved
    await checkDirectConfigStatus();
    
    hideLoading();
    showToast('success', 'Configuration saved successfully', 'Save Complete');
    return true;
  } catch (error) {
    showToast('error', 'Failed to save configuration: ' + error.message, 'Save Error');
    hideLoading();
    return false;
  }
}

/**
 * Test connection to the SleepMe API
 * Sends a request to the server to test API connectivity
 * @returns {Promise<boolean>} True if test was successful
 */
async function testConnection() {
  try {
    showLoading('Testing connection...');
    
    // Get API token from input
    const apiTokenInput = document.getElementById('apiToken');
    if (!apiTokenInput) {
      showToast('error', 'API token input not found', 'UI Error');
      hideLoading();
      return false;
    }
    
    const apiToken = apiTokenInput.value;
    
    if (!apiToken) {
      showToast('error', 'API token is required to test connection', 'Validation Error');
      hideLoading();
      return false;
    }
    
    showToast('info', 'Sending test request to SleepMe API...', 'Testing');
    
    // Send test request to server
    const response = await homebridge.request('/device/test', { apiToken });
    
    hideLoading();
    
    // Handle the response
    if (response && response.success) {
      showToast(
        'success', 
        `Connection successful. Found ${response.devices} device(s): ${response.deviceInfo.map(d => d.name).join(', ')}`, 
        'Test Connection'
      );
      return true;
    } else {
      showToast('error', response.error || 'Unknown error', 'Connection Failed');
      return false;
    }
  } catch (error) {
    showToast('error', 'Connection test failed: ' + (error.message || 'Unknown error'), 'Test Error');
    hideLoading();
    return false;
  }
}

/**
 * Fetch server logs
 * Retrieves logs from the server for debugging
 * @returns {Promise<boolean>} True if logs were fetched successfully
 */
async function fetchServerLogs() {
  try {
    showLoading('Fetching logs...');
    
    // Request logs from server
    const response = await homebridge.request('/logs');
    
    hideLoading();
    
    if (response && response.success && Array.isArray(response.logs)) {
      // Show logs container
      const logsContainer = document.getElementById('logsContainer');
      const logsContent = document.getElementById('logsContent');
      
      if (logsContainer && logsContent) {
        logsContainer.classList.remove('hidden');
        
        // Clear previous logs
        logsContent.innerHTML = '';
        
        // Format and display logs
        response.logs.forEach(log => {
          const logEntry = document.createElement('div');
          logEntry.className = 'log-entry';
          
          // Format timestamp
          const timestamp = new Date(log.timestamp).toLocaleString();
          
          // Create HTML structure
          logEntry.innerHTML = `
            <div class="log-timestamp">${timestamp}</div>
            <div class="log-context">[${log.context}]</div>
            <div class="log-message">${log.message}</div>
            ${log.stack ? `<div class="log-stack">${log.stack}</div>` : ''}
          `;
          
          // Add appropriate styling based on log level
          if (log.level === 'error') {
            logEntry.style.color = '#dc3545';
          } else if (log.level === 'warn') {
            logEntry.style.color = '#fd7e14';
          }
          
          logsContent.appendChild(logEntry);
        });
        
        // Scroll to bottom to show most recent logs
        logsContent.scrollTop = logsContent.scrollHeight;
        
        showToast('success', `Loaded ${response.logs.length} log entries`, 'Logs');
        return true;
      }
    } else {
      showToast('error', response.error || 'Failed to retrieve logs', 'Logs Error');
      return false;
    }
  } catch (error) {
    showToast('error', 'Failed to fetch logs: ' + (error.message || 'Unknown error'), 'Logs Error');
    hideLoading();
    return false;
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