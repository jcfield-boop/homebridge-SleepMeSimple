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
  // Other templates remain unchanged
  // ... 
};

/**
 * Initialize DOM element references
 * Sets up references to key UI elements
 * @returns {boolean} True if all elements were found
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
  // Form submission handler
  const configForm = document.getElementById('configForm');
  if (configForm) {
    configForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveConfig();
    });
  } else {
    showToast('error', 'Config form not found in DOM', 'DOM Error');
    return false;
  }
  
  // Test connection button
  const testConnectionBtn = document.getElementById('testConnection');
  if (testConnectionBtn) {
    testConnectionBtn.addEventListener('click', testConnection);
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
 * This is a critical function to ensure the Homebridge API is available
 * @returns {Promise<void>}
 */
function waitForHomebridgeReady() {
  return new Promise((resolve, reject) => {
    // Check if homebridge object exists
    if (typeof homebridge === 'undefined') {
      showToast('error', 'Homebridge API not available', 'API Error');
      reject(new Error('Homebridge object is not available'));
      return;
    }
    
    // If homebridge API methods are already available, resolve immediately
    if (typeof homebridge.getPluginConfig === 'function') {
      showToast('info', 'Homebridge API already initialized', 'API Ready');
      resolve();
      return;
    }
    
    // Set a timeout to prevent hanging if the ready event never fires
    const timeout = setTimeout(() => {
      showToast('error', 'Timed out waiting for Homebridge API', 'Timeout Error');
      reject(new Error('Timed out waiting for Homebridge to initialize'));
    }, 15000); // 15 second timeout
    
    // Listen for the 'ready' event from Homebridge
    showToast('info', 'Waiting for Homebridge ready event...', 'API Init');
    homebridge.addEventListener('ready', () => {
      clearTimeout(timeout);
      
      // Add a small delay to ensure everything is fully initialized
      setTimeout(() => {
        if (typeof homebridge.getPluginConfig === 'function') {
          showToast('success', 'Homebridge API successfully initialized', 'API Ready');
          resolve();
        } else {
          showToast('error', 'Homebridge API methods not available after ready event', 'API Error');
          reject(new Error('Homebridge API not properly initialized after ready event'));
        }
      }, 1000); // 1 second delay
    });
  });
}

/**
 * Initialize the application
 * Sets up event handlers, loads configuration and prepares the UI
 */
async function initApp() {
  try {
    showToast('info', 'Initializing plugin UI...', 'Starting');
    
    // Create logs section (can be done early)
    createLogsSection();
    
    // Verify the homebridge object is ready - this is critical!
    await waitForHomebridgeReady();
    
    // Initialize DOM element references
    const elementsInitialized = initializeDOMReferences();
    if (!elementsInitialized) {
      showToast('error', 'Failed to initialize UI elements', 'DOM Error');
      return;
    }
    
    // Load initial configuration
    try {
      await loadConfig();
      configLoaded = true;
      showToast('success', 'Configuration loaded successfully', 'Config Loaded');
    } catch (configError) {
      showToast('error', 'Error loading configuration: ' + configError.message, 'Config Error');
      // Continue initialization despite config error
    }
    
    // Setup event listeners after DOM and config are ready
    const listenersInitialized = initializeEventListeners();
    if (!listenersInitialized) {
      showToast('error', 'Failed to initialize event listeners', 'Event Error');
      return;
    }
    
    // Initialize schedule UI if needed
    if (configLoaded && typeof renderScheduleList === 'function') {
      renderScheduleList();
    }
    
    // Mark as initialized
    initialized = true;
    showToast('success', 'SleepMe Simple UI initialized successfully', 'Ready');
  } catch (error) {
    showToast('error', 'Error initializing UI: ' + error.message, 'Initialization Error');
  }
}

// Initialization sequence - critical part
document.addEventListener('DOMContentLoaded', () => {
  // Check if the homebridge object is available (basic check)
  if (typeof homebridge === 'undefined') {
    // Cannot use showToast here as it depends on homebridge
    alert('Error: Homebridge UI framework not detected. Please reload the page.');
    return;
  }
  
  // Global error handler for uncaught exceptions
  window.onerror = function(message, source, lineno, colno, error) {
    showToast('error', 'Uncaught error: ' + message, 'Error');
    return false;
  };
  
  // Wait for Homebridge's ready event or initialize if it's already ready
  if (typeof homebridge.getPluginConfig === 'function') {
    // Homebridge API already available
    initApp();
  } else {
    // Wait for the ready event
    homebridge.addEventListener('ready', () => {
      showToast('info', 'Homebridge ready event received, initializing...', 'Homebridge Ready');
      // Small delay to ensure Homebridge API is fully available
      setTimeout(initApp, 500);
    });
    
    // Set a failsafe timeout in case the ready event doesn't fire
    setTimeout(() => {
      if (!initialized) {
        showToast('warning', 'Homebridge ready event not received, attempting initialization anyway', 'Backup Init');
        initApp();
      }
    }, 10000); // 10 second backup timeout
  }
});

// Event listeners for server events
homebridge.addEventListener('config-status', (event) => {
  const configStatus = event.data;
  
  if (configStatus.success) {
    showToast('success', `Config file accessed successfully`, 'Config Status');
    
    if (configStatus.platformFound && configStatus.platformConfig) {
      showToast('info', `Found configuration with ${configStatus.platformConfig.scheduleCount} schedules`, 'Config Details');
    }
  } else {
    showToast('error', `Unable to read config file: ${configStatus.error || 'Unknown error'}`, 'Config Error');
  }
});

// Server error listener
homebridge.addEventListener('server-error', (event) => {
  const errorData = event.data;
  showToast('error', `Server error: ${errorData.message}`, 'Server Error');
});