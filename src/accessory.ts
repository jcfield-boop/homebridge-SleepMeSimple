/**
 * SleepMe Accessory
 * 
 * This class implements a HomeKit interface for SleepMe devices,
 * using the HeaterCooler service as the primary control interface
 */
import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { SleepMeSimplePlatform } from './platform.js';
import { SleepMeApi } from './api/sleepme-api.js';
import { ThermalStatus, PowerState } from './api/types.js';
import { MIN_TEMPERATURE_C, MAX_TEMPERATURE_C } from './settings.js';
/**
 * Create a debounced function
 * @param callback Function to debounce
 * @param wait Wait time in milliseconds
 * @returns Debounced function
 */
function debounce<T extends (...args: any[]) => any>(
  callback: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      timeout = null;
      callback(...args);
    }, wait);
  };
}
/**
 * SleepMe Accessory
 * Provides a simplified interface for SleepMe devices using the HeaterCooler service
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
  // Debounced function for temperature setting
private tempSetterDebounced: (value: CharacteristicValue) => void;
  // Device properties
  private readonly deviceId: string;
  private readonly displayName: string;
  private deviceModel = 'SleepMe Device';
  
  // Update control
  private statusUpdateTimer?: NodeJS.Timeout;
  private lastTemperatureSetTime = 0;
  
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
    
    // Create HeaterCooler service (main control)
    this.setupTemperatureControlService();
    
    // Initialize the device state by fetching current status
    this.refreshDeviceStatus(true)
      .catch(error => this.platform.log.error(
        `Error initializing device status: ${error instanceof Error ? error.message : String(error)}`
      ));
    // Create debounced temperature setter
this.tempSetterDebounced = debounce((value: CharacteristicValue) => {
  this.handleTargetTemperatureSetImpl(value);
}, 500); // 500ms debounce time
    // Set up polling interval
    this.setupStatusPolling();
    
    this.platform.log.info(`Accessory initialized: ${this.displayName} (ID: ${this.deviceId})`);
  }

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
 * This is the only primary service we'll expose to HomeKit
 */
private setupTemperatureControlService(): void {
  // Remove any existing services to avoid duplication
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
  
  const existingHeaterCoolerService = this.accessory.getService(this.platform.Service.HeaterCooler);
  if (existingHeaterCoolerService) {
    this.platform.log.info('Removing existing HeaterCooler service');
    this.accessory.removeService(existingHeaterCoolerService);
  }
  
  // Use Thermostat service for temperature control and power
  this.temperatureControlService = this.accessory.getService(this.platform.Service.Thermostat) ||
    this.accessory.addService(this.platform.Service.Thermostat, this.displayName);
  
  // Configure basic characteristics
  this.temperatureControlService
    .setCharacteristic(this.Characteristic.Name, this.displayName)
    .setCharacteristic(this.Characteristic.CurrentHeatingCoolingState, 
      this.isPowered ? this.Characteristic.CurrentHeatingCoolingState.HEAT : 
                      this.Characteristic.CurrentHeatingCoolingState.OFF)
  
  // Set up current temperature characteristic
  this.temperatureControlService
    .getCharacteristic(this.Characteristic.CurrentTemperature)
    .setProps({
      minValue: MIN_TEMPERATURE_C - 5, // Allow reporting slightly below min
      maxValue: MAX_TEMPERATURE_C + 5, // Allow reporting slightly above max
      minStep: 0.1
    })
    .onGet(() => this.currentTemperature || 20);
  
  // Set up target temperature characteristic (single value)
  this.temperatureControlService
    .getCharacteristic(this.Characteristic.TargetTemperature)
    .setProps({
      minValue: MIN_TEMPERATURE_C,
      maxValue: MAX_TEMPERATURE_C,
      minStep: 0.5
    })
    .onGet(() => isNaN(this.targetTemperature) ? 21 : this.targetTemperature)
    .onSet(this.handleTargetTemperatureSet.bind(this));
  
  // Set up heating/cooling state getters/setters
  this.temperatureControlService
    .getCharacteristic(this.Characteristic.TargetHeatingCoolingState)
    .setProps({
      validValues: [
        this.Characteristic.TargetHeatingCoolingState.OFF,
        this.Characteristic.TargetHeatingCoolingState.AUTO
      ]
    })
    .onGet(() => this.isPowered ? 
      this.Characteristic.TargetHeatingCoolingState.AUTO : 
      this.Characteristic.TargetHeatingCoolingState.OFF)
    .onSet((value) => {
      // Convert HomeKit state to power on/off
      const newPowerState = value !== this.Characteristic.TargetHeatingCoolingState.OFF;
      this.handlePowerStateSet(newPowerState);
    });
}
  /**
   * Add/update the water level service if supported
   * @param waterLevel - Current water level percentage
   * @param isWaterLow - Whether water level is considered low
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
 * Set up the status polling mechanism
 */
