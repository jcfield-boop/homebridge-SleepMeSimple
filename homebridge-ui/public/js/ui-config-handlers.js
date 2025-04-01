/**
 * Load configuration from Homebridge
 * Enhanced with robust error handling and comprehensive diagnostics
 * @returns {Promise<Object>} The loaded plugin configuration
 */
window.loadConfig = async function() {
    try {
        console.log('Starting configuration loading process...');
        
        // STEP 1: Check if Homebridge API is available and wait if needed
        if (typeof homebridge === 'undefined' || typeof homebridge.getPluginConfig !== 'function') {
            console.warn('Homebridge API not fully available yet, waiting...');
            
            // Wait for up to 3 seconds for API to initialize
            for (let i = 0; i < 30; i++) {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (homebridge && typeof homebridge.getPluginConfig === 'function') {
                    console.log('Homebridge API now available after waiting');
                    break;
                }
            }
            
            // Final check after waiting
            if (typeof homebridge === 'undefined' || typeof homebridge.getPluginConfig !== 'function') {
                // Use NotificationManager to show error to user
                NotificationManager.error(
                    'Homebridge API not available. Please reload the page.', 
                    'Configuration Error'
                );
                return {};
            }
        }
        
        // STEP 2: Load configuration with timeout protection
        console.log('Requesting plugin configuration from Homebridge API...');
        let pluginConfig;
        
        try {
            // Use timeout promise to prevent hanging if getPluginConfig never resolves
            const configPromise = homebridge.getPluginConfig();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Configuration loading timed out after 5 seconds')), 5000);
            });
            
            // Race between actual config loading and timeout
            pluginConfig = await Promise.race([configPromise, timeoutPromise]);
            console.log('Raw configuration received:', pluginConfig);
        } catch (loadError) {
            console.error('Error loading configuration:', loadError);
            NotificationManager.error(
                `Failed to load configuration: ${loadError.message}`, 
                'Configuration Load Error'
            );
            
            // Try to get diagnostic information from server
            try {
                const diagnostics = await homebridge.request('/config/check', {});
                console.log('Configuration diagnostics:', diagnostics);
                
                if (!diagnostics.success) {
                    NotificationManager.error(
                        `Config file issue: ${diagnostics.error || 'Unknown error'}`,
                        'Configuration Access Problem'
                    );
                }
            } catch (diagError) {
                console.error('Failed to get config diagnostics:', diagError);
            }
            
            return {};
        }
        
        // STEP 3: Validate configuration structure
        if (!Array.isArray(pluginConfig)) {
            console.error('Invalid configuration format received - not an array:', typeof pluginConfig);
            NotificationManager.error(
                'Invalid configuration format received from Homebridge', 
                'Configuration Format Error'
            );
            return {};
        }
        
        // STEP 4: Find our platform configuration with comprehensive search
        // First look for exact match
        let config = pluginConfig.find(cfg => cfg && cfg.platform === 'SleepMeSimple');
        
        // If not found, try alternative names
        if (!config) {
            const platformNames = ['SleepMeSimple', 'sleepmebasic', 'sleepme', 'sleepme-simple'];
            config = pluginConfig.find(cfg => 
                cfg && cfg.platform && platformNames.some(name => 
                    cfg.platform.toLowerCase() === name.toLowerCase())
            );
            
            if (config && config.platform !== 'SleepMeSimple') {
                console.warn(`Found platform with alternate name: ${config.platform}`);
            }
        }
        
        // If still not found, log information for troubleshooting
        if (!config) {
            console.warn('SleepMeSimple platform not found in config.json.');
            const availablePlatforms = pluginConfig
                .filter(cfg => cfg && cfg.platform)
                .map(cfg => cfg.platform);
                
            console.log('Available platforms:', availablePlatforms.join(', ') || 'none');
            
            // Show warning to user
            NotificationManager.warning(
                'SleepMeSimple platform not found in your Homebridge configuration',
                'Platform Missing'
            );
            
            // Return empty object as fallback
            return {};
        }
        
        // STEP 5: Log successful configuration load
        console.log('Successfully found platform configuration:', config);
        
        // STEP 6: Populate UI form with loaded configuration
        // This is the critical step where values are displayed in the UI
        try {
            populateFormWithConfig(config);
        } catch (populateError) {
            console.error('Error populating form with config:', populateError);
            // Continue despite population error - partial config is better than none
        }
        
        // STEP 7: Notify user of success and return config
        NotificationManager.success(
            'Configuration loaded successfully', 
            'Configuration Management', 
            { autoHide: true }
        );
        
        return config;
    } catch (error) {
        // Global error handler for unexpected errors
        console.error('Unexpected error loading configuration:', error);
        NotificationManager.error(
            `Configuration loading failed: ${error.message}`, 
            'System Error'
        );
        return {};
    }
};

