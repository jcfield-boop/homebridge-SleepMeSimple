/**
 * Entry point for the SleepMe Simple Homebridge plugin
 * This file exports the platform constructor to Homebridge
 */
import { API, Characteristic, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
import { SleepMeApi } from './api/sleepme-api.js';
import { Logger as CustomLogger } from './api/types.js';
import { LogLevel } from './settings.js';
import { ScheduleManager } from './schedule.js';
import { PollingManager } from './polling-manager.js';
/**
 * SleepMe Simple Platform
 * This class is the entry point for the plugin and manages the plugin lifecycle
 */
export declare class SleepMeSimplePlatform implements DynamicPlatformPlugin {
    readonly config: PlatformConfig;
    readonly homebridgeApi: API;
    readonly Service: typeof Service;
    readonly Characteristic: typeof Characteristic;
    readonly accessories: PlatformAccessory[];
    readonly api?: SleepMeApi;
    readonly log: CustomLogger;
    /**
     * Configuration options parsed from config.json
     */
    readonly logLevel: LogLevel;
    readonly pollingInterval: number;
    readonly temperatureUnit: string;
    private readonly accessoryInstances;
    private discoveryTimer?;
    private discoveryInProgress;
    private isConfigured;
    private _scheduleManager?;
    private _pollingManager?;
    /**
     * Constructor for the SleepMe platform.
     * Initializes the platform with configuration from Homebridge
     *
     * @param logger - Homebridge logger instance
     * @param config - Configuration from config.json
     * @param homebridgeApi - Reference to the Homebridge API
     */
    constructor(logger: Logger, config: PlatformConfig, homebridgeApi: API);
    /**
     * Get the schedule manager
     * @returns Schedule manager instance if available
     */
    get scheduleManager(): ScheduleManager | undefined;
    /**
     * Get the polling manager
     * @returns Polling manager instance if available
     */
    get pollingManager(): PollingManager | undefined;
    /**
     * Create a custom logger adapter
     * @param logger Homebridge logger
     * @returns Custom logger
     */
    private createLogger;
    /**
     * Called by Homebridge when cached accessories are restored at startup
     * This allows us to reconfigure accessories that were cached by Homebridge
     *
     * @param accessory - The cached accessory to configure
     */
    configureAccessory(accessory: PlatformAccessory): void;
    /**
     * Discover SleepMe devices and create HomeKit accessories
     * Uses staggered initialization to prevent API rate limiting
     * Modified to return a Promise for async operation
     * @returns Promise that resolves when discovery is complete
     */
    discoverDevices(): Promise<void>;
    /**
     * Initialize an accessory with its handler
     * @param accessory - The platform accessory to initialize
     * @param deviceId - The device ID for this accessory
     */
    private initializeAccessory;
    /**
     * Clean up accessories that are no longer active
     * Removes accessories from Homebridge that don't match active device IDs
     *
     * @param activeDeviceIds - Set of active device IDs
     */
    private cleanupInactiveAccessories;
}
