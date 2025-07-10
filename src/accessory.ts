/**
 * SleepMe Accessory
 * 
 * Implements HomeKit interface for SleepMe devices with simplified thermostat control
 * that only offers AUTO or OFF states
 */
import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { SleepMeSimplePlatform } from './platform.js';
import { SleepMeApi } from './api/sleepme-api.js';
import { ThermalStatus, PowerState } from './api/types.js';
import { 
  MIN_TEMPERATURE_C, 
  MAX_TEMPERATURE_C, 
  COMMAND_DEBOUNCE_DELAY_MS,
  USER_ACTION_QUIET_PERIOD_MS,
  InterfaceMode,
  DEFAULT_INTERFACE_MODE 
} from './settings.js';

/**
 * Creates a debounced function that limits how often a function can be called
 */
function debounce<T extends (...args: any[]) => any>(
  callback: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>): void {
    const callNow = immediate && !timeout;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      timeout = null;
      if (!immediate) {
        callback(...args);
      }
    }, wait);
    
    if (callNow) {
      callback(...args);
    }
  };
}

/**
 * Validates and clamps temperature to HomeKit acceptable range
 * SleepMe devices sometimes report extreme values like 999°C for schedule mode
 */
function validateTemperature(temperature: number, fallback = 21): number {
  // Handle special case where 999°C indicates schedule mode
  if (temperature >= 999) {
    return fallback;
  }
  
  // Clamp to HomeKit acceptable range
  return Math.max(MIN_TEMPERATURE_C, Math.min(MAX_TEMPERATURE_C, temperature));
}

/**
 * SleepMe Accessory
 * Provides a simplified HomeKit interface for SleepMe devices
 * with only AUTO and OFF (standby) modes
 */
export class SleepMeAccessory {
  // Core HomeKit services
  private informationService: Service;
  
  // Interface services (depends on mode)
  private thermostatService?: Service;
  private switchService?: Service;
  private temperatureSensorService?: Service;
  private waterLevelService?: Service;
  
  // Interface configuration
  private interfaceMode: InterfaceMode;
  
  // Device state
  private currentTemperature = 21;
  private targetTemperature = 21;
  private isPowered = false;
  private waterLevel = 100;
  private isWaterLow = false;
  
  // Device properties
  private readonly deviceId: string;
  private readonly displayName: string;
  private deviceModel = 'SleepMe Device';
  private firmwareVersion = 'Unknown';
  
  // Update control
  private statusUpdateTimer?: NodeJS.Timeout;
  private lastStatusUpdate = 0;
  private lastUserActionTime = 0;
  private failedUpdateAttempts = 0;
  private updateInProgress = false;
  
  // Debounced handlers
  private debouncedTemperatureSet: (temp: number) => void;
  private debouncedPowerSet: (on: boolean) => void;
  
  /**
   * Constructor for the SleepMe accessory
   */
  constructor(
    private readonly platform: SleepMeSimplePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly api: SleepMeApi
  ) {
    // Get device ID from accessory context
    this.deviceId = this.accessory.context.device?.id || '';
    this.displayName = this.accessory.displayName;
    
    if (!this.deviceId) {
      this.platform.log.error(`Accessory missing device ID: ${this.displayName}`);
      throw new Error(`Accessory missing device ID: ${this.displayName}`);
    }
    
    // Determine interface mode
    this.interfaceMode = this.platform.config.interfaceMode || DEFAULT_INTERFACE_MODE;
    
    // Create debounced handlers
    this.debouncedTemperatureSet = debounce(this.setTemperature.bind(this), COMMAND_DEBOUNCE_DELAY_MS);
    this.debouncedPowerSet = debounce(this.setPowerState.bind(this), COMMAND_DEBOUNCE_DELAY_MS);
    
    // Setup HomeKit services
    this.informationService = this.setupInformationService();
    this.setupInterface();
    
    // Initialize the device by fetching status after a delay
    setTimeout(() => this.refreshDeviceStatus(true), 15000);
    
    // Setup regular polling
    this.setupStatusPolling();
    
    this.platform.log.info(`Initialized ${this.displayName} (ID: ${this.deviceId})`);
  }
  
