import { ThermalStatus, PowerState } from './api/types.js';
import { MIN_TEMPERATURE_C, MAX_TEMPERATURE_C } from './settings.js';
// Remove unused TEMPERATURE_STEP import
/**
 * SleepMe Accessory
 * Provides a simplified interface for SleepMe devices using separate HomeKit services
 */
export class SleepMeAccessory {
    /**
     * Constructor for the SleepMe accessory
     */
    constructor(
    // Mark parameters as used with protected/private to prevent ESLint warnings
    platform, accessory, apiClient) {
        var _a;
        this.platform = platform;
        this.accessory = accessory;
        this.apiClient = apiClient;
        // Device state
        this.currentTemperature = NaN;
        this.targetTemperature = NaN;
        this.isPowered = false;
        this.firmwareVersion = 'Unknown';
        this.waterLevel = 100; // Default full water level
        this.isWaterLow = false;
        this.deviceModel = 'SleepMe Device';
        this.lastTemperatureSetTime = 0;
        // Store references to Characteristic for convenience
        this.Characteristic = this.platform.Characteristic;
        // Get device ID from accessory context
        this.deviceId = ((_a = this.accessory.context.device) === null || _a === void 0 ? void 0 : _a.id) || '';
        this.displayName = this.accessory.displayName;
        if (!this.deviceId) {
            this.platform.log.error(`Accessory missing device ID: ${this.displayName}`);
            throw new Error(`Accessory missing device ID: ${this.displayName}`);
        }
        this.platform.log.info(`Creating accessory for device ${this.deviceId} (${this.displayName})`);
        // Initialize accessory information service
        this.setupInformationService();
        // Create our simplified services
        this.setupTemperatureSensorService();
        this.setupPowerSwitchService();
        this.setupTemperatureControlService();
        // Initialize the device state by fetching current status
        this.refreshDeviceStatus(true)
            .catch(error => this.platform.log.error(`Error initializing device status: ${error instanceof Error ? error.message : String(error)}`));
        // Set up polling interval
        this.setupStatusPolling();
        this.platform.log.info(`Accessory initialized: ${this.displayName} (ID: ${this.deviceId})`);
    }
    /**
     * Set up the accessory information service
     */
    setupInformationService() {
        // Get or create the information service
        this.informationService = this.accessory.getService(this.platform.Service.AccessoryInformation) ||
            this.accessory.addService(this.platform.Service.AccessoryInformation);
        // Set default information
        this.informationService
            .setCharacteristic(this.Characteristic.Manufacturer, 'SleepMe Inc.')
            .setCharacteristic(this.Characteristic.Model, this.deviceModel)
            .setCharacteristic(this.Characteristic.SerialNumber, this.deviceId)
            .setCharacteristic(this.Characteristic.FirmwareRevision, this.firmwareVersion);
    }
    /**
     * Set up the temperature sensor service
     */
    setupTemperatureSensorService() {
        // Create the temperature sensor service
        this.temperatureSensorService = this.accessory.getService(this.platform.Service.TemperatureSensor) ||
            this.accessory.addService(this.platform.Service.TemperatureSensor, `${this.displayName} Temperature`);
        // Set service properties
        this.temperatureSensorService
            .setCharacteristic(this.Characteristic.Name, `${this.displayName} Temperature`)
            .getCharacteristic(this.Characteristic.CurrentTemperature)
            .setProps({
            minValue: MIN_TEMPERATURE_C - 10,
            maxValue: MAX_TEMPERATURE_C + 10,
            minStep: 0.1
        })
            .onGet(this.handleCurrentTemperatureGet.bind(this));
    }
    /**
     * Set up the power switch service
     */
    setupPowerSwitchService() {
        // Create the switch service
        this.switchService = this.accessory.getService(this.platform.Service.Switch) ||
            this.accessory.addService(this.platform.Service.Switch, `${this.displayName} Power`);
        // Set service properties
        this.switchService
            .setCharacteristic(this.Characteristic.Name, `${this.displayName} Power`)
            .getCharacteristic(this.Characteristic.On)
            .onGet(this.handlePowerStateGet.bind(this))
            .onSet(this.handlePowerStateSet.bind(this));
    }
    /**
     * Set up the temperature control service (using Lightbulb)
     */
    setupTemperatureControlService() {
        // Use a Lightbulb service to create a slider for temperature
        this.temperatureControlService = this.accessory.getService(this.platform.Service.Lightbulb) ||
            this.accessory.addService(this.platform.Service.Lightbulb, `${this.displayName} Temperature Control`);
        // Configure brightness characteristic as temperature control
        this.temperatureControlService
            .setCharacteristic(this.Characteristic.Name, `${this.displayName} Temperature Control`)
            .getCharacteristic(this.Characteristic.Brightness)
            .setProps({
            minValue: 0,
            maxValue: 100,
            minStep: 1
        })
            .onGet(this.handleTemperatureControlGet.bind(this))
            .onSet(this.handleTemperatureControlSet.bind(this));
        // Configure On characteristic to match power switch
        this.temperatureControlService
            .getCharacteristic(this.Characteristic.On)
            .onGet(() => this.isPowered)
            .onSet((value) => {
            this.handlePowerStateSet(value);
        });
    }
    /**
     * Add/update the water level service if supported
     * @param waterLevel - Current water level percentage
     * @param isWaterLow - Whether water level is considered low
     */
    setupWaterLevelService(waterLevel, isWaterLow) {
        // Only create if water level data is available
        if (waterLevel !== undefined) {
            // Create service if it doesn't exist
            if (!this.waterLevelService) {
                this.waterLevelService = this.accessory.getService(this.platform.Service.Battery) ||
                    this.accessory.addService(this.platform.Service.Battery, 'Water Level');
                this.waterLevelService.setCharacteristic(this.Characteristic.Name, 'Water Level');
                this.platform.log.info(`Created water level service for device ${this.deviceId}`);
            }
            // Update characteristics
            this.waterLevelService.updateCharacteristic(this.Characteristic.BatteryLevel, waterLevel);
            this.waterLevelService.updateCharacteristic(this.Characteristic.StatusLowBattery, isWaterLow ? 1 : 0);
            this.waterLevelService.updateCharacteristic(this.Characteristic.ChargingState, this.Characteristic.ChargingState.NOT_CHARGING);
            // Log water level status if low
            if (isWaterLow) {
                this.platform.log.warn(`Water level low on device ${this.deviceId}: ${waterLevel}%`);
            }
            else {
                this.platform.log.verbose(`Water level updated to ${waterLevel}%`);
            }
        }
    }
    /**
     * Set up the status polling mechanism
     */
    setupStatusPolling() {
        // Clear any existing timer
        if (this.statusUpdateTimer) {
            clearInterval(this.statusUpdateTimer);
        }
        // Convert polling interval from seconds to milliseconds
        const intervalMs = this.platform.pollingInterval * 1000;
        this.platform.log.debug(`Setting up status polling every ${this.platform.pollingInterval} seconds for device ${this.deviceId}`);
        // Set up regular polling
        this.statusUpdateTimer = setInterval(() => {
            this.refreshDeviceStatus().catch(error => {
                this.platform.log.error(`Error updating device status: ${error instanceof Error ? error.message : String(error)}`);
            });
        }, intervalMs);
    }
    /**
     * Detect device model based on attachments or other characteristics
     * @param data - Raw device data from API
     * @returns Detected device model name
     */
    detectDeviceModel(data) {
        // Check attachments first (most reliable)
        const attachments = this.apiClient.extractNestedValue(data, 'attachments');
        if (Array.isArray(attachments) && attachments.length > 0) {
            if (attachments.includes('CHILIPAD_PRO')) {
                return 'ChiliPad Pro';
            }
            else if (attachments.includes('OOLER')) {
                return 'OOLER Sleep System';
            }
            else if (attachments.includes('DOCK_PRO')) {
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
                }
                else if (model.includes('OL')) {
                    return 'OOLER Sleep System';
                }
                else if (model.includes('CP')) {
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
            }
            else if (firmware.toString().startsWith('4.')) {
                return 'OOLER Sleep System';
            }
            else if (firmware.toString().startsWith('3.')) {
                return 'ChiliPad';
            }
        }
        return 'SleepMe Device';
    }
    /**
     * Refresh the device status from the API
     * @param isInitialSetup - Whether this is the initial setup refresh
     */
    async refreshDeviceStatus(isInitialSetup = false) {
        // Skip polling updates if we recently made a user-initiated change
        if (!isInitialSetup) {
            const timeSinceLastTemp = Date.now() - this.lastTemperatureSetTime;
            if (timeSinceLastTemp < 30000) { // 30 seconds
                this.platform.log.debug(`Skipping scheduled status update, recent user interaction ${Math.round(timeSinceLastTemp / 1000)}s ago`);
                return;
            }
        }
        try {
            // Force fresh data on initial setup, otherwise use cache when appropriate
            const forceFresh = isInitialSetup;
            this.platform.log.verbose(`Refreshing status for device ${this.deviceId} (${forceFresh ? 'fresh' : 'cached if available'})`);
            // Get the device status from the API
            const status = await this.apiClient.getDeviceStatus(this.deviceId, forceFresh);
            if (!status) {
                throw new Error(`Failed to get status for device ${this.deviceId}`);
            }
            // Log detailed status in verbose mode
            this.platform.log.verbose(`Device status received: current=${status.currentTemperature}°C, ` +
                `target=${status.targetTemperature}°C, ` +
                `thermal=${status.thermalStatus}, ` +
                `power=${status.powerState}` +
                (status.waterLevel !== undefined ? `, water=${status.waterLevel}%` : ''));
            // Update model if we can detect it from raw response
            if (status.rawResponse) {
                const detectedModel = this.detectDeviceModel(status.rawResponse);
                if (detectedModel !== this.deviceModel) {
                    this.deviceModel = detectedModel;
                    // Update the model in HomeKit
                    this.informationService.updateCharacteristic(this.Characteristic.Model, this.deviceModel);
                    this.platform.log.info(`Detected device model: ${this.deviceModel}`);
                }
            }
            // Update firmware version if available
            if (status.firmwareVersion !== undefined && status.firmwareVersion !== this.firmwareVersion) {
                this.firmwareVersion = status.firmwareVersion;
                // Update HomeKit characteristic
                this.informationService.updateCharacteristic(this.Characteristic.FirmwareRevision, this.firmwareVersion);
                this.platform.log.info(`Updated firmware version to ${this.firmwareVersion}`);
            }
            // Update current temperature
            if (isNaN(this.currentTemperature) || status.currentTemperature !== this.currentTemperature) {
                this.currentTemperature = status.currentTemperature;
                // Update temperature sensor
                this.temperatureSensorService.updateCharacteristic(this.Characteristic.CurrentTemperature, this.currentTemperature);
                this.platform.log.verbose(`Current temperature updated to ${this.currentTemperature}°C`);
            }
            // Update target temperature
            if (isNaN(this.targetTemperature) || status.targetTemperature !== this.targetTemperature) {
                this.targetTemperature = status.targetTemperature;
                // Also update the temperature control UI
                const tempPercentage = this.temperatureToPercentage(this.targetTemperature);
                this.temperatureControlService.updateCharacteristic(this.Characteristic.Brightness, tempPercentage);
                this.platform.log.verbose(`Target temperature updated to ${this.targetTemperature}°C (${tempPercentage}%)`);
            }
            // Update power state
            const newPowerState = status.powerState === PowerState.ON ||
                status.thermalStatus !== ThermalStatus.STANDBY &&
                    status.thermalStatus !== ThermalStatus.OFF;
            if (this.isPowered !== newPowerState) {
                this.isPowered = newPowerState;
                // Update both services that show power state
                this.switchService.updateCharacteristic(this.Characteristic.On, this.isPowered);
                this.temperatureControlService.updateCharacteristic(this.Characteristic.On, this.isPowered);
                this.platform.log.verbose(`Power state updated to ${this.isPowered ? 'ON' : 'OFF'}`);
            }
            // Update water level if available
            if (status.waterLevel !== undefined) {
                if (status.waterLevel !== this.waterLevel || status.isWaterLow !== this.isWaterLow) {
                    this.waterLevel = status.waterLevel;
                    this.isWaterLow = !!status.isWaterLow;
                    // Update or create the water level service
                    this.setupWaterLevelService(this.waterLevel, this.isWaterLow);
                }
            }
        }
        catch (error) {
            this.platform.log.error(`Failed to refresh device status: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Convert temperature to percentage (for the brightness control)
     * @param temperature - Temperature in Celsius
     * @returns Percentage value for slider (0-100)
     */
    temperatureToPercentage(temperature) {
        // Convert temperature to percentage (scaled between MIN_TEMP and MAX_TEMP)
        const temp = isNaN(temperature) ? MIN_TEMPERATURE_C : temperature;
        const percentage = Math.round(((temp - MIN_TEMPERATURE_C) / (MAX_TEMPERATURE_C - MIN_TEMPERATURE_C)) * 100);
        return Math.max(0, Math.min(100, percentage));
    }
    /**
     * Convert percentage to temperature
     * @param percentage - Percentage value from slider (0-100)
     * @returns Temperature in Celsius
     */
    percentageToTemperature(percentage) {
        // Convert percentage to temperature
        const tempRange = MAX_TEMPERATURE_C - MIN_TEMPERATURE_C;
        const temp = MIN_TEMPERATURE_C + ((percentage / 100) * tempRange);
        // Round to nearest 0.5°C
        return Math.round(temp * 2) / 2;
    }
    /**
     * Handler for CurrentTemperature GET
     * @returns Current temperature value
     */
    async handleCurrentTemperatureGet() {
        // Return default temperature if value is not yet initialized
        const temp = isNaN(this.currentTemperature) ? 20 : this.currentTemperature;
        this.platform.log.debug(`GET CurrentTemperature: ${temp}`);
        return temp;
    }
    /**
     * Handler for power state GET
     * @returns Current power state (boolean)
     */
    async handlePowerStateGet() {
        this.platform.log.debug(`GET Power State: ${this.isPowered ? 'ON' : 'OFF'}`);
        return this.isPowered;
    }
    /**
     * Handler for power state SET
     * @param value - New power state value
     */
    async handlePowerStateSet(value) {
        const turnOn = Boolean(value);
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
            }
            else {
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
            this.switchService.updateCharacteristic(this.Characteristic.On, this.isPowered);
            this.temperatureControlService.updateCharacteristic(this.Characteristic.On, this.isPowered);
            // Refresh the status to get any other changes
            setTimeout(() => {
                this.refreshDeviceStatus(true).catch(e => {
                    this.platform.log.debug(`Error refreshing status after power change: ${e}`);
                });
            }, 1000);
        }
        catch (error) {
            this.platform.log.error(`Failed to set power state: ${error instanceof Error ? error.message : String(error)}`);
            // Revert the switch if there was an error
            this.switchService.updateCharacteristic(this.Characteristic.On, !turnOn);
            this.temperatureControlService.updateCharacteristic(this.Characteristic.On, !turnOn);
        }
    }
    /**
     * Handler for temperature control GET
     * @returns Current temperature as percentage for slider
     */
    async handleTemperatureControlGet() {
        const percentage = this.temperatureToPercentage(this.targetTemperature);
        this.platform.log.debug(`GET Temperature Control: ${this.targetTemperature}°C (${percentage}%)`);
        return percentage;
    }
    /**
     * Handler for temperature control SET
     * @param value - New temperature percentage from slider
     */
    async handleTemperatureControlSet(value) {
        const percentage = value;
        // Convert percentage to temperature
        const newTemp = this.percentageToTemperature(percentage);
        this.platform.log.info(`SET Temperature Control: ${percentage}% (${newTemp}°C)`);
        try {
            // Remember the last time we changed the temperature
            this.lastTemperatureSetTime = Date.now();
            // Update internal state
            this.targetTemperature = newTemp;
            // Only send the command if the device is powered on
            if (this.isPowered) {
                const success = await this.apiClient.setTemperature(this.deviceId, newTemp);
                if (success) {
                    this.platform.log.info(`Temperature set to ${newTemp}°C`);
                }
                else {
                    throw new Error(`Failed to set temperature to ${newTemp}°C`);
                }
            }
            else {
                // If device is off, turning on with the new temperature
                const success = await this.apiClient.turnDeviceOn(this.deviceId, newTemp);
                if (success) {
                    this.isPowered = true;
                    // Update the power switches
                    this.switchService.updateCharacteristic(this.Characteristic.On, true);
                    this.temperatureControlService.updateCharacteristic(this.Characteristic.On, true);
                    this.platform.log.info(`Device turned ON and temperature set to ${newTemp}°C`);
                }
                else {
                    throw new Error(`Failed to turn on device and set temperature to ${newTemp}°C`);
                }
            }
            // Refresh the status after a short delay
            setTimeout(() => {
                this.refreshDeviceStatus(true).catch(e => {
                    this.platform.log.debug(`Error refreshing status after temperature change: ${e}`);
                });
            }, 1000);
        }
        catch (error) {
            this.platform.log.error(`Failed to set temperature: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Clean up resources when this accessory is removed
     */
    cleanup() {
        if (this.statusUpdateTimer) {
            clearInterval(this.statusUpdateTimer);
            this.statusUpdateTimer = undefined;
        }
        this.platform.log.info(`Cleaned up accessory: ${this.displayName}`);
    }
}
//# sourceMappingURL=accessory.js.map