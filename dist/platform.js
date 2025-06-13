import { SleepMeApi } from './api/sleepme-api.js';
import { SleepMeAccessory } from './accessory.js';
import { PLATFORM_NAME, PLUGIN_NAME, DEFAULT_POLLING_INTERVAL, LogLevel, InterfaceMode, DEFAULT_INTERFACE_MODE } from './settings.js';
import { ScheduleManager } from './schedule.js';
import { PollingManager } from './polling-manager.js';
/**
 * SleepMe Simple Platform
 * This class is the entry point for the plugin and manages the plugin lifecycle
 */
export class SleepMeSimplePlatform {
    config;
    homebridgeApi;
    // References to Homebridge services and characteristics for accessory creation
    Service;
    Characteristic;
    // Array to store cached accessories from Homebridge
    accessories = [];
    // API client for communicating with SleepMe services
    api;
    // Custom logger for simplified logging
    log;
    /**
     * Configuration options parsed from config.json
     */
    logLevel;
    pollingInterval;
    temperatureUnit = 'C';
    disableAutoDiscovery;
    // Map to track active accessory instances for proper cleanup
    accessoryInstances = new Map();
    // Timer for periodic device discovery
    discoveryTimer;
    // Flag to indicate if discovery is in progress
    discoveryInProgress = false;
    // Flag to track if the plugin is properly configured
    isConfigured = true;
    // Schedule manager for handling temperature schedules
    _scheduleManager;
    // Centralized polling manager to optimize API usage
    _pollingManager;
    /**
     * Constructor for the SleepMe platform.
     * Initializes the platform with configuration from Homebridge
     *
     * @param logger - Homebridge logger instance
     * @param config - Configuration from config.json
     * @param homebridgeApi - Reference to the Homebridge API
     */
    constructor(logger, config, homebridgeApi) {
        this.config = config;
        this.homebridgeApi = homebridgeApi;
        // Store references to Homebridge services and characteristics
        this.Service = this.homebridgeApi.hap.Service;
        this.Characteristic = this.homebridgeApi.hap.Characteristic;
        // Parse configuration options with defaults and validation
        this.temperatureUnit = config.unit || 'C';
        // Set polling interval with minimum and maximum bounds for safety
        // Ensure a reasonable minimum polling interval to avoid rate limiting
        this.pollingInterval = Math.max(60, Math.min(300, parseInt(String(config.pollingInterval)) || DEFAULT_POLLING_INTERVAL));
        // Parse logging level from config
        let configLogLevel = config.logLevel || LogLevel.NORMAL;
        if (!Object.values(LogLevel).includes(configLogLevel)) {
            configLogLevel = LogLevel.NORMAL;
        }
        this.logLevel = configLogLevel;
        // Parse auto-discovery setting
        this.disableAutoDiscovery = config.disableAutoDiscovery === true;
        // Parse interface configuration with defaults
        if (config.interfaceMode && Object.values(InterfaceMode).includes(config.interfaceMode)) {
            this.config.interfaceMode = config.interfaceMode;
        }
        else {
            this.config.interfaceMode = DEFAULT_INTERFACE_MODE;
        }
        this.config.showIndividualSchedules = config.showIndividualSchedules !== false; // Default true
        this.config.enableWarmHug = config.enableWarmHug !== false; // Default true
        // Create custom logger
        this.log = this.createLogger(logger);
        if (this.disableAutoDiscovery) {
            this.log.info('Automatic device re-discovery is disabled');
        }
        // Log interface configuration
        this.log.info(`Using ${this.config.interfaceMode} interface mode`);
        if (this.config.enableSchedules) {
            this.log.info(`Schedules enabled: individual switches=${this.config.showIndividualSchedules}, warm hug=${this.config.enableWarmHug}`);
        }
        // Validate that the API token is present in the configuration
        if (!config.apiToken) {
            this.isConfigured = false;
            this.log.error('API token missing from configuration! The plugin will not work.');
            this.log.info('Please add your SleepMe API token to the configuration in the Homebridge UI.');
            this.log.info('You can get your token from your SleepMe account at sleep.me');
            // Don't throw an error - let the plugin load in a disabled state
        }
        else {
            // Initialize the SleepMe API client with the provided token
            this.api = new SleepMeApi(config.apiToken, this.log);
            // Log platform initialization information
            this.log.info(`Initializing ${PLATFORM_NAME} platform with ${this.temperatureUnit === 'C' ? 'Celsius' : 'Fahrenheit'} ` +
                `units and ${this.pollingInterval}s polling interval`);
            // Initialize the warm hug config upfront
            const warmHugConfig = {
                increment: config.advanced?.warmHugIncrement || 2,
                duration: config.advanced?.warmHugDuration || 10
            };
            // Initialize schedule manager if enabled
            if (config.enableSchedules && this.api) {
                // Create the schedule manager but don't set schedules yet
                // We'll do that after device discovery
                this._scheduleManager = new ScheduleManager(this.log, this.api, warmHugConfig);
                // ScheduleManager constructor handles logging
            }
            // Initialize centralized polling manager
            this._pollingManager = new PollingManager(this.api, this.log, this.pollingInterval * 1000);
            this.log.info('Centralized Polling Manager initialized');
        }
        // Register for Homebridge events
        // When this event is fired, homebridge has restored all cached accessories
        this.homebridgeApi.on('didFinishLaunching', () => {
            // Only attempt to discover devices if the plugin is properly configured
            if (this.isConfigured) {
                // Delay device discovery to prevent immediate API calls on startup
                setTimeout(async () => {
                    this.log.info('Homebridge finished launching, starting device discovery');
                    // Wait for device discovery to complete
                    await this.discoverDevices();
                    // Set up schedules AFTER devices are discovered
                    if (config.enableSchedules && this.api && this._scheduleManager) {
                        // Extract device IDs from discovered accessories
                        const deviceIds = [];
                        this.accessories.forEach(accessory => {
                            const deviceId = accessory.context.device?.id;
                            if (deviceId) {
                                deviceIds.push(deviceId);
                            }
                        });
                        if (deviceIds.length > 0) {
                            this.log.info(`Applying schedules to ${deviceIds.length} discovered devices`);
                            // Add schedules to each device if configured
                            if (Array.isArray(config.schedules) && config.schedules.length > 0) {
                                for (const deviceId of deviceIds) {
                                    const schedules = config.schedules.map((scheduleConfig) => ({
                                        type: ScheduleManager.scheduleTypeFromString(scheduleConfig.type),
                                        day: scheduleConfig.type === 'Specific Day' ?
                                            ScheduleManager.dayNameToDayOfWeek(scheduleConfig.day) : undefined,
                                        time: scheduleConfig.time,
                                        temperature: scheduleConfig.temperature,
                                        description: scheduleConfig.description
                                    }));
                                    this._scheduleManager.setSchedules(deviceId, schedules);
                                    this.log.info(`Applied ${schedules.length} schedules to device ${deviceId}`);
                                }
                            }
                            else {
                                this.log.warn('No schedules defined in configuration');
                            }
                        }
                        else {
                            this.log.warn('No devices found to apply schedules to');
                        }
                    }
                }, 30000); // 30 second delay before starting discovery
                // Set up periodic discovery to catch new or changed devices
                if (!this.disableAutoDiscovery) {
                    // Check once per day is sufficient
                    this.discoveryTimer = setInterval(() => {
                        // Only start discovery if not already in progress
                        if (!this.discoveryInProgress) {
                            this.discoverDevices();
                        }
                    }, 24 * 60 * 60 * 1000); // Check once per day
                    this.log.info('Automatic device re-discovery enabled (24-hour interval)');
                }
                else {
                    this.log.info('Automatic device re-discovery is disabled by configuration');
                }
            }
        });
        // Handle Homebridge shutdown event for proper cleanup
        this.homebridgeApi.on('shutdown', () => {
            this.log.info('Shutting down platform');
            // Clear discovery timer
            if (this.discoveryTimer) {
                clearInterval(this.discoveryTimer);
            }
            // Clean up schedule manager
            if (this._scheduleManager) {
                this._scheduleManager.cleanup();
            }
            // Clean up polling manager
            if (this._pollingManager) {
                this._pollingManager.cleanup();
            }
            // Clean up accessory resources
            this.accessoryInstances.forEach(accessory => {
                accessory.cleanup();
            });
        });
    }
    /**
     * Get the schedule manager
     * @returns Schedule manager instance if available
     */
    get scheduleManager() {
        return this._scheduleManager;
    }
    /**
     * Get the polling manager
     * @returns Polling manager instance if available
     */
    get pollingManager() {
        return this._pollingManager;
    }
    /**
     * Create a custom logger adapter
     * @param logger Homebridge logger
     * @returns Custom logger
     */
    createLogger(logger) {
        return {
            info: (message) => logger.info(`[SleepMe Simple] ${message}`),
            warn: (message) => logger.warn(`[SleepMe Simple] ${message}`),
            error: (message) => logger.error(`[SleepMe Simple] ${message}`),
            debug: (message) => {
                if (this.logLevel === LogLevel.DEBUG || this.logLevel === LogLevel.VERBOSE) {
                    // Use info level when verbose is enabled to ensure visibility
                    if (this.logLevel === LogLevel.VERBOSE) {
                        logger.info(`[SleepMe Simple] [DEBUG] ${message}`);
                    }
                    else {
                        logger.debug(`[SleepMe Simple] ${message}`);
                    }
                }
            },
            verbose: (message) => {
                if (this.logLevel === LogLevel.VERBOSE) {
                    // Use info level for verbose messages to ensure they're visible
                    logger.info(`[SleepMe Simple] [VERBOSE] ${message}`);
                }
            },
            isVerbose: () => this.logLevel === LogLevel.VERBOSE,
            isDebug: () => this.logLevel === LogLevel.DEBUG || this.logLevel === LogLevel.VERBOSE
        };
    }
    /**
     * Called by Homebridge when cached accessories are restored at startup
     * This allows us to reconfigure accessories that were cached by Homebridge
     *
     * @param accessory - The cached accessory to configure
     */
    configureAccessory(accessory) {
        this.log.info(`Loading accessory from cache: ${accessory.displayName}`);
        // Validate that the device context is intact
        if (!accessory.context.device || !accessory.context.device.id) {
            this.log.warn(`Cached accessory ${accessory.displayName} missing device ID, will rediscover`);
        }
        else {
            this.log.debug(`Cached accessory device ID: ${accessory.context.device.id}`);
        }
        // Store the accessory in our array for later use
        this.accessories.push(accessory);
    }
    /**
     * Discover SleepMe devices and create HomeKit accessories
     * Uses staggered initialization to prevent API rate limiting
     * Modified to return a Promise for async operation
     * @returns Promise that resolves when discovery is complete
     */
    async discoverDevices() {
        // Skip discovery if already in progress
        if (this.discoveryInProgress) {
            this.log.info('Device discovery already in progress, skipping');
            return;
        }
        // Skip discovery if the plugin is not properly configured
        if (!this.isConfigured || !this.api) {
            this.log.warn('Skipping device discovery because the plugin is not properly configured');
            return;
        }
        this.discoveryInProgress = true;
        this.log.info('Starting device discovery...');
        try {
            // Check if devices are configured directly in config.json
            let devices = [];
            const configuredDevices = this.config.devices || [];
            if (configuredDevices && configuredDevices.length > 0) {
                // Use the devices from config instead of making an API call
                this.log.info(`Using ${configuredDevices.length} devices from configuration`);
                // Map config devices to the format expected by the rest of the code
                devices = configuredDevices.map(device => ({
                    id: device.id,
                    name: device.name || `SleepMe Device (${device.id})`,
                    attachments: [] // Add required fields with default values
                }));
            }
            else {
                // Fetch devices from the API if none configured manually
                this.log.info('No devices in configuration, fetching from API...');
                devices = await this.api.getDevices();
                if (!devices || devices.length === 0) {
                    this.log.error('No SleepMe devices found. Check your API token and connectivity.');
                    this.discoveryInProgress = false;
                    return;
                }
            }
            this.log.info(`Devices to initialize: ${devices.length}`);
            // Track which accessories are still active to support removal of stale accessories
            const activeDeviceIds = new Set();
            // Process each device with staggered initialization to prevent API rate limiting
            for (let i = 0; i < devices.length; i++) {
                const device = devices[i];
                // Add significant delay between devices (45 seconds)
                if (i > 0) {
                    this.log.info(`Waiting 45s before initializing next device...`);
                    await new Promise(resolve => setTimeout(resolve, 45000));
                }
                // Skip devices with missing IDs
                if (!device.id) {
                    this.log.warn(`Skipping device with missing ID: ${JSON.stringify(device)}`);
                    continue;
                }
                // Mark this device ID as active
                activeDeviceIds.add(device.id);
                // Use device name from API or config
                const displayName = device.name || `SleepMe Device (${device.id})`;
                // Generate a unique identifier for this device in HomeKit
                const uuid = this.homebridgeApi.hap.uuid.generate(device.id);
                // Check if we already have an accessory for this device
                const existingAccessory = this.accessories.find(acc => acc.UUID === uuid);
                if (existingAccessory) {
                    // Check if we need to recreate accessory due to firmware version display issues
                    const hasCachedFirmware = existingAccessory.context.firmwareVersion &&
                        existingAccessory.context.firmwareVersion !== 'Unknown';
                    const needsRecreation = hasCachedFirmware && !existingAccessory.context.firmwareVersionFixed;
                    if (needsRecreation) {
                        this.log.info(`Recreating accessory to fix firmware version display: ${existingAccessory.displayName} (firmware: ${existingAccessory.context.firmwareVersion})`);
                        // Remove the old accessory
                        this.homebridgeApi.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
                        const index = this.accessories.indexOf(existingAccessory);
                        if (index !== -1) {
                            this.accessories.splice(index, 1);
                        }
                        // Create new accessory with firmware fix flag
                        const newAccessory = new this.homebridgeApi.platformAccessory(displayName, uuid);
                        newAccessory.category = 9 /* this.homebridgeApi.hap.Categories.THERMOSTAT */;
                        newAccessory.context.device = device;
                        newAccessory.context.firmwareVersion = existingAccessory.context.firmwareVersion;
                        newAccessory.context.firmwareVersionFixed = true; // Mark as fixed to prevent recreation loop
                        // Register and initialize the new accessory
                        this.homebridgeApi.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [newAccessory]);
                        this.accessories.push(newAccessory);
                        this.initializeAccessory(newAccessory, device.id);
                        this.log.info(`Accessory recreated successfully with firmware version: ${newAccessory.context.firmwareVersion}`);
                    }
                    else {
                        // The accessory already exists, just update its context
                        this.log.info(`Restoring accessory from cache: ${existingAccessory.displayName} (ID: ${device.id})`);
                        // Update context and display name if needed
                        existingAccessory.context.device = device;
                        if (existingAccessory.displayName !== displayName) {
                            existingAccessory.displayName = displayName;
                            this.log.debug(`Updated accessory name to: ${displayName}`);
                        }
                        // Update platform accessories in Homebridge
                        this.homebridgeApi.updatePlatformAccessories([existingAccessory]);
                        // Initialize the accessory handler
                        this.initializeAccessory(existingAccessory, device.id);
                    }
                }
                else {
                    // Create a new accessory since one doesn't exist
                    this.log.info(`Adding new accessory: ${displayName} (ID: ${device.id})`);
                    const accessory = new this.homebridgeApi.platformAccessory(displayName, uuid);
                    // Explicitly set the category to THERMOSTAT
                    accessory.category = 9 /* this.homebridgeApi.hap.Categories.THERMOSTAT */;
                    // Store device info in the accessory context
                    accessory.context.device = device;
                    // Initialize the accessory
                    this.initializeAccessory(accessory, device.id);
                    // Register the accessory with Homebridge
                    this.homebridgeApi.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
                    this.accessories.push(accessory);
                }
            }
            // Remove accessories that no longer exist
            this.cleanupInactiveAccessories(activeDeviceIds);
            this.log.info('Device discovery completed');
        }
        catch (error) {
            this.log.error(`Error discovering devices: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            // Always clear the in-progress flag when done
            this.discoveryInProgress = false;
        }
    }
    /**
     * Initialize an accessory with its handler
     * @param accessory - The platform accessory to initialize
     * @param deviceId - The device ID for this accessory
     */
    initializeAccessory(accessory, deviceId) {
        // Skip initialization if the plugin is not properly configured
        if (!this.isConfigured || !this.api) {
            this.log.warn(`Skipping accessory initialization because the plugin is not properly configured`);
            return;
        }
        this.log.info(`Initializing accessory for device ID: ${deviceId}`);
        // First, remove any existing handler for this accessory
        const existingHandler = this.accessoryInstances.get(deviceId);
        if (existingHandler) {
            existingHandler.cleanup();
            this.accessoryInstances.delete(deviceId);
        }
        // Create new accessory handler
        const handler = new SleepMeAccessory(this, accessory, this.api);
        // Store the handler for later cleanup
        this.accessoryInstances.set(deviceId, handler);
        this.log.debug(`Accessory handler created for device ${deviceId}`);
    }
    /**
     * Clean up accessories that are no longer active
     * Removes accessories from Homebridge that don't match active device IDs
     *
     * @param activeDeviceIds - Set of active device IDs
     */
    cleanupInactiveAccessories(activeDeviceIds) {
        // Find accessories to remove - those not in the active devices list
        const accessoriesToRemove = this.accessories.filter(accessory => {
            const deviceId = accessory.context.device?.id;
            return deviceId && !activeDeviceIds.has(deviceId);
        });
        if (accessoriesToRemove.length > 0) {
            this.log.info(`Removing ${accessoriesToRemove.length} inactive accessories`);
            // Clean up each accessory
            for (const accessory of accessoriesToRemove) {
                const deviceId = accessory.context.device?.id;
                if (deviceId) {
                    // Clean up handler if it exists
                    const handler = this.accessoryInstances.get(deviceId);
                    if (handler) {
                        handler.cleanup();
                        this.accessoryInstances.delete(deviceId);
                    }
                    // Remove from accessories array
                    const index = this.accessories.indexOf(accessory);
                    if (index !== -1) {
                        this.accessories.splice(index, 1);
                    }
                }
                this.log.info(`Removing inactive accessory: ${accessory.displayName}`);
            }
            // Unregister from Homebridge
            this.homebridgeApi.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessoriesToRemove);
        }
    }
}
//# sourceMappingURL=platform.js.map