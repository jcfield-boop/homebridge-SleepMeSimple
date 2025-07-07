/**
 * SleepMe Accessory
 * 
 * This class implements a HomeKit interface for SleepMe devices,
 * using a combination of services for the best user experience
 */
import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { SleepMeSimplePlatform } from './platform.js';
import { SleepMeApi, RequestContext } from './api/sleepme-api.js';
import { ThermalStatus, PowerState, DeviceStatus } from './api/types.js';
import { PollableDevice } from './polling-manager.js';
import { 
  MIN_TEMPERATURE_C, 
  MAX_TEMPERATURE_C, 
  USER_ACTION_QUIET_PERIOD_MS,
  InterfaceMode,
  DEFAULT_INTERFACE_MODE
} from './settings.js';

// HomeKit provides built-in debouncing, so no manual debouncing needed

/**
 * SleepMe Accessory
 * Provides a simplified interface for SleepMe devices
 * Now uses centralized polling to reduce API calls
 */
export class SleepMeAccessory implements PollableDevice {
  // Core HomeKit services
  private informationService!: Service;
  
  // Interface services (depends on mode)
  private powerSwitchService?: Service;
  private temperatureSensorService?: Service;
  private targetTemperatureService?: Service;
  private thermostatService?: Service; // Legacy thermostat mode
  private waterLevelService?: Service;
  
  // Schedule services (optional)
  private scheduleServices: Map<string, Service> = new Map();
  private masterScheduleService?: Service;
  private warmHugService?: Service;
  
  // Interface configuration
  private interfaceMode: InterfaceMode;
  
  // Device state
  private currentTemperature = NaN;
  private targetTemperature = NaN;
  private isPowered = false;
  private firmwareVersion: string;
  private waterLevel = 100; // Default full water level
  private isWaterLow = false;
  private lastPowerOffTime = 0; // Track when device was last turned off
  
  // External change detection for defensive coexistence with native app
  private lastKnownTargetTemp = NaN; // Track what we last knew from API
  private externalChangeDetected = false; // Flag for recent external activity
  private lastExternalChangeTime = 0; // When external change was detected
  private isFirstStatusUpdate = true; // Track first update to distinguish from external changes
  
  // HomeKit handles debouncing natively, so no manual debouncing needed
  
  // Device properties
  public readonly deviceId: string;
  private readonly displayName: string;
  private deviceModel = 'SleepMe Device';
  
  // Update control - removed individual polling timers
  private lastStatusUpdate = 0;
  private lastUserActionTime = 0;
  private failedUpdateAttempts = 0;
  private updateInProgress = false;

  // Added missing properties
  private commandEpoch = 0;
  private pendingOperation: string | null = null;
  
  // Constants from the platform
  private readonly Characteristic;
  
  /**
   * Constructor for the SleepMe accessory
   */
  constructor(
    private readonly platform: SleepMeSimplePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly apiClient: SleepMeApi
  ) {
    // Store references to Characteristic for convenience
    this.Characteristic = this.platform.Characteristic;
    
    // Get device ID from accessory context
    this.deviceId = this.accessory.context.device?.id || '';
    this.displayName = this.accessory.displayName;
    
    if (!this.deviceId) {
      this.platform.log.error(`Accessory missing device ID: ${this.displayName}`);
      throw new Error(`Accessory missing device ID: ${this.displayName}`);
    }
    
    // Initialize firmware version from cache or default
    this.firmwareVersion = this.accessory.context.firmwareVersion || 'Unknown';
    
    this.platform.log.debug(`Firmware version from cache: ${this.firmwareVersion}`);
    
    // Determine interface mode
    this.interfaceMode = this.platform.config.interfaceMode || DEFAULT_INTERFACE_MODE;
    
    this.platform.log.info(`Creating accessory for device ${this.deviceId} (${this.displayName}) with ${this.interfaceMode} interface`);
    
    // Initialize accessory information service
    this.setupInformationService();
    
    // Setup interface based on mode
    this.setupInterface();
    
    // Setup water level monitoring (common to all interfaces)
    this.setupWaterLevelService();

    // HomeKit handles debouncing natively - no manual debouncing needed
    
    // Register with centralized polling manager instead of individual polling
    if (this.platform.pollingManager) {
      this.platform.pollingManager.registerDevice(this);
      this.platform.log.info(`Registered ${this.displayName} with centralized polling`);
    } else {
      this.platform.log.warn(`No polling manager available for ${this.displayName}`);
    }
    
    this.platform.log.info(`Accessory initialized: ${this.displayName} (ID: ${this.deviceId})`);
    
    // Fetch initial device status immediately to avoid waiting for polling cycle
    this.fetchInitialStatus();
  }

  /**
   * Set up the accessory information service
   */
  private setupInformationService(): void {
    // Get or create the information service
    this.informationService = this.accessory.getService(this.platform.Service.AccessoryInformation) || 
      this.accessory.addService(this.platform.Service.AccessoryInformation);
    
    // Set default information
    this.informationService
      .setCharacteristic(this.Characteristic.Manufacturer, 'SleepMe Inc.')
      .setCharacteristic(this.Characteristic.Model, this.deviceModel)
      .setCharacteristic(this.Characteristic.SerialNumber, this.deviceId);
    
    // Only set firmware version if we have a real value, not 'Unknown'
    if (this.firmwareVersion && this.firmwareVersion !== 'Unknown') {
      this.informationService.setCharacteristic(this.Characteristic.FirmwareRevision, this.firmwareVersion);
      this.platform.log.debug(`Set cached firmware version: ${this.firmwareVersion}`);
      
      // Force HomeKit to refresh by updating the platform accessory
      setTimeout(() => {
        this.platform.homebridgeApi.updatePlatformAccessories([this.accessory]);
        this.platform.log.debug('Forced HomeKit accessory refresh for firmware version');
      }, 500);
    } else {
      // Don't set firmware version yet - wait for API response
      this.platform.log.debug('Waiting for API to provide firmware version');
    }
    
    this.platform.log.debug(`Initial accessory info set: Model=${this.deviceModel}, Serial=${this.deviceId}, Firmware=${this.firmwareVersion}`);
    
    // Set the category to THERMOSTAT which is appropriate for temperature control
    this.accessory.category = this.platform.homebridgeApi.hap.Categories.THERMOSTAT;
  }

  /**
   * Setup interface based on configured mode
   */
  private setupInterface(): void {
    // Clean up any existing services first
    this.cleanupExistingServices();
    
    switch (this.interfaceMode) {
      case InterfaceMode.SWITCH:
        this.setupSwitchInterface();
        break;
      case InterfaceMode.THERMOSTAT:
        this.setupLegacyThermostatInterface();
        break;
      case InterfaceMode.HYBRID:
      default:
        this.setupHybridInterface();
        break;
    }
    
    // Setup schedules if enabled
    if (this.platform.config.enableSchedules) {
      this.setupScheduleServices();
    }
  }
  
