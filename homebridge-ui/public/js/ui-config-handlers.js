// Modified loadConfig function in ui-config-handlers.js
window.loadConfig = async function() {
  try {
    console.log('Starting configuration loading process...');
    
    // Show loading status
    if (typeof NotificationManager !== 'undefined') {
      NotificationManager.info('Loading configuration...', 'Please Wait');
    }
    
    // Check if homebridge API is available
    if (typeof homebridge === 'undefined' || typeof homebridge.getPluginConfig !== 'function') {
      console.error('Homebridge API not available');
      return createMockConfig();
    }
    
    try {
      // Get plugin config
      const pluginConfig = await homebridge.getPluginConfig();
      console.log('Plugin config retrieved:', pluginConfig);
      
      // Find our platform config
      const config = Array.isArray(pluginConfig) ? 
        pluginConfig.find(cfg => cfg && cfg.platform === 'SleepMeSimple') : null;
        
      if (config) {
        console.log('Platform config found:', config);
        // Populate form with loaded configuration
        populateFormWithConfig(config);
        
        // Check if schedules are enabled
        const schedulesEnabled = config.enableSchedules === true;
        console.log('Schedules enabled:', schedulesEnabled);
        
        // Update UI to reflect current state
        const schedulesContainer = document.getElementById('schedulesContainer');
        if (schedulesContainer) {
          schedulesContainer.classList.toggle('hidden', !schedulesEnabled);
          schedulesContainer.style.display = schedulesEnabled ? 'block' : 'none';
        }
        
        // CRITICAL FIX: Initialize window.schedules BEFORE trying to render
        // and use deep copy to avoid reference issues
        window.schedules = [];
        
        // Only load and render schedules if they're enabled
        if (schedulesEnabled && Array.isArray(config.schedules)) {
          console.log(`Loading ${config.schedules.length} schedules from config`);
          
          // Create a deep copy of schedules to avoid reference issues
          const schedules = JSON.parse(JSON.stringify(config.schedules || []));
          window.schedules = schedules;
          if (typeof window.ScheduleLoader !== 'undefined' && 
              typeof window.ScheduleLoader.store === 'function') {
            window.ScheduleLoader.store(schedules);
          }
          
          console.log('Schedules loaded into memory:', window.schedules);
          
          // Ensure scheduleList element exists before rendering
          const scheduleList = document.getElementById('scheduleList');
          if (scheduleList && schedulesEnabled) {
            console.log('Schedule list element found, rendering schedules');
            
            // Ensure render function exists
            if (typeof window.renderScheduleList === 'function') {
              // Add slight delay to ensure DOM is fully processed
              setTimeout(() => {
                try {
                  console.log('Config loaded, rendering schedules');
                  window.renderScheduleList();
                  console.log('Schedule list rendered successfully');
                } catch (renderError) {
                  console.error('Error rendering schedule list:', renderError);
                }
              }, 300);
            } else {
              console.error('renderScheduleList function not available');
            }
          } else {
            console.log('Schedule list element not found or schedules disabled');
          }
        } else {
          console.log('Schedules not enabled or no schedules in config');
        }
        
        // Clear the loading message
        if (typeof NotificationManager !== 'undefined') {
          // Hide the status message after a short delay
          setTimeout(() => {
            const statusElement = document.getElementById('status');
            if (statusElement) {
              statusElement.classList.add('hidden');
            }
          }, 500);
        }
        
        return config;
      } else {
        console.warn('Platform config not found, using default config');
        return createMockConfig();
      }
    } catch (error) {
      console.error('Error getting plugin config:', error);
      return createMockConfig();
    }
  } catch (error) {
    console.error('Unexpected configuration loading error:', error);
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
    
    // Set unit with detailed logging
    if (unitSelect && config.unit) {
      console.log(`Setting temperature unit: "${config.unit}"`);
      unitSelect.value = config.unit;
      console.log(`After setting, unitSelect value = "${unitSelect.value}"`);
    } else if (!unitSelect) {
      console.warn('Unit select element not found');
    } else if (!config.unit) {
      console.log('No unit in config, using default (C)');
      unitSelect.value = 'C';
    }
    
    // Set polling interval with detailed logging
    if (pollingIntervalInput && config.pollingInterval) {
      console.log(`Setting polling interval: ${config.pollingInterval}`);
      pollingIntervalInput.value = config.pollingInterval;
      console.log(`After setting, pollingIntervalInput value = "${pollingIntervalInput.value}"`);
    } else if (!pollingIntervalInput) {
      console.warn('Polling interval input element not found');
    } else if (!config.pollingInterval) {
      console.log('No polling interval in config, using default (90)');
      pollingIntervalInput.value = '90';
    }
    
    // Set log level with detailed logging
if (logLevelSelect && config.logLevel) {
  console.log(`Setting log level: "${config.logLevel}"`);
  logLevelSelect.value = config.logLevel;
  console.log(`After setting, logLevelSelect value = "${logLevelSelect.value}"`);
} else if (!logLevelSelect) {
  console.warn('Log level select element not found');
} else if (!config.logLevel) {
  console.log('No log level in config, using default (normal)');
  logLevelSelect.value = 'normal';
  console.log(`After setting default, logLevelSelect value = "${logLevelSelect.value}"`);
}
    // Handle schedules configuration
    if (enableSchedulesCheckbox) {
      const enableSchedules = config.enableSchedules === true;
      console.log(`Setting enable schedules: ${enableSchedules}`);
      enableSchedulesCheckbox.checked = enableSchedules;
      
      // Show/hide schedules container based on checkbox state
      if (schedulesContainer) {
        schedulesContainer.classList.toggle('hidden', !enableSchedules);
        schedulesContainer.style.display = enableSchedules ? 'block' : 'none';
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
 * @param {boolean} saveToFile - Whether to also save to config.json file
 * @returns {Promise<void>}
 */
window.saveConfig = async function(saveToFile = true) {
  try {
    console.log(`Starting configuration ${saveToFile ? 'save' : 'update'} process...`);
    if (typeof NotificationManager !== 'undefined') {
      NotificationManager.info(`${saveToFile ? 'Saving' : 'Updating'} configuration...`, 'Please Wait');
    }
    
    // STEP 1: Check if Homebridge API is available
    if (typeof homebridge === 'undefined' || 
        typeof homebridge.getPluginConfig !== 'function' ||
        typeof homebridge.updatePluginConfig !== 'function' ||
        (saveToFile && typeof homebridge.savePluginConfig !== 'function')) {
        
      console.error('Homebridge API methods not available');
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
    // Get other form values with defaults and log them
const unitSelect = document.getElementById('unit');
const unit = unitSelect?.value || 'C';
console.log(`Reading unit value from form: "${unit}"`);

const pollingIntervalInput = document.getElementById('pollingInterval');
const pollingInterval = parseInt(pollingIntervalInput?.value || '90', 10);
console.log(`Reading polling interval from form: ${pollingInterval}`);

const logLevelSelect = document.getElementById('logLevel');
const logLevel = logLevelSelect?.value || 'normal';
console.log(`Reading log level from form: "${logLevel}"`);

const enableSchedulesCheckbox = document.getElementById('enableSchedules');
const enableSchedules = enableSchedulesCheckbox?.checked || false;
console.log(`Reading enable schedules from form: ${enableSchedules}`);
    
    // Log the values being saved
    console.log('Form values to save:');
    console.log('- API Token: [hidden]');
    console.log(`- Temperature Unit: ${unit}`);
    console.log(`- Polling Interval: ${pollingInterval}`);
    console.log(`- Log Level: ${logLevel}`);
    console.log(`- Enable Schedules: ${enableSchedules}`);
    
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
    
    // STEP 3: Get current plugin config to find platform config
    console.log('Getting current plugin config...');
    const currentConfig = await homebridge.getPluginConfig();
    console.log('Current plugin config retrieved');
    
    // STEP 4: Create updated configuration object
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
   
    // STEP 5: Add schedules if enabled
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
        
        // Preserve warm hug flag if present
        if (schedule.isWarmHug) {
          cleanSchedule.isWarmHug = Boolean(schedule.isWarmHug);
        }
        
        return cleanSchedule;
      });
    } else {
      // Always include schedules array in config (even when disabled)
      // This preserves existing schedules in config when they're disabled
      console.log('Including empty schedules array in config');
      config.schedules = [];
    }
    
    // STEP 6: Get advanced settings
    const advancedSettings = getAdvancedSettings();
    if (advancedSettings) {
      config.advanced = advancedSettings;
    }
    
    // STEP 7: Find existing config in the array or prepare to add new one
    console.log('Preparing updated config array...');
    let updatedConfigArray = [];
    
    if (Array.isArray(currentConfig)) {
      updatedConfigArray = [...currentConfig]; // Create a new copy to avoid reference issues
      
      const existingIndex = updatedConfigArray.findIndex(c => c && c.platform === 'SleepMeSimple');
      
      if (existingIndex >= 0) {
        // Update existing config
        console.log(`Updating existing config at index ${existingIndex}`);
        updatedConfigArray[existingIndex] = config;
      } else {
        // Add new config
        console.log('Adding new platform config');
        updatedConfigArray.push(config);
      }
    } else {
      // If no valid config array, create a new one with just our config
      console.log('Creating new config array');
      updatedConfigArray = [config];
    }
    
    // STEP 8: Save configuration using client-side API
    console.log('Updating plugin config in memory...');
    try {
      // Update config in memory
      await homebridge.updatePluginConfig(updatedConfigArray);
      console.log('Configuration updated in memory successfully');
      
      // If requested, also save to file (only when user explicitly clicks Save button)
      if (saveToFile) {
        console.log('Saving config to disk...');
        await homebridge.savePluginConfig();
        console.log('Configuration saved to disk successfully');
      }
      
      console.log('Configuration process completed successfully');
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.success(
          `Configuration ${saveToFile ? 'saved' : 'updated'} successfully`,
          `Configuration ${saveToFile ? 'Saved' : 'Updated'}`,
          { autoHide: true }
        );
      }
      
      // Verify update
      try {
        const verifyConfig = await homebridge.getPluginConfig();
        const saved = verifyConfig.find(c => c && c.platform === 'SleepMeSimple');
        console.log('Verification - Config saved correctly:', !!saved);
        if (saved) {
          console.log('Saved config values:');
          console.log('- logLevel:', saved.logLevel);
          console.log('- unit:', saved.unit);
          console.log('- pollingInterval:', saved.pollingInterval);
        }
      } catch (verifyError) {
        console.warn('Unable to verify saved config:', verifyError);
      }
    } catch (saveError) {
      console.error('Error saving configuration:', saveError);
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.error(
          `Error ${saveToFile ? 'saving' : 'updating'} configuration: ${saveError.message}`,
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