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
      { type: "Weekdays", time: "22:00", temperature: 21, description: "Cool Down - Helps you fall asleep faster" },
      { type: "Weekdays", time: "23:00", temperature: 19, description: "Deep Sleep - Supports deeper sleep stages" },
      { type: "Weekdays", time: "02:00", temperature: 23, description: "REM Support - Enhances REM sleep phases" },
      { type: "Weekdays", time: "06:00", temperature: 25, description: "Warm Hug Wake-up - Gently wakes you with warmth" }
    ]
  },
  nightOwl: {
    name: "Night Owl",
    description: "Later bedtime with extended morning warm-up",
    schedules: [
      { type: "Weekdays", time: "23:30", temperature: 21, description: "Cool Down" },
      { type: "Weekdays", time: "00:30", temperature: 19, description: "Deep Sleep" },
      { type: "Weekdays", time: "03:30", temperature: 23, description: "REM Support" },
      { type: "Weekdays", time: "07:30", temperature: 25, description: "Warm Hug Wake-up" }
    ]
  },
  earlyBird: {
    name: "Early Bird",
    description: "Earlier bedtime and wake-up schedule",
    schedules: [
      { type: "Weekdays", time: "21:30", temperature: 21, description: "Cool Down" },
      { type: "Weekdays", time: "22:00", temperature: 19, description: "Deep Sleep" },
      { type: "Weekdays", time: "01:00", temperature: 23, description: "REM Support" },
      { type: "Weekdays", time: "05:00", temperature: 25, description: "Warm Hug Wake-up" }
    ]
  },
  recovery: {
    name: "Weekend Recovery",
    description: "Extra sleep with later wake-up time",
    schedules: [
      { type: "Weekend", time: "23:00", temperature: 21, description: "Cool Down" },
      { type: "Weekend", time: "00:00", temperature: 19, description: "Deep Sleep" },
      { type: "Weekend", time: "03:00", temperature: 23, description: "REM Support" },
      { type: "Weekend", time: "08:00", temperature: 25, description: "Warm Hug Wake-up" }
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
 * Initialize the application
 * Sets up event handlers, loads configuration and prepares the UI
 */
async function initApp() {
  try {
    // Initialize DOM element references
    initializeDOMReferences();
    
    // Create logs section
    createLogsSection();
    
    // Setup event listeners
    initializeEventListeners();
    
    // Load initial configuration
    await loadConfig();
    
    // Mark as initialized
    initialized = true;
  } catch (error) {
    showToast('error', 'Error initializing UI: ' + error.message, 'Initialization Error');
    console.error('UI Initialization error:', error);
  }
}

/**
 * Initialize references to DOM elements
 * This ensures elements are available before trying to use them
 */
function initializeDOMReferences() {
  scheduleTypeSelect = document.getElementById('scheduleType');
  daySelectContainer = document.getElementById('daySelectContainer');
  scheduleTimeInput = document.getElementById('scheduleTime');
  scheduleTemperatureInput = document.getElementById('scheduleTemperature');
  unitSelect = document.getElementById('unit');
  warmHugInfo = document.getElementById('warmHugInfo');
  addScheduleBtn = document.getElementById('addSchedule');
  cancelEditBtn = document.getElementById('cancelEdit');
  scheduleList = document.getElementById('scheduleList');
}

/**
 * Hide loading spinner
 */
function hideLoading() {
  if (typeof homebridge !== 'undefined' && typeof homebridge.hideSpinner === 'function') {
    homebridge.hideSpinner();
  }
  
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.classList.add('hidden');
  }
}

/**
 * Create logs container for displaying server logs
 */
function createLogsSection() {
  const logsContainer = document.createElement('div');
  logsContainer.className = 'container hidden';
  logsContainer.id = 'logsContainer';
  
  const logsHeader = document.createElement('h2');
  logsHeader.textContent = 'Server Logs';
  logsContainer.appendChild(logsHeader);
  
  const logsContent = document.createElement('div');
  logsContent.className = 'logs-content';
  logsContent.id = 'logsContent';
  logsContainer.appendChild(logsContent);
  
  const refreshButton = document.createElement('button');
  refreshButton.textContent = 'Refresh Logs';
  refreshButton.className = 'secondary';
  refreshButton.style.marginTop = '10px';
  refreshButton.id = 'refreshLogs';
  logsContainer.appendChild(refreshButton);
  
  // Add the logs container after the schedules container
  const schedulesContainer = document.getElementById('schedulesContainer');
  if (schedulesContainer && schedulesContainer.parentNode) {
    schedulesContainer.parentNode.insertBefore(logsContainer, schedulesContainer.nextSibling);
  }
}

/**
 * Display a toast notification using Homebridge UI utilities
 * @param {string} type - Type of toast: 'success', 'error', 'warning', 'info'
 * @param {string} message - Message to display
 * @param {string} title - Optional title for the toast
 * @param {Function} confirmCallback - Optional callback for confirmation dialogs
 */
function showToast(type, message, title = '', confirmCallback = null) {
  if (typeof homebridge !== 'undefined' && homebridge.toast && typeof homebridge.toast[type] === 'function') {
    homebridge.toast[type](message, title);
    
    if (confirmCallback) {
      const confirmResult = window.confirm(message);
      if (confirmResult) {
        confirmCallback();
      }
    }
    return;
  }
  
  // Fallback for when homebridge.toast is not available
  if (confirmCallback) {
    const confirmResult = window.confirm(message);
    if (confirmResult) {
      confirmCallback();
    }
  } else {
    alert(`${title}: ${message}`);
  }
}

/**
 * Show loading spinner with message
 * @param {string} message - Optional message to display
 */
function showLoading(message = '') {
  if (typeof homebridge !== 'undefined' && typeof homebridge.showSpinner === 'function') {
    homebridge.showSpinner();
  }
  
  if (message) {
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = 'status info';
      statusElement.classList.remove('hidden');
    }
  }
}

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', async () => {
  // Create a centralized error handler for better error tracking
  window.onerror = function(message, source, lineno, colno, error) {
    console.error('UI Error:', message, source, lineno, colno, error);
    showToast('error', 'An error occurred in the UI. Check browser console for details.', 'UI Error');
    return false;
  };
  
  // Check if the homebridge object is available (required for communication)
  if (typeof homebridge === 'undefined') {
    showToast('error', 'Error: Homebridge UI framework not detected. Please reload the page.', 'Framework Error');
    return;
  }
  
  // Add a timeout to detect initialization problems
  const initTimeout = setTimeout(() => {
    if (!initialized) {
      showToast('error', 'UI initialization timeout. Try refreshing the page.', 'Initialization Error');
    }
  }, 15000); // 15 second timeout
  
  // Initialize the application
  await initApp();
  
  // Clear timeout since initialization completed
  clearTimeout(initTimeout);
  
  // Listen for the homebridge ready event
  homebridge.addEventListener('ready', () => {
    // Perform any actions needed after the UI is fully rendered
    showToast('success', 'SleepMe Simple configuration interface loaded.', 'Ready');
  });
});