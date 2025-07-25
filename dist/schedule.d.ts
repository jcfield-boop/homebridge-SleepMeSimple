/**
 * Schedule Manager for SleepMe Simple Plugin
 * Handles scheduled temperature changes and warm hug features
 */
import { Logger } from './api/types.js';
import { SleepMeApi } from './api/sleepme-api.js';
/**
 * Schedule types supported by the plugin
 */
export declare enum ScheduleType {
    EVERYDAY = "Everyday",
    WEEKDAYS = "Weekdays",
    WEEKEND = "Weekend",
    SPECIFIC_DAY = "Specific Day"
}
/**
 * Days of the week (0 = Sunday, 6 = Saturday)
 */
export declare enum DayOfWeek {
    SUNDAY = 0,
    MONDAY = 1,
    TUESDAY = 2,
    WEDNESDAY = 3,
    THURSDAY = 4,
    FRIDAY = 5,
    SATURDAY = 6
}
/**
 * Interface for a temperature schedule
 */
export interface TemperatureSchedule {
    type: ScheduleType;
    day?: DayOfWeek;
    time: string;
    temperature: number;
    description?: string;
    isWarmHug?: boolean;
    nextExecutionTime?: number;
    lastExecutionTime?: number;
}
/**
 * Warm Hug configuration
 */
export interface WarmHugConfig {
    increment: number;
    duration: number;
}
/**
 * Schedule Manager class
 * Handles the scheduling of temperature changes
 */
export declare class ScheduleManager {
    private readonly logger;
    private readonly api;
    private readonly warmHugConfig;
    private schedules;
    private markScheduleActionCallback?;
    private schedulerTimer?;
    private lastTemperatureByDevice;
    private warmHugActiveDevices;
    private warmHugStartTimeByDevice;
    private warmHugTimersByDevice;
    /**
     * Create a new Schedule Manager
     * @param logger Logger for output
     * @param api SleepMe API client
     * @param warmHugConfig Warm Hug configuration
     */
    constructor(logger: Logger, api: SleepMeApi, warmHugConfig: WarmHugConfig, markScheduleActionCallback?: (_deviceId: string) => void);
    /**
     * Set schedules for a specific device
     * @param deviceId Device identifier
     * @param schedules Array of temperature schedules
     */
    setSchedules(deviceId: string, schedules: TemperatureSchedule[]): void;
    /**
     * Update the last known temperature for a device
     * Used to determine starting temperature for Warm Hugs
     * @param deviceId Device identifier
     * @param temperature Current temperature
     */
    updateDeviceTemperature(deviceId: string, temperature: number): void;
    /**
     * Stop and clean up all schedulers
     */
    cleanup(): void;
    /**
     * Start the scheduler
     */
    private startScheduler;
    private checkSchedules;
    /**
     * Execute a regular temperature schedule
     * @param deviceId Device identifier
     * @param schedule Schedule to execute
     */
    private executeSchedule;
    /**
     * Start a Warm Hug temperature ramp
     * @param deviceId Device identifier
     * @param schedule Schedule with target temperature
     */
    private startWarmHug;
    /**
     * Calculate the next execution time for a schedule
     * @param schedule Schedule to calculate next execution for
     * @returns Timestamp when schedule should next execute
     */
    private calculateNextExecutionTime;
    /**
     * Get the next scheduled temperature for a device
     * Useful for optimizing operations
     * @param deviceId Device identifier
     * @returns Next scheduled temperature or undefined if none
     */
    getNextScheduledTemperature(deviceId: string): {
        time: number;
        temperature: number;
    } | undefined;
    /**
     * Convert day name to day of week enum
     * @param dayName Name of the day
     * @returns DayOfWeek enum value
     */
    static dayNameToDayOfWeek(dayName: string): DayOfWeek;
    /**
     * Convert schedule type string to enum
     * @param typeStr Schedule type string
     * @returns ScheduleType enum value
     */
    static scheduleTypeFromString(typeStr: string): ScheduleType;
}
