/**
 * SleepMe Accessory
 *
 * This class implements a HomeKit interface for SleepMe devices,
 * using a combination of services for the best user experience
 */
import { PlatformAccessory } from 'homebridge';
import { SleepMeSimplePlatform } from './platform.js';
import { SleepMeApi } from './api/sleepme-api.js';
import { DeviceStatus } from './api/types.js';
import { PollableDevice } from './polling-manager.js';
/**
 * SleepMe Accessory
 * Provides a simplified interface for SleepMe devices
 * Now uses centralized polling to reduce API calls
 */
export declare class SleepMeAccessory implements PollableDevice {
    private readonly platform;
    private readonly accessory;
    private readonly apiClient;
    private informationService;
    private powerSwitchService?;
    private temperatureSensorService?;
    private targetTemperatureService?;
    private thermostatService?;
    private waterLevelService?;
    private scheduleServices;
    private masterScheduleService?;
    private warmHugService?;
    private interfaceMode;
    private currentTemperature;
    private targetTemperature;
    private isPowered;
    private firmwareVersion;
    private waterLevel;
    private isWaterLow;
    private tempSetterDebounced;
    private powerStateSetterDebounced;
    readonly deviceId: string;
    private readonly displayName;
    private deviceModel;
    private lastStatusUpdate;
    private lastUserActionTime;
    private failedUpdateAttempts;
    private updateInProgress;
    private commandEpoch;
    private pendingOperation;
    private readonly Characteristic;
    /**
     * Constructor for the SleepMe accessory
     */
    constructor(platform: SleepMeSimplePlatform, accessory: PlatformAccessory, apiClient: SleepMeApi);
    /**
     * Set up the accessory information service
     */
    private setupInformationService;
    /**
     * Setup interface based on configured mode
     */
    private setupInterface;
    /**
     * Clean up existing services to avoid conflicts
     */
    private cleanupExistingServices;
    /**
     * Setup simple switch interface
     */
    private setupSwitchInterface;
    /**
     * Setup hybrid interface (power switch + temperature control + schedules)
     */
    private setupHybridInterface;
    /**
     * Setup legacy thermostat interface
     */
    private setupLegacyThermostatInterface;
    /**
     * Setup schedule services for the hybrid interface
     */
    private setupScheduleServices;
    /**
     * Create an individual schedule service
     */
    private createIndividualScheduleService;
    /**
     * Setup water level service (common to all interfaces)
     */
    private setupWaterLevelService;
    /**
     * Power toggle handler for switch interface
     */
    private handlePowerToggle;
    /**
     * Handle master schedule toggle
     */
    private handleMasterScheduleToggle;
    /**
     * Handle individual schedule toggle
     */
    private handleIndividualScheduleToggle;
    /**
     * Handle warm hug toggle
     */
    private handleWarmHugToggle;
    /**
     * Check if warm hug is currently active
     */
    private isWarmHugActive;
    /**
     * Update all services based on current interface mode
     */
    private updateAllServices;
    /**
     * Update switch interface services
     */
    private updateSwitchServices;
    /**
     * Update hybrid interface services
     */
    private updateHybridServices;
    /**
     * Update thermostat interface services (legacy)
     */
    private updateThermostatServices;
    /**
    * Get the current heating/cooling state based on device status
    */
    private getCurrentHeatingCoolingState;
    /**
    * Get the target heating/cooling state
    */
    private getTargetHeatingCoolingState;
    /**
       * Update the schedule manager with current temperature
       * @param temperature Current temperature
       */
    private updateScheduleManager;
    /**
      * Get the appropriate thermostat service based on interface mode
      */
    private getThermostatService;
    /**
      * Update the current heating/cooling state in HomeKit
      */
    private updateCurrentHeatingCoolingState;
    /**
     * Handle getting the target temperature
     * @returns Current target temperature
     */
    private handleTargetTemperatureGet;
    /**
     * Handle setting the target heating cooling state
     * @param value Target heating cooling state value
     */
    private handleTargetHeatingCoolingStateSet;
    /**
       * Verify power state consistency
       */
    private verifyPowerState;
    /**
     * Execute an operation with epoch tracking for cancellation
     * @param operationType Type of operation
     * @param epoch Command epoch to track cancellation
     * @param operation Async operation to execute
     */
    private executeOperation;
    /**
     * Handle target temperature setting with trust-based approach
     * @param value New target temperature value
     */
    private handleTargetTemperatureSet;
    /**
       * Implementation for power state setting (called by debounced wrapper)
       * @param turnOn Whether to turn the device on
       */
    private handlePowerStateSetImpl;
    /**
     * Update the water level service with current status
     * @param waterLevel Current water level percentage
     * @param isWaterLow Whether water level is considered low
     */
    private updateWaterLevelService;
    /**
       * Detect device model based on attachments or other characteristics
       * @param data Raw device data from API
       * @returns Detected device model name
       */
    private detectDeviceModel;
    /**
     * Implementation of target temperature setting that makes the API call
     * @param newTemp New target temperature
     * @param previousTemp Previous target temperature before UI update
     */
    private handleTargetTemperatureSetImpl;
    /**
     * Implementation of PollableDevice interface
     * Called by centralized polling manager when status is updated
     */
    onStatusUpdate(status: DeviceStatus): void;
    /**
     * Implementation of PollableDevice interface
     * Called by centralized polling manager when an error occurs
     */
    onError(error: Error): void;
    /**
     * Update device state from polling manager
     * Called by centralized polling manager to update device state
     */
    private updateDeviceState;
    /**
     * Clean up resources when this accessory is removed
     */
    cleanup(): void;
}
