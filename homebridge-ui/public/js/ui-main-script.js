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
 * Show loading indicator with message
 * @param {string} message - Message to display
 */
function showLoading(message) {
  homebridge.showSpinner();
  showToast('info', message, 'Loading...');
}

/**
 * Hide loading indicator
 */
function hideLoading() {
  homebridge.hideSpinner();
}

/**
 * Show toast notification
 * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
 * @param {string} message - Toast message
 * @param {string} title - Toast title
 * @param {Function} callback - Optional callback function
 */
function showToast(type, message, title, callback) {
  if (!homebridge || !homebridge.toast) {
    return;
  }

  if (homebridge.toast[type]) {
    homebridge.toast[type](message, title);
  } else {
    homebridge.toast.info(message, title);
  }

  if (typeof callback === 'function') {
    setTimeout(callback, 2000);
  }
}

/**
 * Initialize the application
 * Sets up event handlers, loads configuration and prepares the UI
 */
async function initApp() {
  try {
    showToast('info', 'Initializing plugin UI...', 'Starting');
    
    // Initialize DOM element references
    initializeDOMReferences();
    
    // Create logs section
    createLogsSection();
    
    // Verify the homebridge object is ready
    await waitForHomebridgeReady();
    
    // Load initial configuration before setting up event listeners
    // This ensures we have the values needed by event handlers
    await loadConfig();
    
    // Setup event listeners after config is loaded
    initializeEventListeners();
    
    // Mark as initialized
    initialized = true;
    showToast('success', 'SleepMe Simple UI initialized successfully', 'Ready');
  } catch (error) {
    showToast('error', 'Error initializing UI: ' + error.message, 'Initialization Error');
  }
}

/**
 * Wait for Homebridge to be fully ready
 * @returns {Promise<void>}
 */
function waitForHomebridgeReady() {
  return new Promise((resolve, reject) => {
    if (typeof homebridge === 'undefined') {
      reject(new Error('Homebridge object is not available'));
      return;
    }
    
    if (typeof homebridge.getPluginConfig === 'function') {
      // Homebridge appears to be initialized
      resolve();
      return;
    }
    
    // Add a timeout in case the ready event never fires
    const timeout = setTimeout(() => {
      reject(new Error('Timed out waiting for Homebridge to initialize'));
    }, 10000);
    
    // Wait for the ready event if not already fired
    homebridge.addEventListener('ready', () => {
      clearTimeout(timeout);
      
      // Add a small delay to make sure everything is fully ready
      setTimeout(() => {
        if (typeof homebridge.getPluginConfig !== 'function') {
          reject(new Error('Homebridge API not properly initialized'));
        } else {
          resolve();
        }
      }, 500);
    });
  });
}

/**
 * Initialize DOM element references
 * Sets up references to key UI elements
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
  }
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
 */
function initializeEventListeners() {
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
}

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
  // Check if the homebridge object is available (required for communication)
  if (typeof homebridge === 'undefined') {
    alert('Error: Homebridge UI framework not detected. Please reload the page.');
    return;
  }
  
  // Global error handler for uncaught exceptions
  window.onerror = function(message, source, lineno, colno, error) {
    showToast('error', 'An error occurred in the UI: ' + message, 'Error');
    return false;
  };
  
  // Wait for the homebridge ready event before initializing
  homebridge.addEventListener('ready', async () => {
    try {
      showToast('info', 'Homebridge ready, initializing UI...', 'Starting');
      
      // Initialize the application after Homebridge is ready
      await initApp();
    } catch (error) {
      showToast('error', 'Failed to initialize: ' + error.message, 'Initialization Error');
    }
  });
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