private setupStatusPolling(): void {
    // Clear any existing timer
    if (this.statusUpdateTimer) {
        clearInterval(this.statusUpdateTimer);
    }
    
    // Convert polling interval from seconds to milliseconds
    const intervalMs = this.platform.pollingInterval * 1000;
    
    this.platform.log.debug(
        `Setting up status polling every ${this.platform.pollingInterval} seconds for device ${this.deviceId}`
    );
    
    // Set up regular polling
    this.statusUpdateTimer = setInterval(() => {
        this.refreshDeviceStatus().catch(error => {
            this.platform.log.error(
                `Error updating device status: ${error instanceof Error ? error.message : String(error)}`
            );
        });
    }, intervalMs);
}
  /**
   * Detect device model based on attachments or other characteristics
   * @param data - Raw device data from API
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
      if (firmware.toString().startsWith('5.')) {
        return 'Dock Pro';
      } else if (firmware.toString().startsWith('4.')) {
        return 'OOLER Sleep System';
      } else if (firmware.toString().startsWith('3.')) {
        return 'ChiliPad';
      }
    }
    
    return 'SleepMe Device';
  }
  
  /**
   * Refresh the device status from the API
   * @param isInitialSetup - Whether this is the initial setup refresh
   */
  private async refreshDeviceStatus(isInitialSetup = false): Promise<void> {
    // Skip polling updates if we recently made a user-initiated change
    if (!isInitialSetup) {
      const timeSinceLastTemp = Date.now() - this.lastTemperatureSetTime;
      if (timeSinceLastTemp < 30000) { // 30 seconds
        this.platform.log.debug(
          `Skipping scheduled status update, recent user interaction ${Math.round(timeSinceLastTemp/1000)}s ago`
        );
        return;
      }
    }
    
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
        
        // Update the current temperature in HeaterCooler service
        this.temperatureControlService.updateCharacteristic(
          this.Characteristic.CurrentTemperature,
          this.currentTemperature
        );
        
        this.platform.log.verbose(`Current temperature updated to ${this.currentTemperature}°C`);
      }
      
      // Update target temperature
      if (isNaN(this.targetTemperature) || status.targetTemperature !== this.targetTemperature) {
        this.targetTemperature = status.targetTemperature;
        
        // Update both heating and cooling threshold temperatures
        this.temperatureControlService.updateCharacteristic(
          this.Characteristic.CoolingThresholdTemperature,
          this.targetTemperature
        );
        
        this.temperatureControlService.updateCharacteristic(
          this.Characteristic.HeatingThresholdTemperature,
          this.targetTemperature
        );
        
        this.platform.log.verbose(`Target temperature updated to ${this.targetTemperature}°C`);
      }
      
      // Update power state
      const newPowerState = status.powerState === PowerState.ON || 
                          status.thermalStatus !== ThermalStatus.STANDBY && 
                          status.thermalStatus !== ThermalStatus.OFF;
                          
      if (this.isPowered !== newPowerState) {
        this.isPowered = newPowerState;
        
        // Update the active state in HeaterCooler service
        this.temperatureControlService.updateCharacteristic(
          this.Characteristic.Active,
          this.isPowered ? 1 : 0
        );
        
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
    }
  }
 /**
 * Update the current heating/cooling state based on target vs current temperature
 * This helps HomeKit display the appropriate heating/cooling state icon
 */
private updateCurrentHeatingCoolingState(): void {
  if (!this.isPowered) {
    // If not powered, set to off
    this.temperatureControlService.updateCharacteristic(
      this.Characteristic.CurrentHeatingCoolingState,
      this.Characteristic.CurrentHeatingCoolingState.OFF
    );
    return;
  }
  
// Check if we have valid temperature readings
if (isNaN(this.currentTemperature) || isNaN(this.targetTemperature)) {
  this.temperatureControlService.updateCharacteristic(
    this.Characteristic.CurrentHeatingCoolingState,
    this.Characteristic.CurrentHeatingCoolingState.HEAT // Use HEAT as default instead of AUTO
  );
  return;
}
  
  // Determine if we're heating or cooling based on current vs target temperature
  if (this.currentTemperature < this.targetTemperature - 0.5) {
    // Heating up (with 0.5° threshold to prevent oscillation)
    this.temperatureControlService.updateCharacteristic(
      this.Characteristic.CurrentHeatingCoolingState,
      this.Characteristic.CurrentHeatingCoolingState.HEAT
    );
  } else if (this.currentTemperature > this.targetTemperature + 0.5) {
    // Cooling down
    this.temperatureControlService.updateCharacteristic(
      this.Characteristic.CurrentHeatingCoolingState,
      this.Characteristic.CurrentHeatingCoolingState.COOL
    );
  } else {
    // At target temperature (within threshold)
    // Use HEAT as default state when at target temperature
    this.temperatureControlService.updateCharacteristic(
      this.Characteristic.CurrentHeatingCoolingState,
      this.Characteristic.CurrentHeatingCoolingState.HEAT
    );
  } 
}
  /**
   * Handler for target temperature GET (used by both heating and cooling threshold temperatures)
   * @returns Current target temperature
   */
  private async handleTargetTemperatureGet(): Promise<CharacteristicValue> {
    const temp = isNaN(this.targetTemperature) ? 21 : this.targetTemperature;
    this.platform.log.debug(`GET Target Temperature: ${temp}°C`);
    return temp;
  }
  
  /**
 * Handler for power state SET
 * @param value - New power state value
 */