/**
 * Helper function to populate form fields with configuration values
 * Enhanced with comprehensive error handling for each field
 * @param {Object} config - The platform configuration object
 */
function populateFormWithConfig(config) {
    console.log('Populating form fields with configuration...');
    
    try {
        // Get form elements with null checks
        const apiTokenInput = document.getElementById('apiToken');
        const unitSelect = document.getElementById('unit');
        const pollingIntervalInput = document.getElementById('pollingInterval');
        const logLevelSelect = document.getElementById('logLevel');
        const enableSchedulesCheckbox = document.getElementById('enableSchedules');
        const schedulesContainer = document.getElementById('schedulesContainer');
        
        // Set API token if available
        if (apiTokenInput && config.apiToken) {
            console.log('Setting API token field');
            apiTokenInput.value = config.apiToken;
        } else if (!apiTokenInput) {
            console.warn('API token input element not found');
        }
        
        // Set unit if available
        if (unitSelect && config.unit) {
            console.log(`Setting temperature unit: ${config.unit}`);
            unitSelect.value = config.unit;
        } else if (!unitSelect) {
            console.warn('Unit select element not found');
        } else if (!config.unit) {
            console.log('No unit in config, using default (C)');
            unitSelect.value = 'C';
        }
        
        // Set polling interval if available
        if (pollingIntervalInput && config.pollingInterval) {
            console.log(`Setting polling interval: ${config.pollingInterval}`);
            pollingIntervalInput.value = config.pollingInterval;
        } else if (!pollingIntervalInput) {
            console.warn('Polling interval input element not found');
        } else if (!config.pollingInterval) {
            console.log('No polling interval in config, using default (90)');
            pollingIntervalInput.value = '90';
        }
        
        // Set log level if available
        if (logLevelSelect && config.logLevel) {
            console.log(`Setting log level: ${config.logLevel}`);
            logLevelSelect.value = config.logLevel;
        } else if (!logLevelSelect) {
            console.warn('Log level select element not found');
        } else if (!config.logLevel) {
            console.log('No log level in config, using default (normal)');
            logLevelSelect.value = 'normal';
        }
        
        // Handle schedules configuration
        if (enableSchedulesCheckbox) {
            const enableSchedules = config.enableSchedules === true;
            console.log(`Setting enable schedules: ${enableSchedules}`);
            enableSchedulesCheckbox.checked = enableSchedules;
            
            // Show/hide schedules container based on checkbox state
            if (schedulesContainer) {
                schedulesContainer.classList.toggle('hidden', !enableSchedules);
            } else {
                console.warn('Schedules container element not found');
            }
            
            // Load schedules if available and enabled
            if (enableSchedules && Array.isArray(config.schedules)) {
                console.log(`Loading ${config.schedules.length} schedules from configuration`);
                
                // Ensure window.schedules exists
                if (typeof window.schedules === 'undefined') {
                    window.schedules = [];
                }
                
                // Deep copy schedules to prevent reference issues
                window.schedules = JSON.parse(JSON.stringify(config.schedules));
                
                // Ensure each schedule has unit information
                window.schedules = window.schedules.map(schedule => ({
                    ...schedule,
                    unit: schedule.unit || (unitSelect ? unitSelect.value : 'C')
                }));
                
                console.log('Schedules loaded and processed:', window.schedules);
                
                // Initialize schedule display based on available functions
                if (typeof window.initializeSchedules === 'function') {
                    console.log('Calling initializeSchedules function');
                    window.initializeSchedules(window.schedules);
                } else if (typeof window.renderScheduleList === 'function') {
                    console.log('Calling renderScheduleList function');
                    window.renderScheduleList();
                } else {
                    console.warn('No schedule initialization function available');
                }
            } else if (enableSchedules) {
                console.log('Schedules enabled but no schedules found in configuration');
                window.schedules = [];
            }
        } else {
            console.warn('Enable schedules checkbox element not found');
        }
        
        console.log('Form population complete');
    } catch (error) {
        // Catch and log any errors during form population
        console.error('Error during form population:', error);
        NotificationManager.error(
            `Error populating form: ${error.message}`, 
            'UI Error'
        );
        // Don't rethrow - allow partial population
    }
}

/**
 * Save configuration to Homebridge
 * Enhanced with comprehensive validation and error handling
 * @returns {Promise<void>}
 */