  /**
   * Set up the accessory information service
   */
  private setupInformationService(): Service {
    const service = this.accessory.getService(this.platform.Service.AccessoryInformation) || 
                   this.accessory.addService(this.platform.Service.AccessoryInformation);
    
    service
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'SleepMe Inc.')
      .setCharacteristic(this.platform.Characteristic.Model, this.deviceModel)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceId)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.firmwareVersion);
    
    // Set accessory category to THERMOSTAT
    this.accessory.category = this.platform.homebridgeApi.hap.Categories.THERMOSTAT;
    
    return service;
  }
  
  /**
   * Setup interface based on configured mode
   */
  private setupInterface(): void {
    this.platform.log.info(`Setting up ${this.interfaceMode} interface for ${this.displayName}`);
    
    // Clean up any existing services first
    this.cleanupExistingServices();
    
    switch (this.interfaceMode) {
      case InterfaceMode.SWITCH:
        this.setupSwitchInterface();
        break;
      case InterfaceMode.THERMOSTAT:
        this.setupThermostatInterface();
        break;
      case InterfaceMode.HYBRID:
      default:
        this.setupHybridInterface();
        break;
    }
  }
  
  /**
   * Clean up existing services to avoid conflicts
   */
  private cleanupExistingServices(): void {
    const servicesToRemove = [
      this.platform.Service.TemperatureSensor,
      this.platform.Service.Switch,
      this.platform.Service.Thermostat
    ];
    
    servicesToRemove.forEach(serviceType => {
      const existingService = this.accessory.getService(serviceType);
      if (existingService) {
        this.platform.log.info(`Removing existing ${serviceType.name} service`);
        this.accessory.removeService(existingService);
      }
    });
  }
  
  /**
   * Setup simple switch interface
   */
  private setupSwitchInterface(): void {
    // Power switch for simple ON/OFF
    this.switchService = this.accessory.addService(this.platform.Service.Switch, `${this.displayName} Power`);
    
    this.switchService
      .getCharacteristic(this.platform.Characteristic.On)
      .onGet(() => this.isPowered)
      .onSet(this.handlePowerToggle.bind(this));
    
    // Temperature sensor for monitoring
    this.temperatureSensorService = this.accessory.addService(
      this.platform.Service.TemperatureSensor, 
      `${this.displayName} Temperature`
    );
    
    this.temperatureSensorService
      .getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .setProps({
        minValue: MIN_TEMPERATURE_C - 5,
        maxValue: MAX_TEMPERATURE_C + 5,
        minStep: 0.1
      })
      .onGet(() => this.currentTemperature);
  }
  
  /**
   * Setup hybrid interface (power switch + temperature control)
   */
  private setupHybridInterface(): void {
    // 1. Power Switch - for simple ON/OFF control
    this.switchService = this.accessory.addService(this.platform.Service.Switch, `${this.displayName} Power`);
    
    this.switchService
      .getCharacteristic(this.platform.Characteristic.On)
      .onGet(() => this.isPowered)
      .onSet(this.handlePowerToggle.bind(this));
    
    // 2. Temperature sensor for monitoring current temperature
    this.temperatureSensorService = this.accessory.addService(
      this.platform.Service.TemperatureSensor, 
      `${this.displayName} Temperature`
    );
    
    this.temperatureSensorService
      .getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .setProps({
        minValue: MIN_TEMPERATURE_C - 5,
        maxValue: MAX_TEMPERATURE_C + 5,
        minStep: 0.1
      })
      .onGet(() => this.currentTemperature);
    
    // 3. Thermostat for temperature control
    this.setupThermostatInterface();
  }
  
  /**
   * Setup traditional thermostat interface
   */
  private setupThermostatInterface(): void {
    // Create thermostat service
    this.thermostatService = this.accessory.addService(this.platform.Service.Thermostat, this.displayName);
    
    // Configure basic characteristics
    this.thermostatService.setCharacteristic(this.platform.Characteristic.Name, this.displayName);
    
    // Set up current temperature
    this.thermostatService
      .getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .setProps({
        minValue: MIN_TEMPERATURE_C - 5,
        maxValue: MAX_TEMPERATURE_C + 5,
        minStep: 0.1
      })
      .onGet(() => this.currentTemperature);
    
    // Set up target temperature
    this.thermostatService
      .getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .setProps({
        minValue: MIN_TEMPERATURE_C,
        maxValue: MAX_TEMPERATURE_C,
        minStep: 0.5
      })
      .onGet(() => this.targetTemperature)
      .onSet(this.handleTargetTemperatureSet.bind(this));
    
    // Current heating/cooling state
    this.thermostatService
      .getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
      .onGet(() => this.getCurrentHeatingCoolingState());
    
    // Target heating/cooling state - IMPORTANT: ONLY OFF AND AUTO options
    const targetStateChar = this.thermostatService
      .getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState);
    
    // This is the key change - limit valid values to just OFF and AUTO
    targetStateChar.setProps({
      validValues: [
        this.platform.Characteristic.TargetHeatingCoolingState.OFF,
        this.platform.Characteristic.TargetHeatingCoolingState.AUTO
      ]
    });
    
    targetStateChar
      .onGet(() => this.getTargetHeatingCoolingState())
      .onSet(this.handleTargetHeatingCoolingStateSet.bind(this));
    
    // Set display units (Celsius)
    this.thermostatService
      .getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
      .setValue(this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS);
  }
  
  /**
   * Handle target temperature changes from HomeKit
   */
  private async handleTargetTemperatureSet(value: CharacteristicValue): Promise<void> {
    const newTemp = value as number;
    
    // Skip if no real change
    if (Math.abs(this.targetTemperature - newTemp) < 0.5) {
      return;
    }
    
    // Update state immediately for responsiveness
    this.targetTemperature = newTemp;
    this.lastUserActionTime = Date.now();
    
    this.platform.log.info(`Target temp: ${newTemp}°C for ${this.deviceId}`);
    
    // Turn on device if it's currently off
    if (!this.isPowered) {
      this.isPowered = true;
      this.updateAllServices();
    }
    
    // Use debounced temperature setter to avoid rapid API calls
    this.debouncedTemperatureSet(newTemp);
  }
  
  /**
   * Actually set temperature on the device (called by debounced handler)
   */
  private async setTemperature(temperature: number): Promise<void> {
    try {
      if (!this.isPowered) {
        const success = await this.api.turnDeviceOn(this.deviceId, temperature);
        if (success) {
          this.isPowered = true;
          this.updateAllServices();
        }
      } else {
        await this.api.setTemperature(this.deviceId, temperature);
      }
    } catch (error) {
      this.platform.log.error(`Failed to set temperature: ${error}`);
    }
  }
  
  /**
   * Handle target heating cooling state changes from HomeKit
   */
  private async handleTargetHeatingCoolingStateSet(value: CharacteristicValue): Promise<void> {
    const newState = value as number;
    const shouldPowerOn = newState === this.platform.Characteristic.TargetHeatingCoolingState.AUTO;
    
    // Skip if no change
    if (shouldPowerOn === this.isPowered) {
      return;
    }
    
    this.lastUserActionTime = Date.now();
    this.platform.log.info(`Power state: ${shouldPowerOn ? 'ON' : 'OFF'} for ${this.deviceId}`);
    
    // Update state immediately
    this.isPowered = shouldPowerOn;
    this.updateAllServices();
    
    // Use debounced setter to avoid rapid API calls
    this.debouncedPowerSet(shouldPowerOn);
  }
  
  /**
   * Actually set power state on device (called by debounced handler)
   */
  private async setPowerState(on: boolean): Promise<void> {
    try {
      if (on) {
        await this.api.turnDeviceOn(this.deviceId, this.targetTemperature);
      } else {
        await this.api.turnDeviceOff(this.deviceId);
      }
    } catch (error) {
      this.platform.log.error(`Failed to set power state: ${error}`);
    }
  }
  
  /**
   * Get current heating/cooling state based on temperature relation
   */
  private getCurrentHeatingCoolingState(): number {
    const Characteristic = this.platform.Characteristic;
    
    if (!this.isPowered) {
      return Characteristic.CurrentHeatingCoolingState.OFF;
    }
    
    // Using temperature difference to determine state
    if (this.currentTemperature < this.targetTemperature - 1.0) {
      return Characteristic.CurrentHeatingCoolingState.HEAT;
    } else if (this.currentTemperature > this.targetTemperature + 1.0) {
      return Characteristic.CurrentHeatingCoolingState.COOL;
    } else {
      return Characteristic.CurrentHeatingCoolingState.HEAT; // Default when at target
    }
  }
  
  /**
   * Get target heating/cooling state (AUTO when on, OFF when off)
   */
  private getTargetHeatingCoolingState(): number {
    return this.isPowered ? 
      this.platform.Characteristic.TargetHeatingCoolingState.AUTO :
      this.platform.Characteristic.TargetHeatingCoolingState.OFF;
  }
  
  /**
   * Power toggle handler for switch interface
   */
  private async handlePowerToggle(value: CharacteristicValue): Promise<void> {
    const shouldTurnOn = value as boolean;
    this.lastUserActionTime = Date.now();
    
    this.platform.log.info(`Power toggle: ${shouldTurnOn ? 'ON' : 'OFF'} for ${this.deviceId}`);
    
    // Skip if no real change
    if (shouldTurnOn === this.isPowered) {
      return;
    }
    
    // Update state immediately for responsiveness
    this.isPowered = shouldTurnOn;
    this.updateAllServices();
    
    // Use debounced setter to avoid rapid API calls
    this.debouncedPowerSet(shouldTurnOn);
  }
  
  /**
   * Update all services based on current interface mode
   */
  private updateAllServices(): void {
    switch (this.interfaceMode) {
      case InterfaceMode.SWITCH:
        this.updateSwitchServices();
        break;
      case InterfaceMode.THERMOSTAT:
        this.updateThermostatServices();
        break;
      case InterfaceMode.HYBRID:
      default:
        this.updateHybridServices();
        break;
    }
  }
  
  /**
   * Update switch interface services
   */
  private updateSwitchServices(): void {
    if (this.switchService) {
      this.switchService.updateCharacteristic(this.platform.Characteristic.On, this.isPowered);
    }
    if (this.temperatureSensorService) {
      this.temperatureSensorService.updateCharacteristic(
        this.platform.Characteristic.CurrentTemperature, 
        this.currentTemperature
      );
    }
  }
  
  /**
   * Update hybrid interface services
   */
  private updateHybridServices(): void {
    // Update power switch
    if (this.switchService) {
      this.switchService.updateCharacteristic(this.platform.Characteristic.On, this.isPowered);
    }
    
    // Update temperature sensor
    if (this.temperatureSensorService) {
      this.temperatureSensorService.updateCharacteristic(
        this.platform.Characteristic.CurrentTemperature, 
        this.currentTemperature
      );
    }
    
    // Update thermostat service
    this.updateThermostatServices();
  }
  
  /**
   * Update thermostat interface services
   */
  private updateThermostatServices(): void {
    if (this.thermostatService) {
      // Validate temperatures before updating HomeKit characteristics
      const validCurrentTemp = validateTemperature(this.currentTemperature, 21);
      const validTargetTemp = validateTemperature(this.targetTemperature, 21);
      
      this.thermostatService.updateCharacteristic(
        this.platform.Characteristic.CurrentTemperature, 
        validCurrentTemp
      );
      this.thermostatService.updateCharacteristic(
        this.platform.Characteristic.TargetTemperature, 
        validTargetTemp
      );
      this.updateHeatingCoolingStates();
    }
  }

  /**
   * Update heating/cooling state characteristics in HomeKit
   */
  private updateHeatingCoolingStates(): void {
    if (!this.thermostatService) {
      return;
    }
    
    const currentState = this.getCurrentHeatingCoolingState();
    const targetState = this.getTargetHeatingCoolingState();
    
    this.thermostatService.updateCharacteristic(
      this.platform.Characteristic.CurrentHeatingCoolingState,
      currentState
    );
    
    this.thermostatService.updateCharacteristic(
      this.platform.Characteristic.TargetHeatingCoolingState,
      targetState
    );
  }
  
  /**
   * Set up the status polling mechanism
   */
  private setupStatusPolling(): void {
    if (this.statusUpdateTimer) {
      clearInterval(this.statusUpdateTimer);
    }
    
    const pollingIntervalMs = this.platform.pollingInterval * 1000;
    
    this.statusUpdateTimer = setInterval(() => {
      // Skip update if another one is in progress
      if (this.updateInProgress) {
        return;
      }
      
      // Skip update if we've recently had user interaction
      const timeSinceUserAction = Date.now() - this.lastUserActionTime;
      if (timeSinceUserAction < USER_ACTION_QUIET_PERIOD_MS) {
        return;
      }
      
      // Apply exponential backoff for repeated failures
      if (this.failedUpdateAttempts > 1) {
        const backoffFactor = Math.min(8, Math.pow(2, this.failedUpdateAttempts - 1));
        const extendedInterval = pollingIntervalMs * backoffFactor;
        
        if (this.lastStatusUpdate && Date.now() - this.lastStatusUpdate < extendedInterval) {
          return;
        }
      }
      
      this.refreshDeviceStatus().catch(error => {
        this.failedUpdateAttempts++;
        this.platform.log.error(`Status update error: ${error}`);
      });
    }, pollingIntervalMs);
  }
  
  /**
   * Set up water level service for compatible devices
   */
  private setupWaterLevelService(waterLevel: number, isWaterLow: boolean): void {
    if (waterLevel === undefined) {
      return;
    }
    
    // Create service if it doesn't exist
    if (!this.waterLevelService) {
      this.waterLevelService = this.accessory.getService(this.platform.Service.Battery) ||
        this.accessory.addService(this.platform.Service.Battery, 'Water Level');
      
      this.waterLevelService.setCharacteristic(
        this.platform.Characteristic.Name,
        'Water Level'
      );
    }
    
    // Update characteristics
    this.waterLevelService.updateCharacteristic(
      this.platform.Characteristic.BatteryLevel,
      waterLevel
    );
    
    this.waterLevelService.updateCharacteristic(
      this.platform.Characteristic.StatusLowBattery,
      isWaterLow ? 1 : 0
    );
    
    this.waterLevelService.updateCharacteristic(
      this.platform.Characteristic.ChargingState,
      this.platform.Characteristic.ChargingState.NOT_CHARGING
    );
    
    if (isWaterLow) {
      this.platform.log.warn(`Water level low: ${waterLevel}%`);
    }
  }
  
  /**
   * Refresh device status from the API
   */
  private async refreshDeviceStatus(isInitialSetup = false): Promise<void> {
    // Skip if we've had recent user interaction
    if (!isInitialSetup) {
      const timeSinceUserAction = Date.now() - this.lastUserActionTime;
      if (timeSinceUserAction < USER_ACTION_QUIET_PERIOD_MS) {
        return;
      }
    }
    
    // Prevent concurrent updates
    if (this.updateInProgress) {
      return;
    }
    
    this.updateInProgress = true;
    
    try {
      // Get device status
      const status = await this.api.getDeviceStatus(this.deviceId, isInitialSetup);
      
      if (!status) {
        throw new Error(`Failed to get status for device ${this.deviceId}`);
      }
      
      // Update state
      this.lastStatusUpdate = Date.now();
      this.failedUpdateAttempts = 0;
      
      // Update firmware version if changed
      if (status.firmwareVersion && status.firmwareVersion !== this.firmwareVersion) {
        this.firmwareVersion = status.firmwareVersion;
        this.informationService.updateCharacteristic(
          this.platform.Characteristic.FirmwareRevision,
          this.firmwareVersion
        );
      }
      
      // Update current temperature
      if (status.currentTemperature !== this.currentTemperature) {
        this.currentTemperature = status.currentTemperature;
        
        // Update schedule manager with current temperature
        if (this.platform.scheduleManager) {
          this.platform.scheduleManager.updateDeviceTemperature(
            this.deviceId, 
            this.currentTemperature
          );
        }
      }
      
      // Update target temperature with validation
      if (status.targetTemperature !== this.targetTemperature) {
        const rawTargetTemp = status.targetTemperature;
        const validatedTargetTemp = validateTemperature(rawTargetTemp, this.targetTemperature);
        
        // Log when we receive extreme values (likely schedule mode)
        if (rawTargetTemp >= 999) {
          this.platform.log.debug(`Device ${this.deviceId} in schedule mode (Target=${rawTargetTemp}°C), using ${validatedTargetTemp}°C for HomeKit`);
        }
        
        this.targetTemperature = validatedTargetTemp;
      }
      
      // Update power state
      const newPowerState = status.powerState === PowerState.ON || 
                           (status.thermalStatus !== ThermalStatus.STANDBY && 
                            status.thermalStatus !== ThermalStatus.OFF);
      
      if (this.isPowered !== newPowerState) {
        this.isPowered = newPowerState;
      }
      
      // Update water level if available
      if (status.waterLevel !== undefined && 
         (status.waterLevel !== this.waterLevel || status.isWaterLow !== this.isWaterLow)) {
        this.waterLevel = status.waterLevel;
        this.isWaterLow = !!status.isWaterLow;
        this.setupWaterLevelService(this.waterLevel, this.isWaterLow);
      }
      
      // Update all HomeKit services based on interface mode
      this.updateAllServices();
    } catch (error) {
      this.failedUpdateAttempts++;
      this.platform.log.error(`Status refresh error: ${error}`);
    } finally {
      this.updateInProgress = false;
    }
  }
  
  /**
   * Clean up resources when accessory is removed
   */
  public cleanup(): void {
    if (this.statusUpdateTimer) {
      clearInterval(this.statusUpdateTimer);
      this.statusUpdateTimer = undefined;
    }
  }
}