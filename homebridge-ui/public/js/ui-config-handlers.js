/**
 * Configuration handling for SleepMe Simple Homebridge Plugin UI
 * Provides functions to load and save configuration data
 * Enhanced with robust error handling and toast suppression
 */

/**
 * Load configuration from Homebridge
 * Uses the Homebridge UI APIs to fetch plugin configuration
 * @returns {Promise<Object>} The loaded configuration object
 */
window.loadConfig = async function() {
  try {
    // Silent loading - no toast notifications
    console.log('Loading configuration...');
    
    // Ensure homebridge object is fully initialized
    await ensureHomebridgeReady();
    
    // Log homebridge info for debugging
    console.log('Homebridge plugin info:', homebridge.plugin);
    console.log('Homebridge server env:', homebridge.serverEnv);
    
    // Request direct config check from server
    try {
      const configCheck = await homebridge.request('/config/check');
      if (configCheck.success) {
        // Log to console only
        console.log('Server can access config.json directly:', configCheck);
      } else {
        console.warn('Server cannot access config.json directly:', configCheck);
      }
    } catch (checkError) {
      // Silent handling - don't show error toast
      console.error('Config check error:', checkError);
    }
    
    // Get the plugin config using the Homebridge API
    console.log('Getting plugin config from Homebridge API...');
    let pluginConfig = [];
    
    try {
      pluginConfig = await homebridge.getPluginConfig();
    } catch (configError) {
      // Handle API error gracefully
      console.error('Error fetching plugin config:', configError);
      // Continue with empty config rather than failing
      pluginConfig = [];
    }
    
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
    
    console.log('Configuration loaded successfully');
    return config;
  } catch (error) {
    console.error('Configuration loading error:', error);
    
    // Update status element
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = 'Failed to load configuration: ' + error.message;
      statusElement.className = 'status error';
      statusElement.classList.remove('hidden');
    }
    
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
      console.error('Homebridge API not available - cannot load config');
      // Resolve anyway to continue - don't reject which would trigger error toast
      resolve();
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
      console.warn('Timeout waiting for Homebridge API to initialize');
      // Resolve anyway to continue - don't reject which would trigger error toast
      resolve();
    }, 10000);
    
    homebridge.addEventListener('ready', () => {
      clearTimeout(timeout);
      
      // Add delay to ensure full initialization
      setTimeout(() => {
        if (typeof homebridge.getPluginConfig === 'function') {
          console.log('Homebridge API now initialized');
          resolve();
        } else {
          console.error('Homebridge API methods not available after ready event');
          // Resolve anyway to continue - don't reject
          resolve();
        }
      }, 1000);
    });
  });
}

/**
 * Wait for all required DOM elements to be available
 * Enhanced with multiple safety checks
 * @returns {Promise<void>} Resolves when DOM elements are available
 */
async function waitForDOMElements() {
  const requiredElements = [
    'apiToken', 'unit', 'pollingInterval', 'logLevel', 'enableSchedules'
  ];
  
  return new Promise((resolve) => {
    // If all elements already exist, resolve immediately
    if (requiredElements.every(id => document.getElementById(id))) {
      console.log('All required DOM elements already available');
      resolve();
      return;
    }
    
    let attempts = 0;
    const maxAttempts = 15; // Increased for better reliability
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
        console.warn(`Element check timeout - missing: ${missing.join(', ')}`);
        
        // Continue anyway to avoid blocking completely
        clearInterval(intervalId);
        resolve();
      }
    }, checkInterval);
  });
}

/**
 * Populate form fields with configuration values
 * Enhanced with robust error handling for missing elements
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
    if (Array.isArray(config.schedules) && config.schedules.length > 0 && typeof window.schedules !== 'undefined') {
      // Create a clean copy of schedules with unit info
      window.schedules = config.schedules.map(schedule => ({
        ...schedule,
        unit: schedule.unit || (unitSelect ? unitSelect.value : 'C')
      }));
      
      // Assign to global schedules variable for compatibility
      if (typeof window.renderScheduleList === 'function') {
        console.log('Rendering schedule list with', window.schedules.length, 'schedules');
        try {
          window.renderScheduleList();
        } catch (renderError) {
          console.error('Error rendering schedule list:', renderError);
        }
      } else {
        console.warn('renderScheduleList function not available');
      }
      
      console.log(`Loaded ${window.schedules.length} schedules from config`);
    } else if (enableSchedules && typeof window.schedules !== 'undefined') {
      console.log('No schedules found in config but schedules are enabled');
      window.schedules = [];
      
      // Initialize empty schedule list
      if (typeof window.renderScheduleList === 'function') {
        try {
          window.renderScheduleList();
        } catch (renderError) {
          console.error('Error rendering empty schedule list:', renderError);
        }
      }
    }
  }
  
  // Apply the updated temperature validation based on the loaded unit
  if (typeof window.updateTemperatureValidation === 'function') {
    try {
      window.updateTemperatureValidation();
    } catch (validationError) {
      console.error('Error applying temperature validation:', validationError);
    }
  } else {
    console.warn('updateTemperatureValidation function not available');
  }
}

/**
 * Save configuration to Homebridge
 * Enhanced with robust error handling and strict schedule formatting
 * @returns {Promise<void>}
 */
