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
  // Weekday templates
  optimal: {
    name: 'Optimal Sleep Cycle',
    description: 'Complete sleep cycles with REM enhancement for better sleep quality',
    schedules: [
      { type: 'Weekdays', time: '22:00', temperature: 21, description: 'Cool Down' },
      { type: 'Weekdays', time: '23:00', temperature: 19, description: 'Deep Sleep' },
      { type: 'Weekdays', time: '02:00', temperature: 23, description: 'REM Support' },
      { type: 'Weekdays', time: '06:00', temperature: 26, description: 'Warm Hug Wake-up' }
    ]
  },
  nightOwl: {
    name: 'Night Owl',
    description: 'Later bedtime with extended morning warm-up for night owls',
    schedules: [
      { type: 'Weekdays', time: '23:30', temperature: 21, description: 'Cool Down' },
      { type: 'Weekdays', time: '00:30', temperature: 19, description: 'Deep Sleep' },
      { type: 'Weekdays', time: '03:30', temperature: 23, description: 'REM Support' },
      { type: 'Weekdays', time: '07:30', temperature: 26, description: 'Warm Hug Wake-up' }
    ]
  },
  earlyBird: {
    name: 'Early Bird',
    description: 'Earlier bedtime and wake-up schedule for morning people',
    schedules: [
      { type: 'Weekdays', time: '21:00', temperature: 21, description: 'Cool Down' },
      { type: 'Weekdays', time: '22:00', temperature: 19, description: 'Deep Sleep' },
      { type: 'Weekdays', time: '01:00', temperature: 23, description: 'REM Support' },
      { type: 'Weekdays', time: '05:00', temperature: 26, description: 'Warm Hug Wake-up' }
    ]
  },
  
  // Weekend templates
  recovery: {
    name: 'Weekend Recovery',
    description: 'Extra sleep with later wake-up time for weekend recovery',
    schedules: [
      { type: 'Weekend', time: '23:00', temperature: 21, description: 'Cool Down' },
      { type: 'Weekend', time: '00:00', temperature: 19, description: 'Deep Sleep' },
      { type: 'Weekend', time: '03:00', temperature: 23, description: 'REM Support' },
      { type: 'Weekend', time: '08:00', temperature: 26, description: 'Warm Hug Wake-up' }
    ]
  },
  relaxed: {
    name: 'Relaxed Weekend',
    description: 'Gradual transitions for weekend leisure and relaxation',
    schedules: [
      { type: 'Weekend', time: '23:30', temperature: 22, description: 'Cool Down' },
      { type: 'Weekend', time: '01:00', temperature: 20, description: 'Deep Sleep' },
      { type: 'Weekend', time: '04:00', temperature: 24, description: 'REM Support' },
      { type: 'Weekend', time: '09:00', temperature: 27, description: 'Warm Hug Wake-up' }
    ]
  }
};

/**
 * Initialize DOM element references
 * Gets references to all necessary DOM elements
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
 * Initialize the application
 * Sets up event handlers, loads configuration and prepares the UI
 */
async function initApp() {
  try {
    console.log('Initializing SleepMe Simple UI...');
    
    // Initialize DOM element references
    initializeDOMReferences();
    
    // Load initial configuration before setting up event listeners
    // This ensures we have the values needed by event handlers
    await loadConfig();
    
    // Setup event listeners after config is loaded
    initializeEventListeners();
    
    // Update template descriptions
    updateTemplateDescriptions();
    
    // Mark as initialized
    initialized = true;
    console.log('UI initialization complete');
  } catch (error) {
    console.error('UI Initialization error:', error);
    showToast('error', 'Error initializing UI: ' + error.message, 'Initialization Error');
  }
}

/**
 * Initialize event listeners for all UI elements
 */
function initializeEventListeners() {
  // Listen for form submission to save config
  const configForm = document.getElementById('configForm');
  if (configForm) {
    configForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await saveConfig();
    });
  }
  
  // Listen for test connection button
  const testConnectionBtn = document.getElementById('testConnection');
  if (testConnectionBtn) {
    testConnectionBtn.addEventListener('click', async () => {
      await testConnection();
    });
  }
  
  // Listen for enable schedules checkbox change
  const enableSchedulesCheckbox = document.getElementById('enableSchedules');
  const schedulesContainer = document.getElementById('schedulesContainer');
  if (enableSchedulesCheckbox && schedulesContainer) {
    enableSchedulesCheckbox.addEventListener('change', () => {
      schedulesContainer.classList.toggle('hidden', !enableSchedulesCheckbox.checked);
    });
  }
  
  // Listen for schedule type changes
  if (scheduleTypeSelect && daySelectContainer && warmHugInfo) {
    scheduleTypeSelect.addEventListener('change', () => {
      const selectedType = scheduleTypeSelect.value;
      
      // Show/hide day select for specific day schedules
      daySelectContainer.classList.toggle('hidden', selectedType !== 'Specific Day');
      
      // Show/hide warm hug info
      warmHugInfo.classList.toggle('hidden', selectedType !== 'Warm Hug');
    });
  }
  
  // Listen for unit changes to update temperature validation
  if (unitSelect) {
    unitSelect.addEventListener('change', () => {
      updateTemperatureValidation();
    });
  }
  
  // Listen for temperature input to validate
  if (scheduleTemperatureInput) {
    scheduleTemperatureInput.addEventListener('input', validateTemperature);
  }
  
  // Listen for time input to validate
  if (scheduleTimeInput) {
    scheduleTimeInput.addEventListener('input', validateScheduleTime);
  }
  
  // Listen for add/update schedule button
  if (addScheduleBtn) {
    addScheduleBtn.addEventListener('click', handleScheduleAction);
  }
  
  // Listen for cancel edit button
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', exitEditMode);
  }
  
  // Listen for tab switching
  const tabs = document.querySelectorAll('.tab');
  if (tabs.length > 0) {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs
        tabs.forEach(t => t.classList.remove('active'));
        
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Hide all tab content
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Show selected tab content
        const tabId = tab.getAttribute('data-tab');
        const selectedContent = document.getElementById(`${tabId}Tab`);
        if (selectedContent) {
          selectedContent.classList.add('active');
        }
      });
    });
  }
  
  // Listen for apply templates button
  const applyTemplatesBtn = document.getElementById('applyTemplates');
  if (applyTemplatesBtn) {
    applyTemplatesBtn.addEventListener('click', applyScheduleTemplates);
  }
  
  // Listen for template selection changes
  const weekdayTemplate = document.getElementById('weekdayTemplate');
  const weekendTemplate = document.getElementById('weekendTemplate');
  const weekdayTemplateDesc = document.getElementById('weekdayTemplateDesc');
  const weekendTemplateDesc = document.getElementById('weekendTemplateDesc');
  
  if (weekdayTemplate && weekdayTemplateDesc) {
    weekdayTemplate.addEventListener('change', () => {
      const selectedTemplate = weekdayTemplate.value;
      weekdayTemplateDesc.textContent = selectedTemplate ? templates[selectedTemplate].description : '';
    });
  }
  
  if (weekendTemplate && weekendTemplateDesc) {
    weekendTemplate.addEventListener('change', () => {
      const selectedTemplate = weekendTemplate.value;
      weekendTemplateDesc.textContent = selectedTemplate ? templates[selectedTemplate].description : '';
    });
  }
}

