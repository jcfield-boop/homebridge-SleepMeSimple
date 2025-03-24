/**
 * SleepMe Simple Platform
 * This is the main platform implementation that handles device discovery
 * and accessory management for SleepMe devices
 */
import {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service
} from 'homebridge';
import { SleepMeApi } from './api/sleepme-api.js';
import { SleepMeAccessory } from './accessory.js';
import { Logger as CustomLogger } from './api/types.js';
import { PLATFORM_NAME, PLUGIN_NAME, DEFAULT_POLLING_INTERVAL, LogLevel } from './settings.js';

/**
 * SleepMe Simple Platform
 * This class is the entry point for the plugin and manages the plugin lifecycle
 */
export class SleepMeSimplePlatform implements DynamicPlatformPlugin {
  // References to Homebridge services and characteristics for accessory creation
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  
  // Array to store cached accessories from Homebridge
  public readonly accessories: PlatformAccessory[] = [];
  
  // API client for communicating with SleepMe services
  public readonly api?: SleepMeApi;
  
  // Custom logger for simplified logging
  public readonly log: CustomLogger;
  
  /**
   * Configuration options parsed from config.json
   */
  public readonly logLevel!: LogLevel;
  public readonly pollingInterval: number;
  public readonly temperatureUnit: string = 'C';
  
  // Map to track active accessory instances for proper cleanup
  private readonly accessoryInstances: Map<string, SleepMeAccessory> = new Map();
  
  // Timer for periodic device discovery
  private discoveryTimer?: NodeJS.Timeout;

  // Flag to track if the plugin is properly configured
  private isConfigured: boolean = true;
  
  /**
   * Constructor for the SleepMe platform.
   * Initializes the platform with configuration from Homebridge
   * 
   * @param logger - Homebridge logger instance
   * @param config - Configuration from config.json
   * @param homebridgeApi - Reference to the Homebridge API
   */
  constructor(
    logger: Logger,
    public readonly config: PlatformConfig,
    public readonly homebridgeApi: API
  ) {
    // Store references to Homebridge services and characteristics
    this.Service = this.homebridgeApi.hap.Service;
    this.Characteristic = this.homebridgeApi.hap.Characteristic;
    
    // Parse configuration options with defaults and validation
    this.temperatureUnit = (config.unit as string) || 'C';

    // Set polling interval with minimum and maximum bounds for safety
    this.pollingInterval = Math.max(60, Math.min(300, 
      parseInt(String(config.pollingInterval)) || DEFAULT_POLLING_INTERVAL));

    // Parse logging level from config
    let configLogLevel = config.logLevel as string || LogLevel.NORMAL;
    if (!Object.values(LogLevel).includes(configLogLevel as LogLevel)) {
      configLogLevel = LogLevel.NORMAL;
    }
    this.logLevel = configLogLevel as LogLevel;

    // Create custom logger
    this.log = this.createLogger(logger);
    
    // Validate that the API token is present in the configuration
    if (!config.apiToken) {
      this.isConfigured = false;
      this.log.error('API token missing from configuration! The plugin will not work.');
      this.log.info('Please add your SleepMe API token to the configuration in the Homebridge UI.');
      this.log.info('You can get your token from your SleepMe account at sleep.me');
      // Don't throw an error - let the plugin load in a disabled state
    } else {
      // Initialize the SleepMe API client with the provided token
      this.api = new SleepMeApi(config.apiToken as string, this.log);
      
      // Log platform initialization information
      this.log.info(
        `Initializing ${PLATFORM_NAME} platform with ${this.temperatureUnit === 'C' ? 'Celsius' : 'Fahrenheit'} ` +
        `units and ${this.pollingInterval}s polling interval`
      );
    }
    
    // Register for Homebridge events
    
    // When this event is fired, homebridge has restored all cached accessories
    this.homebridgeApi.on('didFinishLaunching', () => {
      // Only attempt to discover devices if the plugin is properly configured
      if (this.isConfigured) {
        // Delay device discovery to prevent immediate API calls on startup
        setTimeout(() => {
          this.log.info('Homebridge finished launching, starting device discovery');
          this.discoverDevices();
        }, 5000); // 5 second delay before starting discovery
        
        // Set up periodic discovery to catch new or changed devices
        this.discoveryTimer = setInterval(() => {
          this.discoverDevices();
        }, 24 * 60 * 60 * 1000); // Check once per day
      }
    });
    
    // Handle Homebridge shutdown event for proper cleanup
    this.homebridgeApi.on('shutdown', () => {
      this.log.info('Shutting down platform');
      
      // Clear discovery timer
      if (this.discoveryTimer) {
        clearInterval(this.discoveryTimer);
      }
      
      // Clean up accessory resources
      this.accessoryInstances.forEach(accessory => {
        accessory.cleanup();
      });
    });
  }

