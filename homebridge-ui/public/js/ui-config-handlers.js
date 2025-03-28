/**
 * Load configuration from Homebridge
 * Uses the proper Homebridge UI APIs to fetch plugin configuration
 */
async function loadConfig() {
  try {
    showLoading('Loading configuration...');
    
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
      showToast('error', 'Failed to check config file: ' + checkError.message, 'Config Check');
    }
    
    // Make sure homebridge object is available
    if (typeof homebridge === 'undefined') {
      throw new Error('Homebridge object is not available');
    }
    
    // Make sure getPluginConfig function is available
    if (typeof homebridge.getPluginConfig !== 'function') {
      throw new Error('Homebridge getPluginConfig function is not available');
    }
    
    // Use the Homebridge API to get plugin config
    showToast('info', 'Calling homebridge.getPluginConfig()...', 'Loading Config');
    
    const pluginConfig = await homebridge.getPluginConfig();
    
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
      config = pluginConfig[0] || {};
      showToast('success', 'Found existing configuration in API response', 'Config Found');
      showToast('info', `Config has API token: ${!!config.apiToken}, Unit: ${config.unit || 'not set'}`, 'Config Details');
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
        schedules = config.schedules.map(schedule => ({
          ...schedule,
          unit: schedule.unit || (unitSelect ? unitSelect.value : 'C') // Set unit if not present
        }));
        
        // Render schedule list
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
    showToast('error', 'Failed to load configuration: ' + error.message, 'Config Error');
    hideLoading();
    return {};
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
 */
async function saveConfig() {
  try {
    showLoading('Saving configuration...');
    showToast('info', 'Starting save process...', 'Save Config');
    
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
    
    // Update config via homebridge API
    showToast('info', 'Calling updatePluginConfig...', 'Save Step 3');
    if (Array.isArray(pluginConfig) && pluginConfig.length > 0) {
      // Update existing config
      await homebridge.updatePluginConfig([config]);
      showToast('info', 'Updated existing configuration', 'Config Update');
    } else {
      // Create new config
      await homebridge.updatePluginConfig([config]);
      showToast('info', 'Created new configuration', 'Config Create');
    }
    
    // Save changes to disk
    showToast('info', 'Calling savePluginConfig...', 'Save Step 4');
    await homebridge.savePluginConfig();
    
    // Verify config was saved
    await checkDirectConfigStatus();
    
    hideLoading();
    showToast('success', 'Configuration saved successfully', 'Save Complete');
  } catch (error) {
    showToast('error', 'Failed to save configuration: ' + error.message, 'Save Error');
    hideLoading();
  }
}

/**
 * Test connection to the SleepMe API
 * Sends a request to the server to test API connectivity
 */
async function testConnection() {
  try {
    showLoading('Testing connection...');
    
    // Get API token from input
    const apiToken = document.getElementById('apiToken').value;
    
    if (!apiToken) {
      showToast('error', 'API token is required to test connection', 'Validation Error');
      hideLoading();
      return;
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
    } else {
      showToast('error', response.error || 'Unknown error', 'Connection Failed');
    }
  } catch (error) {
    showToast('error', 'Connection test failed: ' + (error.message || 'Unknown error'), 'Test Error');
    hideLoading();
  }
}

/**
 * Fetch server logs
 * Retrieves logs from the server for debugging
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
      }
    } else {
      showToast('error', response.error || 'Failed to retrieve logs', 'Logs Error');
    }
  } catch (error) {
    showToast('error', 'Failed to fetch logs: ' + (error.message || 'Unknown error'), 'Logs Error');
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

// Add listeners for server events if not already set up
if (typeof homebridge !== 'undefined') {
  // Add listener for config status events from server
  homebridge.addEventListener('config-status', (event) => {
    const configStatus = event.data;
    
    if (configStatus.success) {
      showToast('success', `Config file read: ${configStatus.path}`, 'Config Direct');
      
      if (configStatus.platformFound && configStatus.platformConfig) {
        showToast('info', `Config platform details: ${JSON.stringify(configStatus.platformConfig)}`, 'Config Content');
      }
    } else {
      showToast('error', `Failed to read config file: ${configStatus.error || 'Unknown error'}`, 'Config Error');
    }
  });
}