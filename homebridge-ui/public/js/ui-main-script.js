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
  // Other templates...
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
    if (typeof showToast === 'function') {
      showToast('warning', 'Some UI elements could not be found', 'UI Warning');
    } else {
      console.warn('Some UI elements could not be found and showToast function is not available');
    }
    return false;
  }
  
  return true;
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
        if (typeof saveConfig === 'function') {
          await saveConfig();
        } else {
          console.error('saveConfig function not available');
        }
      });
    } else {
      console.error('Config form not found in DOM');
      if (typeof showToast === 'function') {
        showToast('error', 'Config form not found in DOM', 'DOM Error');
      }
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
    
    console.log('Event listeners successfully initialized');
    return true;
  } catch (error) {
    console.error('Error setting up event listeners:', error);
    if (typeof showToast === 'function') {
      showToast('error', 'Error setting up event listeners: ' + error.message, 'Event Error');
    }
    return false;
  }
}

// Need to make helper functions globally available
window.showToast = function(type, message, title, callback) {
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
};

// More global function definitions
window.showLoading = function(message) {
  if (typeof homebridge !== 'undefined' && typeof homebridge.showSpinner === 'function') {
    homebridge.showSpinner();
  }
  window.showToast('info', message, 'Loading...');
  console.log('Loading:', message);
};

window.hideLoading = function() {
  if (typeof homebridge !== 'undefined' && typeof homebridge.hideSpinner === 'function') {
    homebridge.hideSpinner();
  }
  console.log('Loading complete');
};

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
    window.showToast('error', 'Uncaught error: ' + message, 'Error');
    return false;
  };
  
  // Expose key functions to window for cross-file access
  window.initializeEventListeners = initializeEventListeners;
  window.initializeDOMReferences = initializeDOMReferences;
  
  // Wait for Homebridge's ready event or initialize if it's already ready
  if (typeof homebridge.getPluginConfig === 'function') {
    // Homebridge API already available
    console.log('Homebridge API already available at DOMContentLoaded');
    initApp();
  } else {
    // Wait for the ready event
    console.log('Waiting for Homebridge ready event');
    homebridge.addEventListener('ready', () => {
      window.showToast('info', 'Homebridge ready event received, initializing...', 'Homebridge Ready');
      console.log('Homebridge ready event received');
      // Small delay to ensure Homebridge API is fully available
      setTimeout(initApp, 500);
    });
    
    // Set a failsafe timeout in case the ready event doesn't fire
    setTimeout(() => {
      if (!initialized) {
        console.warn('Homebridge ready event not received after 10 seconds, attempting fallback initialization');
        window.showToast('warning', 'Homebridge ready event not received, attempting initialization anyway', 'Backup Init');
        initApp();
      }
    }, 10000); // 10 second backup timeout
  }
});

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
      window.showToast('error', 'Homebridge API initialization failed: ' + homebridgeError.message, 'API Error');
      // Continue anyway - sometimes the API becomes available later
    }
    
    // Initialize DOM element references
    try {
      const elementsInitialized = initializeDOMReferences();
      if (!elementsInitialized) {
        console.error('Failed to initialize UI elements');
        window.showToast('error', 'Failed to initialize UI elements', 'DOM Error');
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
        if (typeof loadConfig === 'function') {
          config = await loadConfig();
          configLoaded = true;
          console.log('Configuration loaded successfully');
          break; // Exit loop on success
        } else {
          console.error('loadConfig function not available');
          window.showToast('error', 'loadConfig function not available', 'Function Error');
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
    
    // Setup event listeners after DOM and config are ready
    try {
      const listenersInitialized = initializeEventListeners();
      if (!listenersInitialized) {
        console.error('Failed to initialize event listeners');
        window.showToast('error', 'Failed to initialize event listeners', 'Event Error');
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
    window.showToast('success', 'SleepMe Simple UI initialized successfully', 'Ready');
  } catch (error) {
    console.error('Fatal initialization error:', error);
    window.showToast('error', 'Error initializing UI: ' + error.message, 'Initialization Error');
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
    if (typeof fetchServerLogs === 'function') {
      fetchServerLogs();
    } else {
      console.error('fetchServerLogs function not available');
    }
  });
  
  // Assemble the logs UI
  container.appendChild(title);
  container.appendChild(content);
  container.appendChild(refreshButton);
  
  // Add to the page
  document.body.appendChild(container);
}