  /**
   * Create a custom logger adapter
   * @param logger Homebridge logger
   * @returns Custom logger
   */
  private createLogger(logger: Logger): CustomLogger {
    return {
      info: (message: string) => logger.info(`[SleepMe Simple] ${message}`),
      warn: (message: string) => logger.warn(`[SleepMe Simple] ${message}`),
      error: (message: string) => logger.error(`[SleepMe Simple] ${message}`),
      debug: (message: string) => {
        if (this.logLevel === LogLevel.DEBUG || this.logLevel === LogLevel.VERBOSE) {
          logger.debug(`[SleepMe Simple] ${message}`);
        }
      },
      verbose: (message: string) => {
        if (this.logLevel === LogLevel.VERBOSE) {
          logger.debug(`[SleepMe Simple] [VERBOSE] ${message}`);
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
  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info(`Loading accessory from cache: ${accessory.displayName}`);
    
    // Validate that the device context is intact
    if (!accessory.context.device || !accessory.context.device.id) {
      this.log.warn(
        `Cached accessory ${accessory.displayName} missing device ID, will rediscover`
      );
    } else {
      this.log.debug(`Cached accessory device ID: ${accessory.context.device.id}`);
    }
    
    // Store the accessory in our array for later use
    this.accessories.push(accessory);
  }
  
  /**
   * Discover SleepMe devices and create HomeKit accessories
   * Uses staggered initialization to prevent API rate limiting
   */
  async discoverDevices(): Promise<void> {
    // Skip discovery if the plugin is not properly configured
    if (!this.isConfigured || !this.api) {
      this.log.warn('Skipping device discovery because the plugin is not properly configured');
      return;
    }

    this.log.info('Starting device discovery...');
    
    try {
      // Check if devices are configured directly in config.json
      let devices = [];
      const configuredDevices = this.config.devices as Array<{id: string, name: string}> || [];
      
      if (configuredDevices && configuredDevices.length > 0) {
        // Use the devices from config instead of making an API call
        this.log.info(`Using ${configuredDevices.length} devices from configuration`);
        
        // Map config devices to the format expected by the rest of the code
        devices = configuredDevices.map(device => ({
          id: device.id,
          name: device.name || `SleepMe Device (${device.id})`, // Default name if not specified
          attachments: [] // Add required fields with default values
        }));
      } else {
        // Fetch devices from the API if none configured manually
        this.log.info('No devices in configuration, fetching from API...');
        
        devices = await this.api.getDevices();
        
        if (!devices || devices.length === 0) {
          this.log.error(
            'No SleepMe devices found. Check your API token and connectivity.'
          );
          return;
        }
      }
      
      this.log.info(`Devices to initialize: ${devices.length}`);
      
      // Track which accessories are still active to support removal of stale accessories
      const activeDeviceIds = new Set<string>();
      
      // Process each device with staggered initialization to prevent API rate limiting
      for (let i = 0; i < devices.length; i++) {
        const device = devices[i];
        
        // Skip devices with missing IDs
        if (!device.id) {
          this.log.warn(`Skipping device with missing ID: ${JSON.stringify(device)}`);
          continue;
        }
        
        // Stagger device initialization to prevent API rate limiting
        if (i > 0) {
          const staggerDelay = 10000; // 10 second delay
          this.log.info(`Waiting ${Math.round(staggerDelay/1000)}s before initializing next device...`);
          await new Promise(resolve => setTimeout(resolve, staggerDelay));
        }
        
        // Mark this device ID as active
        activeDeviceIds.add(device.id);
        
        // Use device name from API or config
        const displayName = device.name;
        
        // Generate a unique identifier for this device in HomeKit
        const uuid = this.homebridgeApi.hap.uuid.generate(device.id);
        
        // Check if we already have an accessory for this device
        const existingAccessory = this.accessories.find(acc => acc.UUID === uuid);
        if (existingAccessory) {
          // The accessory already exists, just update its context
          this.log.info(
            `Restoring accessory from cache: ${existingAccessory.displayName} (ID: ${device.id})`
          );
          
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
        } else {
        // Create a new accessory since one doesn't exist
this.log.info(`Adding new accessory: ${displayName} (ID: ${device.id})`);

const accessory = new this.homebridgeApi.platformAccessory(displayName, uuid);
// Explicitly set the category to AIR_CONDITIONER
accessory.category = this.homebridgeApi.hap.Categories.AIR_CONDITIONER;

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
    } catch (error) {
      this.log.error(
        `Error discovering devices: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Initialize an accessory with its handler
   * @param accessory - The platform accessory to initialize
   * @param deviceId - The device ID for this accessory
   */
  private initializeAccessory(accessory: PlatformAccessory, deviceId: string): void {
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
  private cleanupInactiveAccessories(activeDeviceIds: Set<string>): void {
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
      this.homebridgeApi.unregisterPlatformAccessories(
        PLUGIN_NAME,
        PLATFORM_NAME,
        accessoriesToRemove
      );
    }
  }
}
