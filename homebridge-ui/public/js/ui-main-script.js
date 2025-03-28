/**
 * SleepMe Simple Homebridge Plugin UI
 * 
 * Main entry point for the custom UI that handles configuration 
 * of SleepMe devices and scheduling features
 */

// Global variables with proper initialization
window.schedules = [];           // Array to store schedules
window.isEditing = false;        // Flag to track if we're in edit mode
window.editingScheduleIndex = -1; // Index of schedule being edited
let initialized = false;         // Flag to track initialization state
let configLoaded = false;        // Flag to track if config has been loaded
let homebridgeReady = false;     // Flag to track Homebridge API readiness

// DOM element references - initialize as null to avoid undeclared variable issues
window.scheduleTypeSelect = null;       // Schedule type dropdown
window.daySelectContainer = null;       // Container for day selection
window.scheduleTimeInput = null;        // Time input field
window.scheduleTemperatureInput = null; // Temperature input field
window.unitSelect = null;               // Temperature unit selection
window.warmHugInfo = null;              // Warm hug information container
window.addScheduleBtn = null;           // Add schedule button
window.cancelEditBtn = null;            // Cancel edit button
window.scheduleList = null;             // Schedule list container

// Template definitions for schedule presets - making globally available
window.templates = {
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
 * Helper function to safely get a DOM element with error handling
 * @param {string} id - The element ID to find
 * @param {boolean} required - Whether the element is required
 * @returns {HTMLElement|null} - The DOM element or null if not found
 */
function safeGetElement(id, required = false) {
  const element = document.getElementById(id);
  if (!element && required) {
    console.warn(`Required element #${id} not found in DOM`);
  } else if (!element) {
    console.debug(`Element #${id} not found in DOM`);
  }
  return element;
}

/**
 * Initialize DOM element references with proper error handling
 * Sets up references to key UI elements
 * @returns {boolean} True if all required elements were found
 */
function initializeDOMReferences() {
  console.log('Initializing DOM element references');
  
  try {
    // Get key DOM elements with safety checks
    window.scheduleTypeSelect = safeGetElement('scheduleType', true);
    window.daySelectContainer = safeGetElement('daySelectContainer', true);
    window.scheduleTimeInput = safeGetElement('scheduleTime', true);
    window.scheduleTemperatureInput = safeGetElement('scheduleTemperature', true);
    window.unitSelect = safeGetElement('unit', true);
    window.warmHugInfo = safeGetElement('warmHugInfo', true);
    window.addScheduleBtn = safeGetElement('addSchedule', true);
    window.cancelEditBtn = safeGetElement('cancelEdit', true);
    window.scheduleList = safeGetElement('scheduleList', true);
    
    // Make them available as module exports for other scripts
    scheduleTypeSelect = window.scheduleTypeSelect;
    daySelectContainer = window.daySelectContainer;
    scheduleTimeInput = window.scheduleTimeInput;
    scheduleTemperatureInput = window.scheduleTemperatureInput;
    unitSelect = window.unitSelect;
    warmHugInfo = window.warmHugInfo;
    addScheduleBtn = window.addScheduleBtn;
    cancelEditBtn = window.cancelEditBtn;
    scheduleList = window.scheduleList;
    
    // Check if any required elements are missing
    const requiredElements = [
      window.scheduleTypeSelect, window.daySelectContainer, window.scheduleTimeInput, 
      window.scheduleTemperatureInput, window.unitSelect, window.warmHugInfo, 
      window.addScheduleBtn, window.cancelEditBtn, window.scheduleList
    ];
    
    const missingElementCount = requiredElements.filter(el => !el).length;
    
    if (missingElementCount > 0) {
      console.warn(`${missingElementCount} required DOM elements could not be found`);
      window.showToast('warning', `${missingElementCount} UI elements could not be found. The UI may not function correctly.`, 'UI Warning');
      return false;
    }
    
    console.log('All DOM elements successfully initialized');
    return true;
  } catch (error) {
    console.error('Error initializing DOM references:', error);
    window.showToast('error', 'Failed to initialize UI elements: ' + error.message, 'DOM Error');
    return false;
  }
}

/**
 * Initialize event listeners for UI elements with proper error handling
 * @returns {boolean} True if listeners were set up successfully
 */
function initializeEventListeners() {
  console.log('Setting up event listeners');
  
  try {
    // Form submission handler
    const configForm = safeGetElement('configForm', true);
    if (configForm) {
      configForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (typeof window.saveConfig === 'function') {
          await window.saveConfig();
        } else {
          console.error('saveConfig function not available');
          window.showToast('error', 'Save function not available', 'Function Error');
        }
      });
    } else {
      console.error('Config form not found in DOM');
      window.showToast('error', 'Config form not found in DOM', 'DOM Error');
      return false;
    }
    
    // Test connection button
    const testConnectionBtn = safeGetElement('testConnection');
    if (testConnectionBtn) {
      testConnectionBtn.addEventListener('click', () => {
        if (typeof window.testConnection === 'function') {
          window.testConnection();
        } else {
          console.error('testConnection function not available');
          window.showToast('error', 'Test connection function not available', 'Function Error');
        }
      });
    }
    
    // Enable schedules checkbox
    const enableSchedulesCheckbox = safeGetElement('enableSchedules');
    const schedulesContainer = safeGetElement('schedulesContainer');
    if (enableSchedulesCheckbox && schedulesContainer) {
      enableSchedulesCheckbox.addEventListener('change', () => {
        schedulesContainer.classList.toggle('hidden', !enableSchedulesCheckbox.checked);
      });
    }
    
    // Schedule form elements
    if (window.scheduleTypeSelect) {
      window.scheduleTypeSelect.addEventListener('change', () => {
        // Show/hide day select for specific day schedules
        if (window.daySelectContainer) {
          window.daySelectContainer.classList.toggle('hidden', window.scheduleTypeSelect.value !== 'Specific Day');
        }
        
        // Show/hide warm hug info
        if (window.warmHugInfo) {
          window.warmHugInfo.classList.toggle('hidden', window.scheduleTypeSelect.value !== 'Warm Hug');
        }
      });
    }
    
    if (window.scheduleTimeInput && typeof window.validateScheduleTime === 'function') {
      window.scheduleTimeInput.addEventListener('input', window.validateScheduleTime);
      window.scheduleTimeInput.addEventListener('blur', window.validateScheduleTime);
    } else if (window.scheduleTimeInput) {
      console.warn('validateScheduleTime function not available for scheduleTimeInput');
    }
    
    if (window.scheduleTemperatureInput && typeof window.validateTemperature === 'function') {
      window.scheduleTemperatureInput.addEventListener('input', window.validateTemperature);
      window.scheduleTemperatureInput.addEventListener('blur', window.validateTemperature);
    } else if (window.scheduleTemperatureInput) {
      console.warn('validateTemperature function not available for scheduleTemperatureInput');
    }
    
    if (window.unitSelect && typeof window.updateTemperatureValidation === 'function') {
      window.unitSelect.addEventListener('change', window.updateTemperatureValidation);
    } else if (window.unitSelect) {
      console.warn('updateTemperatureValidation function not available for unitSelect');
    }
    
    if (window.addScheduleBtn && typeof window.handleScheduleAction === 'function') {
      window.addScheduleBtn.addEventListener('click', window.handleScheduleAction);
    } else if (window.addScheduleBtn) {
      console.warn('handleScheduleAction function not available for addScheduleBtn');
    }
    
    if (window.cancelEditBtn && typeof window.exitEditMode === 'function') {
      window.cancelEditBtn.addEventListener('click', window.exitEditMode);
    } else if (window.cancelEditBtn) {
      console.warn('exitEditMode function not available for cancelEditBtn');
    }
    
    // Template handling
    const applyTemplatesBtn = safeGetElement('applyTemplates');
    if (applyTemplatesBtn && typeof window.applyScheduleTemplates === 'function') {
      applyTemplatesBtn.addEventListener('click', window.applyScheduleTemplates);
    } else if (applyTemplatesBtn) {
      console.warn('applyScheduleTemplates function not available for applyTemplatesBtn');
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
    }
    
    console.log('Event listeners successfully initialized');
    return true;
  } catch (error) {
    console.error('Error setting up event listeners:', error);
    window.showToast('error', 'Error setting up event listeners: ' + error.message, 'Event Error');
    return false;
  }
}

