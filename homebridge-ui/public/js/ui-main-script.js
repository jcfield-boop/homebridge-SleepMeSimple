/**
 * SleepMe Simple Homebridge Plugin UI
 * 
 * Main entry point for the custom UI that handles configuration 
 * of SleepMe devices and scheduling features
 */

// Global variables
let schedules = [];            // Array to store schedules
let isEditing = false;         // Flag to track if we're in edit mode
let editingScheduleIndex = -1; // Index of schedule being edited
let initialized = false;       // Flag to track initialization state
let configLoaded = false;      // Flag to track if config has been loaded

// DOM element references
let scheduleTypeSelect;        // Schedule type dropdown
let daySelectContainer;        // Container for day selection
let scheduleTimeInput;         // Time input field
let scheduleTemperatureInput;  // Temperature input field
let unitSelect;                // Temperature unit selection
let warmHugInfo;               // Warm hug information container
let addScheduleBtn;            // Add schedule button
let cancelEditBtn;             // Cancel edit button
let scheduleList;              // Schedule list container

// Template definitions for schedule presets
const templates = {
  optimal: {
    name: "Optimal Sleep Cycle",
    description: "Designed for complete sleep cycles with REM enhancement",
    schedules: [
      { type: "Weekdays", time: "22:00", temperature: 21, description: "Cool Down" },
      { type: "Weekdays", time: "23:00", temperature: 19, description: "Deep Sleep" },
      { type: "Weekdays", time: "02:00", temperature: 23, description: "REM Support" },
      { type: "Weekdays", time: "06:00", temperature: 26, description: "Warm Hug Wake-up" }
    ]
  },
  nightOwl: {
    name: "Night Owl",
    description: "Later bedtime with extended morning warm-up",
    schedules: [
      { type: "Weekdays", time: "23:30", temperature: 21, description: "Cool Down" },
      { type: "Weekdays", time: "00:30", temperature: 19, description: "Deep Sleep" },
      { type: "Weekdays", time: "03:30", temperature: 23, description: "REM Support" },
      { type: "Weekdays", time: "07:30", temperature: 26, description: "Warm Hug Wake-up" }
    ]
  },
  earlyBird: {
    name: "Early Bird",
    description: "Earlier bedtime and wake-up schedule",
    schedules: [
      { type: "Weekdays", time: "21:00", temperature: 21, description: "Cool Down" },
      { type: "Weekdays", time: "22:00", temperature: 19, description: "Deep Sleep" },
      { type: "Weekdays", time: "01:00", temperature: 23, description: "REM Support" },
      { type: "Weekdays", time: "05:00", temperature: 26, description: "Warm Hug Wake-up" }
    ]
  },
  recovery: {
    name: "Weekend Recovery",
    description: "Extra sleep with later wake-up time",
    schedules: [
      { type: "Weekend", time: "23:00", temperature: 21, description: "Cool Down" },
      { type: "Weekend", time: "00:00", temperature: 19, description: "Deep Sleep" },
      { type: "Weekend", time: "03:00", temperature: 23, description: "REM Support" },
      { type: "Weekend", time: "08:00", temperature: 26, description: "Warm Hug Wake-up" }
    ]
  },
  relaxed: {
    name: "Relaxed Weekend",
    description: "Gradual transitions for weekend leisure",
    schedules: [
      { type: "Weekend", time: "23:30", temperature: 22, description: "Cool Down" },
      { type: "Weekend", time: "01:00", temperature: 20, description: "Deep Sleep" },
      { type: "Weekend", time: "04:00", temperature: 24, description: "REM Support" },
      { type: "Weekend", time: "09:00", temperature: 26, description: "Warm Hug Wake-up" }
    ]
  }
};

/**
 * Initialize DOM element references
 * Sets up references to key UI elements
 * @returns {boolean} True if all elements were found
 */
