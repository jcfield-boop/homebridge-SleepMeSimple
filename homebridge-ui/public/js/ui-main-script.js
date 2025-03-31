/**
 * SleepMe Simple Homebridge Plugin UI
 * 
 * Main entry point for the custom UI that handles configuration 
 * of SleepMe devices and scheduling features
 * 
 * Uses the module pattern to avoid global namespace pollution
 * and improve code organization
 */
/**
 * DOM Ready Handler - Ensures UI elements are properly initialized
 * Fixes "Failed to initialize UI elements" error
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing UI components');
      // Add this block early in the function
    // IMPORTANT: Initialize templates globally so they're available to all functions
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
    // Initialize DOM elements first
    initUIComponents();
    
    // Set up schedule-specific event listeners
    setupScheduleListeners();

     // Set up schedule-specific event listeners
     setupScheduleListeners();
    
    // Wait for Homebridge to be ready
    initializeHomebridge();
    
    // Function to initialize UI components
    function initUIComponents() {
        // Ensure the DOM is fully loaded before initialization
        console.log('Initializing UI components');
        
        // Initialize key form elements with explicit IDs
        const formElements = ['unit', 'pollingInterval', 'apiToken', 'enableSchedules'];
        
        // Verify all critical elements exist
        const missingElements = formElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            console.error('Missing critical UI elements:', missingElements.join(', '));
        } else {
            console.log('All critical UI elements found');
        }
        
        // Initialize collapsible sections if available
        if (typeof initializeCollapsibleSections === 'function') {
            try {
                initializeCollapsibleSections();
            } catch (error) {
                console.error('Failed to initialize collapsible sections:', error);
            }
        }
        
        // Initialize tabs if available
        if (typeof initializeTabs === 'function') {
            try {
                initializeTabs();
            } catch (error) {
                console.error('Failed to initialize tabs:', error);
            }
        }
    }
    
    // Function to set up schedule-specific event listeners
    function setupScheduleListeners() {
        console.log('Setting up schedule-specific listeners');
        
        // Set up additional event listeners for schedule-related UI elements
        const enableSchedulesCheckbox = document.getElementById('enableSchedules');
        if (enableSchedulesCheckbox) {
            enableSchedulesCheckbox.addEventListener('change', function() {
                const schedulesContainer = document.getElementById('schedulesContainer');
                if (schedulesContainer) {
                    schedulesContainer.classList.toggle('hidden', !this.checked);
                }
            });
        }
        
        // Check if scheduleList exists - critical for rendering schedules
        const scheduleList = document.getElementById('scheduleList');
        if (!scheduleList) {
            console.error('CRITICAL: scheduleList element not found in DOM! Schedules cannot be rendered');
        } else {
            console.log('scheduleList element found in DOM');
        }
    }
    
    // Function to initialize Homebridge connection
    function initializeHomebridge() {
        console.log('Initializing Homebridge connection');
        
        if (typeof homebridge !== 'undefined') {
            // If homebridge.getPluginConfig is already available
            if (typeof homebridge.getPluginConfig === 'function') {
                console.log('Homebridge API already available, loading config immediately');
                
                // Load config with a small delay to ensure DOM is fully ready
                setTimeout(() => {
                    window.loadConfig().then(() => {
                        console.log('Config loaded, checking schedules');
                        // Double-check schedule rendering
                        if (Array.isArray(window.schedules) && 
                            window.schedules.length > 0 && 
                            typeof window.renderScheduleList === 'function') {
                            console.log('Force re-rendering schedules');
                            window.renderScheduleList();
                        } else if (Array.isArray(window.schedules)) {
                            console.log('Schedules array exists but is empty or renderScheduleList not available:', {
                                schedulesLength: window.schedules.length,
                                renderFunctionExists: typeof window.renderScheduleList === 'function'
                            });
                        } else {
                            console.error('window.schedules is not an array after config load');
                        }
                    }).catch(error => {
                        console.error('Error loading config:', error);
                    });
                }, 500); // 500ms delay to ensure DOM is fully ready
            } else {
                // Wait for homebridge ready event
                console.log('Waiting for Homebridge API to be ready');
                homebridge.addEventListener('ready', () => {
                    console.log('Homebridge ready event received, loading config');
                    
                    // Load config with a small delay after ready event
                    setTimeout(() => {
                        window.loadConfig().then(() => {
                            console.log('Config loaded after ready event, checking schedules');
                            // Double-check schedule rendering
                            if (Array.isArray(window.schedules) && 
                                window.schedules.length > 0 && 
                                typeof window.renderScheduleList === 'function') {
                                console.log('Force re-rendering schedules after ready event');
                                window.renderScheduleList();
                            } else if (Array.isArray(window.schedules)) {
                                console.log('Schedules array exists but is empty or renderScheduleList not available:', {
                                    schedulesLength: window.schedules.length,
                                    renderFunctionExists: typeof window.renderScheduleList === 'function'
                                });
                            } else {
                                console.error('window.schedules is not an array after config load');
                            }
                        }).catch(error => {
                            console.error('Error loading config after ready event:', error);
                        });
                    }, 500);
                });
            }
        } else {
            console.error('Homebridge object not available');
        }
    }
});
// Execute immediately to prevent ANY toasts from appearing during startup
(function suppressAllStartupToasts() {
    // Immediately suppress ALL toast notifications during initialization
    if (typeof homebridge !== 'undefined') {
      // METHOD 1: Override toast methods directly - must run ASAP
      const toastTypes = ['success', 'error', 'warning', 'info'];
      toastTypes.forEach(type => {
        if (homebridge.toast && typeof homebridge.toast[type] === 'function') {
          const originalToast = homebridge.toast[type];
          homebridge.toast[type] = function(message, title) {
            // Only log to console during initialization
            console.log(`[TOAST SUPPRESSED] ${type}: ${title || ''} - ${message}`);
            return; // Don't call original function
          };
        }
      });
      
      // METHOD 2: Block log fetching at the source
      if (typeof homebridge.fetchLogs === 'function') {
        homebridge.fetchLogs = function() {
          console.log('[LOGS] Log fetching suppressed');
          return Promise.resolve([]); // Return empty logs array
        };
      }
      
      // METHOD 3: Block network requests to log endpoints
      const originalFetch = window.fetch;
      window.fetch = function(url, options) {
        if (url && typeof url === 'string' && 
            (url.includes('/log') || url.includes('logs'))) {
          console.log(`[NETWORK] Suppressed fetch to: ${url}`);
          return Promise.resolve(new Response('[]', { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' }
          }));
        }
        return originalFetch.apply(this, arguments);
      };
    }
  })();
/**
 * Initialize collapsible sections throughout the UI
 * Enhanced to ensure proper opening/closing and better event handling
 */