window.saveConfig = async function() {
    try {
        console.log('Starting configuration save process...');
        NotificationManager.info('Saving configuration...', 'Please Wait');
        
        // STEP 1: Check if Homebridge API is available
        if (typeof homebridge === 'undefined' || 
            typeof homebridge.getPluginConfig !== 'function' ||
            typeof homebridge.updatePluginConfig !== 'function' ||
            typeof homebridge.savePluginConfig !== 'function') {
            
            console.error('Homebridge API not available for saving configuration');
            NotificationManager.error(
                'Homebridge API not available. Please reload the page.', 
                'Save Error'
            );
            return;
        }
        
        // STEP 2: Get values from form with validation
        console.log('Collecting form values...');
        
        // Get and validate API token
        const apiToken = document.getElementById('apiToken')?.value;
        if (!apiToken) {
            console.error('API token is required');
            NotificationManager.error(
                'API token is required', 
                'Validation Error'
            );
            return;
        }
        
        // Get other form values with defaults
        const unit = document.getElementById('unit')?.value || 'C';
        const pollingInterval = parseInt(document.getElementById('pollingInterval')?.value || '90', 10);
        const logLevel = document.getElementById('logLevel')?.value || 'normal';
        const enableSchedules = document.getElementById('enableSchedules')?.checked || false;
        
        // Validate polling interval
        if (isNaN(pollingInterval) || pollingInterval < 60 || pollingInterval > 300) {
            console.error('Invalid polling interval:', pollingInterval);
            NotificationManager.error(
                'Polling interval must be between 60 and 300 seconds', 
                'Validation Error'
            );
            return;
        }
        
        // STEP 3: Create updated configuration object
        console.log('Creating configuration object...');
        const config = {
            platform: 'SleepMeSimple',
            name: 'SleepMe Simple',
            apiToken,
            unit,
            pollingInterval,
            logLevel,
            enableSchedules
        };
        
        // STEP 4: Add schedules if enabled
        if (enableSchedules && Array.isArray(window.schedules)) {
            console.log(`Adding ${window.schedules.length} schedules to configuration`);
            
            // Process schedules to ensure they have the correct structure
            config.schedules = window.schedules.map(schedule => ({
                type: String(schedule.type || 'Everyday'),
                time: String(schedule.time || '00:00'),
                temperature: Number(schedule.temperature || 21),
                day: schedule.day !== undefined ? Number(schedule.day) : undefined,
                description: schedule.description ? String(schedule.description) : undefined,
                unit: String(schedule.unit || unit)
            }));
        } else {
            console.log('No schedules to add or schedules disabled');
            config.schedules = [];
        }
        
        // STEP 5: Get current config to find the right position to update
        console.log('Retrieving current plugin configuration...');
        const pluginConfig = await homebridge.getPluginConfig();
        
        if (!Array.isArray(pluginConfig)) {
            console.error('Invalid plugin configuration format:', pluginConfig);
            NotificationManager.error(
                'Invalid plugin configuration format received from Homebridge', 
                'Save Error'
            );
            return;
        }
        
        // STEP 6: Find existing config position or prepare to add new entry
        const existingConfigIndex = pluginConfig.findIndex(cfg => 
            cfg && cfg.platform === 'SleepMeSimple');
        
        let updatedConfig;
        
        if (existingConfigIndex >= 0) {
            console.log(`Updating existing configuration at index ${existingConfigIndex}`);
            updatedConfig = [...pluginConfig];
            updatedConfig[existingConfigIndex] = config;
        } else {
            console.log('Adding new configuration entry');
            updatedConfig = [...pluginConfig, config];
        }
        
        // STEP 7: Update configuration in memory
        console.log('Updating plugin configuration in memory...');
        await homebridge.updatePluginConfig(updatedConfig);
        
        // STEP 8: Save configuration to disk
        console.log('Saving configuration to disk...');
        await homebridge.savePluginConfig();
        
        // STEP 9: Verify save was successful
        console.log('Verifying configuration was saved correctly...');
        const verifyConfig = await homebridge.getPluginConfig();
        const verifyPlatform = verifyConfig.find(c => c && c.platform === 'SleepMeSimple');
        
        if (!verifyPlatform) {
            console.error('Configuration verification failed - platform not found after save');
            NotificationManager.warning(
                'Configuration saved, but verification failed. Please check your config.json.',
                'Configuration Warning'
            );
            return;
        }
        
        // Check schedules were saved correctly
        if (verifyPlatform.enableSchedules && Array.isArray(verifyPlatform.schedules)) {
            console.log(`Verification confirmed ${verifyPlatform.schedules.length} schedules saved`);
            NotificationManager.success(
                `Configuration saved successfully with ${verifyPlatform.schedules.length} schedules.`, 
                'Configuration Saved',
                { autoHide: true }
            );
        } else if (verifyPlatform.enableSchedules) {
            console.warn('Schedules were enabled but not found in saved configuration');
            NotificationManager.warning(
                'Configuration saved, but schedules may not have been saved correctly.',
                'Configuration Warning'
            );
        } else {
            console.log('Configuration saved successfully (schedules disabled)');
            NotificationManager.success(
                'Configuration saved successfully.', 
                'Configuration Saved',
                { autoHide: true }
            );
        }
    } catch (error) {
        // Global error handler
        console.error('Error saving configuration:', error);
        NotificationManager.error(
            `Error saving configuration: ${error.message}`, 
            'Save Failed'
        );
    }
};