function initializeDOMReferences() {
  console.log('Initializing DOM element references');
  // Get key DOM elements
  scheduleTypeSelect = document.getElementById('scheduleType');
  daySelectContainer = document.getElementById('daySelectContainer');
  scheduleTimeInput = document.getElementById('scheduleTime');
  scheduleTemperatureInput = document.getElementById('scheduleTemperature');
  unitSelect = document.getElementById('unit');
  warmHugInfo = document.getElementById('warmHugInfo');
  addScheduleBtn = document.getElementById('addSchedule');
  cancelEditBtn = document.getElementById('cancelEdit');
  scheduleList = document.getElementById('scheduleList');
  
  // Log which elements were found/not found
  const elements = {
    scheduleTypeSelect,
    daySelectContainer,
    scheduleTimeInput,
    scheduleTemperatureInput,
    unitSelect,
    warmHugInfo,
    addScheduleBtn,
    cancelEditBtn,
    scheduleList
  };
  
  for (const [name, element] of Object.entries(elements)) {
    console.log(`Element ${name}: ${element ? 'Found' : 'NOT FOUND'}`);
  }
  
  // Show toast if DOM elements are missing
  if (!scheduleTypeSelect || !daySelectContainer || !scheduleTimeInput || 
      !scheduleTemperatureInput || !unitSelect || !warmHugInfo || 
      !addScheduleBtn || !cancelEditBtn || !scheduleList) {
    showToast('warning', 'Some UI elements could not be found', 'UI Warning');
    return false;
  }
  
  return true;
}

/**
 * Create logs section in the UI
 */
function createLogsSection() {
  // Create a container for logs
  const container = document.createElement('div');
  container.id = 'logsContainer';
  container.className = 'container hidden';
  
  const title = document.createElement('h2');
  title.textContent = 'Server Logs';
  
  const content = document.createElement('div');
  content.id = 'logsContent';
  content.className = 'logs-content';
  
  const refreshButton = document.createElement('button');
  refreshButton.textContent = 'Refresh Logs';
  refreshButton.className = 'secondary';
  refreshButton.style.marginTop = '10px';
  
  // Add click handler to refresh logs
  refreshButton.addEventListener('click', () => {
    fetchServerLogs();
  });
  
  // Assemble the logs UI
  container.appendChild(title);
  container.appendChild(content);
  container.appendChild(refreshButton);
  
  // Add to the page
  document.body.appendChild(container);
}

/**
 * Initialize event listeners for UI elements
 * @returns {boolean} True if listeners were set up successfully
 */