function initializeCollapsibleSections() {
    // Get all collapsible headers
    const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
    
    console.log(`Found ${collapsibleHeaders.length} collapsible sections`);
    
    if (!collapsibleHeaders || collapsibleHeaders.length === 0) {
      console.warn('No collapsible sections found');
      return;
    }
    
    // Process each header
    collapsibleHeaders.forEach(header => {
      // Clear existing listeners by cloning and replacing
      const newHeader = header.cloneNode(true);
      if (header.parentNode) {
        header.parentNode.replaceChild(newHeader, header);
      }
      
      // Add click handler to toggle content visibility
      newHeader.addEventListener('click', function(event) {
        // Prevent event bubbling
        event.preventDefault();
        event.stopPropagation();
        
        const section = this.closest('.collapsible-section');
        if (!section) return;
        
        // Toggle the open class
        section.classList.toggle('open');
        
        // Get the content section
        const content = section.querySelector('.collapsible-content');
        if (!content) return;
        
        // Explicitly set display style with both methods
        if (section.classList.contains('open')) {
          content.style.display = 'block';
          content.classList.remove('hidden');
        } else {
          content.style.display = 'none';
          content.classList.add('hidden');
        }
        
        // Update the dropdown indicator with rotation
        const indicator = this.querySelector('.dropdown-indicator');
        if (indicator) {
          indicator.style.transform = section.classList.contains('open') ? 
            'rotate(180deg)' : 'rotate(0deg)';
        }
        
        console.log(`Section ${section.querySelector('h3')?.textContent || 'unknown'} toggled to ${section.classList.contains('open') ? 'open' : 'closed'}`);
      });
    });
    
    console.log('Collapsible sections initialized successfully');
  }
  /**
   * Load Warm Hug settings from configuration with proper unit conversion
   * Enhanced to handle both Celsius and Fahrenheit units
   */
  async function loadWarmHugSettings() {
    try {
      console.log('Loading Warm Hug settings...');
      
      // Get form elements
      const incrementInput = document.getElementById('warmHugIncrement');
      const durationInput = document.getElementById('warmHugDuration');
      const unitSelect = document.getElementById('unit');
      
      // Only proceed if homebridge is ready
      if (typeof homebridge === 'undefined' || typeof homebridge.getPluginConfig !== 'function') {
        console.error('Homebridge API not ready');
        return;
      }
      
      // Get current config
      const pluginConfig = await homebridge.getPluginConfig();
      const config = findPlatformConfig(pluginConfig);
      
      if (!config) {
        console.warn('Platform configuration not found in plugin config');
        return;
      }
      
      // Get current temperature unit
      const currentUnit = unitSelect ? unitSelect.value : 'C';
      
      // Set values if they exist in config.advanced
      if (config.advanced) {
        if (incrementInput && config.advanced.warmHugIncrement !== undefined) {
          // Apply proper unit conversion for increment
          let incrementValue = config.advanced.warmHugIncrement;
          
          // If stored in Celsius but displaying in Fahrenheit, convert
          if (config.unit === 'C' && currentUnit === 'F') {
            // Fahrenheit increments are 9/5 times larger than Celsius increments
            incrementValue = incrementValue * (9/5);
          } 
          // If stored in Fahrenheit but displaying in Celsius, convert
          else if (config.unit === 'F' && currentUnit === 'C') {
            // Celsius increments are 5/9 times smaller than Fahrenheit increments
            incrementValue = incrementValue * (5/9);
          }
          
          // Round to one decimal place for display
          incrementValue = Math.round(incrementValue * 10) / 10;
          incrementInput.value = incrementValue;
        } else if (incrementInput) {
          // Default value if not in config
          // Use appropriate default based on unit
          incrementInput.value = currentUnit === 'C' ? "2" : "3.6";
        }
        
        if (durationInput && config.advanced.warmHugDuration !== undefined) {
          durationInput.value = config.advanced.warmHugDuration;
        } else if (durationInput) {
          // Default value if not in config
          durationInput.value = "15";
        }
      } else {
        // Set default values if advanced section doesn't exist
        if (incrementInput) {
          incrementInput.value = currentUnit === 'C' ? "2" : "3.6";
        }
        if (durationInput) durationInput.value = "15";
      }
      
      console.log('Warm Hug settings loaded successfully');
      
      // Update unit-specific labels
      updateWarmHugUnitLabels(currentUnit);
    } catch (error) {
      console.error('Error loading Warm Hug settings:', error);
    }
  }
  
  /**
   * Update Warm Hug form labels based on current temperature unit
   * @param {string} unit - Current temperature unit ('C' or 'F')
   */
  function updateWarmHugUnitLabels(unit) {
    const incrementLabel = document.querySelector('label[for="warmHugIncrement"]');
    const incrementHelp = document.querySelector('#warmHugIncrement + .form-text');
    
    if (incrementLabel) {
      incrementLabel.textContent = `Temperature Increment (°${unit}/min):`;
    }
    
    if (incrementHelp) {
      if (unit === 'C') {
        incrementHelp.textContent = 'How quickly temperature increases (0.5-5°C per minute)';
      } else {
        incrementHelp.textContent = 'How quickly temperature increases (1-9°F per minute)';
      }
    }
  }
  
  /**
   * Save Warm Hug parameters with proper unit conversion
   * Enhanced to handle both Celsius and Fahrenheit
   */
  async function saveWarmHugParameters() {
    try {
      console.log('Saving Warm Hug parameters...');
      const incrementInput = document.getElementById('warmHugIncrement');
      const durationInput = document.getElementById('warmHugDuration');
      const unitSelect = document.getElementById('unit');
      
      if (!incrementInput || !durationInput || !unitSelect) {
        console.error('Warm Hug input elements not found');
        return;
      }
      
      // Get current unit
      const currentUnit = unitSelect.value;
      
      // Validate inputs with appropriate ranges based on unit
      const increment = parseFloat(incrementInput.value);
      const duration = parseInt(durationInput.value);
      
      // Different validation ranges based on unit
      const minIncrement = currentUnit === 'C' ? 0.5 : 1.0;
      const maxIncrement = currentUnit === 'C' ? 5.0 : 9.0;
      
      if (isNaN(increment) || increment < minIncrement || increment > maxIncrement) {
        console.error('Invalid increment value:', increment);
        
        // Update status element
        const statusElement = document.getElementById('status');
        if (statusElement) {
          statusElement.textContent = `Error: Increment must be between ${minIncrement} and ${maxIncrement}°${currentUnit}`;
          statusElement.className = 'status error';
          statusElement.classList.remove('hidden');
        }
        return;
      }
      
      if (isNaN(duration) || duration < 5 || duration > 30) {
        console.error('Invalid duration value:', duration);
        
        // Update status element
        const statusElement = document.getElementById('status');
        if (statusElement) {
          statusElement.textContent = 'Error: Duration must be between 5 and 30 minutes';
          statusElement.className = 'status error';
          statusElement.classList.remove('hidden');
        }
        return;
      }
      
      // Only proceed if homebridge is ready
      if (typeof homebridge === 'undefined' || typeof homebridge.getPluginConfig !== 'function') {
        console.error('Homebridge API not ready');
        return;
      }
      
      // Get current config
      const pluginConfig = await homebridge.getPluginConfig();
      
      // Find platform config
      let config = findPlatformConfig(pluginConfig);
      
      if (!config) {
        console.error('Platform configuration not found');
        
        // Update status element
        const statusElement = document.getElementById('status');
        if (statusElement) {
          statusElement.textContent = 'Error: Configuration not found';
          statusElement.className = 'status error';
          statusElement.classList.remove('hidden');
        }
        return;
      }
      
      // Convert increment to Celsius for storage if needed
      let storageIncrement = increment;
      if (currentUnit === 'F') {
        // Convert Fahrenheit increment to Celsius increment
        storageIncrement = increment * (5/9);
        console.log(`Converting increment from ${increment}°F/min to ${storageIncrement}°C/min for storage`);
      }
      
      // Ensure advanced section exists
      if (!config.advanced) {
        config.advanced = {};
      }
      
      // Update Warm Hug parameters with converted values if needed
      config.advanced.warmHugIncrement = storageIncrement;
      config.advanced.warmHugDuration = duration;
      
      // Update config in memory
      await homebridge.updatePluginConfig(pluginConfig);
      
      // Save to disk
      await homebridge.savePluginConfig();
      
      console.log('Warm Hug parameters saved successfully');
      
      // Update status element with success message
      const statusElement = document.getElementById('status');
      if (statusElement) {
        statusElement.textContent = 'Warm Hug parameters saved successfully';
        statusElement.className = 'status success';
        statusElement.classList.remove('hidden');
        
        // Auto-hide after a few seconds
        setTimeout(() => {
          statusElement.classList.add('hidden');
        }, 3000);
      }
    } catch (error) {
      console.error('Error saving Warm Hug parameters:', error);
      
      // Update status element with error
      const statusElement = document.getElementById('status');
      if (statusElement) {
        statusElement.textContent = `Error saving parameters: ${error.message}`;
        statusElement.className = 'status error';
        statusElement.classList.remove('hidden');
      }
    }
  }
