/**
 * SleepMe Accessory
 *
 * This class implements a simplified HomeKit interface for SleepMe devices,
 * using separate services for temperature reporting, power control, and temperature adjustment
 */
import { PlatformAccessory } from 'homebridge';
import { SleepMeSimplePlatform } from './platform.js';
import { SleepMeApi } from './api/sleepme-api.js';
/**
 * SleepMe Accessory
 * Provides a simplified interface for SleepMe devices using separate HomeKit services
 */
export declare class SleepMeAccessory {
    private readonly platform;
    private readonly accessory;
    private readonly apiClient;
    private temperatureSensorService;
    private switchService;
    private temperatureControlService;
    private waterLevelService?;
    private informationService;
    private currentTemperature;
    private targetTemperature;
    private isPowered;
    private firmwareVersion;
    private waterLevel;
    private isWaterLow;
    private readonly deviceId;
    private readonly displayName;
    private deviceModel;
    private statusUpdateTimer?;
    private lastTemperatureSetTime;
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
     * Set up the temperature sensor service
     */
    private setupTemperatureSensorService;
    /**
     * Set up the power switch service
     */
    private setupPowerSwitchService;
    /**
     * Set up the temperature control service (using Lightbulb)
     */
    private setupTemperatureControlService;
    /**
     * Add/update the water level service if supported
     * @param waterLevel - Current water level percentage
     * @param isWaterLow - Whether water level is considered low
     */
    private setupWaterLevelService;
    /**
     * Set up the status polling mechanism
     */
    private setupStatusPolling;
    /**
     * Detect device model based on attachments or other characteristics
     * @param data - Raw device data from API
     * @returns Detected device model name
     */
    private detectDeviceModel;
    /**
     * Refresh the device status from the API
     * @param isInitialSetup - Whether this is the initial setup refresh
     */
    private refreshDeviceStatus;
    /**
     * Convert temperature to percentage (for the brightness control)
     * @param temperature - Temperature in Celsius
     * @returns Percentage value for slider (0-100)
     */
    private temperatureToPercentage;
    /**
     * Convert percentage to temperature
     * @param percentage - Percentage value from slider (0-100)
     * @returns Temperature in Celsius
     */
    private percentageToTemperature;
    /**
     * Handler for CurrentTemperature GET
     * @returns Current temperature value
     */
    private handleCurrentTemperatureGet;
    /**
     * Handler for power state GET
     * @returns Current power state (boolean)
     */
    private handlePowerStateGet;
    /**
     * Handler for power state SET
     * @param value - New power state value
     */
    private handlePowerStateSet;
    /**
     * Handler for temperature control GET
     * @returns Current temperature as percentage for slider
     */
    private handleTemperatureControlGet;
    /**
     * Handler for temperature control SET
     * @param value - New temperature percentage from slider
     */
    private handleTemperatureControlSet;
    /**
     * Clean up resources when this accessory is removed
     */
    cleanup(): void;
}