function initializeEventListeners() {
  console.log('Setting up event listeners');
  
  try {
    // Form submission handler
    const configForm = document.getElementById('configForm');
    if (configForm) {
      configForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveConfig();
      });
    } else {
      console.error('Config form not found in DOM');
      showToast('error', 'Config form not found in DOM', 'DOM Error');
      return false;
    }
    
    // Test connection button
    const testConnectionBtn = document.getElementById('testConnection');
    if (testConnectionBtn) {
      testConnectionBtn.addEventListener('click', testConnection);
    } else {
      console.warn('Test connection button not found');
    }
    
    // Enable schedules checkbox
    const enableSchedulesCheckbox = document.getElementById('enableSchedules');
    const schedulesContainer = document.getElementById('schedulesContainer');
    if (enableSchedulesCheckbox && schedulesContainer) {
      enableSchedulesCheckbox.addEventListener('change', () => {
        schedulesContainer.classList.toggle('hidden', !enableSchedulesCheckbox.checked);
      });
    } else {
      console.warn('Enable schedules checkbox or container not found');
    }
    
    // Schedule form elements
    if (scheduleTypeSelect) {
      scheduleTypeSelect.addEventListener('change', () => {
        // Show/hide day select for specific day schedules
        if (daySelectContainer) {
          daySelectContainer.classList.toggle('hidden', scheduleTypeSelect.value !== 'Specific Day');
        }
        
        // Show/hide warm hug info
        if (warmHugInfo) {
          warmHugInfo.classList.toggle('hidden', scheduleTypeSelect.value !== 'Warm Hug');
        }
      });
    }
    
    if (scheduleTimeInput) {
      scheduleTimeInput.addEventListener('input', validateScheduleTime);
      scheduleTimeInput.addEventListener('blur', validateScheduleTime);
    }
    
    if (scheduleTemperatureInput) {
      scheduleTemperatureInput.addEventListener('input', validateTemperature);
      scheduleTemperatureInput.addEventListener('blur', validateTemperature);
    }
    
    if (unitSelect) {
      unitSelect.addEventListener('change', updateTemperatureValidation);
    }
    
    if (addScheduleBtn) {
      addScheduleBtn.addEventListener('click', handleScheduleAction);
    }
    
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', exitEditMode);
    }
    
    // Template handling
    const applyTemplatesBtn = document.getElementById('applyTemplates');
    if (applyTemplatesBtn) {
      applyTemplatesBtn.addEventListener('click', applyScheduleTemplates);
    } else {
      console.warn('Apply templates button not found');
    }
    
    // Tab navigation
    const tabs = document.querySelectorAll('.tab');
    if (tabs && tabs.length > 0) {
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const tabId = tab.getAttribute('data-tab');
          
          // Remove active class from all tabs and contents
          document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          
          // Add active class to selected tab and content
          tab.classList.add('active');
          const tabContent = document.getElementById(tabId + 'Tab');
          if (tabContent) {
            tabContent.classList.add('active');
          } else {
            console.warn(`Tab content for ${tabId} not found`);
          }
        });
      });
    } else {
      console.warn('No tab elements found');
    }
    
    // Template description updates
    const weekdayTemplate = document.getElementById('weekdayTemplate');
    const weekdayTemplateDesc = document.getElementById('weekdayTemplateDesc');
    if (weekdayTemplate && weekdayTemplateDesc) {
      weekdayTemplate.addEventListener('change', () => {
        const selected = weekdayTemplate.value;
        weekdayTemplateDesc.textContent = selected && templates[selected] ? 
          templates[selected].description : '';
      });
    }
    
    const weekendTemplate = document.getElementById('weekendTemplate');
    const weekendTemplateDesc = document.getElementById('weekendTemplateDesc');
    if (weekendTemplate && weekendTemplateDesc) {
      weekendTemplate.addEventListener('change', () => {
        const selected = weekendTemplate.value;
        weekendTemplateDesc.textContent = selected && templates[selected] ? 
          templates[selected].description : '';
      });
    }
    
    console.log('Event listeners successfully initialized');
    return true;
  } catch (error) {
    console.error('Error setting up event listeners:', error);
    showToast('error', 'Error setting up event listeners: ' + error.message, 'Event Error');
    return false;
  }
}

/**
 * Test connection with the API
 */
async function testConnection() {
  try {
    showLoading('Testing API connection...');
    
    // Get the API token value
    const apiTokenInput = document.getElementById('apiToken');
    if (!apiTokenInput || !apiTokenInput.value) {
      showToast('error', 'API token is required', 'Connection Error');
      hideLoading();
      return;
    }
    
    // Make request to server
    const result = await homebridge.request('/device/test', { 
      apiToken: apiTokenInput.value 
    });
    
    if (result.success) {
      // Show success message with device info
      const deviceInfo = result.deviceInfo || [];
      let deviceListHtml = '';
      
      if (deviceInfo.length > 0) {
        deviceListHtml = '<ul style="margin-top:10px;">';
        deviceInfo.forEach(device => {
          deviceListHtml += `<li>${device.name} (${device.type || 'Unknown type'})</li>`;
        });
        deviceListHtml += '</ul>';
      }
      
      const successMessage = `${result.message}${deviceListHtml}`;
      
      // Create status element or get existing one
      const statusElement = document.getElementById('status');
      if (statusElement) {
        statusElement.innerHTML = successMessage;
        statusElement.className = 'status success';
        statusElement.classList.remove('hidden');
      }
      
      showToast('success', 'Connection test successful!', 'API Connection');
    } else {
      // Show error message
      const statusElement = document.getElementById('status');
      if (statusElement) {
        statusElement.textContent = result.error || 'Connection failed';
        statusElement.className = 'status error';
        statusElement.classList.remove('hidden');
      }
      
      showToast('error', result.error || 'Connection failed', 'API Connection');
    }
    
    hideLoading();
  } catch (error) {
    console.error('Test connection error:', error);
    showToast('error', 'Error testing connection: ' + error.message, 'Connection Error');
    hideLoading();
  }
}