/**
 * Populate template code preview with template data
 * Enhanced with direct access to the global templates object
 */
function populateTemplateCodePreview() {
    console.log('Populating template code preview...');
    const templateCodePreview = document.getElementById('templateCodePreview');
    if (!templateCodePreview) {
        console.error('Template code preview element not found');
        return;
    }
    
    try {
        // Access templates from window global - this should be defined in the DOMContentLoaded handler
        if (!window.templates || Object.keys(window.templates).length === 0) {
            console.error('Templates not initialized yet');
            templateCodePreview.textContent = '// Templates not initialized yet. Please try refreshing the page.';
            return;
        }
        
        // Format templates nicely for display
        const templateJson = JSON.stringify(window.templates, null, 2);
        templateCodePreview.textContent = templateJson;
        console.log('Template code preview populated successfully');
    } catch (error) {
        console.error('Error populating template code preview:', error);
        // Set a default message instead of showing error
        templateCodePreview.textContent = '// Error loading template definitions: ' + error.message;
    }
}
  /**
   * Save Warm Hug parameters
   * Updates configuration with user-defined Warm Hug settings
   * Added robust error handling
   */
  async function saveWarmHugParameters() {
      try {
          const incrementInput = document.getElementById('warmHugIncrement');
          const durationInput = document.getElementById('warmHugDuration');
          
          if (!incrementInput || !durationInput) {
              // Silently fail if inputs aren't found
              return;
          }
          
          // Validate inputs
          const increment = parseFloat(incrementInput.value);
          const duration = parseInt(durationInput.value);
          
          if (isNaN(increment) || increment < 0.5 || increment > 5) {
              // Only log to console, don't show error toast
              console.error('Invalid increment value:', increment);
              return;
          }
          
          if (isNaN(duration) || duration < 5 || duration > 30) {
              // Only log to console, don't show error toast
              console.error('Invalid duration value:', duration);
              return;
          }
          
          // Only proceed if homebridge is ready
          if (typeof homebridge === 'undefined' || typeof homebridge.getPluginConfig !== 'function') {
              console.error('Homebridge API not ready');
              return;
          }
          
          // Get current config
          const pluginConfig = await homebridge.getPluginConfig();
          
          // Find platform config
          let config = null;
          if (Array.isArray(pluginConfig)) {
              config = pluginConfig.find(cfg => cfg && cfg.platform === 'SleepMeSimple');
          }
          
          if (!config) {
              console.error('Platform configuration not found');
              return;
          }
          
          // Ensure advanced section exists
          if (!config.advanced) {
              config.advanced = {};
          }
          
          // Update Warm Hug parameters
          config.advanced.warmHugIncrement = increment;
          config.advanced.warmHugDuration = duration;
          
          // Update config in memory
          await homebridge.updatePluginConfig(pluginConfig);
          
          // Save to disk
          await homebridge.savePluginConfig();
          
          // Update status element instead of showing toast
          const statusElement = document.getElementById('status');
          if (statusElement) {
              statusElement.textContent = 'Warm Hug parameters saved successfully';
              statusElement.className = 'status success';
              statusElement.classList.remove('hidden');
          }
      } catch (error) {
          console.error('Error saving Warm Hug parameters:', error);
          // Update status element with error
          const statusElement = document.getElementById('status');
          if (statusElement) {
              statusElement.textContent = `Error saving parameters: ${error.message}`;
              statusElement.className = 'status error';
              statusElement.classList.remove('hidden');
          }
      }
  }
  
  
  /**
   * Find the SleepMeSimple platform config in the Homebridge config
   * @param {Array} pluginConfig - The plugin configuration array
   * @returns {Object|null} - The platform configuration or null if not found
   */
  function findPlatformConfig(pluginConfig) {
      if (!Array.isArray(pluginConfig)) {
          return null;
      }
      
      return pluginConfig.find(cfg => cfg && cfg.platform === 'SleepMeSimple') || null;
  }
  
  /**
   * Load advanced settings from config
   * Populates form fields with current configuration values
   * Enhanced with better error handling
   */
  async function loadAdvancedSettings() {
      try {
          // Get form elements - safely handle missing elements
          const incrementInput = document.getElementById('warmHugIncrement');
          const durationInput = document.getElementById('warmHugDuration');
          const deviceModelSelect = document.getElementById('deviceModel');
          const logLevelSelect = document.getElementById('logLevel');
          
          // Only proceed if homebridge is ready
          if (typeof homebridge === 'undefined' || typeof homebridge.getPluginConfig !== 'function') {
              console.error('Homebridge API not ready');
              return;
          }
          
          // Get current config
          const pluginConfig = await homebridge.getPluginConfig();
          
          const config = findPlatformConfig(pluginConfig);
          
          if (!config) {
              console.warn('Platform configuration not found in plugin config');
              return;
          }
          
          // Set log level if available
          if (logLevelSelect && config.logLevel) {
              logLevelSelect.value = config.logLevel;
          }
          
          // Set values if they exist in config.advanced
          if (config.advanced) {
              if (incrementInput && config.advanced.warmHugIncrement !== undefined) {
                  incrementInput.value = config.advanced.warmHugIncrement;
              } else if (incrementInput) {
                  // Default value if not in config
                  incrementInput.value = "2";
              }
              
              if (durationInput && config.advanced.warmHugDuration !== undefined) {
                  durationInput.value = config.advanced.warmHugDuration;
              } else if (durationInput) {
                  // Default value if not in config
                  durationInput.value = "15";
              }
              
              if (deviceModelSelect && config.advanced.deviceModel) {
                  deviceModelSelect.value = config.advanced.deviceModel;
              }
          } else {
              // Set default values if advanced section doesn't exist
              if (incrementInput) incrementInput.value = "2";
              if (durationInput) durationInput.value = "15";
          }
      } catch (error) {
          console.error('Error loading advanced settings:', error);
          // Don't show error toast - just log to console
      }
  }
  
  // Main application module using IIFE pattern for encapsulation
  const SleepMeUI = (function() {
      // Private module variables
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
          confirmCancel: null,            // Confirmation modal Cancel button
          // Template-related elements
          templateCodePreview: null,      // Template code preview element
          copyTemplateCodeBtn: null,      // Copy template code button
          copyConfigExampleBtn: null,     // Copy config example button
          weekdayTemplateSelect: null,    // Weekday template select
          weekendTemplateSelect: null,    // Weekend template select
          weekdayTemplateDesc: null,      // Weekday template description
          weekendTemplateDesc: null,      // Weekend template description
          templatePreviewBtn: null,       // Template preview button
          templatePreviewContainer: null  // Template preview container
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
        elements.scheduleTypeSelect = safeGetElement('scheduleType');
        elements.daySelectContainer = safeGetElement('daySelectContainer');
        elements.scheduleTimeInput = safeGetElement('scheduleTime');
        elements.scheduleTemperatureInput = safeGetElement('scheduleTemperature');
        elements.unitSelect = safeGetElement('unit');
        elements.warmHugInfo = safeGetElement('warmHugInfo');
        elements.addScheduleBtn = safeGetElement('addSchedule');
        elements.cancelEditBtn = safeGetElement('cancelEdit');
        elements.scheduleList = safeGetElement('scheduleList');
        elements.statusElement = safeGetElement('status');
        elements.configForm = safeGetElement('configForm');
        elements.enableSchedulesCheckbox = safeGetElement('enableSchedules');
        elements.schedulesContainer = safeGetElement('schedulesContainer');
        elements.testConnectionBtn = safeGetElement('testConnection');
        elements.applyTemplatesBtn = safeGetElement('applyTemplates');
        elements.confirmModal = safeGetElement('confirmModal');
        elements.confirmTitle = safeGetElement('confirmTitle');
        elements.confirmMessage = safeGetElement('confirmMessage');
        elements.confirmOk = safeGetElement('confirmOk');
        elements.confirmCancel = safeGetElement('confirmCancel');
        
        // If confirmModal exists, ensure it's properly hidden
        if (elements.confirmModal) {
            elements.confirmModal.classList.add('hidden');
            elements.confirmModal.style.display = 'none';
        }
        
        // Check for critical elements
        const criticalElements = [
            elements.scheduleTypeSelect,
            elements.scheduleTimeInput,
            elements.scheduleTemperatureInput,
            elements.unitSelect,
            elements.configForm
        ];
        
        const missingCriticalElements = criticalElements.filter(el => !el);
        
        if (missingCriticalElements.length > 0) {
            console.warn(`${missingCriticalElements.length} critical UI elements missing`);
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
function showLoading(message) {
    // Log to console only - no UI effects
    console.log(`[Loading] ${message}`);
}

/**
 * Hide loading indicator empty to remove toast spinners
 */
function hideLoading() {
    // Log to console only - no UI effects
    console.log('[Loading] Complete');
}

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
    
    if (elements.confirmOk.parentNode) {
        elements.confirmOk.parentNode.replaceChild(newOkButton, elements.confirmOk);
    }
    if (elements.confirmCancel.parentNode) {
        elements.confirmCancel.parentNode.replaceChild(newCancelButton, elements.confirmCancel);
    }
    
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
 * Copy text to clipboard with success message
 * @param {string} text - Text to copy
 * @param {HTMLElement} button - Button that triggered the copy
 * @returns {boolean} Success status
 */
function copyToClipboard(text, button) {
    try {
        // Create a temporary element for copying
        const el = document.createElement('textarea');
        el.value = text;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        
        // Select and copy the text
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        
        // Show success message
        const successSpan = document.createElement('span');
        successSpan.textContent = 'Copied!';
        successSpan.className = 'copy-success';
        
        if (button && button.parentNode) {
            button.parentNode.appendChild(successSpan);
            
            // Make visible then fade out
            setTimeout(() => {
                successSpan.classList.add('visible');
                setTimeout(() => {
                    successSpan.classList.remove('visible');
                    setTimeout(() => {
                        if (successSpan.parentNode) {
                            successSpan.parentNode.removeChild(successSpan);
                        }
                    }, 300);
                }, 1500);
            }, 10);
        }
        
        return true;
    } catch (error) {
        console.error('Copy to clipboard failed:', error);
        return false;
    }
}

/**
 * Show a preview of a template's schedules
 * @param {string} templateKey - Key of template to preview 
 */
function showTemplatePreview(templateKey) {
    // Get template by key
    const template = templates[templateKey];
    if (!template) {
        console.error(`Template "${templateKey}" not found`);
        return;
    }
    
    try {
        // Get container element
        const containerSelector = `#${templateKey}Preview`;
        let previewContainer = document.querySelector(containerSelector);
        
        // Create container if it doesn't exist
        if (!previewContainer) {
            const targetElement = templateKey.includes('weekday') ? 
                elements.weekdayTemplateDesc : elements.weekendTemplateDesc;
                
            if (!targetElement) {
                console.error('Target element for preview not found');
                return;
            }
            
            // Create preview container
            previewContainer = document.createElement('div');
            previewContainer.id = `${templateKey}Preview`;
            previewContainer.className = 'template-preview';
            
            // Create header
            const header = document.createElement('div');
            header.className = 'template-preview-header';
            
            const title = document.createElement('h4');
            title.textContent = 'Schedule Preview';
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'secondary';
            closeBtn.textContent = 'Close';
            closeBtn.addEventListener('click', () => {
                if (previewContainer.parentNode) {
                    previewContainer.parentNode.removeChild(previewContainer);
                }
            });
            
            header.appendChild(title);
            header.appendChild(closeBtn);
            previewContainer.appendChild(header);
            
            // Add container to DOM
            targetElement.appendChild(previewContainer);
        } else {
            // Clear existing content except header
            const header = previewContainer.querySelector('.template-preview-header');
            previewContainer.innerHTML = '';
            if (header) {
                previewContainer.appendChild(header);
            }
        }
        
        // Get unit for temperature display
        const unit = elements.unitSelect ? elements.unitSelect.value : 'C';
        
        // Add schedules to preview
        template.schedules.forEach(schedule => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            
            // Format time and temperature
            let temp = schedule.temperature;
            if (unit === 'F' && typeof window.convertCtoF === 'function') {
                temp = Math.round(window.convertCtoF(temp) * 10) / 10;
            }
            
            // Create schedule info
            const infoSpan = document.createElement('span');
            infoSpan.textContent = `${schedule.time}: ${temp}°${unit}`;
            
            // Create description
            const descSpan = document.createElement('span');
            descSpan.textContent = schedule.description || '';
            descSpan.className = 'preview-description';
            
            // Add to preview item
            previewItem.appendChild(infoSpan);
            previewItem.appendChild(descSpan);
            
            // Add to preview container
            previewContainer.appendChild(previewItem);
        });
        
    } catch (error) {
        console.error('Error showing template preview:', error);
    }
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
    
       // Template preview
       if (elements.weekdayTemplateSelect) {
           elements.weekdayTemplateSelect.addEventListener('change', () => {
               const selectedTemplate = elements.weekdayTemplateSelect.value;
               
               // Update description
               if (elements.weekdayTemplateDesc && selectedTemplate) {
                   const template = templates[selectedTemplate];
                   if (template) {
                       elements.weekdayTemplateDesc.textContent = template.description || '';
                       
                       // Show preview button
                       let previewBtn = document.getElementById('weekdayPreviewBtn');
                       if (!previewBtn) {
                           previewBtn = document.createElement('button');
                           previewBtn.id = 'weekdayPreviewBtn';
                           previewBtn.className = 'secondary';
                           previewBtn.textContent = 'Preview Schedules';
                           previewBtn.style.marginTop = '10px';
                           elements.weekdayTemplateDesc.appendChild(previewBtn);
                       }
                       
                       // Add preview button event listener
                       previewBtn.addEventListener('click', () => {
                           showTemplatePreview(selectedTemplate);
                       });
                   } else {
                       elements.weekdayTemplateDesc.textContent = '';
                   }
               }
           });
       }
       
       if (elements.weekendTemplateSelect) {
           elements.weekendTemplateSelect.addEventListener('change', () => {
               const selectedTemplate = elements.weekendTemplateSelect.value;
               
               // Update description
               if (elements.weekendTemplateDesc && selectedTemplate) {
                   const template = templates[selectedTemplate];
                   if (template) {
                       elements.weekendTemplateDesc.textContent = template.description || '';
                       
                       // Show preview button
                       let previewBtn = document.getElementById('weekendPreviewBtn');
                       if (!previewBtn) {
                           previewBtn = document.createElement('button');
                           previewBtn.id = 'weekendPreviewBtn';
                           previewBtn.className = 'secondary';
                           previewBtn.textContent = 'Preview Schedules';
                           previewBtn.style.marginTop = '10px';
                           elements.weekendTemplateDesc.appendChild(previewBtn);
                       }
                       
                       // Add preview button event listener
                       previewBtn.addEventListener('click', () => {
                           showTemplatePreview(selectedTemplate);
                       });
                   } else {
                       elements.weekendTemplateDesc.textContent = '';
                   }
               }
           });
       }
       
       // Template copy buttons
       if (elements.copyTemplateCodeBtn) {
           elements.copyTemplateCodeBtn.addEventListener('click', () => {
               const templateCode = JSON.stringify(templates, null, 2);
               copyToClipboard(templateCode, elements.copyTemplateCodeBtn);
           });
       }
       
       if (elements.copyConfigExampleBtn) {
           elements.copyConfigExampleBtn.addEventListener('click', () => {
               const configEl = elements.copyConfigExampleBtn.closest('.code-example').querySelector('pre');
               if (configEl) {
                   copyToClipboard(configEl.textContent, elements.copyConfigExampleBtn);
               }
           });
       }
       // Tab navigation - use event delegation for better performance
const tabContainer = document.querySelector('.tabs');
if (tabContainer) {
    tabContainer.addEventListener('click', (event) => {
        // Find the closest tab element (handles clicks on child elements)
        const tabElement = event.target.closest('.tab');
        
        if (tabElement) {
            const tabId = tabElement.getAttribute('data-tab');
            if (!tabId) return; // Skip if tab ID not found
            
            // Remove active class from all tabs and contents
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to selected tab and content
            tabElement.classList.add('active');
            const tabContent = document.getElementById(tabId + 'Tab');
            if (tabContent) {
                tabContent.classList.add('active');
                
                // Initialize template code preview if needed
                if (tabId === 'templateHelp' && elements.templateCodePreview) {
                    try {
                        elements.templateCodePreview.textContent = JSON.stringify(templates, null, 2);
                    } catch (error) {
                        console.error('Error initializing template preview:', error);
                    }
                }
                
                // Load advanced settings when that tab is selected
                if (tabId === 'advancedOptions') {
                    try {
                        setTimeout(loadAdvancedSettings, 100);
                    } catch (error) {
                        console.error('Error loading advanced settings:', error);
                    }
                }
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

// Initialize collapsible sections
try {
    initializeCollapsibleSections();
} catch (error) {
    console.error('Error initializing collapsible sections:', error);
}

// Add save button handlers for advanced options
const saveWarmHugBtn = document.getElementById('saveWarmHugParams');
if (saveWarmHugBtn) {
    saveWarmHugBtn.addEventListener('click', saveWarmHugParameters);
}


// Load advanced settings when the advanced tab is selected
const advancedTab = document.querySelector('.tab[data-tab="advancedOptions"]');
if (advancedTab) {
    advancedTab.addEventListener('click', () => {
        // Small delay to allow tab content to be displayed
        setTimeout(loadAdvancedSettings, 100);
    });
}
        return true;
    } catch (error) {
        console.error('Error setting up event listeners:', error);
        return false;
    }
}
  
/**
 * Wait for Homebridge to be fully ready with improved error handling
 * Uses Promise with timeout for better reliability
 * @returns {Promise<void>}
 */
async function waitForHomebridgeReady() {
  return new Promise((resolve) => {
      // Check if homebridge object exists
      if (typeof homebridge === 'undefined') {
          console.error('Homebridge object is not available');
          // Resolve anyway to allow initialization to continue
          resolve();
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
 * Enhanced with better error handling
 * @returns {Promise<void>}
 */
async function testConnection() {
  try {
      const apiTokenInput = document.getElementById('apiToken');
      if (!apiTokenInput) {
          console.error('API token input field not found');
          return;
      }
      
      const apiToken = apiTokenInput.value.trim();
      if (!apiToken) {
          // Update status element instead of toast
          const statusElement = document.getElementById('status');
          if (statusElement) {
              statusElement.textContent = 'Please enter your API token';
              statusElement.className = 'status error';
              statusElement.classList.remove('hidden');
          }
          return;
      }
      
      console.log('Testing API connection...'); 
      
      if (typeof homebridge === 'undefined' || typeof homebridge.request !== 'function') {
          console.error('Homebridge API not available for API test');
          return;
      }
      
      // Make request to server
      const response = await homebridge.request('/device/test', { apiToken });
              
      // Update status element instead of toast
      const statusElement = document.getElementById('status');
      if (statusElement) {
          if (response.success) {
              statusElement.textContent = `Connection successful! Found ${response.devices} device(s): ${response.deviceInfo.map(d => d.name).join(', ')}`;
              statusElement.className = 'status success';
          } else {
              statusElement.textContent = response.error || 'Unknown error testing connection';
              statusElement.className = 'status error';
          }
          statusElement.classList.remove('hidden');
      }
  } catch (error) {
      console.error('Error testing connection:', error);
      
      // Update status element instead of toast
      const statusElement = document.getElementById('status');
      if (statusElement) {
          statusElement.textContent = `Error testing connection: ${error.message}`;
          statusElement.className = 'status error';
          statusElement.classList.remove('hidden');
      }
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
      window.templates = templates; // Make templates available globally
      
      // Step 5: Render schedules if needed
      if (state.configLoaded && typeof window.renderScheduleList === 'function') {
          try {
              window.renderScheduleList();
              console.log('Schedule list rendered successfully');
          } catch (scheduleError) {
              console.error('Error rendering schedules:', scheduleError.message);
          }
      }
      
      // Step 6: Initialize template code preview if needed
      if (elements.templateCodePreview) {
          try {
              elements.templateCodePreview.textContent = JSON.stringify(templates, null, 2);
              console.log('Template code preview initialized');
          } catch (templateError) {
              console.error('Error initializing template code preview:', templateError.message);
          }
      }
      
      // Initialize collapsible sections
      try {
          initializeCollapsibleSections();
          console.log('Collapsible sections initialized');
      } catch (error) {
          console.error('Error initializing collapsible sections:', error);
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
  },
  copyToClipboard: copyToClipboard,
  showTemplatePreview: showTemplatePreview,
  exportTemplateConfig: function() {
      return JSON.stringify(templates, null, 2);
  }
};
})();

// Main initialization - runs when document is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded - starting initialization');
  
  // Block log fetching that causes the "Fetching server logs..." toast
  if (typeof homebridge !== 'undefined') {
      // Method 1: Override the log fetching function if it exists
      if (typeof homebridge.fetchLogs === 'function') {
        const originalFetchLogs = homebridge.fetchLogs;
        homebridge.fetchLogs = function() {
          console.log('Log fetching suppressed');
          return Promise.resolve([]); // Return empty promise
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
  window.copyToClipboard = SleepMeUI.copyToClipboard;
  window.exportTemplateConfig = SleepMeUI.exportTemplateConfig;
  window.showTemplatePreview = SleepMeUI.showTemplatePreview;
  
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
// Failsafe initialization - ensure schedules are rendered even if other methods fail
(function() {
    // Set a timeout to check if schedules are properly initialized
    setTimeout(function checkScheduleInitialization() {
        console.log('Running failsafe schedule initialization check');
        
        // Check if schedules exist and if the scheduleList element exists
        const scheduleListElement = document.getElementById('scheduleList');
        const schedulesExist = Array.isArray(window.schedules) && window.schedules.length > 0;
        
        if (scheduleListElement && schedulesExist) {
            console.log(`Failsafe: Found ${window.schedules.length} schedules, checking if they're rendered`);
            
            // Check if the scheduleList has any child elements
            if (scheduleListElement.children.length <= 1) {
                console.log('Failsafe: scheduleList appears empty, forcing re-render');
                if (typeof window.renderScheduleList === 'function') {
                    window.renderScheduleList();
                }
            }
        } else {
            console.log('Failsafe: Conditions not met for schedule rendering:', {
                scheduleListElementExists: !!scheduleListElement,
                schedulesExist: schedulesExist,
                schedulesLength: Array.isArray(window.schedules) ? window.schedules.length : 'not an array'
            });
        }
    }, 5000); // Check 5 seconds after page load - long enough for normal initialization to complete
})();