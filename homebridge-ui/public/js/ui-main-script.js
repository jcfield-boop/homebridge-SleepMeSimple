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
 * Initialize collapsible sections throughout the UI
 * Manages toggle behavior and visual indicators
 */
function initializeCollapsibleSections() {
    console.log('Initializing collapsible sections...');
    
    // Initialize all collapsible headers
    const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
    console.log(`Found ${collapsibleHeaders.length} collapsible headers`);
    
    collapsibleHeaders.forEach((header, index) => {
        console.log(`Initializing header ${index + 1}:`, header.textContent.trim());
        
        // Remove any existing listeners first to avoid duplicates
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);
        
        newHeader.addEventListener('click', function() {
            // Toggle the open class on the parent section
            const section = this.closest('.collapsible-section');
            section.classList.toggle('open');
            
            const isOpen = section.classList.contains('open');
            console.log(`Section ${index + 1} toggled ${isOpen ? 'open' : 'closed'}`);
            
            // Update aria attributes for accessibility
            const content = section.querySelector('.collapsible-content');
            
            this.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            content.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
            
            // Also toggle the dropdown indicator
            const indicator = this.querySelector('.dropdown-indicator');
            if (indicator) {
                indicator.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
            }
            
            // Force display style on the content div
            content.style.display = isOpen ? 'block' : 'none';
        });
        
        // Set initial aria attributes
        const section = newHeader.closest('.collapsible-section');
        const content = section.querySelector('.collapsible-content');
        
        newHeader.setAttribute('aria-expanded', 'false');
        content.setAttribute('aria-hidden', 'true');
        
        // Explicitly set display style
        content.style.display = 'none';
    });
    
    // Open the first section by default in the advanced options if we're in that tab
    const advancedTab = document.getElementById('advancedOptionsTab');
    if (advancedTab && advancedTab.classList.contains('active')) {
        console.log('Advanced tab is active, opening first section');
        
        const firstSection = advancedTab.querySelector('.collapsible-section');
        if (firstSection) {
            firstSection.classList.add('open');
            
            const header = firstSection.querySelector('.collapsible-header');
            const content = firstSection.querySelector('.collapsible-content');
            const indicator = header?.querySelector('.dropdown-indicator');
            
            if (header && content) {
                header.setAttribute('aria-expanded', 'true');
                content.setAttribute('aria-hidden', 'false');
                content.style.display = 'block'; // Explicitly set display style
                
                if (indicator) {
                    indicator.style.transform = 'rotate(180deg)';
                }
                
                console.log('First section opened successfully');
            }
        } else {
            console.warn('No collapsible sections found in advanced tab');
        }
    }
    
    console.log('Collapsible sections initialized');
}
/**
 * Initialize tab handling with improved template code display
 */
function initializeTabs() {
    const tabContainer = document.querySelector('.tabs');
    if (tabContainer) {
        tabContainer.addEventListener('click', (event) => {
            // Find the closest tab element (handles clicks on child elements)
            const tabElement = event.target.closest('.tab');
            
            if (tabElement) {
                const tabId = tabElement.getAttribute('data-tab');
                
                // Remove active class from all tabs and contents
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // Add active class to selected tab and content
                tabElement.classList.add('active');
                const tabContent = document.getElementById(tabId + 'Tab');
                if (tabContent) {
                    tabContent.classList.add('active');
                    
                    // Special handling for template help tab
                    if (tabId === 'templateHelp') {
                        populateTemplateCodePreview();
                    }
                    
                    // Load advanced settings when that tab is selected
                    if (tabId === 'advancedOptions') {
                        loadAdvancedSettings();
                        // Ensure collapsible sections are properly initialized
                        setTimeout(() => {
                            initializeCollapsibleSections();
                        }, 100);
                    }
                } else {
                    console.warn(`Tab content for ${tabId} not found`);
                }
            }
        });
    }
}

/**
 * Populate template code preview with template data
 */
