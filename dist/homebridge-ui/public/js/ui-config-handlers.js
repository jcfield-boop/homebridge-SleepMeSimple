/**
 * SleepMe Simple - Configuration Handlers
 *
 * Handles loading and saving plugin configuration using the Homebridge
 * client-side API (homebridge.getPluginConfig, updatePluginConfig, savePluginConfig).
 *
 * These methods are available on the client-side `homebridge` object, NOT on the server.
 * See: https://github.com/homebridge/plugin-ui-utils
 */

/**
 * Load plugin configuration from Homebridge
 * Uses the client-side homebridge.getPluginConfig() method
 * @returns {Promise<Object>} The platform configuration object
 */
window.loadConfig = async function() {
  try {
    console.log('Loading configuration via client-side API...');

    // Show loading status
    if (typeof NotificationManager !== 'undefined') {
      NotificationManager.info('Loading configuration...', 'Please Wait');
    }

    // Check if homebridge API is available
    if (typeof homebridge === 'undefined') {
      console.error('Homebridge object not available');
      return createDefaultConfig();
    }

    // Wait for homebridge to be ready if needed
    if (typeof homebridge.getPluginConfig !== 'function') {
      console.log('Waiting for Homebridge API to be ready...');
      await waitForHomebridge();
    }

    // Get plugin config using CLIENT-SIDE API
    const pluginConfig = await homebridge.getPluginConfig();
    console.log('Retrieved plugin config array with', pluginConfig?.length || 0, 'entries');

    if (!Array.isArray(pluginConfig) || pluginConfig.length === 0) {
      console.log('No existing config found, using defaults');
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.warning('No existing configuration found. Using defaults.', 'New Setup');
      }
      return createDefaultConfig();
    }

    // Find our platform config
    const config = pluginConfig.find(c => c && c.platform === 'SleepMeSimple');

    if (!config) {
      console.log('SleepMeSimple platform config not found, using defaults');
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.warning('No existing configuration found. Using defaults.', 'New Setup');
      }
      return createDefaultConfig();
    }

    console.log('Platform config loaded successfully');

    // Populate form with loaded configuration
    populateFormWithConfig(config);

    // Handle schedules
    const schedulesEnabled = config.enableSchedules === true;
    console.log('Schedules enabled:', schedulesEnabled);

    // Update UI to reflect current state
    const schedulesContainer = document.getElementById('schedulesContainer');
    if (schedulesContainer) {
      schedulesContainer.classList.toggle('hidden', !schedulesEnabled);
      schedulesContainer.style.display = schedulesEnabled ? 'block' : 'none';
    }

    // Initialize window.schedules
    window.schedules = [];

    // Load and render schedules if enabled
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

      // Render schedules after a short delay to ensure DOM is ready
      const scheduleList = document.getElementById('scheduleList');
      if (scheduleList && typeof window.renderScheduleList === 'function') {
        setTimeout(() => {
          try {
            window.renderScheduleList();
            console.log('Schedule list rendered successfully');
          } catch (renderError) {
            console.error('Error rendering schedule list:', renderError);
          }
        }, 300);
      }
    }

    // Show success notification
    if (typeof NotificationManager !== 'undefined') {
      NotificationManager.success('Configuration loaded successfully', 'Ready', { autoHide: true });
    }

    return config;

  } catch (error) {
    console.error('Error loading configuration:', error);
    if (typeof NotificationManager !== 'undefined') {
      NotificationManager.error(`Error loading configuration: ${error.message}`, 'Load Error');
    }
    return createDefaultConfig();
  }
};

/**
 * Save configuration to Homebridge
 * Uses the client-side homebridge.updatePluginConfig() and savePluginConfig() methods
 * @returns {Promise<void>}
 */
