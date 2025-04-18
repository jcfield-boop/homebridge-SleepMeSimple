import { ThermalStatus, PowerState } from './api/types.js';
import { MIN_TEMPERATURE_C, MAX_TEMPERATURE_C, COMMAND_DEBOUNCE_DELAY_MS, USER_ACTION_QUIET_PERIOD_MS } from './settings.js';
/**
 * Creates a debounced function that limits how often a function can be called
 */
function debounce(callback, wait, immediate = false) {
    let timeout = null;
    return function (...args) {
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
 * SleepMe Accessory
 * Provides a simplified HomeKit interface for SleepMe devices
 * with only AUTO and OFF (standby) modes
 */
export class SleepMeAccessory {
    platform;
    accessory;
    api;
    // HomeKit services
    thermostatService;
    waterLevelService;
    informationService;
    // Device state
    currentTemperature = 21;
    targetTemperature = 21;
    isPowered = false;
    waterLevel = 100;
    isWaterLow = false;
    // Device properties
    deviceId;
    displayName;
    deviceModel = 'SleepMe Device';
    firmwareVersion = 'Unknown';
    // Update control
    statusUpdateTimer;
    lastStatusUpdate = 0;
    lastUserActionTime = 0;
    failedUpdateAttempts = 0;
    updateInProgress = false;
    // Debounced handlers
    debouncedTemperatureSet;
    debouncedPowerSet;
    /**
     * Constructor for the SleepMe accessory
     */
    constructor(platform, accessory, api) {
        this.platform = platform;
        this.accessory = accessory;
        this.api = api;
        // Get device ID from accessory context
        this.deviceId = this.accessory.context.device?.id || '';
        this.displayName = this.accessory.displayName;
        if (!this.deviceId) {
            this.platform.log.error(`Accessory missing device ID: ${this.displayName}`);
            throw new Error(`Accessory missing device ID: ${this.displayName}`);
        }
        // Create debounced handlers
        this.debouncedTemperatureSet = debounce(this.setTemperature.bind(this), COMMAND_DEBOUNCE_DELAY_MS);
        this.debouncedPowerSet = debounce(this.setPowerState.bind(this), COMMAND_DEBOUNCE_DELAY_MS);
        // Setup HomeKit services
        this.informationService = this.setupInformationService();
        this.thermostatService = this.setupThermostatService();
        // Initialize the device by fetching status after a delay
        setTimeout(() => this.refreshDeviceStatus(true), 15000);
        // Setup regular polling
        this.setupStatusPolling();
        this.platform.log.info(`Initialized ${this.displayName} (ID: ${this.deviceId})`);
    }
    /**
     * Set up the accessory information service
     */
    setupInformationService() {
        const service = this.accessory.getService(this.platform.Service.AccessoryInformation) ||
            this.accessory.addService(this.platform.Service.AccessoryInformation);
        service
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'SleepMe Inc.')
            .setCharacteristic(this.platform.Characteristic.Model, this.deviceModel)
            .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceId)
            .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.firmwareVersion);
        // Set accessory category to THERMOSTAT
        this.accessory.category = 9 /* this.platform.homebridgeApi.hap.Categories.THERMOSTAT */;
        return service;
    }
    /**
     * Set up the thermostat service with simplified controls (only OFF and AUTO)
     */
    setupThermostatService() {
        // Remove any existing services first for clean setup
        const existingService = this.accessory.getService(this.platform.Service.Thermostat);
        if (existingService) {
            this.accessory.removeService(existingService);
        }
        // Create new thermostat service
        const service = this.accessory.addService(this.platform.Service.Thermostat, this.displayName);
        // Configure basic characteristics
        service.setCharacteristic(this.platform.Characteristic.Name, this.displayName);
        // Set up current temperature
        service
            .getCharacteristic(this.platform.Characteristic.CurrentTemperature)
            .setProps({
            minValue: MIN_TEMPERATURE_C - 5,
            maxValue: MAX_TEMPERATURE_C + 5,
            minStep: 0.1
        })
            .onGet(() => this.currentTemperature);
        // Set up target temperature
        service
            .getCharacteristic(this.platform.Characteristic.TargetTemperature)
            .setProps({
            minValue: MIN_TEMPERATURE_C,
            maxValue: MAX_TEMPERATURE_C,
            minStep: 0.5
        })
            .onGet(() => this.targetTemperature)
            .onSet(this.handleTargetTemperatureSet.bind(this));
        // Current heating/cooling state
        service
            .getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
            .onGet(() => this.getCurrentHeatingCoolingState());
        // Target heating/cooling state - IMPORTANT: ONLY OFF AND AUTO options
        const targetStateChar = service
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
        service
            .getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
            .setValue(this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS);
        return service;
    }
    /**
     * Handle target temperature changes from HomeKit
     */
    async handleTargetTemperatureSet(value) {
        const newTemp = value;
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
            this.updateHeatingCoolingStates();
        }
        // Use debounced temperature setter to avoid rapid API calls
        this.debouncedTemperatureSet(newTemp);
    }
    /**
     * Actually set temperature on the device (called by debounced handler)
     */
    async setTemperature(temperature) {
        try {
            if (!this.isPowered) {
                const success = await this.api.turnDeviceOn(this.deviceId, temperature);
                if (success) {
                    this.isPowered = true;
                    this.updateHeatingCoolingStates();
                }
            }
            else {
                await this.api.setTemperature(this.deviceId, temperature);
            }
        }
        catch (error) {
            this.platform.log.error(`Failed to set temperature: ${error}`);
        }
    }
    /**
     * Handle target heating cooling state changes from HomeKit
     */
    async handleTargetHeatingCoolingStateSet(value) {
        const newState = value;
        const shouldPowerOn = newState === this.platform.Characteristic.TargetHeatingCoolingState.AUTO;
        // Skip if no change
        if (shouldPowerOn === this.isPowered) {
            return;
        }
        this.lastUserActionTime = Date.now();
        this.platform.log.info(`Power state: ${shouldPowerOn ? 'ON' : 'OFF'} for ${this.deviceId}`);
        // Update state immediately
        this.isPowered = shouldPowerOn;
        this.updateHeatingCoolingStates();
        // Use debounced setter to avoid rapid API calls
        this.debouncedPowerSet(shouldPowerOn);
    }
    /**
     * Actually set power state on device (called by debounced handler)
     */
    async setPowerState(on) {
        try {
            if (on) {
                await this.api.turnDeviceOn(this.deviceId, this.targetTemperature);
            }
            else {
                await this.api.turnDeviceOff(this.deviceId);
            }
        }
        catch (error) {
            this.platform.log.error(`Failed to set power state: ${error}`);
        }
    }
    /**
     * Get current heating/cooling state based on temperature relation
     */
    getCurrentHeatingCoolingState() {
        const Characteristic = this.platform.Characteristic;
        if (!this.isPowered) {
            return Characteristic.CurrentHeatingCoolingState.OFF;
        }
        // Using temperature difference to determine state
        if (this.currentTemperature < this.targetTemperature - 1.0) {
            return Characteristic.CurrentHeatingCoolingState.HEAT;
        }
        else if (this.currentTemperature > this.targetTemperature + 1.0) {
            return Characteristic.CurrentHeatingCoolingState.COOL;
        }
        else {
            return Characteristic.CurrentHeatingCoolingState.HEAT; // Default when at target
        }
    }
    /**
     * Get target heating/cooling state (AUTO when on, OFF when off)
     */
    getTargetHeatingCoolingState() {
        return this.isPowered ?
            this.platform.Characteristic.TargetHeatingCoolingState.AUTO :
            this.platform.Characteristic.TargetHeatingCoolingState.OFF;
    }
    /**
     * Update heating/cooling state characteristics in HomeKit
     */
    updateHeatingCoolingStates() {
        const currentState = this.getCurrentHeatingCoolingState();
        const targetState = this.getTargetHeatingCoolingState();
        this.thermostatService.updateCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState, currentState);
        this.thermostatService.updateCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState, targetState);
    }
    /**
     * Set up the status polling mechanism
     */
    setupStatusPolling() {
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
    setupWaterLevelService(waterLevel, isWaterLow) {
        if (waterLevel === undefined) {
            return;
        }
        // Create service if it doesn't exist
        if (!this.waterLevelService) {
            this.waterLevelService = this.accessory.getService(this.platform.Service.Battery) ||
                this.accessory.addService(this.platform.Service.Battery, 'Water Level');
            this.waterLevelService.setCharacteristic(this.platform.Characteristic.Name, 'Water Level');
        }
        // Update characteristics
        this.waterLevelService.updateCharacteristic(this.platform.Characteristic.BatteryLevel, waterLevel);
        this.waterLevelService.updateCharacteristic(this.platform.Characteristic.StatusLowBattery, isWaterLow ? 1 : 0);
        this.waterLevelService.updateCharacteristic(this.platform.Characteristic.ChargingState, this.platform.Characteristic.ChargingState.NOT_CHARGING);
        if (isWaterLow) {
            this.platform.log.warn(`Water level low: ${waterLevel}%`);
        }
    }
    /**
     * Refresh device status from the API
     */
    async refreshDeviceStatus(isInitialSetup = false) {
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
                this.informationService.updateCharacteristic(this.platform.Characteristic.FirmwareRevision, this.firmwareVersion);
            }
            // Update current temperature
            if (status.currentTemperature !== this.currentTemperature) {
                this.currentTemperature = status.currentTemperature;
                this.thermostatService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.currentTemperature);
                // Update schedule manager with current temperature
                if (this.platform.scheduleManager) {
                    this.platform.scheduleManager.updateDeviceTemperature(this.deviceId, this.currentTemperature);
                }
            }
            // Update target temperature
            if (status.targetTemperature !== this.targetTemperature) {
                this.targetTemperature = status.targetTemperature;
                this.thermostatService.updateCharacteristic(this.platform.Characteristic.TargetTemperature, this.targetTemperature);
            }
            // Update power state
            const newPowerState = status.powerState === PowerState.ON ||
                (status.thermalStatus !== ThermalStatus.STANDBY &&
                    status.thermalStatus !== ThermalStatus.OFF);
            if (this.isPowered !== newPowerState) {
                this.isPowered = newPowerState;
                this.updateHeatingCoolingStates();
            }
            // Update water level if available
            if (status.waterLevel !== undefined &&
                (status.waterLevel !== this.waterLevel || status.isWaterLow !== this.isWaterLow)) {
                this.waterLevel = status.waterLevel;
                this.isWaterLow = !!status.isWaterLow;
                this.setupWaterLevelService(this.waterLevel, this.isWaterLow);
            }
        }
        catch (error) {
            this.failedUpdateAttempts++;
            this.platform.log.error(`Status refresh error: ${error}`);
        }
        finally {
            this.updateInProgress = false;
        }
    }
    /**
     * Clean up resources when accessory is removed
     */
    cleanup() {
        if (this.statusUpdateTimer) {
            clearInterval(this.statusUpdateTimer);
            this.statusUpdateTimer = undefined;
        }
    }
}
//# sourceMappingURL=accessory.js.map