  /**
   * Clean up existing services to avoid conflicts
   */
  private cleanupExistingServices(): void {
    // Only remove services that conflict with the current interface mode
    // Don't remove services that will be reused
    
    if (this.interfaceMode === InterfaceMode.SWITCH) {
      // Switch mode doesn't need thermostat services
      const thermostatService = this.accessory.getService(this.platform.Service.Thermostat);
      if (thermostatService) {
        this.platform.log.info('Removing existing Thermostat service (switch mode)');
        this.accessory.removeService(thermostatService);
      }
    } else if (this.interfaceMode === InterfaceMode.THERMOSTAT) {
      // Thermostat mode doesn't need separate switch/temperature sensor
      const switchService = this.accessory.getService(this.platform.Service.Switch);
      const tempSensorService = this.accessory.getService(this.platform.Service.TemperatureSensor);
      
      if (switchService) {
        this.platform.log.info('Removing existing Switch service (thermostat mode)');
        this.accessory.removeService(switchService);
      }
      if (tempSensorService) {
        this.platform.log.info('Removing existing TemperatureSensor service (thermostat mode)');
        this.accessory.removeService(tempSensorService);
      }
    }
    
    // Always remove HeaterCooler service as we don't use it
    const heaterCoolerService = this.accessory.getService(this.platform.Service.HeaterCooler);
    if (heaterCoolerService) {
      this.platform.log.info('Removing existing HeaterCooler service');
      this.accessory.removeService(heaterCoolerService);
    }
  }
  
  /**
   * Setup simple switch interface
   */
  private setupSwitchInterface(): void {
    // Power switch for simple ON/OFF
    this.powerSwitchService = this.accessory.getService(this.platform.Service.Switch) ||
      this.accessory.addService(this.platform.Service.Switch, `${this.displayName} Power`);
    
    this.powerSwitchService
      .getCharacteristic(this.Characteristic.On)
      .onGet(() => this.isPowered)
      .onSet(this.handlePowerToggle.bind(this));
    
    // Temperature sensor for monitoring
    this.temperatureSensorService = this.accessory.getService(this.platform.Service.TemperatureSensor) ||
      this.accessory.addService(this.platform.Service.TemperatureSensor, `${this.displayName} Temperature`);
    
    this.temperatureSensorService
      .getCharacteristic(this.Characteristic.CurrentTemperature)
      .setProps({
        minValue: MIN_TEMPERATURE_C - 5,
        maxValue: MAX_TEMPERATURE_C + 5,
        minStep: 0.1
      })
      .onGet(() => this.currentTemperature || 20);
  }
  
  /**
   * Setup hybrid interface (power switch + temperature control + schedules)
   */
  private setupHybridInterface(): void {
    this.platform.log.info(`Setting up hybrid interface for ${this.displayName}`);
    
    // 1. Power Switch - for simple ON/OFF control
    this.powerSwitchService = this.accessory.getService(this.platform.Service.Switch) ||
      this.accessory.addService(this.platform.Service.Switch, `${this.displayName} Power`);
    
    this.platform.log.info(`Created Power Switch service: ${this.displayName} Power`);
    
    this.powerSwitchService
      .getCharacteristic(this.Characteristic.On)
      .onGet(() => this.isPowered)
      .onSet(this.handlePowerToggle.bind(this));
    
    // 2. Current Temperature Sensor - for monitoring
    this.temperatureSensorService = this.accessory.getService(this.platform.Service.TemperatureSensor) ||
      this.accessory.addService(this.platform.Service.TemperatureSensor, `${this.displayName} Temperature`);
    
    this.platform.log.info(`Created Temperature Sensor service: ${this.displayName} Temperature`);
    
    this.temperatureSensorService
      .getCharacteristic(this.Characteristic.CurrentTemperature)
      .setProps({
        minValue: MIN_TEMPERATURE_C - 5,
        maxValue: MAX_TEMPERATURE_C + 5,
        minStep: 0.1
      })
      .updateValue(Math.max(MIN_TEMPERATURE_C - 5, this.currentTemperature || 20))
      .onGet(() => Math.max(MIN_TEMPERATURE_C - 5, this.currentTemperature || 20));
    
    // 3. Target Temperature Control - simplified thermostat for temperature setting
    this.targetTemperatureService = this.accessory.getService(this.platform.Service.Thermostat) ||
      this.accessory.addService(this.platform.Service.Thermostat, `${this.displayName} Target Temperature`);
    
    this.platform.log.info(`Created Target Temperature service: ${this.displayName} Target Temperature`);
    
    // Configure as temperature-only control
    this.targetTemperatureService
      .getCharacteristic(this.Characteristic.TargetTemperature)
      .setProps({
        minValue: MIN_TEMPERATURE_C,
        maxValue: MAX_TEMPERATURE_C,
        minStep: 0.5
      })
      .updateValue(Math.max(MIN_TEMPERATURE_C, this.targetTemperature || 21))
      .onGet(() => Math.max(MIN_TEMPERATURE_C, this.targetTemperature || 21))
      .onSet(this.handleTargetTemperatureSet.bind(this));
    
    // Set current temperature for the thermostat service
    this.targetTemperatureService
      .getCharacteristic(this.Characteristic.CurrentTemperature)
      .setProps({
        minValue: MIN_TEMPERATURE_C - 5,
        maxValue: MAX_TEMPERATURE_C + 5,
        minStep: 0.1
      })
      .updateValue(Math.max(MIN_TEMPERATURE_C - 5, this.currentTemperature || 20))
      .onGet(() => Math.max(MIN_TEMPERATURE_C - 5, this.currentTemperature || 20));
    
    // Set up heating/cooling state to reflect actual device status - only show OFF and AUTO for cleaner UX
    this.targetTemperatureService
      .getCharacteristic(this.Characteristic.TargetHeatingCoolingState)
      .setProps({
        validValues: [
          this.Characteristic.TargetHeatingCoolingState.OFF,
          this.Characteristic.TargetHeatingCoolingState.AUTO
        ]
      })
      .onGet(() => this.getTargetHeatingCoolingState())
      .onSet(this.handleTargetHeatingCoolingStateSet.bind(this));
      
    this.targetTemperatureService
      .getCharacteristic(this.Characteristic.CurrentHeatingCoolingState)
      .onGet(() => this.getCurrentHeatingCoolingState());
    
    this.platform.log.info(`Hybrid interface setup complete for ${this.displayName}: Power Switch + Temperature Sensor + Target Temperature Control`);
  }
  
  /**
   * Setup legacy thermostat interface
   */
  private setupLegacyThermostatInterface(): void {
    // Use Thermostat service for legacy mode
    this.thermostatService = this.accessory.getService(this.platform.Service.Thermostat) ||
      this.accessory.addService(this.platform.Service.Thermostat, this.displayName);
    
    // Configure basic characteristics
    this.thermostatService
      .setCharacteristic(this.Characteristic.Name, this.displayName);
      
    // Set up current temperature characteristic
    this.thermostatService
      .getCharacteristic(this.Characteristic.CurrentTemperature)
      .setProps({
        minValue: MIN_TEMPERATURE_C - 5,
        maxValue: MAX_TEMPERATURE_C + 5,
        minStep: 0.1
      })
      .onGet(() => this.currentTemperature || 20);
    
    // Set up target temperature characteristic
    this.thermostatService
      .getCharacteristic(this.Characteristic.TargetTemperature)
      .setProps({
        minValue: MIN_TEMPERATURE_C,
        maxValue: MAX_TEMPERATURE_C,
        minStep: 0.5
      })
      .onGet(this.handleTargetTemperatureGet.bind(this))
      .onSet(this.handleTargetTemperatureSet.bind(this));
   
    // Set up current heating/cooling state
    this.thermostatService
      .getCharacteristic(this.Characteristic.CurrentHeatingCoolingState)
      .onGet(() => this.getCurrentHeatingCoolingState());
 
    // Set up target heating/cooling state - only show OFF and AUTO for cleaner UX
    this.thermostatService
      .getCharacteristic(this.Characteristic.TargetHeatingCoolingState)
      .setProps({
        validValues: [
          this.Characteristic.TargetHeatingCoolingState.OFF,
          this.Characteristic.TargetHeatingCoolingState.AUTO
        ]
      })
      .onGet(() => this.getTargetHeatingCoolingState())
      .onSet((value: CharacteristicValue) => {
        this.handleTargetHeatingCoolingStateSet(value as number);
      });
 
    // Set initial display unit (Celsius)
    this.thermostatService
      .getCharacteristic(this.Characteristic.TemperatureDisplayUnits)
      .setProps({
        validValues: [
          this.Characteristic.TemperatureDisplayUnits.CELSIUS,
          this.Characteristic.TemperatureDisplayUnits.FAHRENHEIT
        ]
      })
      .setValue(this.Characteristic.TemperatureDisplayUnits.CELSIUS);
  }
  
