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
let appState = {               // Application state tracking
  homebridgeReady: false,      // Is the Homebridge API ready
  domInitialized: false,       // Are DOM elements initialized 
  configLoaded: false          // Has config been loaded
};

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
  // Other templates remain unchanged...
};

/**
 * Initialize DOM element references
 * Sets up references to key UI elements
 * @returns {boolean} Whether initialization was successful
 */
function initializeDOMReferences() {
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
  
  // Check if all required elements are found
  const allElementsFound = Boolean(
    scheduleTypeSelect && daySelectContainer && scheduleTimeInput && 
    scheduleTemperatureInput && unitSelect && warmHugInfo && 
    addScheduleBtn && cancelEditBtn && scheduleList
  );
  
  if (!allElementsFound) {
    showToast('warning', 'Some UI elements could not be found', 'UI Warning');
    console.error('Some UI elements could not be found during initialization');
  }
  
  appState.domInitialized = allElementsFound;
  return allElementsFound;
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
  refreshButton.id = 'refreshLogsButton';
  
  // Assemble the logs UI
  container.appendChild(title);
  container.appendChild(content);
  container.appendChild(refreshButton);
  
  // Add to the page
  document.body.appendChild(container);
}

/**
 * Initialize event listeners for UI elements
 * @returns {boolean} Whether initialization was successful
 */
function initializeEventListeners() {
  // First ensure DOM is initialized
  if (!appState.domInitialized) {
    showToast('error', 'Cannot set up event listeners: DOM not initialized', 'Initialization Error');
    return false;
  }
  
  // Form submission handler
  const configForm = document.getElementById('configForm');
  if (configForm) {
    configForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveConfig();
    });
  }
  
  // Test connection button
  const testConnectionBtn = document.getElementById('testConnection');
  if (testConnectionBtn) {
    testConnectionBtn.addEventListener('click', testConnection);
  }
  
  // Refresh logs button
  const refreshLogsBtn = document.getElementById('refreshLogsButton');
  if (refreshLogsBtn) {
    refreshLogsBtn.addEventListener('click', fetchServerLogs);
  }
  
  // Enable schedules checkbox
  const enableSchedulesCheckbox = document.getElementById('enableSchedules');
  const schedulesContainer = document.getElementById('schedulesContainer');
  if (enableSchedulesCheckbox && schedulesContainer) {
    enableSchedulesCheckbox.addEventListener('change', () => {
      schedulesContainer.classList.toggle('hidden', !enableSchedulesCheckbox.checked);
    });
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
  }
  
  // Tab navigation
  const tabs = document.querySelectorAll('.tab');
  if (tabs) {
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
        }
      });
    });
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
  
  return true;
}

/**
 * Wait for Homebridge to be fully ready
 * @returns {Promise<void>} Resolves when Homebridge is ready
 */
function waitForHomebridgeReady() {
  return new Promise((resolve, reject) => {
    // Check if homebridge object exists
    if (typeof homebridge === 'undefined') {
      reject(new Error('Homebridge object is not available'));
      return;
    }
    
    // Check if homebridge API is already available
    if (homebridge.ready === true || typeof homebridge.getPluginConfig === 'function') {
      appState.homebridgeReady = true;
      resolve();
      return;
    }
    
    // Create timeout to prevent infinite waiting
    const timeout = setTimeout(() => {
      reject(new Error('Timed out waiting for Homebridge to initialize'));
    }, 15000); // 15 seconds timeout
    
    // Listen for the ready event
    const readyHandler = () => {
      clearTimeout(timeout);
      
      // Double check that the API is available
      if (typeof homebridge.getPluginConfig !== 'function') {
        // Add a small delay and check again
        setTimeout(() => {
          if (typeof homebridge.getPluginConfig === 'function') {
            appState.homebridgeReady = true;
            resolve();
          } else {
            reject(new Error('Homebridge API not properly initialized'));
          }
        }, 1000);
      } else {
        appState.homebridgeReady = true;
        resolve();
      }
    };
    
    // Add the event listener
    homebridge.addEventListener('ready', readyHandler);
  });
}