window.saveConfig = async function() {
  try {
    console.log('Starting save process...');
    
    // Verify Homebridge API is available
    await ensureHomebridgeReady();
    
    // Get current config to update
    console.log('Fetching current config...');
    let pluginConfig = [];
    
    try {
      pluginConfig = await homebridge.getPluginConfig();
    } catch (configError) {
      console.error('Error fetching current config:', configError);
      // Continue with empty config rather than failing
      pluginConfig = [];
    }
    
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
      console.error('API token is required');
      
      // Update status element
      const statusElement = document.getElementById('status');
      if (statusElement) {
        statusElement.textContent = 'API token is required';
        statusElement.className = 'status error';
        statusElement.classList.remove('hidden');
      }
      
      return;
    }
    
    // Create updated config - follow exact structure from schema
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
    
    // Add schedules if enabled - CRITICAL SECTION
    if (enableSchedules && Array.isArray(window.schedules)) {
      // Ensure schedules is always an array even if empty
      config.schedules = [];
      
      // Only add valid schedules
      if (window.schedules.length > 0) {
        // Clean schedules for storage - strict formatting
        config.schedules = window.schedules.map(schedule => {
          // Create a clean schedule object with explicit type conversions
          const cleanSchedule = {
            type: String(schedule.type || 'Everyday'),
            time: String(schedule.time || '00:00'),
            temperature: Number(schedule.temperature || 21)
          };
          
          // Add day for Specific Day schedules only if present
          if (schedule.type === 'Specific Day' && schedule.day !== undefined) {
            cleanSchedule.day = Number(schedule.day);
          }
          
          // Add description if present (for Warm Hug, etc.)
          if (schedule.description) {
            cleanSchedule.description = String(schedule.description);
          }
          
          // Store unit information if available
          if (schedule.unit) {
            cleanSchedule.unit = String(schedule.unit);
          } else {
            cleanSchedule.unit = unit; // Use global unit setting
          }
          
          return cleanSchedule;
        });
      }
      
      console.log(`Adding ${config.schedules.length} schedules to config:`, config.schedules);
    } else {
      // Always explicitly set schedules to empty array when disabled
      config.schedules = [];
      console.log('Schedules disabled, setting empty array');
    }
    
    // Find current config position or create new entry
    let updatedConfig;
    const existingConfigIndex = Array.isArray(pluginConfig) ? 
      pluginConfig.findIndex(cfg => cfg && cfg.platform === 'SleepMeSimple') : -1;
    
    if (existingConfigIndex >= 0) {
      // Create a fresh array with the updated config
      updatedConfig = [...pluginConfig];
      updatedConfig[existingConfigIndex] = config;
      console.log(`Updating existing config at index ${existingConfigIndex}`);
    } else {
      // Add new config
      updatedConfig = Array.isArray(pluginConfig) ? [...pluginConfig, config] : [config];
      console.log('Adding new config entry');
    }
    
    // Critical: Log the exact structure being saved
    console.log('Final config structure before save:', 
      JSON.stringify(updatedConfig, (k, v) => k === 'apiToken' ? '[REDACTED]' : v));
    
    try {
      // CRITICAL: First update plugin config in memory
      await homebridge.updatePluginConfig(updatedConfig);
      console.log('Plugin config updated in memory');
      
      // Then save to disk
      await homebridge.savePluginConfig();
      console.log('Config saved to disk successfully');
      
      // Verify save was successful
      const verifyConfig = await homebridge.getPluginConfig();
      const verifyPlatform = verifyConfig.find(c => c && c.platform === 'SleepMeSimple');

      if (verifyPlatform && verifyPlatform.enableSchedules && 
          Array.isArray(verifyPlatform.schedules)) {
        console.log(`Verification: ${verifyPlatform.schedules.length} schedules saved`);
        
        // Log the first few schedules for verification
        if (verifyPlatform.schedules.length > 0) {
          console.log('Sample saved schedules:', 
            verifyPlatform.schedules.slice(0, Math.min(3, verifyPlatform.schedules.length)));
        }
      } else if (verifyPlatform) {
        console.log('Verification: Platform saved but schedules not enabled');
      } else {
        console.warn('Verification: Platform config not found after save!');
      }
      
      // Update status element with success message
      const statusElement = document.getElementById('status');
      if (statusElement) {
        statusElement.textContent = 'Configuration saved successfully';
        statusElement.className = 'status success';
        statusElement.classList.remove('hidden');
      }
    } catch (updateError) {
      console.error('Error saving config:', updateError);
      
      // Update status element
      const statusElement = document.getElementById('status');
      if (statusElement) {
        statusElement.textContent = 'Error saving config: ' + updateError.message;
        statusElement.className = 'status error';
        statusElement.classList.remove('hidden');
      }
    }
  } catch (error) {
    console.error('Save configuration error:', error);
    
    // Update status element
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = 'Save configuration error: ' + error.message;
      statusElement.className = 'status error';
      statusElement.classList.remove('hidden');
    }
  }
};