  /**
   * Setup schedule services for the hybrid interface
   */
  private setupScheduleServices(): void {
    if (!this.platform.config.enableSchedules) {
      return;
    }
    
    // Master schedule control
    this.masterScheduleService = this.accessory.addService(
      this.platform.Service.Switch,
      `${this.displayName} Schedules`
    );
    
    this.masterScheduleService
      .getCharacteristic(this.Characteristic.On)
      .onGet(() => this.platform.config.enableSchedules || false)
      .onSet(this.handleMasterScheduleToggle.bind(this));
    
    // Individual schedule switches if configured
    if (this.platform.config.showIndividualSchedules !== false) {
      if (this.platform.config.schedules) {
        for (const schedule of this.platform.config.schedules) {
          this.createIndividualScheduleService(schedule);
        }
      }
    }
    
    // Special Warm Hug service if enabled
    if (this.platform.config.enableWarmHug !== false) {
      this.warmHugService = this.accessory.addService(
        this.platform.Service.Switch,
        `${this.displayName} Warm Hug`
      );
      
      this.warmHugService
        .getCharacteristic(this.Characteristic.On)
        .onGet(() => this.isWarmHugActive())
        .onSet(this.handleWarmHugToggle.bind(this));
    }
  }
  
  /**
   * Create an individual schedule service
   */
  private createIndividualScheduleService(schedule: any): void {
    const service = this.accessory.addService(
      this.platform.Service.Switch,
      `${this.displayName} ${schedule.name || 'Schedule'}`
    );
    
    service
      .getCharacteristic(this.Characteristic.On)
      .onGet(() => schedule.enabled !== false)
      .onSet((value) => this.handleIndividualScheduleToggle(schedule.id, value as boolean));
    
    this.scheduleServices.set(schedule.id, service);
  }
  