/**
 * Initialize the application
 * Sets up event handlers, loads configuration and prepares the UI
 */
async function initApp() {
  try {
    showToast('info', 'Initializing plugin UI...', 'Starting');
    
    // Create logs section
    createLogsSection();
    
    // Initialize DOM element references
    const domInitialized = initializeDOMReferences();
    if (!domInitialized) {
      showToast('warning', 'Some UI elements could not be found', 'Initialization Warning');
    }
    
    // Verify the homebridge object is ready
    await waitForHomebridgeReady();
    showToast('info', 'Homebridge API is ready', 'Initialization');
    
    // Load initial configuration
    try {
      await loadConfig();
      appState.configLoaded = true;
      showToast('success', 'Configuration loaded successfully', 'Config Loaded');
    } catch (configError) {
      appState.configLoaded = false;
      showToast('error', 'Failed to load configuration: ' + configError.message, 'Config Error');
    }
    
    // Setup event listeners after DOM and config are initialized
    const eventsInitialized = initializeEventListeners();
    if (!eventsInitialized) {
      showToast('warning', 'Some event handlers could not be set up', 'Events Warning');
    }
    
    // Mark as initialized if all steps succeeded
    initialized = appState.homebridgeReady && appState.domInitialized && appState.configLoaded;
    
    if (initialized) {
      showToast('success', 'SleepMe Simple UI initialized successfully', 'Ready');
    } else {
      showToast('warning', 'UI initialized with some issues. Check logs for details.', 'Partial Initialization');
    }
  } catch (error) {
    console.error('Initialization error:', error);
    showToast('error', 'Error initializing UI: ' + error.message, 'Initialization Error');
  }
}

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Global error handler for uncaught exceptions
    window.onerror = function(message, source, lineno, colno, error) {
      console.error('Uncaught error:', message, source, lineno, error);
      showToast('error', 'An error occurred in the UI: ' + message, 'Error');
      return false;
    };
    
    // Check if the homebridge object is available
    if (typeof homebridge === 'undefined') {
      showToast('error', 'Homebridge UI framework not detected', 'Critical Error');
      return;
    }
    
    // Wait for the homebridge ready event before initializing
    if (homebridge.ready === true) {
      // Homebridge is already ready, initialize immediately
      initApp();
    } else {
      // Listen for the ready event
      homebridge.addEventListener('ready', async () => {
        try {
          showToast('info', 'Homebridge ready event received, initializing UI...', 'Starting');
          await initApp();
        } catch (error) {
          console.error('Initialization error after Homebridge ready:', error);
          showToast('error', 'Failed to initialize: ' + error.message, 'Initialization Error');
        }
      });
      
      // Also set a timeout to check if the ready event was missed
      setTimeout(() => {
        if (!appState.homebridgeReady) {
          showToast('warning', 'Homebridge ready event not received, attempting to initialize anyway...', 'Fallback');
          initApp();
        }
      }, 5000); // 5 second fallback
    }
  } catch (error) {
    console.error('Setup error:', error);
    showToast('error', 'Error during UI setup: ' + error.message, 'Setup Error');
  }
});

// Add listener for config status events from server
homebridge.addEventListener('config-status', (event) => {
  const configStatus = event.data;
  
  if (configStatus.success) {
    showToast('success', `Config file read successfully! Found platform: ${configStatus.platformFound}`, 'Config Status');
    
    if (configStatus.platformFound && configStatus.platformConfig) {
      showToast('info', `Config contains: Unit=${configStatus.platformConfig.unit}, Schedules=${configStatus.platformConfig.scheduleCount}`, 'Config Details');
    }
  } else {
    showToast('error', `Unable to read config file: ${configStatus.error || 'Unknown error'}`, 'Config Error');
  }
});

// Add listener for server errors
homebridge.addEventListener('server-error', (event) => {
  const errorData = event.data;
  showToast('error', `Server error: ${errorData.message}`, 'Server Error');
});