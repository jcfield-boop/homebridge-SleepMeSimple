/**
 * This is the server-side component of the SleepMe Simple plugin UI.
 * It provides API endpoints for the UI to interact with Homebridge.
 */
const { HomebridgePluginUiServer } = require('@homebridge/plugin-ui-utils');

// Create a new instance of the plugin UI server
const homebridge = new HomebridgePluginUiServer();

// Sleep schedule templates
const sleepTemplates = {
    weekday: {
        "optimal": {
            name: "Optimal Sleep Cycle",
            description: "Designed for complete sleep cycles with REM enhancement",
            schedules: [
                { type: "Weekdays", time: "22:00", temperature: 21, name: "Cool Down" },
                { type: "Weekdays", time: "23:00", temperature: 19, name: "Deep Sleep" },
                { type: "Weekdays", time: "02:00", temperature: 23, name: "REM Support" },
                { type: "Weekdays", time: "06:00", temperature: 24, name: "Warm Hug" }
            ]
        },
        "nightowl": {
            name: "Night Owl",
            description: "Later bedtime with extended morning warm-up",
            schedules: [
                { type: "Weekdays", time: "23:30", temperature: 21, name: "Cool Down" },
                { type: "Weekdays", time: "00:30", temperature: 19, name: "Deep Sleep" },
                { type: "Weekdays", time: "03:30", temperature: 23, name: "REM Support" },
                { type: "Weekdays", time: "07:30", temperature: 24, name: "Warm Hug" }
            ]
        },
        "earlybird": {
            name: "Early Bird",
            description: "Earlier bedtime and wake-up schedule",
            schedules: [
                { type: "Weekdays", time: "21:00", temperature: 21, name: "Cool Down" },
                { type: "Weekdays", time: "22:00", temperature: 19, name: "Deep Sleep" },
                { type: "Weekdays", time: "01:00", temperature: 23, name: "REM Support" },
                { type: "Weekdays", time: "05:00", temperature: 24, name: "Warm Hug" }
            ]
        }
    },
    weekend: {
        "weekend-optimal": {
            name: "Weekend Recovery",
            description: "Extra sleep with later wake-up time",
            schedules: [
                { type: "Weekend", time: "23:00", temperature: 21, name: "Cool Down" },
                { type: "Weekend", time: "00:00", temperature: 19, name: "Deep Sleep" },
                { type: "Weekend", time: "03:00", temperature: 23, name: "REM Support" },
                { type: "Weekend", time: "08:00", temperature: 24, name: "Warm Hug" }
            ]
        },
        "weekend-relax": {
            name: "Relaxed Weekend",
            description: "Gradual transitions for weekend leisure",
            schedules: [
                { type: "Weekend", time: "23:30", temperature: 22, name: "Cool Down" },
                { type: "Weekend", time: "01:00", temperature: 20, name: "Deep Sleep" },
                { type: "Weekend", time: "04:00", temperature: 24, name: "REM Support" },
                { type: "Weekend", time: "09:00", temperature: 26, name: "Warm Hug" }
            ]
        }
    }
};

// Store selected templates
let selectedTemplates = {
    weekday: "optimal",
    weekend: "weekend-optimal"
};

// API endpoint to get template data
homebridge.registerCustomEndpoint('/api/templates', async (_, response) => {
    // Return the template definitions
    response.json({ 
        templates: sleepTemplates,
        selected: selectedTemplates
    });
});

// API endpoint to get current config
homebridge.registerCustomEndpoint('/api/config', async (_, response) => {
    try {
        // Get the current config
        const pluginConfig = await homebridge.getPluginConfig();
        
        // If config exists, send it
        if (pluginConfig && pluginConfig.length > 0) {
            response.json({
                success: true,
                config: pluginConfig[0]
            });
        } else {
            // No config yet, send default
            response.json({
                success: true,
                config: {
                    platform: "SleepMeSimple",
                    name: "SleepMe Simple",
                    unit: "C",
                    pollingInterval: 90,
                    logLevel: "normal",
                    enableSchedules: false,
                    advanced: {
                        warmHugIncrement: 2,
                        warmHugDuration: 10
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error retrieving config:', error);
        response.json({
            success: false,
            error: 'Failed to retrieve configuration'
        });
    }
});

// API endpoint to save config
homebridge.registerCustomEndpoint('/api/saveConfig', async (request, response) => {
    try {
        const config = request.body;
        
        // Validate required fields
        if (!config || !config.platform) {
            response.json({
                success: false,
                error: 'Invalid configuration data'
            });
            return;
        }
        
        // Save the config
        await homebridge.updatePluginConfig([config]);
        
        // Send success response
        response.json({
            success: true
        });
    } catch (error) {
        console.error('Error saving config:', error);
        response.json({
            success: false,
            error: 'Failed to save configuration'
        });
    }
});

// API endpoint to save template selection
homebridge.registerCustomEndpoint('/api/saveTemplates', async (request, response) => {
    try {
        const { weekday, weekend } = request.body;
        
        // Update selected templates
        selectedTemplates.weekday = weekday || "optimal";
        selectedTemplates.weekend = weekend || "weekend-optimal";
        
        // Get current config
        const pluginConfig = await homebridge.getPluginConfig();
        
        if (pluginConfig && pluginConfig.length > 0) {
            const config = pluginConfig[0];
            
            // Generate schedules from selected templates
            const schedules = [];
            
            // Add weekday schedules
            const weekdayTemplate = sleepTemplates.weekday[selectedTemplates.weekday];
            if (weekdayTemplate) {
                schedules.push(...weekdayTemplate.schedules);
            }
            
            // Add weekend schedules
            const weekendTemplate = sleepTemplates.weekend[selectedTemplates.weekend];
            if (weekendTemplate) {
                schedules.push(...weekendTemplate.schedules);
            }
            
            // Update config with schedules
            config.enableSchedules = true;
            config.schedules = schedules;
            
            // Save updated config
            await homebridge.updatePluginConfig([config]);
            
            // Send success response
            response.json({
                success: true
            });
        } else {
            response.json({
                success: false,
                error: 'No configuration found'
            });
        }
    } catch (error) {
        console.error('Error saving templates:', error);
        response.json({
            success: false,
            error: 'Failed to save templates'
        });
    }
});

// Start the server
(async () => {
    await homebridge.startServer();
})();