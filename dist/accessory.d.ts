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
    private temperatureControlService;
    private waterLevelService?;
    private informationService;
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
     * Set up the Thermostat service for temperature control
     */
    private setupTemperatureControlService;
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
     * Add/update the water level service if supported
     * @param waterLevel Current water level percentage
     * @param isWaterLow Whether water level is considered low
     */
    private setupWaterLevelService;
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
