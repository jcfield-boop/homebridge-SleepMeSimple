/**
 * Configuration handling for SleepMe Simple Homebridge Plugin UI
 * Provides functions to load and save configuration data
 * Enhanced with robust error handling and toast suppression
 */

/**
 * Load configuration from Homebridge
 * Enhanced with better debugging for schedule issues
 * @returns {Promise<Object>} The loaded configuration object
 */
window.loadConfig = async function() {
  // Enable detailed logging to track the schedule loading issue
  const DEBUG_SCHEDULES = true;
  
  function debugLog(message, data) {
      if (DEBUG_SCHEDULES) {
          console.log(`[CONFIG] ${message}`, data || '');
      }
  }
  
  debugLog('Starting configuration loading...');
  
  try {
      // Check if homebridge object is available
      if (typeof homebridge === 'undefined') {
          console.error('Homebridge API not available');
          return {};
      }
      
      debugLog('Getting plugin config from Homebridge API...');
      const pluginConfig = await homebridge.getPluginConfig();
      debugLog('Raw plugin config received:', pluginConfig);
      
      // Find our platform configuration
      let config = {};
      if (Array.isArray(pluginConfig) && pluginConfig.length > 0) {
          // Look for platform config with exact name match
          const platformConfig = pluginConfig.find(cfg => 
              cfg && cfg.platform === 'SleepMeSimple');
          
          if (platformConfig) {
              config = platformConfig;
              debugLog('Found SleepMeSimple platform config:', config);
          } else {
              debugLog('No SleepMeSimple platform found in config');
          }
      } else {
          debugLog('No plugin config found or empty array');
      }
      
      // Fill in form fields with config values
      const apiTokenInput = document.getElementById('apiToken');
      const unitSelect = document.getElementById('unit');
      const pollingIntervalInput = document.getElementById('pollingInterval');
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
      
      // Handle schedules
      if (enableSchedulesCheckbox) {
          const enableSchedules = config.enableSchedules === true;
          enableSchedulesCheckbox.checked = enableSchedules;
          
          // Show/hide schedules container based on checkbox state
          if (schedulesContainer) {
              schedulesContainer.classList.toggle('hidden', !enableSchedules);
          }
          
          // Critical: Load schedules if available and enabled
          if (enableSchedules && Array.isArray(config.schedules)) {
              debugLog(`Found ${config.schedules.length} schedules in config:`, config.schedules);
              
              // Ensure window.schedules exists
              if (typeof window.schedules === 'undefined') {
                  window.schedules = [];
              }
              
              // Copy schedules to window.schedules for UI rendering
              // Create a clean copy with unit info
              window.schedules = config.schedules.map(schedule => ({
                  ...schedule,
                  unit: schedule.unit || (unitSelect ? unitSelect.value : 'C')
              }));
              
              debugLog(`Copied ${window.schedules.length} schedules to window.schedules`);
              
              // Initialize schedules if the function exists
              if (typeof window.initializeSchedules === 'function') {
                  window.initializeSchedules(window.schedules);
                  debugLog('Initialized schedules with initializeSchedules function');
              } else {
                  debugLog('initializeSchedules function not available');
                  
                  // Fallback: Try rendering directly
                  if (typeof window.renderScheduleList === 'function') {
                      window.renderScheduleList();
                      debugLog('Called renderScheduleList directly as fallback');
                  } else {
                      debugLog('renderScheduleList function not available');
                  }
              }
          } else {
              debugLog('Schedules not enabled or empty schedules array in config');
              
              // Initialize empty schedule list if schedules are enabled
              if (enableSchedules && typeof window.schedules !== 'undefined') {
                  window.schedules = [];
                  
                  if (typeof window.renderScheduleList === 'function') {
                      window.renderScheduleList();
                      debugLog('Initialized empty schedule list');
                  }
              }
          }
      }
      
      const statusElement = document.getElementById('status');
      if (statusElement) {
          statusElement.textContent = 'Configuration loaded successfully';
          statusElement.className = 'status success';
          statusElement.classList.remove('hidden');
          
          // Auto-hide success message after a delay
          setTimeout(() => {
              statusElement.classList.add('hidden');
          }, 3000);
      }
      
      debugLog('Configuration loaded successfully');
      return config;
  } catch (error) {
      console.error('Configuration loading error:', error);
      
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
* Save configuration to Homebridge
* @returns {Promise<void>}
*/
window.saveConfig = async function() {
  try {
      console.log('Starting configuration save...');
      
      // Check if homebridge object is available
      if (typeof homebridge === 'undefined') {
          console.error('Homebridge API not available');
          return;
      }
      
      // Get current config to update
      const pluginConfig = await homebridge.getPluginConfig();
      console.log('Current plugin config:', pluginConfig);
      
      // Get values from form
      const apiToken = document.getElementById('apiToken')?.value;
      const unit = document.getElementById('unit')?.value || 'C';
      const pollingInterval = parseInt(document.getElementById('pollingInterval')?.value || '90', 10);
      const enableSchedules = document.getElementById('enableSchedules')?.checked || false;
      
      // Validate required fields
      if (!apiToken) {
          console.error('API token is required');
          
          const statusElement = document.getElementById('status');
          if (statusElement) {
              statusElement.textContent = 'API token is required';
              statusElement.className = 'status error';
              statusElement.classList.remove('hidden');
          }
          
          return;
      }
      
      // Create updated config
      const config = {
          platform: 'SleepMeSimple',
          name: 'SleepMe Simple',
          apiToken,
          unit,
          pollingInterval,
          enableSchedules
      };
      
      console.log('Prepared config object:', {...config, apiToken: '[REDACTED]'});
      
      // Add schedules if enabled
      if (enableSchedules && Array.isArray(window.schedules)) {
          // Always initialize schedules array even if empty
          config.schedules = [];
          
          if (window.schedules.length > 0) {
              // Create proper schedules array for storage
              config.schedules = window.schedules.map(schedule => {
                  // Create a clean schedule object
                  const cleanSchedule = {
                      type: String(schedule.type || 'Everyday'),
                      time: String(schedule.time || '00:00'),
                      temperature: Number(schedule.temperature || 21)
                  };
                  
                  // Add day for Specific Day schedules
                  if (schedule.type === 'Specific Day' && schedule.day !== undefined) {
                      cleanSchedule.day = Number(schedule.day);
                  }
                  
                  // Add description if present
                  if (schedule.description) {
                      cleanSchedule.description = String(schedule.description);
                  }
                  
                  // Add unit information
                  cleanSchedule.unit = String(schedule.unit || unit);
                  
                  return cleanSchedule;
              });
          }
          
          console.log(`Adding ${config.schedules.length} schedules to config`);
      } else {
          // Explicitly set empty schedules array when disabled
          config.schedules = [];
      }
      
      // Find current config position or create new entry
      let updatedConfig;
      const existingConfigIndex = Array.isArray(pluginConfig) ? 
          pluginConfig.findIndex(cfg => cfg && cfg.platform === 'SleepMeSimple') : -1;
      
      if (existingConfigIndex >= 0) {
          // Replace existing config
          updatedConfig = [...pluginConfig];
          updatedConfig[existingConfigIndex] = config;
          console.log(`Updating existing config at index ${existingConfigIndex}`);
      } else {
          // Add new config
          updatedConfig = Array.isArray(pluginConfig) ? [...pluginConfig, config] : [config];
          console.log('Adding new config entry');
      }
      
      // First update plugin config
      await homebridge.updatePluginConfig(updatedConfig);
      console.log('Updated plugin config in memory');
      
      // Then save to disk
      await homebridge.savePluginConfig();
      console.log('Config saved to disk successfully');
      
      // Verify save was successful
      const verifyConfig = await homebridge.getPluginConfig();
      const verifyPlatform = verifyConfig.find(c => c && c.platform === 'SleepMeSimple');
      
      if (verifyPlatform && verifyPlatform.enableSchedules && 
          Array.isArray(verifyPlatform.schedules)) {
          console.log(`Verified: ${verifyPlatform.schedules.length} schedules saved`);
      } else if (verifyPlatform) {
          console.log('Verified: Platform saved but schedules not enabled');
      } else {
          console.warn('Verification: Platform config not found after save!');
      }
      
      // Update status element
      const statusElement = document.getElementById('status');
      if (statusElement) {
          statusElement.textContent = 'Configuration saved successfully';
          statusElement.className = 'status success';
          statusElement.classList.remove('hidden');
          
          // Auto-hide success message after a delay
          setTimeout(() => {
              statusElement.classList.add('hidden');
          }, 3000);
      }
  } catch (error) {
      console.error('Error saving config:', error);
      
      const statusElement = document.getElementById('status');
      if (statusElement) {
          statusElement.textContent = 'Error saving config: ' + error.message;
          statusElement.className = 'status error';
          statusElement.classList.remove('hidden');
      }
  }
};