  /**
   * Setup water level service (common to all interfaces)
   */
  private setupWaterLevelService(): void {
    // Water level as battery service (shows percentage)
    this.waterLevelService = this.accessory.getService(this.platform.Service.Battery) ||
      this.accessory.addService(this.platform.Service.Battery, `${this.displayName} Water Level`);
    
    this.waterLevelService
      .getCharacteristic(this.Characteristic.BatteryLevel)
      .onGet(() => this.waterLevel);
    
    this.waterLevelService
      .getCharacteristic(this.Characteristic.StatusLowBattery)
      .onGet(() => this.isWaterLow ? 
        this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : 
        this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
  }
  
  /**
   * Power toggle handler for switch interface
   * Uses optimistic updates for immediate UI feedback
   */
  private async handlePowerToggle(value: CharacteristicValue): Promise<void> {
    const shouldTurnOn = value as boolean;
    this.lastUserActionTime = Date.now();
    
    // Check for duplicate command (same state already in progress)
    if (this.pendingOperation === 'power' && this.isPowered === shouldTurnOn) {
      this.platform.log.debug(`Ignoring duplicate power ${shouldTurnOn ? 'ON' : 'OFF'} command - already in progress`);
      return;
    }
    
    // Increment command epoch to invalidate previous commands
    const currentEpoch = ++this.commandEpoch;
    
    this.platform.log.info(`⚡ User power change: ${shouldTurnOn ? 'ON' : 'OFF'} for ${this.deviceId} - OPTIMISTIC UPDATE`);
    
    // Store previous state for rollback if needed
    const previousPowerState = this.isPowered;
    const previousPowerOffTime = this.lastPowerOffTime;
    
    // Optimistic update: Update UI immediately for responsiveness
    this.isPowered = shouldTurnOn;
    if (!shouldTurnOn) {
      this.lastPowerOffTime = Date.now();
    }
    
    // Sync thermostat state immediately when power switch changes
    this.syncThermostatState();
    
    this.updateAllServices();
    this.platform.log.debug(`🔄 Optimistic update: power switch now shows ${shouldTurnOn ? 'ON' : 'OFF'}, thermostat synced`);
    
    if (shouldTurnOn) {
      // Turn on with current target temperature
      await this.executeOperationWithRollback('power', currentEpoch, 
        // Operation
        async () => {
          const success = await this.apiClient.turnDeviceOn(this.deviceId, this.targetTemperature);
          if (!success) {
            throw new Error('Failed to turn on device');
          }
        },
        // Rollback on failure
        () => {
          this.isPowered = previousPowerState;
          this.syncThermostatState();
          this.updateAllServices();
          this.platform.log.warn(`🔙 Rolled back power state to ${previousPowerState ? 'ON' : 'OFF'} due to API failure`);
        }
      );
    } else {
      // Cancel any pending requests for clean OFF
      this.apiClient.cancelAllDeviceRequests(this.deviceId);
      
      await this.executeOperationWithRollback('power', currentEpoch,
        // Operation  
        async () => {
          const success = await this.apiClient.turnDeviceOff(this.deviceId);
          if (!success) {
            throw new Error('Failed to turn off device');
          }
        },
        // Rollback on failure
        () => {
          this.isPowered = previousPowerState;
          this.lastPowerOffTime = previousPowerOffTime;
          this.syncThermostatState();
          this.updateAllServices();
          this.platform.log.warn(`🔙 Rolled back power state to ${previousPowerState ? 'ON' : 'OFF'} due to API failure`);
        }
      );
    }
  }
  
  /**
   * Handle master schedule toggle
   */
  private async handleMasterScheduleToggle(value: CharacteristicValue): Promise<void> {
    const enabled = value as boolean;
    this.platform.log.info(`${enabled ? 'Enabling' : 'Disabling'} all schedules for ${this.deviceId}`);
    
    // Master schedule toggle - update platform config
    this.platform.config.enableSchedules = enabled;
  }
  
  /**
   * Handle individual schedule toggle
   */
  private async handleIndividualScheduleToggle(scheduleId: string, enabled: boolean): Promise<void> {
    this.platform.log.info(`${enabled ? 'Enabling' : 'Disabling'} schedule ${scheduleId} for ${this.deviceId}`);
    
    // Individual schedule toggle
    this.platform.log.info(`${enabled ? 'Enabled' : 'Disabled'} schedule ${scheduleId} for ${this.deviceId}`);
  }
  
  /**
   * Handle warm hug toggle
   */
  private async handleWarmHugToggle(value: CharacteristicValue): Promise<void> {
    const shouldStart = value as boolean;
    this.platform.log.info(`${shouldStart ? 'Starting' : 'Stopping'} warm hug for ${this.deviceId}`);
    
    // Warm hug toggle functionality
    this.platform.log.info(`${shouldStart ? 'Started' : 'Stopped'} warm hug for ${this.deviceId}`);
  }
  
  /**
   * Check if warm hug is currently active
   */
  private isWarmHugActive(): boolean {
    // Check if warm hug is active for this device
    return false; // Placeholder implementation
  }
  
  /**
   * Helper method to safely update a service characteristic
   */
  private updateServiceCharacteristic(service: Service | undefined, characteristic: any, value: any): void {
    if (service) {
      service.updateCharacteristic(characteristic, value);
    }
  }

  /**
   * Update all services based on current interface mode
   */
  private updateAllServices(): void {
    const currentTemp = this.currentTemperature || 20;
    const targetTemp = this.targetTemperature || 21;
    
    // Update power switch (common to SWITCH and HYBRID)
    this.updateServiceCharacteristic(this.powerSwitchService, this.Characteristic.On, this.isPowered);
    
    // Update temperature sensor (common to all modes)
    this.updateServiceCharacteristic(this.temperatureSensorService, this.Characteristic.CurrentTemperature, currentTemp);
    
    // Update thermostat services based on interface mode
    if (this.interfaceMode === InterfaceMode.THERMOSTAT && this.thermostatService) {
      this.updateServiceCharacteristic(this.thermostatService, this.Characteristic.CurrentTemperature, currentTemp);
      this.updateServiceCharacteristic(this.thermostatService, this.Characteristic.TargetTemperature, targetTemp);
      this.updateServiceCharacteristic(this.thermostatService, this.Characteristic.CurrentHeatingCoolingState, this.getCurrentHeatingCoolingState());
      this.updateServiceCharacteristic(this.thermostatService, this.Characteristic.TargetHeatingCoolingState, this.getTargetHeatingCoolingState());
    }
    
    // Update target temperature service (HYBRID mode)
    if (this.interfaceMode === InterfaceMode.HYBRID && this.targetTemperatureService) {
      this.updateServiceCharacteristic(this.targetTemperatureService, this.Characteristic.CurrentTemperature, currentTemp);
      this.updateServiceCharacteristic(this.targetTemperatureService, this.Characteristic.TargetTemperature, targetTemp);
      this.updateServiceCharacteristic(this.targetTemperatureService, this.Characteristic.CurrentHeatingCoolingState, this.getCurrentHeatingCoolingState());
      this.updateServiceCharacteristic(this.targetTemperatureService, this.Characteristic.TargetHeatingCoolingState, this.getTargetHeatingCoolingState());
    }
    
    // Update water level (common to all modes)
    this.updateWaterLevelService(this.waterLevel, this.isWaterLow);
    
    // Cross-service validation - ensure power switch and thermostat states are consistent
    this.validateServiceStates();
  }
  
  /**
   * Validate that all services show consistent states
   * Logs warnings if inconsistencies are detected
   */
  private validateServiceStates(): void {
    // Only validate in HYBRID mode where we have both power switch and thermostat
    if (this.interfaceMode !== InterfaceMode.HYBRID || !this.powerSwitchService || !this.targetTemperatureService) {
      return;
    }
    
    const powerSwitchState = this.powerSwitchService.getCharacteristic(this.Characteristic.On).value as boolean;
    const thermostatState = this.targetTemperatureService.getCharacteristic(this.Characteristic.TargetHeatingCoolingState).value as number;
    
    const expectedThermostatState = this.isPowered ? 
      this.Characteristic.TargetHeatingCoolingState.AUTO : 
      this.Characteristic.TargetHeatingCoolingState.OFF;
    
    // Check for mismatches
    if (powerSwitchState !== this.isPowered) {
      this.platform.log.warn(`Power switch state mismatch: HomeKit=${powerSwitchState}, Internal=${this.isPowered} - correcting`);
      this.powerSwitchService.updateCharacteristic(this.Characteristic.On, this.isPowered);
    }
    
    if (thermostatState !== expectedThermostatState) {
      this.platform.log.warn(`Thermostat state mismatch: HomeKit=${thermostatState === this.Characteristic.TargetHeatingCoolingState.OFF ? 'OFF' : 'AUTO'}, Expected=${expectedThermostatState === this.Characteristic.TargetHeatingCoolingState.OFF ? 'OFF' : 'AUTO'} - correcting`);
      this.targetTemperatureService.updateCharacteristic(this.Characteristic.TargetHeatingCoolingState, expectedThermostatState);
    }
    
    // Log validation success in verbose mode
    this.platform.log.verbose(`Service state validation passed: power=${this.isPowered}, thermostat=${expectedThermostatState === this.Characteristic.TargetHeatingCoolingState.OFF ? 'OFF' : 'AUTO'}`);
  }
  
  


/**
* Get the current heating/cooling state based on device status
*/
private getCurrentHeatingCoolingState(): number {
 if (!this.isPowered) {
   return this.Characteristic.CurrentHeatingCoolingState.OFF;
 }
 
 // If we don't have valid temperature readings
 if (isNaN(this.currentTemperature) || isNaN(this.targetTemperature)) {
   return this.Characteristic.CurrentHeatingCoolingState.HEAT; // Default to HEAT
 }
 
 // Determine if we're heating or cooling based on current vs target temperature
 // Use a larger threshold (1.0°C) to reduce state flapping
 if (this.currentTemperature < this.targetTemperature - 1.0) {
   // Heating up
   return this.Characteristic.CurrentHeatingCoolingState.HEAT;
 } else if (this.currentTemperature > this.targetTemperature + 1.0) {
   // Cooling down
   return this.Characteristic.CurrentHeatingCoolingState.COOL;
 } else {
   // At target temperature (within threshold)
   // Use HEAT as state when at target temperature and powered on
   return this.Characteristic.CurrentHeatingCoolingState.HEAT;
 }
}

/**
* Get the target heating/cooling state
* Return OFF when device is actually off, AUTO when on
* This ensures thermostat state matches actual device state
*/
private getTargetHeatingCoolingState(): number {
 // Return OFF when device is actually powered off
 if (!this.isPowered) {
   return this.Characteristic.TargetHeatingCoolingState.OFF;
 }
 
 // Return AUTO when device is powered on
 return this.Characteristic.TargetHeatingCoolingState.AUTO;
}   
/**
   * Update the schedule manager with current temperature
   * @param temperature Current temperature
   */
private updateScheduleManager(temperature: number): void {
  // Skip if schedule manager not available or temperature is invalid
  if (!this.platform.scheduleManager || isNaN(temperature)) {
    return;
  }
  
  // Update the schedule manager with the current temperature
  this.platform.scheduleManager.updateDeviceTemperature(this.deviceId, temperature);
}

 /**
   * Get the appropriate thermostat service based on interface mode
   */
 private getThermostatService(): Service | undefined {
   if (this.interfaceMode === InterfaceMode.THERMOSTAT) {
     return this.thermostatService;
   } else if (this.interfaceMode === InterfaceMode.HYBRID) {
     return this.targetTemperatureService;
   }
   return undefined;
 }

 /**
   * Update the current heating/cooling state in HomeKit
   */
 private updateCurrentHeatingCoolingState(): void {
  const service = this.getThermostatService();
  if (!service) return;
  
  const state = this.getCurrentHeatingCoolingState();
  
  service.updateCharacteristic(
    this.Characteristic.CurrentHeatingCoolingState,
    state
  );
  
  // Update target state too
  service.updateCharacteristic(
    this.Characteristic.TargetHeatingCoolingState,
    this.getTargetHeatingCoolingState()
  );
}

/**
 * Sync thermostat state with power switch state
 * Ensures both services show consistent states
 */
private syncThermostatState(): void {
  const service = this.getThermostatService();
  if (!service) return;
  
  const targetState = this.getTargetHeatingCoolingState();
  const currentState = this.getCurrentHeatingCoolingState();
  
  service.updateCharacteristic(
    this.Characteristic.TargetHeatingCoolingState,
    targetState
  );
  
  service.updateCharacteristic(
    this.Characteristic.CurrentHeatingCoolingState,
    currentState
  );
  
  this.platform.log.debug(`Synced thermostat state: target=${targetState === this.Characteristic.TargetHeatingCoolingState.OFF ? 'OFF' : 'AUTO'}, current=${currentState === this.Characteristic.CurrentHeatingCoolingState.OFF ? 'OFF' : 'ON'}`);
}

/**
 * Handle getting the target temperature
 * @returns Current target temperature
 */
private handleTargetTemperatureGet(): number {
  return this.targetTemperature || 21; // Default to 21°C if not set
}

/**
 * Unified power state management method
 * @param turnOn Whether to turn the device on or off
 * @param epoch Command epoch for cancellation tracking
 * @param source Source of the command for logging
 * @param temperature Optional temperature for turn on commands
 */
private async setPowerState(turnOn: boolean, epoch: number, source: string, temperature?: number): Promise<void> {
  // Skip if already in desired state
  if (this.isPowered === turnOn) {
    this.platform.log.debug(`Device already ${turnOn ? 'ON' : 'OFF'}, skipping update`);
    return;
  }

  // Mark user action time
  this.lastUserActionTime = Date.now();
  
  // Track user activity for context-aware caching
  this.apiClient.trackUserActivity(this.deviceId);
  
  // Cancel any pending operations for this device
  this.apiClient.cancelAllDeviceRequests(this.deviceId);

  await this.executeOperation('power', epoch, async () => {
    let success: boolean;
    
    if (turnOn) {
      const targetTemp = temperature !== undefined ? temperature : 
                        (isNaN(this.targetTemperature) ? 21 : this.targetTemperature);
      success = await this.apiClient.turnDeviceOn(this.deviceId, targetTemp);
      
      if (success) {
        this.isPowered = true;
        this.platform.log.info(`Device ${this.deviceId} turned ON successfully to ${targetTemp}°C via ${source}`);
        
        // Notify polling manager that device is now active
        if (this.platform.pollingManager) {
          this.platform.pollingManager.notifyDeviceActive(this.deviceId);
          // Trigger immediate poll if needed (uses smart joining logic)
          this.platform.pollingManager.triggerDevicePollIfNeeded(this.deviceId);
        }
      } else {
        throw new Error('Failed to turn on device');
      }
    } else {
      success = await this.apiClient.turnDeviceOff(this.deviceId);
      
      if (success) {
        this.isPowered = false;
        this.lastPowerOffTime = Date.now();
        this.platform.log.info(`Device ${this.deviceId} turned OFF successfully via ${source}`);
        
        // Notify polling manager that device is now inactive
        if (this.platform.pollingManager) {
          this.platform.pollingManager.notifyDeviceInactive(this.deviceId);
        }
      } else {
        throw new Error('Failed to turn off device');
      }
    }
    
    // Update UI immediately for responsiveness
    this.updateCurrentHeatingCoolingState();
    
    // Ensure all services are synchronized
    this.updateAllServices();
  });
}

/**
 * Handle setting the target heating cooling state
 * @param value Target heating cooling state value
 */
private async handleTargetHeatingCoolingStateSet(value: CharacteristicValue): Promise<void> {
  const shouldPowerOn = value !== this.Characteristic.TargetHeatingCoolingState.OFF;
  this.platform.log.info(`🎛️ User changed heating/cooling state: ${shouldPowerOn ? 'ON' : 'OFF'} for ${this.deviceId}`);
  
  // Increment command epoch to invalidate previous commands
  const currentEpoch = ++this.commandEpoch;
  
  if (value === this.Characteristic.TargetHeatingCoolingState.OFF) {
    // Turn off device
    this.platform.log.info(`🔴 Turning device OFF via heating/cooling state`);
    await this.setPowerState(false, currentEpoch, 'thermostat');
    
    // BUT immediately reset to AUTO mode to keep temperature dial responsive
    setTimeout(() => {
      const service = this.getThermostatService();
      if (service) {
        service.updateCharacteristic(
          this.Characteristic.TargetHeatingCoolingState,
          this.Characteristic.TargetHeatingCoolingState.AUTO
        );
        this.platform.log.debug(`Reset thermostat to AUTO mode to keep temperature dial responsive`);
      }
    }, 1000);
  } else {
    // Turn on with current temperature (AUTO/HEAT/COOL modes)
    this.platform.log.info(`🟢 Turning device ON via heating/cooling state`);
    await this.setPowerState(true, currentEpoch, 'thermostat');
  }
}
/**
   * Verify power state consistency
   * Note: We keep thermostat in AUTO mode for responsive temperature dial
   * Power state is shown separately via the power switch service
   */
private async verifyPowerState(): Promise<void> {
  // Always keep thermostat in AUTO mode for temperature dial responsiveness
  // The power switch service shows the actual device power state
  const service = this.getThermostatService();
  if (service) {
    service.updateCharacteristic(
      this.Characteristic.TargetHeatingCoolingState,
      this.Characteristic.TargetHeatingCoolingState.AUTO
    );
  }
}

/**
 * Execute an operation with epoch tracking for cancellation
 * @param operationType Type of operation
 * @param epoch Command epoch to track cancellation
 * @param operation Async operation to execute
 */
private async executeOperation(
  operationType: string, 
  epoch: number, 
  operation: () => Promise<void>
): Promise<void> {
  // Set pending operation
  this.pendingOperation = operationType;
  
  try {
    // Only execute if the epoch hasn't changed (no newer commands queued)
    if (epoch === this.commandEpoch) {
      await operation();
    } else {
      this.platform.log.debug(`Skipping stale ${operationType} operation (epoch ${epoch}, current ${this.commandEpoch})`);
    }
  } catch (error) {
    this.platform.log.error(
      `Error in ${operationType} operation: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error; // Re-throw for caller handling
  } finally {
    // Clear pending operation
    this.pendingOperation = null;
  }
}

/**
 * Execute an operation with rollback support for optimistic updates
 * @param operationType Type of operation
 * @param epoch Command epoch to track cancellation 
 * @param operation Async operation to execute
 * @param rollback Function to call if operation fails
 */
private async executeOperationWithRollback(
  operationType: string,
  epoch: number,
  operation: () => Promise<void>,
  rollback: () => void
): Promise<void> {
  // Set pending operation
  this.pendingOperation = operationType;
  
  try {
    // Only execute if the epoch hasn't changed (no newer commands queued)
    if (epoch === this.commandEpoch) {
      await operation();
      this.platform.log.debug(`✅ ${operationType} operation completed successfully`);
    } else {
      this.platform.log.debug(`Skipping stale ${operationType} operation (epoch ${epoch}, current ${this.commandEpoch})`);
      // Still call rollback since we did optimistic update
      rollback();
    }
  } catch (error) {
    this.platform.log.error(
      `❌ Error in ${operationType} operation: ${error instanceof Error ? error.message : String(error)}`
    );
    
    // Call rollback to undo optimistic update
    rollback();
    
    // Don't re-throw - we've handled the error with rollback
  } finally {
    // Clear pending operation
    this.pendingOperation = null;
  }
}

/**
 * Handle target temperature setting with trust-based approach
 * @param value New target temperature value
 */
private async handleTargetTemperatureSet(value: CharacteristicValue): Promise<void> {
  const newTemp = value as number;
  
  this.platform.log.info(`🌡️ Temperature dial changed to ${newTemp}°C (current: ${this.targetTemperature}°C, device powered: ${this.isPowered})`);
  
  // Skip if no real change
  if (!isNaN(this.targetTemperature) && Math.abs(this.targetTemperature - newTemp) < 0.5) {
    this.platform.log.debug(`Temperature change too small (${Math.abs(this.targetTemperature - newTemp)}°C), skipping`);
    return;
  }
  
  // Store previous temperature before updating UI
  const previousTemp = this.targetTemperature;
  
  // Mark user action time
  this.lastUserActionTime = Date.now();
  
  // Track user activity for context-aware caching
  this.apiClient.trackUserActivity(this.deviceId);
  
  // Update UI immediately for responsiveness
  this.targetTemperature = newTemp;
  
  // ALWAYS automatically switch to AUTO mode when user sets temperature (regardless of current state)
  // BUT only if the user didn't recently turn the device OFF (within 10 seconds)
  const timeSinceLastPowerOff = Date.now() - this.lastPowerOffTime;
  const shouldAutoTurnOn = this.lastPowerOffTime === 0 || timeSinceLastPowerOff > 10000;
  
  if (shouldAutoTurnOn) {
    this.platform.log.info(`🟢 Auto-switching to AUTO mode and power ON for temperature change`);
    
    // Always set to AUTO mode when user changes temperature (better UX)
    const service = this.getThermostatService();
    if (service) {
      service.updateCharacteristic(
        this.Characteristic.TargetHeatingCoolingState,
        this.Characteristic.TargetHeatingCoolingState.AUTO
      );
      this.platform.log.debug(`Thermostat service switched to AUTO mode`);
    } else {
      this.platform.log.warn(`No thermostat service found for AUTO mode switch`);
    }
    
    // ALSO update the power switch in hybrid mode (if it exists and device is off)
    if (this.powerSwitchService) {
      // Check both HomeKit characteristic value AND our internal state for reliability
      const currentSwitchState = this.powerSwitchService.getCharacteristic(this.Characteristic.On).value;
      this.platform.log.info(`🔌 Power switch sync check: HomeKit=${currentSwitchState}, Internal=${this.isPowered}`);
      
      // Update power switch if either HomeKit or internal state shows device is off
      if (!currentSwitchState || !this.isPowered) {
        this.powerSwitchService.updateCharacteristic(
          this.Characteristic.On,
          true
        );
        this.platform.log.info(`🟢 Auto-switching power switch to ON for temperature change (was HomeKit=${currentSwitchState}, Internal=${this.isPowered})`);
      } else {
        this.platform.log.info(`🟡 Power switch already ON - no sync needed (HomeKit=${currentSwitchState}, Internal=${this.isPowered})`);
      }
    } else {
      this.platform.log.warn(`⚠️ No power switch service found for hybrid mode sync`);
    }
  } else {
    this.platform.log.info(`Skipping auto-on for temperature change - device was recently turned OFF (${Math.round(timeSinceLastPowerOff/1000)}s ago)`);
  }
  
  // Log the change
  this.platform.log.info(`User set target temp: ${newTemp}°C for ${this.deviceId} - IMMEDIATE`);
  
  // Increment command epoch to invalidate previous commands
  const currentEpoch = ++this.commandEpoch;
  
  // Execute the temperature change operation
  await this.executeOperation('temperature', currentEpoch, async () => {
    // If device is off and we're changing temperature, turn it on
    // BUT only if the device wasn't recently turned off (within 10 seconds)
    const timeSinceLastPowerOff = Date.now() - this.lastPowerOffTime;
    const shouldTurnOn = !this.isPowered && (this.lastPowerOffTime === 0 || timeSinceLastPowerOff > 10000);
    
    if (shouldTurnOn) {
      const success = await this.apiClient.turnDeviceOn(this.deviceId, newTemp);
      
      if (success) {
        this.isPowered = true;
        this.platform.log.info(`Device turned ON with new temperature ${newTemp}°C`);
        
        // Update all services after power change to ensure synchronization
        this.updateAllServices();
        
        // Notify polling manager that device is now active for more frequent polling
        if (this.platform.pollingManager) {
          this.platform.pollingManager.notifyDeviceActive(this.deviceId);
          // Trigger immediate poll if needed (uses smart joining logic)
          this.platform.pollingManager.triggerDevicePollIfNeeded(this.deviceId);
        }
      } else {
        throw new Error(`Failed to turn on device with temperature ${newTemp}°C`);
      }
    } else if (!this.isPowered) {
      // Device is off and was recently turned off - don't auto-turn on
      this.platform.log.info(`Skipping temperature change - device was recently turned OFF (${Math.round(timeSinceLastPowerOff/1000)}s ago)`);
      return; // Skip the temperature change
    } else {
      // Device is already on, just change temperature
      const success = await this.apiClient.setTemperature(this.deviceId, newTemp);
      
      if (success) {
        this.platform.log.info(`Temperature set to ${newTemp}°C`);
      } else {
        // Revert UI to previous temperature on error
        this.targetTemperature = previousTemp;
        const service = this.getThermostatService();
        if (service) {
          service.updateCharacteristic(
            this.Characteristic.TargetTemperature,
            previousTemp
          );
        }
        throw new Error(`Failed to set temperature to ${newTemp}°C`);
      }
    }
    
    // Update the current heating/cooling state based on temperature difference
    this.updateCurrentHeatingCoolingState();
    
    // Ensure all services reflect the new state
    this.updateAllServices();
    
    // Notify polling manager that device is active (either newly on or temperature changed)
    if (this.platform.pollingManager) {
      this.platform.pollingManager.notifyDeviceActive(this.deviceId);
      // Trigger immediate poll if needed (uses smart joining logic)
      this.platform.pollingManager.triggerDevicePollIfNeeded(this.deviceId);
    }
  });
}
/**
   * Implementation for power state setting (called by debounced wrapper)
   * @param turnOn Whether to turn the device on
   */
private async handlePowerStateSetImpl(turnOn: boolean): Promise<void> {
  this.platform.log.info(`Processing power state change: ${turnOn ? 'ON' : 'OFF'}`);
  
  // Increment command epoch to invalidate previous commands
  const currentEpoch = ++this.commandEpoch;
  
  try {
    await this.setPowerState(turnOn, currentEpoch, 'switch');
  } catch (error) {
    this.platform.log.error(
      `Failed to set power state: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Update the water level service with current status
 * @param waterLevel Current water level percentage
 * @param isWaterLow Whether water level is considered low
 */
private updateWaterLevelService(waterLevel: number, isWaterLow: boolean): void {
  if (!this.waterLevelService || waterLevel === undefined) {
    return;
  }
  
  // Update characteristics
  this.waterLevelService.updateCharacteristic(
    this.Characteristic.BatteryLevel,
    waterLevel
  );
  
  this.waterLevelService.updateCharacteristic(
    this.Characteristic.StatusLowBattery,
    isWaterLow ? 1 : 0
  );
  
  this.waterLevelService.updateCharacteristic(
    this.Characteristic.ChargingState,
    this.Characteristic.ChargingState.NOT_CHARGING
  );
  
  // Log water level status if low
  if (isWaterLow) {
    this.platform.log.warn(`Water level low on device ${this.deviceId}: ${waterLevel}%`);
  }
  // Note: Normal water level updates are logged in updateDeviceState() to avoid duplication
}
/**
   * Detect device model based on attachments or other characteristics
   * @param data Raw device data from API
   * @returns Detected device model name
   */
private detectDeviceModel(data: Record<string, unknown>): string {
  // Check attachments first (most reliable)
  const attachments = this.apiClient.extractNestedValue(data, 'attachments');
  
  if (Array.isArray(attachments) && attachments.length > 0) {
    if (attachments.includes('CHILIPAD_PRO')) {
      return 'ChiliPad Pro';
    } else if (attachments.includes('OOLER')) {
      return 'OOLER Sleep System';
    } else if (attachments.includes('DOCK_PRO')) {
      return 'Dock Pro';
    }
  }
  
  // Check model field
  const model = this.apiClient.extractNestedValue(data, 'about.model') || 
               this.apiClient.extractNestedValue(data, 'model');
  
  if (model) {
    if (typeof model === 'string') {
      if (model.includes('DP')) {
        return 'Dock Pro';
      } else if (model.includes('OL')) {
        return 'OOLER Sleep System';
      } else if (model.includes('CP')) {
        return 'ChiliPad';
      }
      return `SleepMe ${model}`;
    }
  }
  
  // Check firmware version for clues
  const firmware = this.apiClient.extractNestedValue(data, 'about.firmware_version') ||
                  this.apiClient.extractNestedValue(data, 'firmware_version');
  
  if (firmware) {
    const firmwareStr = String(firmware);
    if (firmwareStr.startsWith('5.')) {
      return 'Dock Pro';
    } else if (firmwareStr.startsWith('4.')) {
      return 'OOLER Sleep System';
    } else if (firmwareStr.startsWith('3.')) {
      return 'ChiliPad';
    }
  }
  
  return 'SleepMe Device';
}


/**
 * Implementation of target temperature setting that makes the API call
 * @param newTemp New target temperature
 * @param previousTemp Previous target temperature before UI update
 */
private async handleTargetTemperatureSetImpl(newTemp: number, previousTemp: number): Promise<void> {
  this.platform.log.info(`Processing temperature change: ${previousTemp}°C → ${newTemp}°C`);
  
  // Skip truly redundant updates (using previous temp for comparison)
  // Allow very small changes (>= 0.5°C) which is the minimum HomeKit step
  if (Math.abs(newTemp - previousTemp) < 0.5) {
    this.platform.log.debug(`Skipping minor temperature adjustment (${Math.abs(newTemp - previousTemp).toFixed(1)}°C difference)`);
    return;
  }
  
  // Mark user action time for centralized polling
  this.lastUserActionTime = Date.now();
  
  try {
    // Only send the command if the device is powered on
    if (this.isPowered) {
      const success = await this.apiClient.setTemperature(this.deviceId, newTemp);
      
      if (success) {
        this.platform.log.info(`Temperature set to ${newTemp}°C`);
      } else {
        throw new Error(`Failed to set temperature to ${newTemp}°C`);
      }
    } else {
      // If device is off, turning on with the new temperature
      const success = await this.apiClient.turnDeviceOn(this.deviceId, newTemp);
      
      if (success) {
        this.isPowered = true;
        this.platform.log.info(`Device turned ON and temperature set to ${newTemp}°C`);
      } else {
        throw new Error(`Failed to turn on device and set temperature to ${newTemp}°C`);
      }
    }
    
    // Update the current heating/cooling state based on temperature difference
    this.updateCurrentHeatingCoolingState();
    
    // Ensure all services reflect the new state
    this.updateAllServices();
    
    // Notify polling manager of device activity
    if (this.platform.pollingManager) {
      if (this.isPowered) {
        this.platform.pollingManager.notifyDeviceActive(this.deviceId);
        // Trigger immediate poll if needed (uses smart joining logic)
        this.platform.pollingManager.triggerDevicePollIfNeeded(this.deviceId);
      }
    }
    
    // Status will be updated by centralized polling manager
  } catch (error) {
    this.platform.log.error(
      `Failed to set temperature: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Implementation of PollableDevice interface
 * Called by centralized polling manager when status is updated
 */
public onStatusUpdate(status: DeviceStatus): void {
  this.updateDeviceState(status);
}

/**
 * Implementation of PollableDevice interface  
 * Called by centralized polling manager when an error occurs
 */
public onError(error: Error): void {
  this.platform.log.error(`Polling error for ${this.displayName}: ${error.message}`);
  this.failedUpdateAttempts++;
}

/**
 * Update device state from polling manager
 * Called by centralized polling manager to update device state
 */
private updateDeviceState(status: DeviceStatus): void {
  // Update the last successful update timestamp
  this.lastStatusUpdate = Date.now();
  // Reset failed attempts counter on success
  this.failedUpdateAttempts = 0;
  
  // Log detailed status in verbose mode
  this.platform.log.verbose(
    `Device status received: current=${status.currentTemperature}°C, ` +
    `target=${status.targetTemperature}°C, ` +
    `thermal=${status.thermalStatus}, ` +
    `power=${status.powerState}` +
    (status.waterLevel !== undefined ? `, water=${status.waterLevel}%` : '')
  );
  
  // Update model if we can detect it from raw response
  if (status.rawResponse) {
    const detectedModel = this.detectDeviceModel(status.rawResponse);
    if (detectedModel !== this.deviceModel) {
      this.deviceModel = detectedModel;
      // Update the model in HomeKit
      this.informationService.updateCharacteristic(
        this.Characteristic.Model,
        this.deviceModel
      );
      this.platform.log.info(`Detected device model: ${this.deviceModel}`);
    }
  }
  
  // Update firmware version if available
  this.platform.log.debug(`Firmware version check: API=${status.firmwareVersion}, Current=${this.firmwareVersion}`);
  if (status.firmwareVersion !== undefined && status.firmwareVersion !== this.firmwareVersion) {
    const oldVersion = this.firmwareVersion;
    this.firmwareVersion = status.firmwareVersion;
    
    // Cache firmware version in accessory context for persistence
    this.accessory.context.firmwareVersion = this.firmwareVersion;
    
    // Update HomeKit characteristic - use setCharacteristic for reliability
    try {
      this.informationService.setCharacteristic(
        this.Characteristic.FirmwareRevision,
        this.firmwareVersion
      );
      
      // Force HomeKit to update by also calling updateCharacteristic
      setTimeout(() => {
        this.informationService.updateCharacteristic(
          this.Characteristic.FirmwareRevision,
          this.firmwareVersion
        );
        
        // Also force platform accessory update
        this.platform.homebridgeApi.updatePlatformAccessories([this.accessory]);
        this.platform.log.debug('Forced HomeKit platform accessory update for firmware');
      }, 100);
      
      this.platform.log.info(`Updated firmware version: ${oldVersion} → ${this.firmwareVersion} in HomeKit and cached`);
    } catch (error) {
      this.platform.log.error(`Failed to update firmware version in HomeKit: ${error}`);
    }
  }
  
  // Update current temperature
  if (isNaN(this.currentTemperature) || status.currentTemperature !== this.currentTemperature) {
    this.currentTemperature = status.currentTemperature;
    this.platform.log.verbose(`Current temperature updated to ${this.currentTemperature}°C`);
    
    // Update schedule manager with current temperature
    if (!isNaN(this.currentTemperature)) {
      this.updateScheduleManager(this.currentTemperature);
    }
  }
  
  // Update target temperature with smart initialization logic
  if (isNaN(this.targetTemperature) || status.targetTemperature !== this.targetTemperature) {
    
    // Detect external temperature changes from native app
    const hasExternalTempChange = !isNaN(this.lastKnownTargetTemp) && 
                                  this.lastKnownTargetTemp !== status.targetTemperature &&
                                  status.targetTemperature !== this.targetTemperature;
    
    if (hasExternalTempChange) {
      const timeSinceUserAction = Date.now() - this.lastUserActionTime;
      const wasRecentUserAction = timeSinceUserAction < USER_ACTION_QUIET_PERIOD_MS;
      
      if (!wasRecentUserAction) {
        this.externalChangeDetected = true;
        this.lastExternalChangeTime = Date.now();
        this.platform.log.info(
          `🔄 External temperature change detected: ${this.lastKnownTargetTemp}°C → ${status.targetTemperature}°C ` +
          `(likely from native app or schedule)`
        );
      }
    }
    
    // Determine the appropriate target temperature
    let newTargetTemp = status.targetTemperature;
    
    // Smart initialization: Only override on first startup or after long periods of inactivity
    // AND only if there's no evidence of external control
    const timeSinceLastUserAction = Date.now() - this.lastUserActionTime;
    const timeSinceExternalChange = Date.now() - this.lastExternalChangeTime;
    const isFirstStartup = this.isFirstStatusUpdate && this.lastUserActionTime === 0;
    const isLongInactive = !this.isFirstStatusUpdate && timeSinceLastUserAction > 300000; // 5 minutes instead of 1
    const hasRecentExternalActivity = this.externalChangeDetected && timeSinceExternalChange < 300000; // 5 minutes
    const isPoweredOff = status.powerState === PowerState.OFF || status.thermalStatus === ThermalStatus.OFF;
    
    // Smart initialization: At reboot/startup, always set target to current temperature
    // This prevents unwanted heating/cooling when Homebridge starts up
    // During runtime, respect external temperature changes from native app
    if (isFirstStartup && isPoweredOff && !isNaN(status.currentTemperature)) {
      // At reboot, always initialize target to current temperature for safety
      newTargetTemp = status.currentTemperature;
      this.platform.log.debug(
        `Reboot initialization: Setting target to current temperature (${newTargetTemp}°C) ` +
        `to prevent unwanted heating/cooling on startup`
      );
    } else if (hasRecentExternalActivity) {
      this.platform.log.debug(
        `Respecting external temperature setting (${newTargetTemp}°C) - ` +
        `recent external activity detected`
      );
    } else if (isLongInactive && isPoweredOff && !hasRecentExternalActivity && !isNaN(status.currentTemperature)) {
      // After long inactivity, also reset to current temperature
      newTargetTemp = status.currentTemperature;
      this.platform.log.debug(
        `Long inactivity reset: Setting target to current temperature (${newTargetTemp}°C) ` +
        `after extended period of inactivity`
      );
    }
    
    // Update tracking variables
    this.lastKnownTargetTemp = status.targetTemperature;
    this.targetTemperature = newTargetTemp;
    this.isFirstStatusUpdate = false;
    
    // Clamp target temperature to HomeKit valid range
    // API returns 999 for MAX HEAT and -1 for MAX COLD, but HomeKit has stricter limits
    let clampedTargetTemp = this.targetTemperature;
    if (this.targetTemperature > MAX_TEMPERATURE_C) {
      clampedTargetTemp = MAX_TEMPERATURE_C;
    } else if (this.targetTemperature < MIN_TEMPERATURE_C) {
      clampedTargetTemp = MIN_TEMPERATURE_C;
    }
    
    this.platform.log.verbose(`Target temperature updated to ${this.targetTemperature}°C (HomeKit: ${clampedTargetTemp}°C)`);
  }
  
  // Update power state based on thermal status and power state
  const newPowerState = status.powerState === PowerState.ON || 
                     (status.thermalStatus !== ThermalStatus.STANDBY && 
                      status.thermalStatus !== ThermalStatus.OFF);
                      
  if (this.isPowered !== newPowerState) {
    // Check if this was a user action
    const timeSinceUserAction = Date.now() - this.lastUserActionTime;
    const wasUserAction = timeSinceUserAction < USER_ACTION_QUIET_PERIOD_MS;
    
    if (!wasUserAction) {
      this.platform.log.info(
        `🔄 External control detected: Device ${this.deviceId} (${this.displayName}) ` +
        `power state changed: ${this.isPowered ? 'ON' : 'OFF'} → ${newPowerState ? 'ON' : 'OFF'} ` +
        `(likely from native app or schedule)`
      );
    } else {
      this.platform.log.info(
        `⚡ HomeKit control: Device ${this.deviceId} power state changed: ${this.isPowered ? 'ON' : 'OFF'} → ${newPowerState ? 'ON' : 'OFF'}`
      );
    }
    
    this.isPowered = newPowerState;
    
    // Track power off time if device was turned off
    if (!newPowerState) {
      this.lastPowerOffTime = Date.now();
    }
    
    // Sync thermostat state when power state changes from external sources
    this.syncThermostatState();
  }
  
  // Update water level if available
  if (status.waterLevel !== undefined) {
    if (status.waterLevel !== this.waterLevel || status.isWaterLow !== this.isWaterLow) {
      this.waterLevel = status.waterLevel;
      this.isWaterLow = !!status.isWaterLow;
      this.platform.log.verbose(`Water level updated to ${this.waterLevel}%`);
    }
  }
  
  // Update all HomeKit services based on interface mode
  this.updateAllServices();
  
  // Final state consistency check after all updates
  this.validateServiceStates();
}

/**
 * Fetch initial device status immediately after initialization
 * Tries cached data first to avoid rate limiting, then fresh if needed
 */
private async fetchInitialStatus(): Promise<void> {
  try {
    this.platform.log.debug(`Fetching initial status for ${this.deviceId}`);
    
    // First try cached data to avoid immediate rate limiting
    const context = {
      source: 'startup' as const,
      urgency: 'background' as const,
      operation: 'status' as const
    };
    const status = await this.apiClient.getDeviceStatus(this.deviceId, context, false); // Try cached first
    
    if (status) {
      this.platform.log.info(`Got initial cached status for ${this.deviceId}: power=${status.powerState}, temp=${status.currentTemperature}°C`);
      this.onStatusUpdate(status);
    } else {
      // No cached data available, try fresh call immediately
      this.platform.log.debug(`No cached status, trying fresh call immediately...`);
      try {
        const freshContext = {
          source: 'startup' as const,
          urgency: 'routine' as const,
          operation: 'status' as const
        };
        const freshStatus = await this.apiClient.getDeviceStatus(this.deviceId, freshContext, true);
        if (freshStatus) {
          this.platform.log.info(`Got initial fresh status for ${this.deviceId}: power=${freshStatus.powerState}, temp=${freshStatus.currentTemperature}°C`);
          this.onStatusUpdate(freshStatus);
        } else {
          this.platform.log.warn(`No fresh status available for ${this.deviceId}`);
        }
      } catch (error) {
        this.platform.log.warn(`Failed to fetch fresh initial status for ${this.deviceId}: ${error}`);
        // Will be retried by polling manager shortly
      }
    }
  } catch (error) {
    this.platform.log.error(`Failed to fetch initial status for ${this.deviceId}: ${error}`);
  }
}

/**
 * Clean up resources when this accessory is removed
 */
public cleanup(): void {
  // Unregister from centralized polling
  if (this.platform.pollingManager) {
    this.platform.pollingManager.unregisterDevice(this.deviceId);
  }
  
  this.platform.log.info(`Cleaned up accessory: ${this.displayName}`);
}
}