private async handlePowerStateSet(value: boolean): Promise<void> {
  const turnOn = value;
  this.platform.log.info(`SET Power State: ${turnOn ? 'ON' : 'OFF'}`);
  
  try {
    let success = false;
    
    if (turnOn) {
      // Turn on the device with current target temperature
      const temperature = isNaN(this.targetTemperature) ? 21 : this.targetTemperature;
      success = await this.apiClient.turnDeviceOn(this.deviceId, temperature);
      
      if (success) {
        this.isPowered = true;
        this.platform.log.info(`Device ${this.deviceId} turned ON successfully to ${temperature}°C`);
      }
    } else {
      // Turn off the device
      success = await this.apiClient.turnDeviceOff(this.deviceId);
      
      if (success) {
        this.isPowered = false;
        this.platform.log.info(`Device ${this.deviceId} turned OFF successfully`);
      }
    }
    
    if (!success) {
      throw new Error(`Failed to ${turnOn ? 'turn on' : 'turn off'} device`);
    }
    
    // Update the UI state immediately for responsiveness
    this.temperatureControlService.updateCharacteristic(
      this.Characteristic.TargetHeatingCoolingState,
      this.isPowered ? this.Characteristic.TargetHeatingCoolingState.AUTO : 
                      this.Characteristic.TargetHeatingCoolingState.OFF
    );
    
    // Update the current heating/cooling state
    this.updateCurrentHeatingCoolingState();
    
    // Refresh the status to get any other changes
    setTimeout(() => {
      this.refreshDeviceStatus(true).catch(e => {
        this.platform.log.debug(`Error refreshing status after power change: ${e}`);
      });
    }, 1000);
  } catch (error) {
    this.platform.log.error(
      `Failed to set power state: ${error instanceof Error ? error.message : String(error)}`
    );
    
    // Revert the switch if there was an error
    this.temperatureControlService.updateCharacteristic(
      this.Characteristic.TargetHeatingCoolingState,
      !turnOn ? this.Characteristic.TargetHeatingCoolingState.AUTO : 
                this.Characteristic.TargetHeatingCoolingState.OFF
    );
  }
}
/**
 * Handler for target temperature SET
 * @param value - New target temperature
 */
private handleTargetTemperatureSet(value: CharacteristicValue): void {
  // Update UI immediately for responsiveness
  this.targetTemperature = value as number;
  
  // Call the debounced implementation
  this.tempSetterDebounced(value);
}

/**
 * Implementation of target temperature setting that makes the API call
 * @param value - New target temperature
 */
private async handleTargetTemperatureSetImpl(value: CharacteristicValue): Promise<void> {
  const newTemp = value as number;
  
  this.platform.log.info(`SET Target Temperature: ${newTemp}°C`);
  
  try {
    // Remember the last time we changed the temperature
    this.lastTemperatureSetTime = Date.now();
    
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
        
        // Update the power state
        this.temperatureControlService.updateCharacteristic(
          this.Characteristic.TargetHeatingCoolingState,
          this.Characteristic.TargetHeatingCoolingState.AUTO
        );
        
        this.platform.log.info(`Device turned ON and temperature set to ${newTemp}°C`);
      } else {
        throw new Error(`Failed to turn on device and set temperature to ${newTemp}°C`);
      }
    }
    
    // Update the current heating/cooling state based on temperature difference
    this.updateCurrentHeatingCoolingState();
    
    // Refresh the status after a short delay
    setTimeout(() => {
      this.refreshDeviceStatus(true).catch(e => {
        this.platform.log.debug(`Error refreshing status after temperature change: ${e}`);
      });
    }, 1000);
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
