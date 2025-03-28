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
  // Template definitions remain unchanged
  // ...
};

/**
 * Initialize the application
 * Sets up event handlers, loads configuration and prepares the UI
 */
async function initApp() {
  try {
    console.log('Initializing SleepMe Simple UI...');
    
    // Initialize DOM element references
    initializeDOMReferences();
    
    // Create logs section
    createLogsSection();
    
    // Load initial configuration before setting up event listeners
    // This ensures we have the values needed by event handlers
    await loadConfig();
    
    // Setup event listeners after config is loaded
    initializeEventListeners();
    
    // Mark as initialized
    initialized = true;
    console.log('UI initialization complete');
  } catch (error) {
    console.error('UI Initialization error:', error);
    showToast('error', 'Error initializing UI: ' + error.message, 'Initialization Error');
  }
}

// Remaining functions...

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, waiting for Homebridge...');
  
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
  
  // Wait for the homebridge ready event before initializing
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
});