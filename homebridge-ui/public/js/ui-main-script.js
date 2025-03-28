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
let debugLogging = false;        // Flag to control debug message output

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
      console.warn(`${missingElementCount} UI elements could not be found. The UI may not function correctly.`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to initialize UI elements:', error.message);
    return false;
  }
}

/**
 * Initialize event listeners for UI elements with proper error handling
 * @returns {boolean} True if listeners were set up successfully
 */
function initializeEventListeners() {
  try {
    // Form submission handler
    const configForm = safeGetElement('configForm', true);
    if (configForm) {
      configForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (typeof window.saveConfig === 'function') {
          await window.saveConfig();
        } else {
          console.error('Save function not available');
        }
      });
    } else {
      console.error('Config form not found in DOM');
      return false;
    }
    
    // Test connection button
    const testConnectionBtn = safeGetElement('testConnection');
    if (testConnectionBtn) {
      testConnectionBtn.addEventListener('click', () => {
        if (typeof window.testConnection === 'function') {
          window.testConnection();
        } else {
          console.error('Test connection function not available');
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
    
    return true;
  } catch (error) {
    console.error('Error setting up event listeners:', error.message);
    return false;
  }
}

/**
 * CRUCIAL FIX: Intercept and completely block ALL toast notifications 
 * except those explicitly allowed
 */
function installToastOverrides() {
  // Skip if homebridge not available
  if (typeof homebridge === 'undefined' || !homebridge.toast) {
    console.warn('Cannot install toast overrides - homebridge.toast not available');
    return;
  }
  
  console.log('Installing complete toast notification blocking system');
  
  // Keep reference to original toast methods
  const originalToasts = {
    success: homebridge.toast.success,
    error: homebridge.toast.error,
    warning: homebridge.toast.warning,
    info: homebridge.toast.info
  };
  
  // Extended list of messages that should NEVER be shown as toasts
  const blockToastContents = [
    'Config Check', 
    'Config Found',
    'Ready',
    'SleepMe Simple UI',
    'Loading',
    'Config loaded',
    'Fetching',
    'Config saved',
    'Server log',
    'Log',
    'API token',
    'Error fetching logs',
    'Logs not found',
    'Server logs',
    'initialized',
    'File',
    'Path',
    'Directory',
    'Storage'
  ];
  
  // Only these specific titles are allowed to show toasts
  const allowedToastTitles = [
    'Save Complete',
    'API Test',
    'Templates Applied',
    'Schedule Removed',
    'Validation Error',
    'API Test Failed',
    'API Test Error',
    'Save Error',
    'Connection Error'
  ];
  
  // Replacement function that applies ultra-strict filtering
  function createFilteredToast(type) {
    return function(message, title = '') {
      // Always log to console for debugging
      if (type === 'error') {
        console.error(`[Toast ${type}] ${title}: ${message}`);
      } else if (type === 'warning') {
        console.warn(`[Toast ${type}] ${title}: ${message}`);
      } else {
        console.log(`[Toast ${type}] ${title}: ${message}`);
      }
      
      // Block by default - only specifically allowed toasts will show
      let shouldShow = false;
      
      // 1. Block any toast containing blocked terms
      const shouldBlock = blockToastContents.some(term => 
        (message && message.toLowerCase().includes(term.toLowerCase())) || 
        (title && title.toLowerCase().includes(term.toLowerCase()))
      );
      
      if (shouldBlock) {
        return; // Skip toast display completely
      }
      
      // 2. Only allow explicitly approved toast titles - exact match required
      const isAllowedTitle = allowedToastTitles.some(allowedTitle => 
        title === allowedTitle // Exact match required
      );
      
      // Only show toasts with explicitly allowed titles
      if (isAllowedTitle) {
        originalToasts[type](message, title);
      }
    };
  }
  
  // Replace all toast methods with filtered versions
  homebridge.toast.success = createFilteredToast('success');
  homebridge.toast.error = createFilteredToast('error');
  homebridge.toast.warning = createFilteredToast('warning');
  homebridge.toast.info = createFilteredToast('info');
  
  console.log('Complete toast notification blocking system installed');
}

/**
 * Show a toast notification with STRICT filtering to reduce verbosity
 * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
 * @param {string} message - Toast message
 * @param {string} title - Toast title (optional)
 */
window.showToast = function(type, message, title = '') {
  // Always log to console for debugging purposes
  if (type === 'error') {
    console.error(`${title}: ${message}`);
  } else if (type === 'warning') {
    console.warn(`${title}: ${message}`);
  } else {
    console.log(`${title}: ${message}`);
  }
  
  // Global blocklist for message content that should NEVER trigger toasts
  const blockedContentPatterns = [
    'Fetching Server logs',
    'Server logs unavailable',
    'Log directory not found',
    'Loading configuration',
    'Logs not found',
    'API token loaded',
    'Temperature unit set',
    'Config loaded',
    'Config Check',
    'Config Found',
    'Ready',
    'SleepMe Simple UI',
    'Initialized'
  ];
  
  // Check if message contains any blocked pattern
  if (blockedContentPatterns.some(pattern => 
    (message && message.includes(pattern)) || (title && title.includes(pattern))
  )) {
    return; // Skip toast for blocked content
  }
  
  // Very strict allowlist approach - ONLY show these specific toast combinations
  const allowedToasts = [
    // Critical user actions that need feedback
    { type: 'success', title: 'Save Complete' },
    { type: 'success', title: 'API Test', titleMatch: 'exact' },
    { type: 'success', title: 'Templates Applied', titleMatch: 'exact' },
    { type: 'success', title: 'Schedule Removed', titleMatch: 'exact' },
    
    // Critical errors that require user attention
    { type: 'error', title: 'Validation Error' },
    { type: 'error', title: 'API Test Failed' },
    { type: 'error', title: 'API Test Error' },
    { type: 'error', title: 'Save Error' },
    { type: 'error', title: 'Connection Error' }
  ];
  
  // Check if this toast should be shown based on the allowlist
  const shouldShow = allowedToasts.some(allowed => {
    // Type must match
    if (allowed.type !== type) return false;
    
    // Title matching based on the matching strategy
    if (allowed.titleMatch === 'exact') {
      return allowed.title === title;
    } else {
      return title.includes(allowed.title);
    }
  });
  
  // Exit early if this toast shouldn't be shown
  if (!shouldShow) {
    return;
  }
  
  // Display toast if homebridge is available and it passed all filters
  if (typeof homebridge !== 'undefined' && homebridge.toast) {
    if (homebridge.toast[type]) {
      homebridge.toast[type](message, title);
    } else {
      homebridge.toast.info(message, title);
    }
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
  // Log to console but don't show toast for loading messages
  console.log(`Loading: ${message}`);
};

/**
 * Hide loading indicator
 */
window.hideLoading = function() {
  if (typeof homebridge !== 'undefined' && typeof homebridge.hideSpinner === 'function') {
    homebridge.hideSpinner();
  }
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
    window.showToast('error', 'Error testing connection: ' + error.message, 'API Test Error');
  }
};

/**
 * Wait for Homebridge to be fully ready with improved error handling
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
      homebridgeReady = true;
      resolve();
      return;
    }
    
    // Set a timeout to prevent hanging if the ready event never fires
    const timeout = setTimeout(() => {
      // Even though this is an error, we'll try to continue anyway
      homebridgeReady = false;
      resolve(); // Resolve instead of reject to allow initialization to continue
    }, 15000); // 15 second timeout
    
    // Listen for the 'ready' event from Homebridge
    homebridge.addEventListener('ready', () => {
      clearTimeout(timeout);
      
      // Add a small delay to ensure everything is fully initialized
      setTimeout(() => {
        // Double check methods are available
        if (typeof homebridge.getPluginConfig === 'function') {
          homebridgeReady = true;
          resolve();
        } else {
          homebridgeReady = false;
          resolve(); // Resolve instead of reject to allow initialization to continue
        }
      }, 1500); // Increased delay for better reliability
    });
  });
}

/**
 * Robust initialization sequence with better error handling and fallbacks
 */
async function initApp() {
  try {
    // Skip toast for initialization - just log to console
    console.log('Initializing SleepMe Simple UI...');
    
    // Step 0: Install toast overrides as early as possible
    installToastOverrides();
    
    // Step 1: Ensure Homebridge API is ready
    try {
      await waitForHomebridgeReady();
      if (homebridgeReady) {
        console.log('Homebridge API initialized successfully');
      } else {
        console.warn('Homebridge API may not be fully initialized - continuing anyway');
      }
    } catch (homebridgeError) {
      console.error('Homebridge API error:', homebridgeError.message);
      // Continue anyway - we'll try to recover
    }
    
    // Step 2: Ensure DOM elements are initialized
    let domInitialized = false;
    try {
      // Try multiple times with delay to ensure DOM is ready
      for (let attempt = 1; attempt <= 3; attempt++) {
        domInitialized = initializeDOMReferences();
        if (domInitialized) {
          break;
        }
        
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!domInitialized) {
        console.error('Failed to initialize UI elements');
        // Continue anyway - we'll try to recover
      }
    } catch (domError) {
      console.error('DOM initialization error:', domError.message);
      // Continue anyway - we'll try to recover
    }
    
    // Step 3: Load configuration
    let configLoadAttempts = 0;
    let config = {};
    
    while (configLoadAttempts < 3) {
      try {
        if (typeof window.loadConfig === 'function' && homebridgeReady) {
          config = await window.loadConfig();
          configLoaded = true;
          console.log('Configuration loaded successfully');
          break; // Exit loop on success
        } else {
          if (!window.loadConfig) {
            console.error('loadConfig function not available');
          }
          if (!homebridgeReady) {
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
    
    // Step 4: Setup event listeners
    try {
      const listenersInitialized = initializeEventListeners();
      if (!listenersInitialized) {
        console.error('Failed to initialize event listeners');
      }
    } catch (listenerError) {
      console.error('Event listener error:', listenerError.message);
    }
    
    // Step 5: Initialize schedule UI if needed
    if (configLoaded && typeof window.renderScheduleList === 'function') {
      try {
        window.renderScheduleList();
      } catch (scheduleError) {
        console.error('Error rendering schedules:', scheduleError.message);
      }
    }
    
    // Mark as initialized
    initialized = true;
    console.log('SleepMe Simple UI initialization complete');
  } catch (error) {
    // Main try-catch block for initApp
    console.error('Unhandled error during initialization:', error.message);
  }
}

// Main initialization - runs when document is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded - initializing confirmation modal');
  
  // Initialize and properly hide confirmation modal at startup
  const confirmModal = document.getElementById('confirmModal');
  if (confirmModal) {
    // Make sure modal is fully hidden - both style AND class
    confirmModal.classList.add('hidden');
    confirmModal.style.display = 'none';
    
    // Setup event delegation for modal closing when clicking outside
    confirmModal.addEventListener('click', (event) => {
      if (event.target === confirmModal) {
        confirmModal.classList.add('hidden');
        confirmModal.style.display = 'none';
      }
    });
    
    // Setup cancel button closure
    const cancelButton = document.getElementById('confirmCancel');
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        confirmModal.classList.add('hidden');
        confirmModal.style.display = 'none';
      });
    }
  } else {
    console.warn('Confirmation modal element not found in DOM');
  }

  // Check if the homebridge object is available (basic check)
  if (typeof homebridge === 'undefined') {
    // Cannot use showToast here as it depends on homebridge
    alert('Error: Homebridge UI framework not detected. Please reload the page.');
    return;
  }
  
  // Global error handler for uncaught exceptions
  window.onerror = function(message, source, lineno, colno, error) {
    console.error('Uncaught error:', message);
    return false;
  };
  
  // Wait for Homebridge's ready event or initialize if it's already ready
  if (typeof homebridge.getPluginConfig === 'function') {
    // Homebridge API already available
    homebridgeReady = true;
    // Small delay to ensure DOM is fully loaded
    setTimeout(initApp, 500);
  } else {
    // Wait for the ready event
    homebridge.addEventListener('ready', () => {
      console.log('Homebridge ready event received');
      // Small delay to ensure Homebridge API is fully available
      setTimeout(initApp, 500);
    });
    
    // Set a failsafe timeout in case the ready event doesn't fire
    setTimeout(() => {
      if (!initialized) {
        console.warn('Homebridge ready event timeout, attempting initialization anyway');
        initApp();
      }
    }, 10000); // 10 second backup timeout
  }
});