/**
 * Fetch logs from the server
 */
async function fetchServerLogs() {
  try {
    showLoading('Fetching server logs...');
    
    const result = await homebridge.request('/logs');
    
    if (result.success) {
      const logsContent = document.getElementById('logsContent');
      if (logsContent) {
        // Clear existing content
        logsContent.innerHTML = '';
        
        if (result.logs && result.logs.length > 0) {
          // Create log entries
          result.logs.forEach(log => {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            
            const timestamp = document.createElement('div');
            timestamp.className = 'log-timestamp';
            timestamp.textContent = log.timestamp;
            
            const content = document.createElement('div');
            content.className = `log-content log-${log.level || 'info'}`;
            
            const context = document.createElement('span');
            context.className = 'log-context';
            context.textContent = `[${log.context || 'Server'}] `;
            
            const message = document.createElement('span');
            message.textContent = log.message;
            
            content.appendChild(context);
            content.appendChild(message);
            
            entry.appendChild(timestamp);
            entry.appendChild(content);
            
            // Add stack trace if available
            if (log.stack) {
              const stack = document.createElement('div');
              stack.className = 'log-stack';
              stack.textContent = log.stack;
              entry.appendChild(stack);
            }
            
            logsContent.appendChild(entry);
          });
        } else {
          logsContent.innerHTML = '<p>No logs available</p>';
        }
        
        // Show logs container
        const logsContainer = document.getElementById('logsContainer');
        if (logsContainer) {
          logsContainer.classList.remove('hidden');
        }
      }
      
      showToast('success', 'Logs retrieved successfully', 'Server Logs');
    } else {
      showToast('error', result.error || 'Failed to retrieve logs', 'Server Logs');
    }
    
    hideLoading();
  } catch (error) {
    console.error('Fetch logs error:', error);
    showToast('error', 'Error fetching logs: ' + error.message, 'Server Logs');
    hideLoading();
  }
}

/**
 * Wait for Homebridge to be fully ready
 * @returns {Promise<void>}
 */
function waitForHomebridgeReady() {
  return new Promise((resolve, reject) => {
    console.log('Checking Homebridge API readiness...');
    
    // Check if homebridge object exists
    if (typeof homebridge === 'undefined') {
      console.error('Homebridge API not available');
      reject(new Error('Homebridge object is not available'));
      return;
    }
    
    // If homebridge API methods are already available, resolve immediately
    if (typeof homebridge.getPluginConfig === 'function') {
      console.log('Homebridge API already initialized');
      resolve();
      return;
    }
    
    // Set a timeout to prevent hanging if the ready event never fires
    const timeout = setTimeout(() => {
      console.error('Timed out waiting for Homebridge API');
      reject(new Error('Timed out waiting for Homebridge to initialize'));
    }, 15000); // 15 second timeout
    
    // Listen for the 'ready' event from Homebridge
    console.log('Waiting for Homebridge ready event...');
    homebridge.addEventListener('ready', () => {
      console.log('Received Homebridge ready event');
      clearTimeout(timeout);
      
      // Add a small delay to ensure everything is fully initialized
      setTimeout(() => {
        // Double check methods are available
        if (typeof homebridge.getPluginConfig === 'function') {
          console.log('Homebridge API successfully initialized with all required methods');
          resolve();
        } else {
          console.error('Homebridge API methods not available after ready event');
          reject(new Error('Homebridge API not properly initialized after ready event'));
        }
      }, 1500); // Increased delay for better reliability
    });
  });
}