window.saveConfig = async function() {
  try {
    console.log('Saving configuration via client-side API...');

    if (typeof NotificationManager !== 'undefined') {
      NotificationManager.info('Saving configuration...', 'Please Wait');
    }

    // Check if Homebridge API is available
    if (typeof homebridge === 'undefined' ||
        typeof homebridge.getPluginConfig !== 'function' ||
        typeof homebridge.updatePluginConfig !== 'function' ||
        typeof homebridge.savePluginConfig !== 'function') {
      console.error('Homebridge API not available');
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.error('Homebridge API not available. Please reload the page.', 'Save Error');
      }
      return;
    }

    // STEP 1: Get and validate form values
    console.log('Collecting form values...');

    const apiToken = document.getElementById('apiToken')?.value;
    if (!apiToken) {
      console.error('API token is required');
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.error('API token is required', 'Validation Error');
      }
      return;
    }

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

    // Validate polling interval
    if (isNaN(pollingInterval) || pollingInterval < 60 || pollingInterval > 300) {
      console.error('Invalid polling interval:', pollingInterval);
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.error('Polling interval must be between 60 and 300 seconds', 'Validation Error');
      }
      return;
    }

    // STEP 2: Create new configuration object
    const newConfig = {
      platform: 'SleepMeSimple',
      name: 'SleepMe Simple',
      apiToken,
      unit,
      pollingInterval,
      logLevel,
      enableSchedules
    };

    // STEP 3: Add schedules if enabled
    if (enableSchedules && Array.isArray(window.schedules)) {
      console.log(`Adding ${window.schedules.length} schedules to configuration`);
      newConfig.schedules = window.schedules.map(schedule => {
        const cleanSchedule = {
          type: String(schedule.type || 'Everyday'),
          time: String(schedule.time || '00:00'),
          temperature: Number(schedule.temperature || 21)
        };

        if (schedule.unit) {
          cleanSchedule.unit = String(schedule.unit);
        }

        if (schedule.type === 'Specific Day' && schedule.day !== undefined) {
          cleanSchedule.day = Number(schedule.day);
        }

        if (schedule.description) {
          cleanSchedule.description = String(schedule.description);
        }

        if (schedule.isFromTemplate) {
          cleanSchedule.isFromTemplate = Boolean(schedule.isFromTemplate);
        }

        if (schedule.templateSource) {
          cleanSchedule.templateSource = String(schedule.templateSource);
        }

        if (schedule.isWarmHug) {
          cleanSchedule.isWarmHug = Boolean(schedule.isWarmHug);
        }

        return cleanSchedule;
      });
    } else {
      newConfig.schedules = [];
    }

    // STEP 4: Get advanced settings if present
    const advancedSettings = getAdvancedSettings();
    if (advancedSettings) {
      newConfig.advanced = advancedSettings;
    }

    // STEP 5: Get current plugin config array and update our entry
    console.log('Getting current plugin config array...');
    const pluginConfig = await homebridge.getPluginConfig();
    const configArray = Array.isArray(pluginConfig) ? pluginConfig : [];

    // Find existing config index
    const existingIndex = configArray.findIndex(c => c && c.platform === 'SleepMeSimple');

    if (existingIndex >= 0) {
      configArray[existingIndex] = newConfig;
      console.log('Updated existing config at index', existingIndex);
    } else {
      configArray.push(newConfig);
      console.log('Added new config to array');
    }

    // STEP 6: Update config in memory using CLIENT-SIDE API
    console.log('Updating config in memory...');
    await homebridge.updatePluginConfig(configArray);

    // STEP 7: Save to disk using CLIENT-SIDE API
    console.log('Saving config to disk...');
    await homebridge.savePluginConfig();

    console.log('Configuration saved successfully');
    if (typeof NotificationManager !== 'undefined') {
      NotificationManager.success('Configuration saved successfully', 'Configuration Saved', { autoHide: true });
    }

  } catch (error) {
    console.error('Error saving configuration:', error);
    if (typeof NotificationManager !== 'undefined') {
      NotificationManager.error(`Error saving configuration: ${error.message}`, 'Save Failed');
    }
  }
};

/**
 * Wait for the Homebridge API to be ready
 * @returns {Promise<void>}
 */
