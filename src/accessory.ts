/**
 * SleepMe Accessory
 * 
 * This class implements a HomeKit interface for SleepMe devices,
 * using a combination of services for the best user experience
 */
import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { SleepMeSimplePlatform } from './platform.js';
import { SleepMeApi } from './api/sleepme-api.js';
import { ThermalStatus, PowerState } from './api/types.js';
import { 
  MIN_TEMPERATURE_C, 
  MAX_TEMPERATURE_C, 
  COMMAND_DEBOUNCE_DELAY_MS,
  USER_ACTION_QUIET_PERIOD_MS 
} from './settings.js';

/**
 * Create an enhanced debounced function with leading/trailing options
 * @param callback Function to debounce
 * @param wait Wait time in milliseconds
 * @param options Configuration options
 * @returns Debounced function
 */
function createSmartDebounce<T extends (...args: any[]) => any>(
  callback: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = { leading: false, trailing: true }
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  let isInvoking = false;
  
  return (...args: Parameters<T>): void => {
    lastArgs = args;
    
    // Function to execute the callback
    const executeCallback = () => {
      if (lastArgs) {
        isInvoking = true;
        try {
          callback(...lastArgs);
        } finally {
          isInvoking = false;
        }
      }
    };
    
    // Clear existing timeout
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    } 
    // Execute leading edge call if enabled and not currently invoking
    else if (options.leading && !isInvoking) {
      executeCallback();
    }
    
    // Set up trailing edge call if enabled
    if (options.trailing !== false) {
      timeout = setTimeout(() => {
        timeout = null;
        if (!isInvoking) {
          executeCallback();
        }
      }, wait);
    }
  };
}

/**
 * SleepMe Accessory
 * Provides a simplified interface for SleepMe devices
 */
export class SleepMeAccessory {
  // HomeKit services
  private temperatureControlService!: Service;
  private waterLevelService?: Service;
  private informationService!: Service;
  
  // Device state
  private currentTemperature = NaN;
  private targetTemperature = NaN;
  private isPowered = false;
  private firmwareVersion = 'Unknown';
  private waterLevel = 100; // Default full water level
  private isWaterLow = false;
  
  // Debounced functions for command handling
  private tempSetterDebounced: (newTemp: number, previousTemp: number) => void;
  private powerStateSetterDebounced: (turnOn: boolean) => void;
  
  // Device properties
  private readonly deviceId: string;
  private readonly displayName: string;
  private deviceModel = 'SleepMe Device';
  
  // Update control
  private statusUpdateTimer?: NodeJS.Timeout;
  private lastStatusUpdate = 0;
  private lastUserActionTime = 0;
  private failedUpdateAttempts = 0;
  private updateInProgress = false;
  private skipNextUpdate = false;

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
    
    this.platform.log.info(`Creating accessory for device ${this.deviceId} (${this.displayName})`);
    
    // Initialize accessory information service
    this.setupInformationService();
    
    // Create Thermostat service (main control)
    this.setupTemperatureControlService();

    // Create debounced temperature setter with smart options
    // Use leading edge for immediate feedback, but also trailing edge for final value
    this.tempSetterDebounced = createSmartDebounce(
      (newTemp: number, previousTemp: number) => {
        this.handleTargetTemperatureSetImpl(newTemp, previousTemp);
      }, 
      COMMAND_DEBOUNCE_DELAY_MS, 
      { leading: false, trailing: true }
    );
    
    // Create debounced power state setter
    // No leading edge to avoid too many power toggles 
    this.powerStateSetterDebounced = createSmartDebounce(
      (turnOn: boolean) => {
        this.handlePowerStateSetImpl(turnOn);
      },
      COMMAND_DEBOUNCE_DELAY_MS,
      { leading: false, trailing: true }
    );
    // Initialize the device state by fetching current status
    // Wait a moment before first status fetch to avoid immediate API call
    setTimeout(() => {
      this.refreshDeviceStatus(true)
        .catch(error => this.platform.log.error(
          `Error initializing device status: ${error instanceof Error ? error.message : String(error)}`
        ));
    }, 15000); // 15 second delay for initial status check
    
    // Set up polling interval
    this.setupStatusPolling();
    