/**
 * Wait for all required DOM elements to be available
 * @returns {Promise<void>} Resolves when DOM elements are available
 */
async function waitForDOMElements() {
  const requiredElements = [
    'apiToken', 'unit', 'pollingInterval', 'logLevel', 'enableSchedules'
  ];
  
  return new Promise((resolve, reject) => {
    console.log('Checking for required DOM elements');
    
    // If all elements already exist, resolve immediately
    if (requiredElements.every(id => document.getElementById(id))) {
      console.log('All required DOM elements already available');
      resolve();
      return;
    }
    
    let attempts = 0;
    const maxAttempts = 10;
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
        console.error(`Timed out waiting for DOM elements: ${missing.join(', ')}`);
        clearInterval(intervalId);
        reject(new Error(`DOM elements not available: ${missing.join(', ')}`));
      }
    }, checkInterval);
  });
}

/**
 * Ensures the Homebridge API is fully initialized and ready
 * @returns {Promise<void>} Resolves when API is ready
 */
async function ensureHomebridgeReady() {
  return new Promise((resolve, reject) => {
    // Check if homebridge object exists
    if (typeof homebridge === 'undefined') {
      reject(new Error('Homebridge API not available - cannot load config'));
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
      reject(new Error('Timeout waiting for Homebridge API to initialize'));
    }, 10000);
    
    homebridge.addEventListener('ready', () => {
      clearTimeout(timeout);
      
      // Add delay to ensure full initialization
      setTimeout(() => {
        if (typeof homebridge.getPluginConfig === 'function') {
          console.log('Homebridge API now initialized');
          resolve();
        } else {
          reject(new Error('Homebridge API methods not available after ready event'));
        }
      }, 1000);
    });
  });
}

/**
 * Load configuration from Homebridge
 * Uses the Homebridge UI APIs to fetch plugin configuration
 * @returns {Promise<Object>} The loaded configuration object
 */
async function loadConfig() {
  try {
    showLoading('Loading configuration...');
    
    // Ensure homebridge object is fully initialized
    await ensureHomebridgeReady();
    
    // Log homebridge info for debugging
    console.log('Homebridge plugin info:', homebridge.plugin);
    console.log('Homebridge server env:', homebridge.serverEnv);
    
    // Request direct config check from server
    try {
      const configCheck = await homebridge.request('/config/check');
      if (configCheck.success) {
        showToast('success', 'Server can access config.json directly', 'Config Check');
        console.log('Server config check result:', configCheck);
      } else {
        showToast('warning', 'Server cannot access config.json directly', 'Config Warning');
        console.warn('Server config check warning:', configCheck);
      }
    } catch (checkError) {
      console.error('Config check error:', checkError);
      showToast('warning', 'Config check failed: ' + checkError.message, 'Config Warning');
    }
    
    // Get the plugin config using the Homebridge API
    let retries = 0;
    let pluginConfig = null;
    let retryDelay = 1000;
    
    // Try up to 3 times to load the config with increasing delay
    while (retries < 3 && !pluginConfig) {
      try {
        console.log(`Attempt ${retries + 1}/3 to get plugin config...`);
        pluginConfig = await homebridge.getPluginConfig();
        
        console.log('Raw plugin config:', JSON.stringify(pluginConfig));
        showToast('success', 'Configuration retrieved successfully', 'Config Loaded');
      } catch (configError) {
        retries++;
        console.error(`Config load attempt ${retries} failed:`, configError);
        showToast('warning', `Config load attempt ${retries} failed: ${configError.message}`, 'Retry');
        
        if (retries < 3) {
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay *= 2; // Double the delay for each retry
        } else {
          throw new Error(`Failed to load config after ${retries} attempts: ${configError.message}`);
        }
      }
    }
    
    // Find our platform configuration with more forgiving matching
    let config = {};
    if (Array.isArray(pluginConfig) && pluginConfig.length > 0) {
      // Try to find by exact platform name
      let platformConfig = pluginConfig.find(cfg => 
        cfg && cfg.platform && cfg.platform.toLowerCase() === 'sleepmebasic');
      
      // If not found, try the alternative name
      if (!platformConfig) {
        platformConfig = pluginConfig.find(cfg => 
          cfg && cfg.platform && (cfg.platform.toLowerCase() === 'sleepme' || 
          cfg.platform === 'SleepMeSimple'));
      }
      
      // If still not found, take the first platform config
      if (!platformConfig && pluginConfig.length > 0) {
        platformConfig = pluginConfig.find(cfg => cfg && cfg.platform) || pluginConfig[0];
      }
      
      config = platformConfig || {};
      
      console.log('Found platform config:', config);
      showToast('success', 'Found configuration in API response', 'Config Found');
    } else {
      console.warn('No plugin config found in API response');
      showToast('info', 'No existing configuration found, using defaults', 'New Config');
    }
    
    // Wait for DOM elements to be available
    await waitForDOMElements();
    
    // Fill form fields with config values
    populateFormFields(config);
    
    hideLoading();
    return config;
  } catch (error) {
    console.error('Configuration loading error:', error);
    showToast('error', 'Failed to load configuration: ' + error.message, 'Config Error');
    hideLoading();
    return {};
  }
}