function populateTemplateCodePreview() {
    const templateCodePreview = document.getElementById('templateCodePreview');
    if (!templateCodePreview) {
        console.warn('Template code preview element not found');
        return;
    }
    
    try {
        // Make sure templates are defined
        if (typeof templates === 'undefined' || templates === null) {
            console.error('Templates object is not defined');
            templateCodePreview.textContent = '// Templates not available';
            return;
        }
        
        // Format templates nicely for display
        const templateJson = JSON.stringify(templates, null, 2);
        templateCodePreview.textContent = templateJson;
        console.log('Template code preview populated successfully');
    } catch (error) {
        console.error('Error populating template code preview:', error);
        templateCodePreview.textContent = '// Error loading template definitions';
    }
}
/**
 * Save Warm Hug parameters
 * Updates configuration with user-defined Warm Hug settings
 */
async function saveWarmHugParameters() {
    try {
        console.log('Saving Warm Hug parameters...');
        
        const incrementInput = document.getElementById('warmHugIncrement');
        const durationInput = document.getElementById('warmHugDuration');
        
        if (!incrementInput || !durationInput) {
            console.error('Warm Hug parameter inputs not found:',
                         'incrementInput:', !!incrementInput,
                         'durationInput:', !!durationInput);
            return;
        }
        
        // Validate inputs
        const increment = parseFloat(incrementInput.value);
        const duration = parseInt(durationInput.value);
        
        if (isNaN(increment) || increment < 0.5 || increment > 5) {
            console.error('Invalid increment value:', increment);
            logMessage('error', 'Increment must be between 0.5 and 5°C per minute');
            return;
        }
        
        if (isNaN(duration) || duration < 5 || duration > 30) {
            console.error('Invalid duration value:', duration);
            logMessage('error', 'Duration must be between 5 and 30 minutes');
            return;
        }
        
        // Get current config
        const pluginConfig = await homebridge.getPluginConfig();
        console.log('Retrieved plugin config for saving Warm Hug params:', pluginConfig);
        
        let config = findPlatformConfig(pluginConfig);
        
        if (!config) {
            console.error('Platform configuration not found');
            return;
        }
        
        console.log('Original config advanced section:', config.advanced);
        
        // Ensure advanced section exists
        if (!config.advanced) {
            config.advanced = {};
        }
        
        // Update Warm Hug parameters
        config.advanced.warmHugIncrement = increment;
        config.advanced.warmHugDuration = duration;
        
        console.log('Updated config advanced section:', config.advanced);
        
        // Update config in memory
        await homebridge.updatePluginConfig(pluginConfig);
        console.log('Updated plugin config in memory');
        
        // Save to disk
        await homebridge.savePluginConfig();
        console.log('Saved plugin config to disk');
        
        // Log success
        logMessage('success', 'Warm Hug parameters saved successfully');
    } catch (error) {
        console.error('Error saving Warm Hug parameters:', error);
        logMessage('error', `Error saving parameters: ${error.message}`);
    }
}
/**
 * Save device-specific settings
 * Updates configuration with user-defined device settings
 */