/**
 * Show a toast notification with consistent formatting
 * This helper function ensures toast notifications work across files
 * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
 * @param {string} message - Toast message
 * @param {string} title - Toast title
 * @param {Function} callback - Optional callback function
 */
window.showToast = function(type, message, title, callback) {
  // Log to console for debugging
  const logMethod = type === 'error' ? console.error : 
                   type === 'warning' ? console.warn : console.log;
  
  logMethod(`${title}: ${message}`);
  
  // Display toast if homebridge is available
  if (typeof homebridge !== 'undefined' && homebridge.toast) {
    if (homebridge.toast[type]) {
      homebridge.toast[type](message, title);
    } else {
      homebridge.toast.info(message, title);
    }
  }

  if (typeof callback === 'function') {
    setTimeout(callback, 2000);
  }
};

/**
 * Show loading indicator with message
 * @param {string} message - Message to display
 */
window.showLoading = function(message) {
  if (typeof homebridge !== 'undefined' && typeof homebridge.showSpinner === 'function') {
    homebridge.showSpinner();
  }
  window.showToast('info', message, 'Loading...');
  console.log('Loading:', message);
};

/**
 * Hide loading indicator
 */
window.hideLoading = function() {
  if (typeof homebridge !== 'undefined' && typeof homebridge.hideSpinner === 'function') {
    homebridge.hideSpinner();
  }
  console.log('Loading complete');
};

