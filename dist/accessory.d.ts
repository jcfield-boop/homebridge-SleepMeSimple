/**
 * SleepMe Accessory
 *
 * Implements HomeKit interface for SleepMe devices with simplified thermostat control
 * that only offers AUTO or OFF states
 */
import { PlatformAccessory } from 'homebridge';
import { SleepMeSimplePlatform } from './platform.js';
import { SleepMeApi } from './api/sleepme-api.js';
/**
 * SleepMe Accessory
 * Provides a simplified HomeKit interface for SleepMe devices
 * with only AUTO and OFF (standby) modes
 */
export declare class SleepMeAccessory {
    private readonly platform;
    private readonly accessory;
    private readonly api;
    private thermostatService;
    private waterLevelService?;
    private informationService;
    private currentTemperature;
    private targetTemperature;
    private isPowered;
    private waterLevel;
    private isWaterLow;
    private readonly deviceId;
    private readonly displayName;
    private deviceModel;
    private firmwareVersion;
    private statusUpdateTimer?;
    private lastStatusUpdate;
    private lastUserActionTime;
    private failedUpdateAttempts;
    private updateInProgress;
    private debouncedTemperatureSet;
    private debouncedPowerSet;
    /**
     * Constructor for the SleepMe accessory
     */
    constructor(platform: SleepMeSimplePlatform, accessory: PlatformAccessory, api: SleepMeApi);
    /**
     * Set up the accessory information service
     */
    private setupInformationService;
    /**
     * Set up the thermostat service with simplified controls (only OFF and AUTO)
     */
    private setupThermostatService;
    /**
     * Handle target temperature changes from HomeKit
     */
    private handleTargetTemperatureSet;
    /**
     * Actually set temperature on the device (called by debounced handler)
     */
    private setTemperature;
    /**
     * Handle target heating cooling state changes from HomeKit
     */
    private handleTargetHeatingCoolingStateSet;
    /**
     * Actually set power state on device (called by debounced handler)
     */
    private setPowerState;
    /**
     * Get current heating/cooling state based on temperature relation
     */
    private getCurrentHeatingCoolingState;
    /**
     * Get target heating/cooling state (AUTO when on, OFF when off)
     */
    private getTargetHeatingCoolingState;
    /**
     * Update heating/cooling state characteristics in HomeKit
     */
    private updateHeatingCoolingStates;
    /**
     * Set up the status polling mechanism
     */
    private setupStatusPolling;
    /**
     * Set up water level service for compatible devices
     */
    private setupWaterLevelService;
    /**
     * Refresh device status from the API
     */
    private refreshDeviceStatus;
    /**
     * Clean up resources when accessory is removed
     */
    cleanup(): void;
}
