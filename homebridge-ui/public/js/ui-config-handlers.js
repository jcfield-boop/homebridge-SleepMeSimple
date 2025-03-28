/**
 * Load configuration from Homebridge
 * Uses the proper Homebridge UI APIs to fetch plugin configuration
 */
async function loadConfig() {
  try {
    showLoading('Loading configuration...');
    
    // Make sure homebridge object is available
    if (typeof homebridge === 'undefined') {
      throw new Error('Homebridge object is not available');
    }
    
    // Make sure getPluginConfig function is available
    if (typeof homebridge.getPluginConfig !== 'function') {
      throw new Error('Homebridge getPluginConfig function is not available');
    }
    
    // Use the Homebridge API to get plugin config with retry logic
    let pluginConfig;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        pluginConfig = await homebridge.getPluginConfig();
        showToast('info', 'Configuration loaded successfully', 'Config Loaded');
        break; // Success, exit retry loop
      } catch (retryError) {
        retryCount++;
        
        if (retryCount >= maxRetries) {
          throw new Error(`Failed to get plugin config after ${maxRetries} attempts: ${retryError.message}`);
        }
        
        showToast('warning', `Retry attempt ${retryCount}...`, 'Loading Config');
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Find our platform configuration (should be the first/only one)
    let config = {};
    if (Array.isArray(pluginConfig) && pluginConfig.length > 0) {
      config = pluginConfig[0] || {};
      showToast('success', 'Found existing configuration', 'Config Found');
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
        renderScheduleList();
        
        showToast('info', `Loaded ${schedules.length} schedules from config`, 'Schedules');
      } else if (enableSchedules) {
        showToast('info', 'No existing schedules found', 'Schedules');
      }
    }
    
    // Apply the updated temperature validation based on the loaded unit
    updateTemperatureValidation();
    
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
    
    // Get current config to update
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
      
      showToast('info', `Saving ${config.schedules.length} schedules`, 'Schedules');
    }
    
    // Show saving message with config details
    showToast('info', `Saving: ${unit}°, ${pollingInterval}s polling, ${logLevel} logging`, 'Config');
    
    // Update config via homebridge API
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
    await homebridge.savePluginConfig();
    
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