/**
 * Test connection to the SleepMe API
 * @returns {Promise<void>}
 */
window.testConnection = async function() {
  try {
    const apiTokenInput = safeGetElement('apiToken', true);
    if (!apiTokenInput) {
      window.showToast('error', 'API token input field not found', 'Test Error');
      return;
    }
    
    const apiToken = apiTokenInput.value.trim();
    if (!apiToken) {
      window.showToast('error', 'Please enter your API token', 'Validation Error');
      return;
    }
    
    window.showLoading('Testing API connection...');
    
    const response = await homebridge.request('/device/test', { apiToken });
    
    window.hideLoading();
    
    if (response.success) {
      window.showToast('success', 
        `Connection successful! Found ${response.devices} device(s): ${response.deviceInfo.map(d => d.name).join(', ')}`, 
        'API Test');
    } else {
      window.showToast('error', response.error || 'Unknown error testing connection', 'API Test Failed');
    }
  } catch (error) {
    window.hideLoading();
    console.error('Test connection error:', error);
    window.showToast('error', 'Error testing connection: ' + error.message, 'API Test Error');
  }
};

/**
 * Wait for Homebridge to be fully ready with improved error handling
 * @returns {Promise<void>}
 */
async function waitForHomebridgeReady() {
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
      homebridgeReady = true;
      resolve();
      return;
    }
    
    // Set a timeout to prevent hanging if the ready event never fires
    const timeout = setTimeout(() => {
      console.error('Timed out waiting for Homebridge API');
      // Even though this is an error, we'll try to continue anyway
      homebridgeReady = false;
      resolve(); // Resolve instead of reject to allow initialization to continue
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
          homebridgeReady = true;
          resolve();
        } else {
          console.error('Homebridge API methods not available after ready event');
          homebridgeReady = false;
          resolve(); // Resolve instead of reject to allow initialization to continue
        }
      }, 1500); // Increased delay for better reliability
    });
  });
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
 * Fetch server logs from the backend
 */
