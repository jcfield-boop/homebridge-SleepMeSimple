/**
 * SleepMe Simple Homebridge Plugin UI
 * 
 * Main entry point for the custom UI that handles configuration 
 * of SleepMe devices and scheduling features
 * 
 * Uses the module pattern to avoid global namespace pollution
 * and improve code organization
 */

// Main application module using IIFE pattern for encapsulation
const SleepMeUI = (function() {
  // Private module state
  const state = {
      schedules: [],           // Array to store schedules
      isEditing: false,        // Flag to track if we're in edit mode
      editingScheduleIndex: -1, // Index of schedule being edited
      initialized: false,      // Flag to track initialization state
      configLoaded: false,     // Flag to track if config has been loaded
      homebridgeReady: false,  // Flag to track Homebridge API readiness
      debugLogging: false      // Flag to control debug message output
  };

  // DOM element references - initialize as null
  const elements = {
      scheduleTypeSelect: null,       // Schedule type dropdown
      daySelectContainer: null,       // Container for day selection
      scheduleTimeInput: null,        // Time input field
      scheduleTemperatureInput: null, // Temperature input field
      unitSelect: null,               // Temperature unit selection
      warmHugInfo: null,              // Warm hug information container
      addScheduleBtn: null,           // Add schedule button
      cancelEditBtn: null,            // Cancel edit button
      scheduleList: null,             // Schedule list container
      statusElement: null,            // Status display element
      configForm: null,               // Main configuration form
      enableSchedulesCheckbox: null,  // Enable schedules checkbox
      schedulesContainer: null,       // Schedules container
      testConnectionBtn: null,        // Test connection button
      applyTemplatesBtn: null,        // Apply templates button
      confirmModal: null,             // Confirmation modal
      confirmTitle: null,             // Confirmation modal title
      confirmMessage: null,           // Confirmation modal message
      confirmOk: null,                // Confirmation modal OK button
      confirmCancel: null             // Confirmation modal Cancel button
  };

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
   * Helper function to safely get a DOM element with error handling
   * @param {string} id - The element ID to find
   * @param {boolean} required - Whether the element is required
   * @returns {HTMLElement|null} - The DOM element or null if not found
   */
  function safeGetElement(id, required = false) {
      const element = document.getElementById(id);
      if (!element && required) {
          console.warn(`Required element #${id} not found in DOM`);
      } else if (!element && state.debugLogging) {
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
      try {
          // Get key DOM elements with safety checks
          elements.scheduleTypeSelect = safeGetElement('scheduleType', true);
          elements.daySelectContainer = safeGetElement('daySelectContainer', true);
          elements.scheduleTimeInput = safeGetElement('scheduleTime', true);
          elements.scheduleTemperatureInput = safeGetElement('scheduleTemperature', true);
          elements.unitSelect = safeGetElement('unit', true);
          elements.warmHugInfo = safeGetElement('warmHugInfo', true);
          elements.addScheduleBtn = safeGetElement('addSchedule', true);
          elements.cancelEditBtn = safeGetElement('cancelEdit', true);
          elements.scheduleList = safeGetElement('scheduleList', true);
          elements.statusElement = safeGetElement('status');
          elements.configForm = safeGetElement('configForm', true);
          elements.enableSchedulesCheckbox = safeGetElement('enableSchedules');
          elements.schedulesContainer = safeGetElement('schedulesContainer');
          elements.testConnectionBtn = safeGetElement('testConnection');
          elements.applyTemplatesBtn = safeGetElement('applyTemplates');
          elements.confirmModal = safeGetElement('confirmModal');
          elements.confirmTitle = safeGetElement('confirmTitle');
          elements.confirmMessage = safeGetElement('confirmMessage');
          elements.confirmOk = safeGetElement('confirmOk');
          elements.confirmCancel = safeGetElement('confirmCancel');
          // Check if any required elements are missing
          const requiredElements = [
            elements.scheduleTypeSelect,
            elements.daySelectContainer,
            elements.scheduleTimeInput,
            elements.scheduleTemperatureInput,
            elements.unitSelect,
            elements.warmHugInfo,
            elements.addScheduleBtn,
            elements.cancelEditBtn,
            elements.scheduleList
        ];
        
        const missingElementCount = requiredElements.filter(el => !el).length;
        
        if (missingElementCount > 0) {
            console.warn(`${missingElementCount} required UI elements could not be found. The UI may not function correctly.`);
            return false;
        }
        
        // Expose elements to legacy code (for backward compatibility)
        // This will be refactored in future versions
        window.scheduleTypeSelect = elements.scheduleTypeSelect;
        window.daySelectContainer = elements.daySelectContainer;
        window.scheduleTimeInput = elements.scheduleTimeInput;
        window.scheduleTemperatureInput = elements.scheduleTemperatureInput;
        window.unitSelect = elements.unitSelect;
        window.warmHugInfo = elements.warmHugInfo;
        window.addScheduleBtn = elements.addScheduleBtn;
        window.cancelEditBtn = elements.cancelEditBtn;
        window.scheduleList = elements.scheduleList;
        
        return true;
    } catch (error) {
        console.error('Failed to initialize UI elements:', error.message);
        return false;
    }
}

/**
 * Log message to console only - eliminates toast notifications
 * @param {string} type - Log type: 'success', 'error', 'warning', 'info'
 * @param {string} message - Log message
 * @param {string} title - Optional log title
 */
function logMessage(type, message, title = '') {
    // Always log to console with appropriate formatting
    if (type === 'error') {
        console.error(`${title ? title + ': ' : ''}${message}`);
    } else if (type === 'warning') {
        console.warn(`${title ? title + ': ' : ''}${message}`);
    } else if (type === 'success') {
        console.log(`${title ? title + ': ' : ''}${message}`);
    } else {
        console.info(`${title ? title + ': ' : ''}${message}`);
    }
    
    // Update status element if available and appropriate
    if (elements.statusElement && (type === 'error' || type === 'success')) {
        elements.statusElement.textContent = `${title ? title + ': ' : ''}${message}`;
        elements.statusElement.className = `status ${type}`;
        elements.statusElement.classList.remove('hidden');
    }
}

/**
 * Show loading indicator with message (console only) to remove Toasts!
 * @param {string} message - Message to display
 */
function showLoading(message) {}

/**
 * Hide loading indicator empty to remove toast spinners
 */
function hideLoading() {}

/**
 * Show confirmation modal with guaranteed visibility
 * Uses direct DOM manipulation for reliability
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {Function} callback - Function to call if confirmed
 */
function showConfirmModal(title, message, callback) {
    console.log('Showing confirmation modal:', title);
    
    // Ensure modal elements are available
    if (!elements.confirmModal || !elements.confirmTitle || 
        !elements.confirmMessage || !elements.confirmOk || !elements.confirmCancel) {
        console.error('Modal elements not found - using native confirm instead');
        if (window.confirm(message)) {
            if (typeof callback === 'function') callback();
        }
        return;
    }
    
    // Set modal content
    elements.confirmTitle.textContent = title || 'Confirm Action';
    elements.confirmMessage.textContent = message || 'Are you sure?';
    
    // Remove existing event listeners by cloning
    const newOkButton = elements.confirmOk.cloneNode(true);
    const newCancelButton = elements.confirmCancel.cloneNode(true);
    elements.confirmOk.parentNode.replaceChild(newOkButton, elements.confirmOk);
    elements.confirmCancel.parentNode.replaceChild(newCancelButton, elements.confirmCancel);
    
    // Update references to the new buttons
    elements.confirmOk = newOkButton;
    elements.confirmCancel = newCancelButton;
    
    // Add new event listeners
    elements.confirmOk.addEventListener('click', function() {
        // Force hide modal using both methods for reliability
        elements.confirmModal.classList.add('hidden');
        elements.confirmModal.style.display = 'none';
        if (typeof callback === 'function') callback();
    });
    
    elements.confirmCancel.addEventListener('click', function() {
        // Force hide modal using both methods for reliability
        elements.confirmModal.classList.add('hidden');
        elements.confirmModal.style.display = 'none';
    });
    
    // Show modal using both methods for reliability
    elements.confirmModal.classList.remove('hidden');
    elements.confirmModal.style.display = 'flex';
    
    // Force visibility check with timeout as backup
    setTimeout(function() {
        if (elements.confirmModal.classList.contains('hidden') || 
            elements.confirmModal.style.display !== 'flex') {
            console.log('Backup visibility fix applied to modal');
            elements.confirmModal.classList.remove('hidden');
            elements.confirmModal.style.display = 'flex';
        }
    }, 50);
}

/**
 * Initialize event listeners for UI elements with proper error handling
 * Uses event delegation where appropriate to reduce listener count
 * @returns {boolean} True if listeners were set up successfully
 */
function initializeEventListeners() {
    try {
        // Form submission handler
        if (elements.configForm) {
            elements.configForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (typeof window.saveConfig === 'function') {
                    await window.saveConfig();
                } else {
                    logMessage('error', 'Save function not available');
                }
            });
        } else {
            logMessage('error', 'Config form not found in DOM');
            return false;
        }
       // Test connection button
       if (elements.testConnectionBtn) {
        elements.testConnectionBtn.addEventListener('click', () => {
            testConnection();
        });
    }
    
    // Enable schedules checkbox
    if (elements.enableSchedulesCheckbox && elements.schedulesContainer) {
        elements.enableSchedulesCheckbox.addEventListener('change', () => {
            elements.schedulesContainer.classList.toggle(
                'hidden', 
                !elements.enableSchedulesCheckbox.checked
            );
        });
    }
    
    // Schedule form elements
    if (elements.scheduleTypeSelect) {
        elements.scheduleTypeSelect.addEventListener('change', () => {
            // Show/hide day select for specific day schedules
            if (elements.daySelectContainer) {
                elements.daySelectContainer.classList.toggle(
                    'hidden', 
                    elements.scheduleTypeSelect.value !== 'Specific Day'
                );
            }
            
            // Show/hide warm hug info
            if (elements.warmHugInfo) {
                elements.warmHugInfo.classList.toggle(
                    'hidden', 
                    elements.scheduleTypeSelect.value !== 'Warm Hug'
                );
            }
        });
    }
    
    // Time and temperature validation
    if (elements.scheduleTimeInput && typeof window.validateScheduleTime === 'function') {
        elements.scheduleTimeInput.addEventListener('input', window.validateScheduleTime);
        elements.scheduleTimeInput.addEventListener('blur', window.validateScheduleTime);
    }
    
    if (elements.scheduleTemperatureInput && typeof window.validateTemperature === 'function') {
        elements.scheduleTemperatureInput.addEventListener('input', window.validateTemperature);
        elements.scheduleTemperatureInput.addEventListener('blur', window.validateTemperature);
    }
    
    // Unit change handler
    if (elements.unitSelect && typeof window.updateTemperatureValidation === 'function') {
        elements.unitSelect.addEventListener('change', window.updateTemperatureValidation);
    }
    
    // Add/edit schedule button
    if (elements.addScheduleBtn && typeof window.handleScheduleAction === 'function') {
        elements.addScheduleBtn.addEventListener('click', window.handleScheduleAction);
    }
    
    // Cancel edit button
    if (elements.cancelEditBtn && typeof window.exitEditMode === 'function') {
        elements.cancelEditBtn.addEventListener('click', window.exitEditMode);
    }
    
    // Template handling
    if (elements.applyTemplatesBtn && typeof window.applyScheduleTemplates === 'function') {
        elements.applyTemplatesBtn.addEventListener('click', () => {
            // Expose templates to global scope for legacy code
            window.templates = templates;
            window.applyScheduleTemplates();
        });
    }
    
    // Tab navigation - use event delegation for better performance
    const tabContainer = document.querySelector('.tabs');
    if (tabContainer) {
        tabContainer.addEventListener('click', (event) => {
            // Check if a tab was clicked
            if (event.target.classList.contains('tab')) {
                const tabId = event.target.getAttribute('data-tab');
                
                // Remove active class from all tabs and contents
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // Add active class to selected tab and content
                event.target.classList.add('active');
                const tabContent = document.getElementById(tabId + 'Tab');
                if (tabContent) {
                    tabContent.classList.add('active');
                } else {
                    console.warn(`Tab content for ${tabId} not found`);
                }
            }
        });
    }
    
    // Initialize modal event listeners
    if (elements.confirmModal) {
        // Setup event delegation for modal closing when clicking outside
        elements.confirmModal.addEventListener('click', (event) => {
            if (event.target === elements.confirmModal) {
                elements.confirmModal.classList.add('hidden');
                elements.confirmModal.style.display = 'none';
            }
        });
    }
    
    return true;
} catch (error) {
    console.error('Error setting up event listeners:', error.message);
    return false;
}
}

/**
* Wait for Homebridge to be fully ready with improved error handling
* Uses Promise with timeout for better reliability
* @returns {Promise<void>}
*/
async function waitForHomebridgeReady() {
return new Promise((resolve, reject) => {
    // Check if homebridge object exists
    if (typeof homebridge === 'undefined') {
        reject(new Error('Homebridge object is not available'));
        return;
    }
    
    // If homebridge API methods are already available, resolve immediately
    if (typeof homebridge.getPluginConfig === 'function') {
        state.homebridgeReady = true;
        resolve();
        return;
    }
    
    // Set a timeout to prevent hanging if the ready event never fires
    const timeout = setTimeout(() => {
        // Even though this is an error, we'll try to continue anyway
        console.warn('Homebridge ready event timeout - continuing anyway');
        state.homebridgeReady = false;
        resolve(); // Resolve instead of reject to allow initialization to continue
    }, 15000); // 15 second timeout
    
    // Listen for the 'ready' event from Homebridge
    homebridge.addEventListener('ready', () => {
        clearTimeout(timeout);
        
        // Add a small delay to ensure everything is fully initialized
        setTimeout(() => {
            // Double check methods are available
            if (typeof homebridge.getPluginConfig === 'function') {
                state.homebridgeReady = true;
                resolve();
            } else {
                state.homebridgeReady = false;
                resolve(); // Resolve instead of reject to allow initialization to continue
            }
        }, 1500); // Increased delay for better reliability
    });
});
}

/**
* Test connection to the SleepMe API
* @returns {Promise<void>}
*/
async function testConnection() {
try {
    const apiTokenInput = safeGetElement('apiToken', true);
    if (!apiTokenInput) {
        logMessage('error', 'API token input field not found');
        return;
    }
    
    const apiToken = apiTokenInput.value.trim();
    if (!apiToken) {
        logMessage('error', 'Please enter your API token');
        return;
    }
    
    showLoading('Testing API connection...'); 
    const response = await homebridge.request('/device/test', { apiToken });
            
            hideLoading();
            
            if (response.success) {
                logMessage(
                    'success', 
                    `Connection successful! Found ${response.devices} device(s): ${response.deviceInfo.map(d => d.name).join(', ')}`
                );
            } else {
                logMessage('error', response.error || 'Unknown error testing connection');
            }
        } catch (error) {
            hideLoading();
            logMessage('error', `Error testing connection: ${error.message}`);
        }
    }

    /**
     * Robust initialization sequence with better error handling and fallbacks
     * Uses sequential async operations with proper error boundaries
     */
    async function initApp() {
        try {
            // Skip toast for initialization - just log to console
            console.log('Initializing SleepMe Simple UI...');
            
            // Step 1: Ensure Homebridge API is ready
            try {
                await waitForHomebridgeReady();
                if (state.homebridgeReady) {
                    console.log('Homebridge API initialized successfully');
                } else {
                    console.warn('Homebridge API may not be fully initialized - continuing anyway');
                }
            } catch (homebridgeError) {
                console.error('Homebridge API error:', homebridgeError.message);
                // Continue anyway - we'll try to recover
            }
            
            // Step 2: Initialize DOM elements
            let domInitialized = false;
            try {
                // Try multiple times with delay to ensure DOM is ready
                for (let attempt = 1; attempt <= 3; attempt++) {
                    domInitialized = initializeDOMReferences();
                    if (domInitialized) {
                        console.log('DOM elements initialized successfully');
                        break;
                    }
                    
                    if (attempt < 3) {
                        console.log(`DOM initialization attempt ${attempt} failed, retrying...`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
                
                if (!domInitialized) {
                    console.error('Failed to initialize UI elements after multiple attempts');
                }
            } catch (domError) {
                console.error('DOM initialization error:', domError.message);
            }
            
            // Step 3: Setup event listeners
            try {
                const listenersInitialized = initializeEventListeners();
                if (listenersInitialized) {
                    console.log('Event listeners initialized successfully');
                } else {
                    console.error('Failed to initialize event listeners');
                }
            } catch (listenerError) {
                console.error('Event listener initialization error:', listenerError.message);
            }
            
            // Step 4: Load configuration and expose to global scope for legacy code
            let configLoadAttempts = 0;
            
            while (configLoadAttempts < 3) {
                try {
                    if (typeof window.loadConfig === 'function' && state.homebridgeReady) {
                        await window.loadConfig();
                        state.configLoaded = true;
                        console.log('Configuration loaded successfully');
                        break; // Exit loop on success
                    } else {
                        if (!window.loadConfig) {
                            console.error('loadConfig function not available');
                        }
                        if (!state.homebridgeReady) {
                            console.error('Cannot load config - Homebridge API not ready');
                        }
                        break;
                    }
                } catch (configError) {
                    configLoadAttempts++;
                    
                    if (configLoadAttempts < 3) {
                        console.warn(`Retrying config load (${configLoadAttempts}/3)`, configError.message);
                        await new Promise(resolve => setTimeout(resolve, 2000 * configLoadAttempts));
                    } else {
                        console.error('Failed to load config after multiple attempts:', configError.message);
                    }
                }
            }
            
            // Expose state to global scope for legacy code
            window.schedules = state.schedules;
            window.isEditing = state.isEditing;
            window.editingScheduleIndex = state.editingScheduleIndex;
            
            // Step 5: Render schedules if needed
            if (state.configLoaded && typeof window.renderScheduleList === 'function') {
                try {
                    window.renderScheduleList();
                    console.log('Schedule list rendered successfully');
                } catch (scheduleError) {
                    console.error('Error rendering schedules:', scheduleError.message);
                }
            }
            
            // Mark as initialized
            state.initialized = true;
            console.log('SleepMe Simple UI initialization complete');
        } catch (error) {
            // Main try-catch block for initApp
            console.error('Unhandled error during initialization:', error.message);
        }
    }

    // Public API - expose functions for external use
    return {
        init: initApp,
        showConfirmModal: showConfirmModal,
        logMessage: logMessage,
        showLoading: showLoading,
        hideLoading: hideLoading,
        testConnection: testConnection,
        templates: templates,
        getState: function() {
            return {...state}; // Return a copy to prevent direct modification
        }
    };
})();

// Main initialization - runs when document is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded - starting initialization');
    // Add this inside your DOMContentLoaded event handler
// Block log fetching that causes the "Fetching server logs..." toast
if (typeof homebridge !== 'undefined') {
    // Method 1: Override the log fetching function if it exists
    if (typeof homebridge.fetchLogs === 'function') {
      const originalFetchLogs = homebridge.fetchLogs;
      homebridge.fetchLogs = function() {
        console.log('Log fetching suppressed');
        return Promise.resolve(); // Return empty promise
      };
    }
    
    // Method 2: Intercept network requests that might be fetching logs
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      // Check if this is a log-related fetch
      if (url && typeof url === 'string' && 
          (url.includes('/log') || url.includes('logs'))) {
        console.log(`Suppressed fetch to: ${url}`);
        return Promise.resolve(new Response('[]', { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      // Otherwise, proceed with normal fetch
      return originalFetch.apply(this, arguments);
    };
  }
    // Initialize the confirmation modal at startup
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) {
        // Make sure modal is fully hidden - both style AND class
        confirmModal.classList.add('hidden');
        confirmModal.style.display = 'none';
    }

    // Check if the homebridge object is available (basic check)
    if (typeof homebridge === 'undefined') {
        console.error('Homebridge UI framework not detected');
        return;
    }
    
    // Global error handler for uncaught exceptions
    window.onerror = function(message, source, lineno, colno, error) {
        console.error('Uncaught error:', message, 'at', source, lineno, colno);
        return false;
    };
    
    // Expose API for global usage (backward compatibility)
    window.showConfirmModal = SleepMeUI.showConfirmModal;
    window.logMessage = SleepMeUI.logMessage;
    window.showLoading = SleepMeUI.showLoading;
    window.hideLoading = SleepMeUI.hideLoading;
    
    // Wait for Homebridge's ready event or initialize if it's already ready
    if (typeof homebridge.getPluginConfig === 'function') {
        // Homebridge API already available
        console.log('Homebridge API already available - initializing immediately');
        // Small delay to ensure DOM is fully loaded
        setTimeout(SleepMeUI.init, 500);
    } else {
        // Wait for the ready event
        console.log('Waiting for Homebridge ready event');
        homebridge.addEventListener('ready', () => {
            console.log('Homebridge ready event received');
            // Small delay to ensure Homebridge API is fully available
            setTimeout(SleepMeUI.init, 500);
        });
        
        // Set a failsafe timeout in case the ready event doesn't fire
        setTimeout(() => {
            if (!SleepMeUI.getState().initialized) {
                console.warn('Homebridge ready event timeout, attempting initialization anyway');
                SleepMeUI.init();
            }
        }, 10000); // 10 second backup timeout
    }
});