/**
 * Populate form fields with configuration values
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
    showToast('info', 'API token loaded from config', 'Config');
  } else if (apiTokenInput) {
    console.warn('No API token found in config');
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
    if (Array.isArray(config.schedules) && config.schedules.length > 0) {
      // Create a clean copy of schedules with unit info
      window.schedules = config.schedules.map(schedule => ({
        ...schedule,
        unit: schedule.unit || (unitSelect ? unitSelect.value : 'C')
      }));
      
      // Assign to global schedules variable for compatibility
      schedules = [...window.schedules];
      
      // Render schedule list if the function exists
      if (typeof renderScheduleList === 'function') {
        console.log('Rendering schedule list with', schedules.length, 'schedules');
        renderScheduleList();
      } else {
        console.warn('renderScheduleList function not available');
      }
      
      showToast('info', `Loaded ${schedules.length} schedules from config`, 'Schedules');
    } else if (enableSchedules) {
      console.log('No schedules found in config but schedules are enabled');
      window.schedules = [];
      schedules = [];
      showToast('info', 'No existing schedules found', 'Schedules');
    }
  }
  
  // Apply the updated temperature validation based on the loaded unit
  if (typeof updateTemperatureValidation === 'function') {
    updateTemperatureValidation();
  } else {
    console.warn('updateTemperatureValidation function not available');
  }
}

/**
 * Save configuration to Homebridge
 * @returns {Promise<void>}
 */