window.fetchServerLogs = async function() {
  try {
    window.showLoading('Fetching server logs...');
    
    const response = await homebridge.request('/logs');
    
    window.hideLoading();
    
    if (response.success) {
      const logsContent = safeGetElement('logsContent');
      if (logsContent) {
        logsContent.innerHTML = '';
        
        if (response.logs && response.logs.length > 0) {
          response.logs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            
            const timestamp = document.createElement('div');
            timestamp.className = 'log-timestamp';
            timestamp.textContent = log.timestamp;
            
            const context = document.createElement('div');
            context.className = 'log-context';
            context.textContent = `[${log.context}] [${log.level.toUpperCase()}]`;
            
            const message = document.createElement('div');
            message.textContent = log.message;
            
            logEntry.appendChild(timestamp);
            logEntry.appendChild(context);
            logEntry.appendChild(message);
            
            if (log.stack) {
              const stack = document.createElement('div');
              stack.className = 'log-stack';
              stack.textContent = log.stack;
              logEntry.appendChild(stack);
            }
            
            logsContent.appendChild(logEntry);
          });
          
          window.showToast('success', `Loaded ${response.logs.length} log entries`, 'Logs');
        } else {
          logsContent.innerHTML = '<p>No logs available.</p>';
          window.showToast('info', 'No logs available', 'Logs');
        }
        
        // Show the logs container
        const logsContainer = safeGetElement('logsContainer');
        if (logsContainer) {
          logsContainer.classList.remove('hidden');
        }
      }
    } else {
      window.showToast('error', response.error || 'Failed to fetch logs', 'Logs Error');
    }
  } catch (error) {
    window.hideLoading();
    console.error('Fetch logs error:', error);
    window.showToast('error', 'Error fetching logs: ' + error.message, 'Logs Error');
  }
};

/**
 * Robust initialization sequence with better error handling and fallbacks
 */