    this.platform.log.info(`Accessory initialized: ${this.displayName} (ID: ${this.deviceId})`);
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
      .setCharacteristic(this.Characteristic.SerialNumber, this.deviceId)
      .setCharacteristic(this.Characteristic.FirmwareRevision, this.firmwareVersion);
    
    // Set the category to THERMOSTAT which is appropriate for temperature control
    this.accessory.category = this.platform.homebridgeApi.hap.Categories.THERMOSTAT;
  }

  /**
   * Set up the Thermostat service for temperature control
   */
  private setupTemperatureControlService(): void {
    // Remove any existing temperature or switch services to avoid duplication
    const existingTempService = this.accessory.getService(this.platform.Service.TemperatureSensor);
    if (existingTempService) {
      this.platform.log.info('Removing existing temperature sensor service');
      this.accessory.removeService(existingTempService);
    }
    
    const existingSwitchService = this.accessory.getService(this.platform.Service.Switch);
    if (existingSwitchService) {
      this.platform.log.info('Removing existing switch service');
      this.accessory.removeService(existingSwitchService);
    }
    
    // Remove existing HeaterCooler service if present
    const existingHeaterCoolerService = this.accessory.getService(this.platform.Service.HeaterCooler);
    if (existingHeaterCoolerService) {
      this.platform.log.info('Removing existing HeaterCooler service');
      this.accessory.removeService(existingHeaterCoolerService);
    }
    
    // Use Thermostat service for temperature control
    this.temperatureControlService = this.accessory.getService(this.platform.Service.Thermostat) ||
      this.accessory.addService(this.platform.Service.Thermostat, this.displayName);
    
    // Configure basic characteristics
    this.temperatureControlService
      .setCharacteristic(this.Characteristic.Name, this.displayName)
      .setCharacteristic(this.Characteristic.CurrentHeatingCoolingState, this.Characteristic.CurrentHeatingCoolingState.OFF)
      .setCharacteristic(this.Characteristic.TargetHeatingCoolingState, this.Characteristic.TargetHeatingCoolingState.OFF);
    
    // Set up current temperature characteristic
    this.temperatureControlService
      .getCharacteristic(this.Characteristic.CurrentTemperature)
      .setProps({
        minValue: MIN_TEMPERATURE_C - 5, // Allow reporting slightly below min
        maxValue: MAX_TEMPERATURE_C + 5, // Allow reporting slightly above max
        minStep: 0.1
      })
      .onGet(() => this.currentTemperature || 20);
    
    // Set up target temperature characteristic
    this.temperatureControlService
      .getCharacteristic(this.Characteristic.TargetTemperature)
      .setProps({
        minValue: MIN_TEMPERATURE_C,
        maxValue: MAX_TEMPERATURE_C,
        minStep: 0.5
      })
      .onGet(this.handleTargetTemperatureGet.bind(this))
      .onSet(this.handleTargetTemperatureSet.bind(this));
   // Set up current heating/cooling state
   this.temperatureControlService
   .getCharacteristic(this.Characteristic.CurrentHeatingCoolingState)
   .onGet(() => this.getCurrentHeatingCoolingState());
 
 // Set up target heating/cooling state
 this.temperatureControlService
   .getCharacteristic(this.Characteristic.TargetHeatingCoolingState)
   .onGet(() => this.getTargetHeatingCoolingState())
   .onSet((value) => {
     this.handleTargetHeatingCoolingStateSet(value as number);
   });
 
 // Set initial display unit (Celsius)
 this.temperatureControlService
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
* Verify the current device state by forcing a refresh
* Used after critical operations like power changes
*/
private async verifyDeviceState(): Promise<void> {
 try {
   this.platform.log.debug('Verifying device state consistency...');
   
   // Force a fresh status update
   const status = await this.apiClient.getDeviceStatus(this.deviceId, true);
   
   if (status) {
     // Update our internal state to match reality
     const actualPowerState = status.powerState === PowerState.ON;
     
     if (this.isPowered !== actualPowerState) {
       this.platform.log.info(
         `Power state mismatch detected. UI shows: ${this.isPowered ? 'ON' : 'OFF'}, ` +
         `Actual: ${actualPowerState ? 'ON' : 'OFF'}. Updating UI.`
       );
       
       // Update internal state
       this.isPowered = actualPowerState;
       
       // Update UI
       this.updateCurrentHeatingCoolingState();
     }
   }
 } catch (error) {
   this.platform.log.error(`Error verifying device state: ${error}`);
 }
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
*/
private getTargetHeatingCoolingState(): number {
 return this.isPowered ? 
   this.Characteristic.TargetHeatingCoolingState.AUTO : 
   this.Characteristic.TargetHeatingCoolingState.OFF;
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
   * Update the current heating/cooling state in HomeKit
   */
 private updateCurrentHeatingCoolingState(): void {
  const state = this.getCurrentHeatingCoolingState();
  
  this.temperatureControlService.updateCharacteristic(
    this.Characteristic.CurrentHeatingCoolingState,
    state
  );
  
  // Update target state too
  this.temperatureControlService.updateCharacteristic(
    this.Characteristic.TargetHeatingCoolingState,
    this.getTargetHeatingCoolingState()
  );
}

/**
 * Handle getting the target temperature
 * @returns Current target temperature
 */
private handleTargetTemperatureGet(): number {
  return this.targetTemperature || 21; // Default to 21°C if not set
}

/**
 * Handle setting the target heating cooling state
 * @param value Target heating cooling state value
 */
private async handleTargetHeatingCoolingStateSet(value: number): Promise<void> {
  this.platform.log.info(`SET Target Heating Cooling State: ${value}`);
  
  // Mark user action time
  this.lastUserActionTime = Date.now();
  
  // Increment command epoch to invalidate previous commands
  const currentEpoch = ++this.commandEpoch;
  
  // Cancel any pending operations for this device
  this.apiClient.cancelAllDeviceRequests(this.deviceId);
  
  switch (value) {
    case this.Characteristic.TargetHeatingCoolingState.OFF:
      // Turn off
      if (this.isPowered) {
        await this.executeOperation('power', currentEpoch, async () => {
          const success = await this.apiClient.turnDeviceOff(this.deviceId);
          
          if (success) {
            // Trust the API response - device is now off
            this.isPowered = false;
            this.platform.log.info(`Device ${this.deviceId} turned OFF successfully`);
            
            // Update UI immediately for responsiveness
            this.updateCurrentHeatingCoolingState();
            
            // Verify the state after a short delay
            setTimeout(() => this.verifyDeviceState(), 5000);
          } else {
            throw new Error('Failed to turn off device');
          }
        });
      }
      break;
      
    case this.Characteristic.TargetHeatingCoolingState.AUTO:
    case this.Characteristic.TargetHeatingCoolingState.HEAT:
    case this.Characteristic.TargetHeatingCoolingState.COOL:
      // Turn on with current temperature
      if (!this.isPowered) {
        const temperature = isNaN(this.targetTemperature) ? 21 : this.targetTemperature;
        
        await this.executeOperation('power', currentEpoch, async () => {
          const success = await this.apiClient.turnDeviceOn(this.deviceId, temperature);
          
          if (success) {
            // Trust the API response - device is now on
            this.isPowered = true;
            this.platform.log.info(`Device ${this.deviceId} turned ON successfully to ${temperature}°C`);
            
            // Update UI immediately for responsiveness
            this.updateCurrentHeatingCoolingState();
          } else {
            throw new Error('Failed to turn on device');
          }
        });
      }
      
      // For SleepMe devices, we treat all active modes as AUTO
      setTimeout(() => {
        this.temperatureControlService.updateCharacteristic(
          this.Characteristic.TargetHeatingCoolingState,
          this.Characteristic.TargetHeatingCoolingState.AUTO
        );
      }, 100);
      break;
  }
}
/**
   * Verify power state consistency
   */
private async verifyPowerState(): Promise<void> {
  // Changed comparison to correctly compare the power state with the heating/cooling state
  const currentTargetState = this.getTargetHeatingCoolingState();
  const expectedState = this.isPowered ? 
    this.Characteristic.TargetHeatingCoolingState.AUTO : 
    this.Characteristic.TargetHeatingCoolingState.OFF;
    
  if (currentTargetState !== expectedState) {
    this.platform.log.debug('Verifying power state consistency...');
    
    // Force UI to match our internal state
    this.temperatureControlService.updateCharacteristic(
      this.Characteristic.TargetHeatingCoolingState,
      this.isPowered ? 
        this.Characteristic.TargetHeatingCoolingState.AUTO : 
        this.Characteristic.TargetHeatingCoolingState.OFF
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
 * Handle target temperature setting with trust-based approach
 * @param value New target temperature value
 */
private async handleTargetTemperatureSet(value: CharacteristicValue): Promise<void> {
  const newTemp = value as number;
  
  // Skip if no real change
  if (!isNaN(this.targetTemperature) && Math.abs(this.targetTemperature - newTemp) < 0.5) {
    return;
  }
  
  // Store previous temperature before updating UI
  const previousTemp = this.targetTemperature;
  
  // Mark user action time
  this.lastUserActionTime = Date.now();
  
  // Update UI immediately for responsiveness
  this.targetTemperature = newTemp;
  
  // Log the change
  this.platform.log.info(`Target temperature change request: ${previousTemp}°C → ${newTemp}°C`);
  
  // Increment command epoch to invalidate previous commands
  const currentEpoch = ++this.commandEpoch;
  
  // Execute the temperature change operation
  await this.executeOperation('temperature', currentEpoch, async () => {
    // If device is off and we're changing temperature, turn it on
    if (!this.isPowered) {
      const success = await this.apiClient.turnDeviceOn(this.deviceId, newTemp);
      
      if (success) {
        this.isPowered = true;
        this.platform.log.info(`Device turned ON with new temperature ${newTemp}°C`);
        
        // Update heating/cooling state after power change
        this.updateCurrentHeatingCoolingState();
      } else {
        throw new Error(`Failed to turn on device with temperature ${newTemp}°C`);
      }
    } else {
      // Device is already on, just change temperature
      const success = await this.apiClient.setTemperature(this.deviceId, newTemp);
      
      if (success) {
        this.platform.log.info(`Temperature set to ${newTemp}°C`);
      } else {
        throw new Error(`Failed to set temperature to ${newTemp}°C`);
        
        // Revert UI to previous temperature on error
        this.targetTemperature = previousTemp;
        this.temperatureControlService.updateCharacteristic(
          this.Characteristic.TargetTemperature,
          previousTemp
        );
      }
    }
    
    // Update the current heating/cooling state based on temperature difference
    this.updateCurrentHeatingCoolingState();
  });
}
/**
   * Implementation for power state setting (called by debounced wrapper)
   * @param turnOn Whether to turn the device on
   */
private async handlePowerStateSetImpl(turnOn: boolean): Promise<void> {
  this.platform.log.info(`Processing power state change: ${turnOn ? 'ON' : 'OFF'}`);
  
  // Skip if already in desired state
  if (this.isPowered === turnOn) {
    this.platform.log.debug(`Device already ${turnOn ? 'ON' : 'OFF'}, skipping update`);
    return;
  }
  
  try {
    if (turnOn) {
      // Turn on device
      const temperature = isNaN(this.targetTemperature) ? 21 : this.targetTemperature;
      const success = await this.apiClient.turnDeviceOn(this.deviceId, temperature);
      
      if (success) {
        this.isPowered = true;
        this.platform.log.info(`Device turned ON successfully with temperature ${temperature}°C`);
      } else {
        throw new Error('Failed to turn on device');
      }
    } else {
      // Turn off device
      const success = await this.apiClient.turnDeviceOff(this.deviceId);
      
      if (success) {
        this.isPowered = false;
        this.platform.log.info(`Device turned OFF successfully`);
      } else {
        throw new Error('Failed to turn off device');
      }
    }
    
    // Update the current heating/cooling state
    this.updateCurrentHeatingCoolingState();
  } catch (error) {
    this.platform.log.error(
      `Failed to set power state: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Add/update the water level service if supported
 * @param waterLevel Current water level percentage
 * @param isWaterLow Whether water level is considered low
 */
private setupWaterLevelService(waterLevel: number, isWaterLow: boolean): void {
  // Only create if water level data is available
  if (waterLevel !== undefined) {
    // Create service if it doesn't exist
    if (!this.waterLevelService) {
      this.waterLevelService = this.accessory.getService(this.platform.Service.Battery) ||
        this.accessory.addService(this.platform.Service.Battery, 'Water Level');
        
      this.waterLevelService.setCharacteristic(
        this.Characteristic.Name,
        'Water Level'
      );
      
      this.platform.log.info(`Created water level service for device ${this.deviceId}`);
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
    } else {
      this.platform.log.verbose(`Water level updated to ${waterLevel}%`);
    }
  }
}
/**
   * Set up the status polling mechanism with trust-based adaptive intervals
   */
private setupStatusPolling(): void {
  // Clear any existing timer
  if (this.statusUpdateTimer) {
    clearInterval(this.statusUpdateTimer);
  }
  
  // Convert polling interval from seconds to milliseconds
  const pollingIntervalMs = this.platform.pollingInterval * 1000;
  
  this.platform.log.debug(
    `Setting up status polling every ${this.platform.pollingInterval} seconds for device ${this.deviceId}`
  );
  
  // Set up regular polling with adaptive interval
  this.statusUpdateTimer = setInterval(() => {
    // Skip update if another one is in progress to prevent queue buildup
    if (this.updateInProgress) {
      this.platform.log.debug('Skipping update, another one already in progress');
      return;
    }

    // Skip update if there's a pending operation
    if (this.pendingOperation) {
      this.platform.log.debug('Skipping update, pending operation in progress');
      return;
    }

    // Skip update if manually marked to skip (after user interaction)
    if (this.skipNextUpdate) {
      this.platform.log.debug('Skipping scheduled update due to recent user interaction');
      this.skipNextUpdate = false;
      return;
    }

    // Significantly longer quiet period for trust-based approach
    // Since we trust API responses, we can go longer between polls
    const quietPeriod = USER_ACTION_QUIET_PERIOD_MS * 1.5;
    const timeSinceUserAction = Date.now() - this.lastUserActionTime;
    if (timeSinceUserAction < quietPeriod) {
      this.platform.log.debug(
        `Skipping update, within quiet period after user action (${Math.round(timeSinceUserAction/1000)}s of ${Math.round(quietPeriod/1000)}s)`
      );
      return;
    }

    // Dynamic polling frequency based on device state
    let shouldPoll = true;
    
    if (!this.isPowered) {
      // Device is off - poll much less frequently
      // Only poll every 3x the interval when device is off
      if (this.lastStatusUpdate && Date.now() - this.lastStatusUpdate < pollingIntervalMs * 3) {
        shouldPoll = false;
        this.platform.log.debug('Device is inactive, using extended polling interval');
      }
    }
    
    // If we've had several failed attempts, back off exponentially
    if (this.failedUpdateAttempts > 1) {
      const backoffFactor = Math.min(8, Math.pow(2, this.failedUpdateAttempts - 1));
      const extendedInterval = pollingIntervalMs * backoffFactor;
      
      if (this.lastStatusUpdate && Date.now() - this.lastStatusUpdate < extendedInterval) {
        shouldPoll = false;
        this.platform.log.debug(`Backing off polling due to ${this.failedUpdateAttempts} failed attempts`);
      }
    }

    if (shouldPoll) {
      this.refreshDeviceStatus().catch(error => {
        this.failedUpdateAttempts++;
        this.platform.log.error(
          `Error updating device status (attempt ${this.failedUpdateAttempts}): ${error instanceof Error ? error.message : String(error)}`
        );
      });
    }
  }, pollingIntervalMs);
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
 * Refresh the device status from the API with trust-based approach
 * @param isInitialSetup Whether this is the initial setup refresh
 */
private async refreshDeviceStatus(isInitialSetup = false): Promise<void> {
  // Skip polling updates if we recently made a user-initiated change
  if (!isInitialSetup) {
    const timeSinceUserAction = Date.now() - this.lastUserActionTime;
    if (timeSinceUserAction < USER_ACTION_QUIET_PERIOD_MS) {
      this.platform.log.debug(
        `Skipping scheduled status update, recent user interaction ${Math.round(timeSinceUserAction/1000)}s ago`
      );
      this.skipNextUpdate = true; // Skip next update too
      return;
    }
  }
  
  // Prevent concurrent updates
  if (this.updateInProgress) {
    this.platform.log.debug('Update already in progress, skipping');
    return;
  }
  
  this.updateInProgress = true;
  
  try {
    // Force fresh data on initial setup, otherwise use cache when appropriate
    const forceFresh = isInitialSetup;
    
    this.platform.log.verbose(
      `Refreshing status for device ${this.deviceId} (${forceFresh ? 'fresh' : 'cached if available'})`
    );
    
    // Get the device status from the API
    const status = await this.apiClient.getDeviceStatus(this.deviceId, forceFresh);
    
    if (!status) {
      throw new Error(`Failed to get status for device ${this.deviceId}`);
    }
    
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
    if (status.firmwareVersion !== undefined && status.firmwareVersion !== this.firmwareVersion) {
      this.firmwareVersion = status.firmwareVersion;
      
      // Update HomeKit characteristic
      this.informationService.updateCharacteristic(
        this.Characteristic.FirmwareRevision,
        this.firmwareVersion
      );
      
      this.platform.log.info(`Updated firmware version to ${this.firmwareVersion}`);
    }
    
    // Update current temperature
    if (isNaN(this.currentTemperature) || status.currentTemperature !== this.currentTemperature) {
      this.currentTemperature = status.currentTemperature;
      
      // Update the current temperature in Thermostat service
      this.temperatureControlService.updateCharacteristic(
        this.Characteristic.CurrentTemperature,
        this.currentTemperature
      );
      
      this.platform.log.verbose(`Current temperature updated to ${this.currentTemperature}°C`);
      
      // Inside refreshDeviceStatus method, after updating currentTemperature
      if (!isNaN(this.currentTemperature)) {
        this.updateScheduleManager(this.currentTemperature);
      }
    }
    
    // Update target temperature
    if (isNaN(this.targetTemperature) || status.targetTemperature !== this.targetTemperature) {
      this.targetTemperature = status.targetTemperature;
      
      // Update target temperature in Thermostat service
      this.temperatureControlService.updateCharacteristic(
        this.Characteristic.TargetTemperature,
        this.targetTemperature
      );
      
      this.platform.log.verbose(`Target temperature updated to ${this.targetTemperature}°C`);
    }
    
    // Update power state based on thermal status and power state
    const newPowerState = status.powerState === PowerState.ON || 
                       (status.thermalStatus !== ThermalStatus.STANDBY && 
                        status.thermalStatus !== ThermalStatus.OFF);
                        
    if (this.isPowered !== newPowerState) {
      this.isPowered = newPowerState;
      this.platform.log.verbose(`Power state updated to ${this.isPowered ? 'ON' : 'OFF'}`);
    }
    
    // Update the current heating/cooling state
    this.updateCurrentHeatingCoolingState();
    // Update water level if available
    if (status.waterLevel !== undefined) {
      if (status.waterLevel !== this.waterLevel || status.isWaterLow !== this.isWaterLow) {
        this.waterLevel = status.waterLevel;
        this.isWaterLow = !!status.isWaterLow;
        
        // Update or create the water level service
        this.setupWaterLevelService(this.waterLevel, this.isWaterLow);
      }
    }
  } catch (error) {
    this.platform.log.error(
      `Failed to refresh device status: ${error instanceof Error ? error.message : String(error)}`
    );
    // Increment failed attempts counter
    this.failedUpdateAttempts++;
  } finally {
    // Always clear the in-progress flag when done
    this.updateInProgress = false;
  }
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
  
  // Mark that we shouldn't poll right after this user action
  this.skipNextUpdate = true;
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
    
    // Refresh the status after a delay to get any other changes
    // but use a longer delay to avoid rate limiting
    setTimeout(() => {
      this.refreshDeviceStatus(true).catch(e => {
        this.platform.log.debug(`Error refreshing status after temperature change: ${e}`);
      });
    }, 10000); // 10 seconds
  } catch (error) {
    this.platform.log.error(
      `Failed to set temperature: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Clean up resources when this accessory is removed
 */
public cleanup(): void {
  if (this.statusUpdateTimer) {
    clearInterval(this.statusUpdateTimer);
    this.statusUpdateTimer = undefined;
  }
  
  this.platform.log.info(`Cleaned up accessory: ${this.displayName}`);
}
}