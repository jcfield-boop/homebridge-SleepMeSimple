window.loadConfig = async function() {
  try {
      console.log('Starting configuration loading process...');
      
      // Use the /config/load endpoint
      const response = await homebridge.request('/config/load');
      
      if (!response.success) {
          console.warn('Configuration load unsuccessful:', response.error);
          NotificationManager.warning(
              response.error || 'Unable to load configuration', 
              'Configuration Load'
          );
          return {};
      }
      
      const config = response.config;
      
      // Populate form with loaded configuration
      if (config) {
          try {
              // Existing population logic
              populateFormWithConfig(config);
              
              // If schedules exist, render them
              if (Array.isArray(config.schedules)) {
                  window.schedules = JSON.parse(JSON.stringify(config.schedules));
                  
                  if (typeof window.renderScheduleList === 'function') {
                      window.renderScheduleList();
                  }
              }
              
              NotificationManager.success(
                  'Configuration loaded successfully', 
                  'Configuration Management'
              );
              
              return config;
          } catch (populationError) {
              console.error('Error populating form:', populationError);
              NotificationManager.error(
                  `Error processing configuration: ${populationError.message}`, 
                  'Configuration Error'
              );
              return {};
          }
      }
      
      return {};
  } catch (error) {
      console.error('Unexpected configuration loading error:', error);
      NotificationManager.error(
          `Unexpected error loading configuration: ${error.message}`, 
          'System Error'
      );
      return {};
  }
};

