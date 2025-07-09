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
    private informationService;
    private thermostatService?;
    private switchService?;
    private temperatureSensorService?;
    private waterLevelService?;
    private interfaceMode;
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
     * Setup hybrid interface (power switch + temperature control)
     */
    private setupHybridInterface;
    /**
     * Setup traditional thermostat interface
     */
    private setupThermostatInterface;
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
     * Power toggle handler for switch interface
     */
    private handlePowerToggle;
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
     * Update thermostat interface services
     */
    private updateThermostatServices;
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
