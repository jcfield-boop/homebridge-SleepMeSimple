import { ThermalStatus, PowerState } from './api/types.js';
import { MIN_TEMPERATURE_C, MAX_TEMPERATURE_C, COMMAND_DEBOUNCE_DELAY_MS, USER_ACTION_QUIET_PERIOD_MS } from './settings.js';
/**
 * Create an enhanced debounced function with leading/trailing options
 * @param callback Function to debounce
 * @param wait Wait time in milliseconds
 * @param options Configuration options
 * @returns Debounced function
 */
function createSmartDebounce(callback, wait, options = { leading: false, trailing: true }) {
    let timeout = null;
    let lastArgs = null;
    let isInvoking = false;
    return (...args) => {
        lastArgs = args;
        // Function to execute the callback
        const executeCallback = () => {
            if (lastArgs) {
                isInvoking = true;
                try {
                    callback(...lastArgs);
                }
                finally {
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
 * Now uses centralized polling to reduce API calls
 */
export class SleepMeAccessory {
    platform;
    accessory;
    apiClient;
    // HomeKit services
    temperatureControlService;
    waterLevelService;
    informationService;
    // Device state
    currentTemperature = NaN;
    targetTemperature = NaN;
    isPowered = false;
    firmwareVersion = 'Unknown';
    waterLevel = 100; // Default full water level
    isWaterLow = false;
    // Debounced functions for command handling
    tempSetterDebounced;
    powerStateSetterDebounced;
    // Device properties
    deviceId;
    displayName;
    deviceModel = 'SleepMe Device';
    // Update control - removed individual polling timers
    lastStatusUpdate = 0;
    lastUserActionTime = 0;
    failedUpdateAttempts = 0;
    updateInProgress = false;
    // Added missing properties
    commandEpoch = 0;
    pendingOperation = null;
    // Constants from the platform
    Characteristic;
    /**
     * Constructor for the SleepMe accessory
     */
    constructor(platform, accessory, apiClient) {
        this.platform = platform;
        this.accessory = accessory;
        this.apiClient = apiClient;
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
        this.tempSetterDebounced = createSmartDebounce((newTemp, previousTemp) => {
            this.handleTargetTemperatureSetImpl(newTemp, previousTemp);
        }, COMMAND_DEBOUNCE_DELAY_MS, { leading: false, trailing: true });
        // Create debounced power state setter
        // No leading edge to avoid too many power toggles 
        this.powerStateSetterDebounced = createSmartDebounce((turnOn) => {
            this.handlePowerStateSetImpl(turnOn);
        }, COMMAND_DEBOUNCE_DELAY_MS, { leading: false, trailing: true });
        // Register with centralized polling manager instead of individual polling
        if (this.platform.pollingManager) {
            this.platform.pollingManager.registerDevice(this);
            this.platform.log.info(`Registered ${this.displayName} with centralized polling`);
        }
        else {
            this.platform.log.warn(`No polling manager available for ${this.displayName}`);
        }
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
        // Set the category to THERMOSTAT which is appropriate for temperature control
        this.accessory.category = 9 /* this.platform.homebridgeApi.hap.Categories.THERMOSTAT */;
    }
    /**
     * Set up the Thermostat service for temperature control
     */
    setupTemperatureControlService() {
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
            .setCharacteristic(this.Characteristic.Name, this.displayName);
        // IMPORTANT: Do not set initial state during setup
        // Let the first status poll determine the correct state
        // This prevents the device from being turned OFF during re-initialization
        // Set up current temperature characteristic
        this.temperatureControlService
            .getCharacteristic(this.Characteristic.CurrentTemperature)
            .setProps({
            minValue: MIN_TEMPERATURE_C - 5,
            maxValue: MAX_TEMPERATURE_C + 5,
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
            this.handleTargetHeatingCoolingStateSet(value);
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
    * Get the current heating/cooling state based on device status
    */
    getCurrentHeatingCoolingState() {
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
        }
        else if (this.currentTemperature > this.targetTemperature + 1.0) {
            // Cooling down
            return this.Characteristic.CurrentHeatingCoolingState.COOL;
        }
        else {
            // At target temperature (within threshold)
            // Use HEAT as state when at target temperature and powered on
            return this.Characteristic.CurrentHeatingCoolingState.HEAT;
        }
    }
    /**
    * Get the target heating/cooling state
    */
    getTargetHeatingCoolingState() {
        return this.isPowered ?
            this.Characteristic.TargetHeatingCoolingState.AUTO :
            this.Characteristic.TargetHeatingCoolingState.OFF;
    }
    /**
       * Update the schedule manager with current temperature
       * @param temperature Current temperature
       */
    updateScheduleManager(temperature) {
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
    updateCurrentHeatingCoolingState() {
        const state = this.getCurrentHeatingCoolingState();
        this.temperatureControlService.updateCharacteristic(this.Characteristic.CurrentHeatingCoolingState, state);
        // Update target state too
        this.temperatureControlService.updateCharacteristic(this.Characteristic.TargetHeatingCoolingState, this.getTargetHeatingCoolingState());
    }
    /**
     * Handle getting the target temperature
     * @returns Current target temperature
     */
    handleTargetTemperatureGet() {
        return this.targetTemperature || 21; // Default to 21°C if not set
    }
    /**
     * Handle setting the target heating cooling state
     * @param value Target heating cooling state value
     */
    async handleTargetHeatingCoolingStateSet(value) {
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
                        }
                        else {
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
                        }
                        else {
                            throw new Error('Failed to turn on device');
                        }
                    });
                }
                // For SleepMe devices, we treat all active modes as AUTO
                setTimeout(() => {
                    this.temperatureControlService.updateCharacteristic(this.Characteristic.TargetHeatingCoolingState, this.Characteristic.TargetHeatingCoolingState.AUTO);
                }, 100);
                break;
        }
    }
    /**
       * Verify power state consistency
       */
    async verifyPowerState() {
        // Changed comparison to correctly compare the power state with the heating/cooling state
        const currentTargetState = this.getTargetHeatingCoolingState();
        const expectedState = this.isPowered ?
            this.Characteristic.TargetHeatingCoolingState.AUTO :
            this.Characteristic.TargetHeatingCoolingState.OFF;
        if (currentTargetState !== expectedState) {
            this.platform.log.debug('Verifying power state consistency...');
            // Force UI to match our internal state
            this.temperatureControlService.updateCharacteristic(this.Characteristic.TargetHeatingCoolingState, this.isPowered ?
                this.Characteristic.TargetHeatingCoolingState.AUTO :
                this.Characteristic.TargetHeatingCoolingState.OFF);
        }
    }
    /**
     * Execute an operation with epoch tracking for cancellation
     * @param operationType Type of operation
     * @param epoch Command epoch to track cancellation
     * @param operation Async operation to execute
     */
    async executeOperation(operationType, epoch, operation) {
        // Set pending operation
        this.pendingOperation = operationType;
        try {
            // Only execute if the epoch hasn't changed (no newer commands queued)
            if (epoch === this.commandEpoch) {
                await operation();
            }
            else {
                this.platform.log.debug(`Skipping stale ${operationType} operation (epoch ${epoch}, current ${this.commandEpoch})`);
            }
        }
        catch (error) {
            this.platform.log.error(`Error in ${operationType} operation: ${error instanceof Error ? error.message : String(error)}`);
            throw error; // Re-throw for caller handling
        }
        finally {
            // Clear pending operation
            this.pendingOperation = null;
        }
    }
    /**
     * Handle target temperature setting with trust-based approach
     * @param value New target temperature value
     */
    async handleTargetTemperatureSet(value) {
        const newTemp = value;
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
                }
                else {
                    throw new Error(`Failed to turn on device with temperature ${newTemp}°C`);
                }
            }
            else {
                // Device is already on, just change temperature
                const success = await this.apiClient.setTemperature(this.deviceId, newTemp);
                if (success) {
                    this.platform.log.info(`Temperature set to ${newTemp}°C`);
                }
                else {
                    throw new Error(`Failed to set temperature to ${newTemp}°C`);
                    // Revert UI to previous temperature on error
                    this.targetTemperature = previousTemp;
                    this.temperatureControlService.updateCharacteristic(this.Characteristic.TargetTemperature, previousTemp);
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
    async handlePowerStateSetImpl(turnOn) {
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
                }
                else {
                    throw new Error('Failed to turn on device');
                }
            }
            else {
                // Turn off device
                const success = await this.apiClient.turnDeviceOff(this.deviceId);
                if (success) {
                    this.isPowered = false;
                    this.platform.log.info(`Device turned OFF successfully`);
                }
                else {
                    throw new Error('Failed to turn off device');
                }
            }
            // Update the current heating/cooling state
            this.updateCurrentHeatingCoolingState();
        }
        catch (error) {
            this.platform.log.error(`Failed to set power state: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Add/update the water level service if supported
     * @param waterLevel Current water level percentage
     * @param isWaterLow Whether water level is considered low
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
       * Detect device model based on attachments or other characteristics
       * @param data Raw device data from API
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
            const firmwareStr = String(firmware);
            if (firmwareStr.startsWith('5.')) {
                return 'Dock Pro';
            }
            else if (firmwareStr.startsWith('4.')) {
                return 'OOLER Sleep System';
            }
            else if (firmwareStr.startsWith('3.')) {
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
    async handleTargetTemperatureSetImpl(newTemp, previousTemp) {
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
                    this.platform.log.info(`Device turned ON and temperature set to ${newTemp}°C`);
                }
                else {
                    throw new Error(`Failed to turn on device and set temperature to ${newTemp}°C`);
                }
            }
            // Update the current heating/cooling state based on temperature difference
            this.updateCurrentHeatingCoolingState();
            // Status will be updated by centralized polling manager
        }
        catch (error) {
            this.platform.log.error(`Failed to set temperature: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Implementation of PollableDevice interface
     * Called by centralized polling manager when status is updated
     */
    onStatusUpdate(status) {
        this.updateDeviceState(status);
    }
    /**
     * Implementation of PollableDevice interface
     * Called by centralized polling manager when an error occurs
     */
    onError(error) {
        this.platform.log.error(`Polling error for ${this.displayName}: ${error.message}`);
        this.failedUpdateAttempts++;
    }
    /**
     * Update device state from polling manager
     * Called by centralized polling manager to update device state
     */
    updateDeviceState(status) {
        // Update the last successful update timestamp
        this.lastStatusUpdate = Date.now();
        // Reset failed attempts counter on success
        this.failedUpdateAttempts = 0;
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
            // Update the current temperature in Thermostat service
            this.temperatureControlService.updateCharacteristic(this.Characteristic.CurrentTemperature, this.currentTemperature);
            this.platform.log.verbose(`Current temperature updated to ${this.currentTemperature}°C`);
            // Update schedule manager with current temperature
            if (!isNaN(this.currentTemperature)) {
                this.updateScheduleManager(this.currentTemperature);
            }
        }
        // Update target temperature
        if (isNaN(this.targetTemperature) || status.targetTemperature !== this.targetTemperature) {
            this.targetTemperature = status.targetTemperature;
            // Update target temperature in Thermostat service
            this.temperatureControlService.updateCharacteristic(this.Characteristic.TargetTemperature, this.targetTemperature);
            this.platform.log.verbose(`Target temperature updated to ${this.targetTemperature}°C`);
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
                this.platform.log.warn(`UNEXPECTED STATE CHANGE: Device ${this.deviceId} (${this.displayName}) ` +
                    `power state changed: ${this.isPowered ? 'ON' : 'OFF'} → ${newPowerState ? 'ON' : 'OFF'} ` +
                    `(last user action was ${Math.round(timeSinceUserAction / 1000)}s ago)`);
            }
            else {
                this.platform.log.info(`Device ${this.deviceId} power state changed: ${this.isPowered ? 'ON' : 'OFF'} → ${newPowerState ? 'ON' : 'OFF'}`);
            }
            this.isPowered = newPowerState;
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
    }
    /**
     * Clean up resources when this accessory is removed
     */
    cleanup() {
        // Unregister from centralized polling
        if (this.platform.pollingManager) {
            this.platform.pollingManager.unregisterDevice(this.deviceId);
        }
        this.platform.log.info(`Cleaned up accessory: ${this.displayName}`);
    }
}
//# sourceMappingURL=accessory.js.map