/**
* Helper function to populate form fields with configuration values
* Enhanced with comprehensive error handling for each field
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
      
      // Set unit
      if (unitSelect && config.unit) {
          console.log(`Setting temperature unit: ${config.unit}`);
          unitSelect.value = config.unit;
      } else if (!unitSelect) {
          console.warn('Unit select element not found');
      } else if (!config.unit) {
          console.log('No unit in config, using default (C)');
          unitSelect.value = 'C';
      }
      
      // Set polling interval
      if (pollingIntervalInput && config.pollingInterval) {
          console.log(`Setting polling interval: ${config.pollingInterval}`);
          pollingIntervalInput.value = config.pollingInterval;
      } else if (!pollingIntervalInput) {
          console.warn('Polling interval input element not found');
      } else if (!config.pollingInterval) {
          console.log('No polling interval in config, using default (90)');
          pollingIntervalInput.value = '90';
      }
      
      // Set log level
      if (logLevelSelect && config.logLevel) {
          console.log(`Setting log level: ${config.logLevel}`);
          logLevelSelect.value = config.logLevel;
      } else if (!logLevelSelect) {
          console.warn('Log level select element not found');
      } else if (!config.logLevel) {
          console.log('No log level in config, using default (normal)');
          logLevelSelect.value = 'normal';
      }
      
      // Handle schedules configuration
      if (enableSchedulesCheckbox) {
          const enableSchedules = config.enableSchedules === true;
          console.log(`Setting enable schedules: ${enableSchedules}`);
          enableSchedulesCheckbox.checked = enableSchedules;
          
          // Show/hide schedules container based on checkbox state
          if (schedulesContainer) {
              schedulesContainer.classList.toggle('hidden', !enableSchedules);
          } else {
              console.warn('Schedules container element not found');
          }
          
          // Load schedules if available and enabled
          if (enableSchedules && Array.isArray(config.schedules)) {
              console.log(`Loading ${config.schedules.length} schedules from configuration`);
              
              // Ensure window.schedules exists
              if (typeof window.schedules === 'undefined') {
                  window.schedules = [];
              }
              
              // Deep copy schedules to prevent reference issues
              window.schedules = JSON.parse(JSON.stringify(config.schedules));
              
              // Ensure each schedule has unit information
              window.schedules = window.schedules.map(schedule => ({
                  ...schedule,
                  unit: schedule.unit || (unitSelect ? unitSelect.value : 'C')
              }));
              
              console.log('Schedules loaded and processed:', window.schedules);
              
              // Initialize schedule display based on available functions
              if (typeof window.renderScheduleList === 'function') {
                  console.log('Calling renderScheduleList function');
                  window.renderScheduleList();
              } else {
                  console.warn('renderScheduleList function not available');
              }
          } else if (enableSchedules) {
              console.log('Schedules enabled but no schedules found in configuration');
              window.schedules = [];
              
              // Still render empty list if function available
              if (typeof window.renderScheduleList === 'function') {
                  window.renderScheduleList();
              }
          }
      } else {
          console.warn('Enable schedules checkbox element not found');
      }
      
      console.log('Form population complete');
  } catch (error) {
      // Catch and log any errors during form population
      console.error('Error during form population:', error);
      throw new Error(`Form population failed: ${error.message}`);
  }
}

/**
* Save configuration to Homebridge
* @returns {Promise<void>}
*/
window.saveConfig = async function() {
  try {
      console.log('Starting configuration save process...');
      NotificationManager.info('Saving configuration...', 'Please Wait');
      
      // STEP 1: Check if Homebridge API is available
      if (typeof homebridge === 'undefined' || 
          typeof homebridge.getPluginConfig !== 'function' ||
          typeof homebridge.updatePluginConfig !== 'function' ||
          typeof homebridge.savePluginConfig !== 'function') {
          
          console.error('Homebridge API not available for saving configuration');
          NotificationManager.error(
              'Homebridge API not available. Please reload the page.', 
              'Save Error'
          );
          return;
      }
      
      // STEP 2: Get values from form with validation
      console.log('Collecting form values...');
      
      // Get and validate API token
      const apiToken = document.getElementById('apiToken')?.value;
      if (!apiToken) {
          console.error('API token is required');
          NotificationManager.error(
              'API token is required', 
              'Validation Error'
          );
          return;
      }
      
      // Get other form values with defaults
      const unit = document.getElementById('unit')?.value || 'C';
      const pollingInterval = parseInt(document.getElementById('pollingInterval')?.value || '90', 10);
      const logLevel = document.getElementById('logLevel')?.value || 'normal';
      const enableSchedules = document.getElementById('enableSchedules')?.checked || false;
      
      // Validate polling interval
      if (isNaN(pollingInterval) || pollingInterval < 60 || pollingInterval > 300) {
          console.error('Invalid polling interval:', pollingInterval);
          NotificationManager.error(
              'Polling interval must be between 60 and 300 seconds', 
              'Validation Error'
          );
          return;
      }
      
      // STEP 3: Create updated configuration object
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
      
      // STEP 4: Add schedules if enabled
      if (enableSchedules && Array.isArray(window.schedules)) {
          console.log(`Adding ${window.schedules.length} schedules to configuration`);
          
          // THIS IS THE KEY FIX: Process schedules to ensure proper format
          config.schedules = window.schedules.map(schedule => {
              // Create a clean schedule object with only the properties defined in the schema
              const cleanSchedule = {
                  type: String(schedule.type || 'Everyday'),
                  time: String(schedule.time || '00:00'),
                  temperature: Number(schedule.temperature || 21),
                  unit: String(schedule.unit || unit)
              };
              
              // Only add day property for Specific Day schedules
              if (schedule.type === 'Specific Day' && schedule.day !== undefined) {
                  cleanSchedule.day = Number(schedule.day);
              }
              
              // Only add description if present
              if (schedule.description) {
                  cleanSchedule.description = String(schedule.description);
              }
              
              // Log processed schedule for debugging
              console.log(`Processed schedule: ${cleanSchedule.type} at ${cleanSchedule.time}: ${cleanSchedule.temperature}°${cleanSchedule.unit}`);
              
              return cleanSchedule;
          });
      } else {
          console.log('No schedules to add or schedules disabled');
          config.schedules = [];
      }
      
      // STEP 5: Get current config to find the right position to update
      console.log('Retrieving current plugin configuration...');
      const pluginConfig = await homebridge.getPluginConfig();
      
      if (!Array.isArray(pluginConfig)) {
          console.error('Invalid plugin configuration format:', pluginConfig);
          NotificationManager.error(
              'Invalid plugin configuration format received from Homebridge', 
              'Save Error'
          );
          return;
      }
      
      // STEP 6: Find existing config position or prepare to add new entry
      const existingConfigIndex = pluginConfig.findIndex(cfg => 
          cfg && cfg.platform === 'SleepMeSimple');
      
      let updatedConfig;
      
      if (existingConfigIndex >= 0) {
          console.log(`Updating existing configuration at index ${existingConfigIndex}`);
          updatedConfig = [...pluginConfig];
          updatedConfig[existingConfigIndex] = config;
      } else {
          console.log('Adding new configuration entry');
          updatedConfig = [...pluginConfig, config];
      }
      
      // STEP 7: Update configuration in memory
      console.log('Updating plugin configuration in memory...');
      await homebridge.updatePluginConfig(updatedConfig);
      
      // STEP 8: Save configuration to disk
      console.log('Saving configuration to disk...');
      await homebridge.savePluginConfig();
      
      // STEP 9: Verify save was successful
      console.log('Verifying configuration was saved correctly...');
      const verifyConfig = await homebridge.getPluginConfig();
      const verifyPlatform = verifyConfig.find(c => c && c.platform === 'SleepMeSimple');
      
      if (!verifyPlatform) {
          console.error('Configuration verification failed - platform not found after save');
          NotificationManager.warning(
              'Configuration saved, but verification failed. Please check your config.json.',
              'Configuration Warning'
          );
          return;
      }
      
      // Check schedules were saved correctly
      if (verifyPlatform.enableSchedules && Array.isArray(verifyPlatform.schedules)) {
          console.log(`Verification confirmed ${verifyPlatform.schedules.length} schedules saved`);
          NotificationManager.success(
              `Configuration saved successfully with ${verifyPlatform.schedules.length} schedules.`, 
              'Configuration Saved',
              { autoHide: true }
          );
      } else if (verifyPlatform.enableSchedules) {
          console.warn('Schedules were enabled but not found in saved configuration');
          NotificationManager.warning(
              'Configuration saved, but schedules may not have been saved correctly.',
              'Configuration Warning'
          );
      } else {
          console.log('Configuration saved successfully (schedules disabled)');
          NotificationManager.success(
              'Configuration saved successfully.', 
              'Configuration Saved',
              { autoHide: true }
          );
      }
  } catch (error) {
      // Global error handler
      console.error('Error saving configuration:', error);
      NotificationManager.error(
          `Error saving configuration: ${error.message}`, 
          'Save Failed'
      );
  }
};