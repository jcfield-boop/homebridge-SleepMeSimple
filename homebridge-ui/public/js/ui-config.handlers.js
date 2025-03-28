/**
 * Load configuration from Homebridge
 * Uses the proper Homebridge UI APIs to fetch plugin configuration
 */
async function loadConfig() {
  try {
    showLoading('Loading configuration...');
    
    // Use the Homebridge API to get plugin config (recommended approach)
    const pluginConfig = await homebridge.getPluginConfig();
    
    // Find our platform configuration (should be the first/only one)
    let config = {};
    if (Array.isArray(pluginConfig) && pluginConfig.length > 0) {
      config = pluginConfig[0] || {};
    }
    
    console.log('Loaded config:', config);
    
    // Fill form fields with config values
    const apiTokenInput = document.getElementById('apiToken');
    const unitSelect = document.getElementById('unit');
    const pollingIntervalInput = document.getElementById('pollingInterval');
    const logLevelSelect = document.getElementById('logLevel');
    const enableSchedulesCheckbox = document.getElementById('enableSchedules');
    const schedulesContainer = document.getElementById('schedulesContainer');
    
    if (apiTokenInput && config.apiToken) {
      apiTokenInput.value = config.apiToken;
    }
    
    if (unitSelect && config.unit) {
      unitSelect.value = config.unit;
    }
    
    if (pollingIntervalInput && config.pollingInterval) {
      pollingIntervalInput.value = config.pollingInterval;
    }
    
    if (logLevelSelect && config.logLevel) {
      logLevelSelect.value = config.logLevel;
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
          unit: schedule.unit || unitSelect.value // Set unit if not present
        }));
        
        // Render schedule list
        renderScheduleList();
      }
    }
    
    // Apply the updated temperature validation based on the loaded unit
    updateTemperatureValidation();
    
    hideLoading();
    return config;
  } catch (error) {
    console.error('Error loading config:', error);
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
    }
    
    // Update config via homebridge API (proper method)
    if (Array.isArray(pluginConfig) && pluginConfig.length > 0) {
      // Update existing config
      await homebridge.updatePluginConfig([config]);
    } else {
      // Create new config
      await homebridge.updatePluginConfig([config]);
    }
    
    // Save changes to disk
    await homebridge.savePluginConfig();
    
    hideLoading();
    showToast('success', 'Configuration saved successfully', 'Save Complete');
  } catch (error) {
    console.error('Error saving config:', error);
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
    
    // Send test request to server
    const response = await homebridge.request('/device/test', { apiToken });
    
    hideLoading();
    
    // Handle the response
    if (response.success) {
      showToast(
        'success', 
        `Connection successful. Found ${response.devices} device(s): ${response.deviceInfo.map(d => d.name).join(', ')}`, 
        'Test Connection'
      );
    } else {
      showToast('error', response.error || 'Unknown error', 'Connection Failed');
    }
  } catch (error) {
    console.error('Connection test error:', error);
    showToast('error', 'Connection test failed: ' + error.message, 'Test Error');
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
    
    if (response.success && Array.isArray(response.logs)) {
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
      }
    } else {
      showToast('error', response.error || 'Failed to retrieve logs', 'Logs Error');
    }
  } catch (error) {
    console.error('Error fetching logs:', error);
    showToast('error', 'Failed to fetch logs: ' + error.message, 'Logs Error');
    hideLoading();
  }
}