function waitForHomebridge() {
  return new Promise((resolve) => {
    if (typeof homebridge !== 'undefined' && typeof homebridge.getPluginConfig === 'function') {
      resolve();
      return;
    }

    // Set up ready event listener
    const onReady = () => {
      clearTimeout(timeout);
      resolve();
    };

    if (typeof homebridge !== 'undefined') {
      homebridge.addEventListener('ready', onReady);
    }

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      console.warn('Homebridge ready timeout - continuing anyway');
      resolve();
    }, 10000);
  });
}

/**
 * Create default configuration
 * @returns {Object} Default configuration object
 */
function createDefaultConfig() {
  console.log('Creating default configuration');
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
 * Populate form fields with configuration values
 * @param {Object} config - The platform configuration object
 */
function populateFormWithConfig(config) {
  console.log('Populating form fields with configuration...');

  try {
    const apiTokenInput = document.getElementById('apiToken');
    const unitSelect = document.getElementById('unit');
    const pollingIntervalInput = document.getElementById('pollingInterval');
    const logLevelSelect = document.getElementById('logLevel');
    const enableSchedulesCheckbox = document.getElementById('enableSchedules');
    const schedulesContainer = document.getElementById('schedulesContainer');

    // Set API token
    if (apiTokenInput && config.apiToken) {
      apiTokenInput.value = config.apiToken;
    }

    // Set unit
    if (unitSelect) {
      unitSelect.value = config.unit || 'C';
      console.log(`Set temperature unit: "${unitSelect.value}"`);
    }

    // Set polling interval
    if (pollingIntervalInput) {
      pollingIntervalInput.value = config.pollingInterval || 90;
      console.log(`Set polling interval: ${pollingIntervalInput.value}`);
    }

    // Set log level
    if (logLevelSelect) {
      logLevelSelect.value = config.logLevel || 'normal';
      console.log(`Set log level: "${logLevelSelect.value}"`);
    }

    // Handle schedules configuration
    if (enableSchedulesCheckbox) {
      const enableSchedules = config.enableSchedules === true;
      enableSchedulesCheckbox.checked = enableSchedules;

      if (schedulesContainer) {
        schedulesContainer.classList.toggle('hidden', !enableSchedules);
        schedulesContainer.style.display = enableSchedules ? 'block' : 'none';
      }
    }

    // Load advanced settings if present
    if (config.advanced) {
      loadAdvancedSettings(config.advanced);
    }

    console.log('Form population complete');
  } catch (error) {
    console.error('Error during form population:', error);
  }
}

/**
 * Load advanced settings from configuration
 * @param {Object} advanced - Advanced configuration section
 */
function loadAdvancedSettings(advanced) {
  try {
    const warmHugIncrementInput = document.getElementById('warmHugIncrement');
    const warmHugDurationInput = document.getElementById('warmHugDuration');
    const unitSelect = document.getElementById('unit');

    if (warmHugIncrementInput && advanced.warmHugIncrement !== undefined) {
      let incrementValue = advanced.warmHugIncrement;

      // Convert if units don't match
      if (unitSelect && unitSelect.value === 'F') {
        incrementValue = incrementValue * (9 / 5);
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
 * Get advanced settings from form
 * @returns {Object|null} Advanced settings object or null if none
 */
function getAdvancedSettings() {
  const warmHugIncrementInput = document.getElementById('warmHugIncrement');
  const warmHugDurationInput = document.getElementById('warmHugDuration');
  const unitSelect = document.getElementById('unit');

  let hasAdvancedSettings = false;
  const advancedSettings = {};

  if (warmHugIncrementInput && warmHugIncrementInput.value) {
    let increment = parseFloat(warmHugIncrementInput.value);

    // Convert F to C for storage
    if (unitSelect && unitSelect.value === 'F') {
      increment = increment * (5 / 9);
    }

    advancedSettings.warmHugIncrement = Math.round(increment * 10) / 10;
    hasAdvancedSettings = true;
  }

  if (warmHugDurationInput && warmHugDurationInput.value) {
    advancedSettings.warmHugDuration = parseInt(warmHugDurationInput.value, 10);
    hasAdvancedSettings = true;
  }

  return hasAdvancedSettings ? advancedSettings : null;
}