async function saveDeviceSettings() {
    try {
        const deviceModelSelect = document.getElementById('deviceModel');
        
        if (!deviceModelSelect) {
            console.error('Device model select not found');
            return;
        }
        
        // Get selected model
        const deviceModel = deviceModelSelect.value;
        
        // Get current config
        const pluginConfig = await homebridge.getPluginConfig();
        let config = findPlatformConfig(pluginConfig);
        
        if (!config) {
            console.error('Platform configuration not found');
            return;
        }
        
        // Ensure advanced section exists
        if (!config.advanced) {
            config.advanced = {};
        }
        
        // Update device model preference
        config.advanced.deviceModel = deviceModel;
        
        // Update config in memory
        await homebridge.updatePluginConfig(pluginConfig);
        
        // Log success
        logMessage('success', 'Device settings saved successfully');
    } catch (error) {
        console.error('Error saving device settings:', error);
        logMessage('error', `Error saving settings: ${error.message}`);
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
 */
async function loadAdvancedSettings() {
    try {
        console.log('Loading advanced settings from config...');
        
        // Get form elements
        const incrementInput = document.getElementById('warmHugIncrement');
        const durationInput = document.getElementById('warmHugDuration');
        const deviceModelSelect = document.getElementById('deviceModel');
        const logLevelSelect = document.getElementById('logLevel');
        
        if (!incrementInput || !durationInput) {
            console.warn('Warm Hug parameter inputs not found in DOM:',
                         'incrementInput:', !!incrementInput,
                         'durationInput:', !!durationInput);
        }
        
        if (!deviceModelSelect) {
            console.warn('Device model select not found in DOM');
        }
        
        // Get current config
        const pluginConfig = await homebridge.getPluginConfig();
        console.log('Retrieved plugin config for advanced settings:', pluginConfig);
        
        const config = findPlatformConfig(pluginConfig);
        
        if (!config) {
            console.warn('Platform configuration not found in plugin config');
            return;
        }
        
        console.log('Found platform config:', {
            hasAdvanced: !!config.advanced,
            advancedProps: config.advanced ? Object.keys(config.advanced) : 'none'
        });
        
        // Set log level if available
        if (logLevelSelect && config.logLevel) {
            logLevelSelect.value = config.logLevel;
            console.log('Set log level to:', config.logLevel);
        }
        
        // Set values if they exist in config.advanced
        if (config.advanced) {
            if (incrementInput && config.advanced.warmHugIncrement !== undefined) {
                incrementInput.value = config.advanced.warmHugIncrement;
                console.log('Set warm hug increment to:', config.advanced.warmHugIncrement);
            } else if (incrementInput) {
                // Default value if not in config
                incrementInput.value = "2";
                console.log('Using default warm hug increment: 2');
            }
            
            if (durationInput && config.advanced.warmHugDuration !== undefined) {
                durationInput.value = config.advanced.warmHugDuration;
                console.log('Set warm hug duration to:', config.advanced.warmHugDuration);
            } else if (durationInput) {
                // Default value if not in config
                durationInput.value = "15";
                console.log('Using default warm hug duration: 15');
            }
            
            if (deviceModelSelect && config.advanced.deviceModel) {
                deviceModelSelect.value = config.advanced.deviceModel;
                console.log('Set device model to:', config.advanced.deviceModel);
            }
        } else {
            console.log('No advanced settings found in config, using defaults');
            // Set default values if advanced section doesn't exist
            if (incrementInput) incrementInput.value = "2";
            if (durationInput) durationInput.value = "15";
        }
        
        console.log('Advanced settings loaded successfully');
    } catch (error) {
        console.error('Error loading advanced settings:', error);
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
        // New template-related elements
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
            
            // New template-related elements
            elements.templateCodePreview = safeGetElement('templateCodePreview');
            elements.copyTemplateCodeBtn = safeGetElement('copyTemplateCode');
            elements.copyConfigExampleBtn = safeGetElement('copyConfigExample');
            elements.weekdayTemplateSelect = safeGetElement('weekdayTemplate');
            elements.weekendTemplateSelect = safeGetElement('weekendTemplate');
            elements.weekdayTemplateDesc = safeGetElement('weekdayTemplateDesc');
            elements.weekendTemplateDesc = safeGetElement('weekendTemplateDesc');
            
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
          
          // Add to DOM if not already there
          if (!previewContainer.parentNode) {
              const targetElement = templateKey.includes('weekday') ? 
                  elements.weekdayTemplateDesc : elements.weekendTemplateDesc;
                  
              if (targetElement) {
                  targetElement.appendChild(previewContainer);
              }
          }
          
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
                    elements.templateCodePreview.textContent = JSON.stringify(templates, null, 2);
                }
                
                // Load advanced settings when that tab is selected
                if (tabId === 'advancedOptions') {
                    setTimeout(loadAdvancedSettings, 100);
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
initializeCollapsibleSections();

// Add save button handlers for advanced options
const saveWarmHugBtn = document.getElementById('saveWarmHugParams');
if (saveWarmHugBtn) {
    saveWarmHugBtn.addEventListener('click', saveWarmHugParameters);
}

const saveDeviceSettingsBtn = document.getElementById('saveDeviceSettings');
if (saveDeviceSettingsBtn) {
    saveDeviceSettingsBtn.addEventListener('click', saveDeviceSettings);
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