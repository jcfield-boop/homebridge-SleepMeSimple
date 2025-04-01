/**
 * Configuration handling for SleepMe Simple Homebridge Plugin UI
 * Refactored to use centralized NotificationManager
 */

window.loadConfig = async function() {
    try {
        // Check if homebridge object is available
        if (typeof homebridge === 'undefined') {
            NotificationManager.error(
                'Homebridge API not available', 
                'Configuration Load Failed'
            );
            return {};
        }
        
        const pluginConfig = await homebridge.getPluginConfig();
        
        // Find our platform configuration
        let config = {};
        if (Array.isArray(pluginConfig) && pluginConfig.length > 0) {
            const platformConfig = pluginConfig.find(cfg => 
                cfg && cfg.platform === 'SleepMeSimple');
            
            if (platformConfig) {
                config = platformConfig;
            }
        }
        
        // Fill in form fields with config values
        const apiTokenInput = document.getElementById('apiToken');
        const unitSelect = document.getElementById('unit');
        const pollingIntervalInput = document.getElementById('pollingInterval');
        const enableSchedulesCheckbox = document.getElementById('enableSchedules');
        const schedulesContainer = document.getElementById('schedulesContainer');
        
        if (apiTokenInput && config.apiToken) {
            apiTokenInput.value = config.apiToken;
        }
        
        if (unitSelect && config.unit) {
            unitSelect.value = config.unit;
        }
        
        if (pollingIntervalInput && config.pollingInterval) {
            pollingIntervalInput.value = config.pollingInterval;
        }
        
        // Handle schedules
        if (enableSchedulesCheckbox) {
            const enableSchedules = config.enableSchedules === true;
            enableSchedulesCheckbox.checked = enableSchedules;
            
            // Show/hide schedules container based on checkbox state
            if (schedulesContainer) {
                schedulesContainer.classList.toggle('hidden', !enableSchedules);
            }
            
            // Critical: Load schedules if available and enabled
            if (enableSchedules && Array.isArray(config.schedules)) {
                // Ensure window.schedules exists
                if (typeof window.schedules === 'undefined') {
                    window.schedules = [];
                }
                
                // Copy schedules to window.schedules for UI rendering
                window.schedules = config.schedules.map(schedule => ({
                    ...schedule,
                    unit: schedule.unit || (unitSelect ? unitSelect.value : 'C')
                }));
                
                // Initialize schedules if the function exists
                if (typeof window.initializeSchedules === 'function') {
                    window.initializeSchedules(window.schedules);
                } else if (typeof window.renderScheduleList === 'function') {
                    window.renderScheduleList();
                }
            }
        }
        
        NotificationManager.success(
            'Configuration loaded successfully', 
            'Configuration Management', 
            { autoHide: true }
        );
        
        return config;
    } catch (error) {
        NotificationManager.error(
            `Failed to load configuration: ${error.message}`, 
            'Configuration Load Error'
        );
        return {};
    }
};

window.saveConfig = async function() {
    try {
        // Get values from form
        const apiToken = document.getElementById('apiToken')?.value;
        const unit = document.getElementById('unit')?.value || 'C';
        const pollingInterval = parseInt(document.getElementById('pollingInterval')?.value || '90', 10);
        const enableSchedules = document.getElementById('enableSchedules')?.checked || false;
        
        // Validate required fields
        if (!apiToken) {
            NotificationManager.error(
                'API token is required', 
                'Configuration Validation'
            );
            return;
        }
        
        // Create updated config
        const config = {
            platform: 'SleepMeSimple',
            name: 'SleepMe Simple',
            apiToken,
            unit,
            pollingInterval,
            enableSchedules
        };
        
        // Add schedules if enabled
        if (enableSchedules && Array.isArray(window.schedules)) {
            config.schedules = window.schedules.map(schedule => ({
                type: String(schedule.type || 'Everyday'),
                time: String(schedule.time || '00:00'),
                temperature: Number(schedule.temperature || 21),
                day: schedule.day !== undefined ? Number(schedule.day) : undefined,
                description: schedule.description ? String(schedule.description) : undefined,
                unit: String(schedule.unit || unit)
            }));
        } else {
            config.schedules = [];
        }
        
        // Find current config position or create new entry
        const pluginConfig = await homebridge.getPluginConfig();
        const existingConfigIndex = Array.isArray(pluginConfig) ? 
            pluginConfig.findIndex(cfg => cfg && cfg.platform === 'SleepMeSimple') : -1;
        
        let updatedConfig;
        if (existingConfigIndex >= 0) {
            // Replace existing config
            updatedConfig = [...pluginConfig];
            updatedConfig[existingConfigIndex] = config;
        } else {
            // Add new config
            updatedConfig = Array.isArray(pluginConfig) ? [...pluginConfig, config] : [config];
        }
        
        // Update and save config
        await homebridge.updatePluginConfig(updatedConfig);
        await homebridge.savePluginConfig();
        
        // Verify save was successful
        const verifyConfig = await homebridge.getPluginConfig();
        const verifyPlatform = verifyConfig.find(c => c && c.platform === 'SleepMeSimple');
        
        if (verifyPlatform && verifyPlatform.enableSchedules && 
            Array.isArray(verifyPlatform.schedules)) {
            NotificationManager.success(
                `Configuration saved successfully. ${verifyPlatform.schedules.length} schedules saved.`, 
                'Configuration Management',
                { autoHide: true }
            );
        } else {
            NotificationManager.warning(
                'Configuration saved, but no schedules found.', 
                'Configuration Save'
            );
        }
    } catch (error) {
        NotificationManager.error(
            `Error saving config: ${error.message}`, 
            'Configuration Save Failed'
        );
    }
};