async function saveConfig() {
  try {
    showLoading('Saving configuration...');
    showToast('info', 'Starting save process...', 'Save Config');
    
    // Verify Homebridge API is available
    await ensureHomebridgeReady();
    
    // Get current config to update
    showToast('info', 'Fetching current config...', 'Save Step 1');
    const pluginConfig = await homebridge.getPluginConfig();
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
    
    console.log('Prepared config object:', {...config, apiToken: '[REDACTED]'});
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
      
      console.log(`Adding ${config.schedules.length} schedules to config`);
      showToast('info', `Added ${config.schedules.length} schedules to config`, 'Schedules');
    }
    
    // Find current config position and update
    const existingConfigIndex = Array.isArray(pluginConfig) ? 
      pluginConfig.findIndex(cfg => cfg.platform === 'SleepMeSimple') : -1;

    let updatedConfig;
    if (existingConfigIndex >= 0) {
      // Replace existing config
      updatedConfig = [...pluginConfig];
      updatedConfig[existingConfigIndex] = config;
      console.log(`Updating existing config at index ${existingConfigIndex}`);
    } else if (Array.isArray(pluginConfig)) {
      // Add new config to array
      updatedConfig = [...pluginConfig, config];
      console.log('Adding new config to existing array');
    } else {
      // Create new config array
      updatedConfig = [config];
      console.log('Creating new config array');
    }
    
    // Update plugin config
    showToast('info', 'Calling updatePluginConfig...', 'Save Step 3');
    await homebridge.updatePluginConfig(updatedConfig);
    
    // Save changes to disk
    showToast('info', 'Calling savePluginConfig...', 'Save Step 4');
    await homebridge.savePluginConfig();
    
    // Verify config was saved
    try {
      const verifyResult = await homebridge.request('/config/check');
      console.log('Config verification result:', verifyResult);
      
      if (verifyResult.success && verifyResult.platformFound) {
        showToast('success', 'Configuration verified by server', 'Config Verified');
      } else {
        showToast('warning', 'Server verification inconclusive', 'Verify Warning');
      }
    } catch (verifyError) {
      console.error('Verification error:', verifyError);
      showToast('warning', 'Could not verify configuration: ' + verifyError.message, 'Verify Warning');
    }
    
    hideLoading();
    showToast('success', 'Configuration saved successfully', 'Save Complete');
  } catch (error) {
    console.error('Save configuration error:', error);
    showToast('error', 'Failed to save configuration: ' + error.message, 'Save Error');
    hideLoading();
  }
}

/**
 * Initialize the application
 * Sets up event handlers, loads configuration and prepares the UI
 */