async function initApp() {
  try {
    console.log('Starting UI initialization sequence');
    window.showToast('info', 'Initializing UI...', 'Startup');
    
    // Create logs section (can be done early)
    createLogsSection();
    
    // Step 1: Ensure Homebridge API is ready
    try {
      await waitForHomebridgeReady();
      if (homebridgeReady) {
        console.log('Homebridge API is ready');
        window.showToast('success', 'Homebridge API initialized', 'Startup');
      } else {
        console.warn('Homebridge API may not be fully ready, continuing anyway');
        window.showToast('warning', 'Homebridge API may not be fully initialized', 'Startup Warning');
      }
    } catch (homebridgeError) {
      console.error('Homebridge API initialization error:', homebridgeError);
      window.showToast('error', 'Homebridge API error: ' + homebridgeError.message, 'API Error');
      // Continue anyway - we'll try to recover
    }
    
    // Step 2: Ensure DOM elements are initialized
    let domInitialized = false;
    try {
      // Try multiple times with delay to ensure DOM is ready
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`DOM initialization attempt ${attempt}/3`);
        
        domInitialized = initializeDOMReferences();
        if (domInitialized) {
          console.log('DOM references successfully initialized');
          break;
        }
        
        if (attempt < 3) {
          console.log('DOM not ready, waiting before retry...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!domInitialized) {
        console.error('Failed to initialize DOM references after multiple attempts');
        window.showToast('error', 'Failed to initialize UI elements', 'DOM Error');
        // Continue anyway - we'll try to recover
      }
    } catch (domError) {
      console.error('DOM initialization error:', domError);
      window.showToast('error', 'DOM initialization error: ' + domError.message, 'DOM Error');
      // Continue anyway - we'll try to recover
    }
    
    // Step 3: Load configuration
    let configLoadAttempts = 0;
    let config = {};
    
    while (configLoadAttempts < 3) {
      try {
        if (typeof window.loadConfig === 'function' && homebridgeReady) {
          console.log(`Config load attempt ${configLoadAttempts + 1}/3`);
          config = await window.loadConfig();
          configLoaded = true;
          console.log('Configuration loaded successfully');
          window.showToast('success', 'Configuration loaded successfully', 'Config');
          break; // Exit loop on success
        } else {
          if (!window.loadConfig) {
            console.error('loadConfig function not available');
            window.showToast('error', 'loadConfig function not available', 'Function Error');
          }
          if (!homebridgeReady) {
            console.error('Cannot load config - Homebridge API not ready');
            window.showToast('error', 'Cannot load config - Homebridge API not ready', 'API Error');
          }
          break;
        }
      } catch (configError) {
        configLoadAttempts++;
        console.error(`Config load attempt ${configLoadAttempts} failed:`, configError);
        
        if (configLoadAttempts < 3) {
          console.log(`Waiting before retry ${configLoadAttempts}...`);
          window.showToast('warning', `Retrying config load (${configLoadAttempts}/3)`, 'Config Retry');
          await new Promise(resolve => setTimeout(resolve, 2000 * configLoadAttempts));
        } else {
          window.showToast('error', 'Failed to load config after multiple attempts', 'Config Error');
        }
      }
    }
    
    // Step 4: Setup event listeners
    try {
      const listenersInitialized = initializeEventListeners();
      if (listenersInitialized) {
        console.log('Event listeners successfully initialized');
      } else {
        console.error('Failed to initialize event listeners');
        window.showToast('error', 'Failed to initialize event listeners', 'Event Error');
      }
    } catch (listenerError) {
      console.error('Event listener initialization error:', listenerError);
      window.showToast('error', 'Event listener error: ' + listenerError.message, 'Event Error');
    }
    
    // Step 5: Initialize schedule UI if needed
    if (configLoaded && typeof window.renderScheduleList === 'function') {
      try {
        console.log('Rendering schedule list');
        window.renderScheduleList();
      } catch (scheduleError) {
        console.error('Error rendering schedule list:', scheduleError);
        window.showToast('error', 'Error rendering schedules: ' + scheduleError.message, 'Schedule Error');
      }
    } else if (typeof window.renderScheduleList !== 'function') {
      console.warn('renderScheduleList function not available');
    }
    
    // Mark as initialized
    initialized = true;
    console.log('SleepMe Simple UI initialization complete');
    window.showToast('success', 'SleepMe Simple UI initialized', 'Ready');
    
    // Fetch server logs
    if (typeof window.fetchServerLogs === 'function') {
      window.fetchServerLogs().catch(err => {
        console.error('Error fetching logs:', err);
      });
    }
  } catch (error) {
    console.error('Fatal initialization error:', error);
    window.showToast('error', 'Error initializing UI: ' + error.message, 'Initialization Error');
  }
}

// Main initialization - runs when document is ready
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
    window.showToast('error', 'Uncaught error: ' + message, 'Error');
    return false;
  };
  
  // Wait for Homebridge's ready event or initialize if it's already ready
  if (typeof homebridge.getPluginConfig === 'function') {
    // Homebridge API already available
    console.log('Homebridge API already available at DOMContentLoaded');
    homebridgeReady = true;
    // Small delay to ensure DOM is fully loaded
    setTimeout(initApp, 500);
  } else {
    // Wait for the ready event
    console.log('Waiting for Homebridge ready event');
    homebridge.addEventListener('ready', () => {
      window.showToast('info', 'Homebridge ready event received', 'Homebridge Ready');
      console.log('Homebridge ready event received');
      // Small delay to ensure Homebridge API is fully available
      setTimeout(initApp, 500);
    });
    
    // Set a failsafe timeout in case the ready event doesn't fire
    setTimeout(() => {
      if (!initialized) {
        console.warn('Homebridge ready event not received after 10 seconds, attempting fallback initialization');
        window.showToast('warning', 'Homebridge ready event timeout, attempting initialization anyway', 'Backup Init');
        initApp();
      }
    }, 10000); // 10 second backup timeout
  }
});