/**
 * Update template descriptions based on selected templates
 */
function updateTemplateDescriptions() {
  const weekdayTemplate = document.getElementById('weekdayTemplate');
  const weekendTemplate = document.getElementById('weekendTemplate');
  const weekdayTemplateDesc = document.getElementById('weekdayTemplateDesc');
  const weekendTemplateDesc = document.getElementById('weekendTemplateDesc');
  
  if (weekdayTemplate && weekdayTemplateDesc) {
    const selectedTemplate = weekdayTemplate.value;
    weekdayTemplateDesc.textContent = selectedTemplate ? templates[selectedTemplate].description : '';
  }
  
  if (weekendTemplate && weekendTemplateDesc) {
    const selectedTemplate = weekendTemplate.value;
    weekendTemplateDesc.textContent = selectedTemplate ? templates[selectedTemplate].description : '';
  }
}

/**
 * Create UI elements for logs section
 */
function createLogsSection() {
  // Create logs container if it doesn't exist
  if (!document.getElementById('logsContainer')) {
    const container = document.createElement('div');
    container.id = 'logsContainer';
    container.className = 'container hidden';
    
    container.innerHTML = `
      <h2>Server Logs</h2>
      <div id="logsContent" class="logs-content"></div>
      <div class="button-group" style="margin-top: 15px;">
        <button type="button" id="refreshLogs">Refresh Logs</button>
      </div>
    `;
    
    document.body.appendChild(container);
    
    // Add event listener for refresh logs button
    const refreshLogsBtn = document.getElementById('refreshLogs');
    if (refreshLogsBtn) {
      refreshLogsBtn.addEventListener('click', fetchServerLogs);
    }
  }
}

/**
 * Show loading spinner overlay
 * @param {string} message - Optional message to display during loading
 */
function showLoading(message = 'Loading...') {
  homebridge.showSpinner();
  
  // Display status message if provided
  const statusElem = document.getElementById('status');
  if (statusElem && message) {
    statusElem.textContent = message;
    statusElem.className = 'status';
    statusElem.classList.remove('hidden');
  }
}

/**
 * Hide loading spinner overlay
 */
function hideLoading() {
  homebridge.hideSpinner();
}

/**
 * Show a toast notification to the user
 * @param {string} type - Type of notification (success, error, warning, info)
 * @param {string} message - Message to display
 * @param {string} title - Optional title for the notification
 * @param {Function} callback - Optional callback function to execute when confirmed
 */
function showToast(type, message, title, callback) {
  if (!message) return;
  
  if (callback && typeof callback === 'function') {
    // Use modal confirmation for actions requiring confirmation
    // This is a simplified version - in a real implementation, you'd create a modal
    if (confirm(`${title}: ${message}`)) {
      callback();
    }
  } else {
    // Use standard toast notifications for informational messages
    switch (type) {
      case 'success':
        homebridge.toast.success(message, title);
        break;
      case 'error':
        homebridge.toast.error(message, title);
        break;
      case 'warning':
        homebridge.toast.warning(message, title);
        break;
      case 'info':
      default:
        homebridge.toast.info(message, title);
        break;
    }
  }
}

// Wait for DOM to be fully loaded before initializing
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, waiting for Homebridge...');
  
  // Create a centralized error handler for better error tracking
  window.onerror = function(message, source, lineno, colno, error) {
    console.error('UI Error:', message, source, lineno, colno, error);
    if (typeof homebridge !== 'undefined') {
      homebridge.toast.error('An error occurred in the UI. Check browser console for details.', 'UI Error');
    }
    return false;
  };
});

// The critical fix: Listen for homebridge ready event
// This is the entry point for the plugin UI
homebridge.addEventListener('ready', async () => {
  console.log('Homebridge UI ready event received');
  try {
    // Initialize the application after Homebridge is ready
    await initApp();
    
    // Show ready message
    showToast('success', 'SleepMe Simple configuration interface loaded.', 'Ready');
  } catch (error) {
    console.error('Error during initialization:', error);
    showToast('error', 'Failed to initialize: ' + error.message, 'Initialization Error');
  }
});