async function initApp() {
  try {
    console.log('Starting UI initialization');
    
    // Create logs section (can be done early)
    createLogsSection();
    
    // Verify the homebridge object is ready
    try {
      await waitForHomebridgeReady();
      console.log('Homebridge API ready, continuing initialization');
    } catch (homebridgeError) {
      console.error('Homebridge API not ready:', homebridgeError);
      showToast('error', 'Homebridge API initialization failed: ' + homebridgeError.message, 'API Error');
      // Continue anyway - sometimes the API becomes available later
    }
    
    // Initialize DOM element references
    try {
      const elementsInitialized = initializeDOMReferences();
      if (!elementsInitialized) {
        console.error('Failed to initialize UI elements');
        showToast('error', 'Failed to initialize UI elements', 'DOM Error');
        // Continue despite error
      }
    } catch (domError) {
      console.error('DOM initialization error:', domError);
      // Continue despite error
    }
    
    // Load initial configuration with retry mechanism
    let configLoadAttempts = 0;
    let config = {};
    
    while (configLoadAttempts < 3) {
      try {
        config = await loadConfig();
        configLoaded = true;
        console.log('Configuration loaded successfully');
        break; // Exit loop on success
      } catch (configError) {
        configLoadAttempts++;
        console.error(`Config load attempt ${configLoadAttempts} failed:`, configError);
        
        if (configLoadAttempts < 3) {
          console.log(`Waiting before retry ${configLoadAttempts}...`);
          showToast('warning', `Retrying config load (${configLoadAttempts}/3)`, 'Config Retry');
          await new Promise(resolve => setTimeout(resolve, 2000 * configLoadAttempts));
        } else {
          showToast('error', 'Failed to load config after multiple attempts', 'Config Error');
        }
      }
    }
    
    // Setup event listeners after DOM and config are ready
    try {
      const listenersInitialized = initializeEventListeners();
      if (!listenersInitialized) {
        console.error('Failed to initialize event listeners');
        showToast('error', 'Failed to initialize event listeners', 'Event Error');
      }
    } catch (listenerError) {
      console.error('Event listener initialization error:', listenerError);
    }
    
    // Initialize schedule UI if needed
    if (configLoaded && typeof renderScheduleList === 'function') {
      try {
        console.log('Rendering schedule list');
        renderScheduleList();
      } catch (scheduleError) {
        console.error('Error rendering schedule list:', scheduleError);
      }
    }
    
    // Mark as initialized
    initialized = true;
    console.log('SleepMe Simple UI initialization complete');
    showToast('success', 'SleepMe Simple UI initialized successfully', 'Ready');
  } catch (error) {
    console.error('Fatal initialization error:', error);
    showToast('error', 'Error initializing UI: ' + error.message, 'Initialization Error');
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
  console.log('Loading:', message);
}

/**
 * Hide loading indicator
 */
function hideLoading() {
  if (typeof homebridge !== 'undefined' && typeof homebridge.hideSpinner === 'function') {
    homebridge.hideSpinner();
  }
  console.log('Loading complete');
}

/**
 * Show toast notification
 * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
 * @param {string} message - Toast message
 * @param {string} title - Toast title
 * @param {Function} callback - Optional callback function
 */
function showToast(type, message, title, callback) {
  // Log to console for debugging
  const logMethod = type === 'error' ? console.error : 
                   type === 'warning' ? console.warn : console.log;
  
  logMethod(`${title}: ${message}`);
  
  // Display toast if homebridge is available
  if (homebridge && homebridge.toast) {
    if (homebridge.toast[type]) {
      homebridge.toast[type](message, title);
    } else {
      homebridge.toast.info(message, title);
    }
  }

  if (typeof callback === 'function') {
    setTimeout(callback, 2000);
  }
}

// Initialization sequence - critical part
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded event fired');
  
  // Check if the homebridge object is available (basic check)
  if (typeof homebridge === 'undefined') {
    // Cannot use showToast here as it depends on homebridge
    alert('Error: Homebridge UI framework not detected. Please reload the page.');
    console.error('Homebridge object not available at DOMContentLoaded');
    return;
  }
  
  // Global error handler for uncaught exceptions
  window.onerror = function(message, source, lineno, colno, error) {
    console.error('Uncaught error:', message, 'at', source, ':', lineno);
    showToast('error', 'Uncaught error: ' + message, 'Error');
    return false;
  };
  
  // Wait for Homebridge's ready event or initialize if it's already ready
  if (typeof homebridge.getPluginConfig === 'function') {
    // Homebridge API already available
    console.log('Homebridge API already available at DOMContentLoaded');
    initApp();
  } else {
    // Wait for the ready event
    console.log('Waiting for Homebridge ready event');
    homebridge.addEventListener('ready', () => {
      showToast('info', 'Homebridge ready event received, initializing...', 'Homebridge Ready');
      console.log('Homebridge ready event received');
      // Small delay to ensure Homebridge API is fully available
      setTimeout(initApp, 500);
    });
    
    // Set a failsafe timeout in case the ready event doesn't fire
    setTimeout(() => {
      if (!initialized) {
        console.warn('Homebridge ready event not received after 10 seconds, attempting fallback initialization');
        showToast('warning', 'Homebridge ready event not received, attempting initialization anyway', 'Backup Init');
        initApp();
      }
    }, 10000); // 10 second backup timeout
  }
});

// Event listeners for server events
homebridge.addEventListener('config-status', (event) => {
  const configStatus = event.data;
  console.log('Received config-status event:', configStatus);
  
  if (configStatus.success) {
    showToast('success', `Config file accessed successfully`, 'Config Status');
    
    if (configStatus.platformFound && configStatus.platformConfig) {
      showToast('info', `Found configuration with ${configStatus.platformConfig.scheduleCount} schedules`, 'Config Details');
    } else {
      console.warn('Platform config not found in config.json');
      if (configStatus.allPlatforms && configStatus.allPlatforms.length > 0) {
        console.log('Available platforms:', configStatus.allPlatforms);
      }
    }
  } else {
    console.error('Config status error:', configStatus);
    showToast('error', `Unable to read config file: ${configStatus.error || 'Unknown error'}`, 'Config Error');
  }
});

// Server error listener
homebridge.addEventListener('server-error', (event) => {
  const errorData = event.data;
  console.error('Server error event:', errorData);
  showToast('error', `Server error: ${errorData.message}`, 'Server Error');
});