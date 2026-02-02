import { Device, DeviceStatus, ApiStats, Logger } from './types.js';
import { EmpiricalRateLimiter } from './empirical-rate-limiter.js';
import { UltraConservativeRateLimiter } from './ultra-conservative-rate-limiter.js';
import { EmpiricalDiscreteWindowLimiter } from './empirical-token-bucket-limiter.js';
/**
 * SleepMe API Client
 * Handles API communication with rate limiting and robust error handling
 */
export declare class SleepMeApi {
    private readonly apiToken;
    private readonly logger;
    private criticalQueue;
    private highPriorityQueue;
    private normalPriorityQueue;
    private lowPriorityQueue;
    private processingQueue;
    private consecutiveErrors;
    private rateExceededLogged;
    private empiricalRateLimiter;
    private ultraConservativeRateLimiter;
    private discreteWindowLimiter;
    private requestIdCounter;
    private deviceStatusCache;
    private stats;
    private readonly startupComplete;
    private startupFinished;
    private initialDiscoveryComplete;
    private startupTime;
    private authHeaderValue;
    private triedWithoutBearer;
    private authFormatChangeLogged;
    /**
     * Create a new SleepMe API client
     * @param apiToken API authentication token
     * @param logger Logging utility
     */
    constructor(apiToken: string, logger: Logger);
    /**
     * Get API statistics
     * @returns Current API statistics
     */
    getStats(): ApiStats;
    /**
     * Get empirical rate limiter statistics
     * @returns Current rate limiter statistics and recommendations
     */
    getRateLimiterStats(): {
        stats: ReturnType<EmpiricalRateLimiter['getStats']>;
        recommendations: string[];
    };
    /**
     * Get ultra-conservative rate limiter statistics and recommendations
     * @returns Current rate limiter status and recommendations
     */
    getUltraConservativeStats(): {
        status: ReturnType<UltraConservativeRateLimiter['getStatus']>;
        recommendations: string[];
    };
    /**
     * Get primary discrete window rate limiter statistics and recommendations
     * @returns Current rate limiter status and detailed statistics
     */
    getDiscreteWindowStats(): {
        status: ReturnType<EmpiricalDiscreteWindowLimiter['getStatus']>;
        detailedStats: ReturnType<EmpiricalDiscreteWindowLimiter['getDetailedStats']>;
        recommendations: string[];
    };
    /**
     * Mark startup as complete (called by platform when initial discovery is done)
     * This allows the platform to control when startup is considered finished
     */
    markStartupComplete(): void;
    /**
     * Mark initial discovery as complete (called by platform after first device discovery)
     * This ensures device discovery uses NORMAL priority during initial startup
     */
    markInitialDiscoveryComplete(): void;
    /**
     * Create a simple hash of device ID for consistent jitter
     * @param deviceId Device identifier
     * @returns Hash value for jitter calculation
     */
    private hashDeviceId;
    /**
     * Clean up expired cache entries
     */
    private cleanupCache;
    /**
     * Get devices from the SleepMe API
     * @returns Array of devices or empty array if error
     */
    getDevices(): Promise<Device[]>;
    /**
    * Get status for a specific device with trust-based caching
    * @param deviceId Device identifier
    * @param forceFresh Whether to force a fresh status update
    * @returns Device status or null if error
    */
    getDeviceStatus(deviceId: string, forceFresh?: boolean): Promise<DeviceStatus | null>;
    /**
   * Turn device on and set temperature in a single operation
   * With trust-based approach (no verification GET)
   * @param deviceId Device identifier
   * @param temperature Target temperature in Celsius
   * @returns Whether operation was successful
   */
    turnDeviceOn(deviceId: string, temperature?: number): Promise<boolean>;
    /**
   * Turn device off
   * @param deviceId Device identifier
   * @returns Whether operation was successful
   */
    turnDeviceOff(deviceId: string): Promise<boolean>;
    /**
   * Set device temperature
   * With trust-based approach (no verification GET)
   * @param deviceId Device identifier
   * @param temperature Target temperature in Celsius
   * @returns Whether operation was successful
   */
    setTemperature(deviceId: string, temperature: number): Promise<boolean>;
    /**
     * Cancel all pending requests for a device
     * @param deviceId Device ID
     */
    cancelAllDeviceRequests(deviceId: string): void;
    /**
     * Turn device on for schedule operation (uses schedule context)
     * @param deviceId Device identifier
     * @param temperature Target temperature in Celsius
     * @returns Whether operation was successful
     */
    turnDeviceOnForSchedule(deviceId: string, temperature: number): Promise<boolean>;
    /**
     * Set temperature for schedule operation (uses schedule context)
     * @param deviceId Device identifier
     * @param temperature Target temperature in Celsius
     * @returns Whether operation was successful
     */
    setTemperatureForSchedule(deviceId: string, temperature: number): Promise<boolean>;
    /**
     * Update device settings
     * @param deviceId Device identifier
     * @param settings Settings to update
     * @returns Whether operation was successful
     */
    private updateDeviceSettings;
    /**
   * Update cache with a trusted device state based on our commands
   * Enhanced with better consistency handling
   * @param deviceId Device identifier
   * @param updates Status updates to apply
   * @param context Context of the update (user/schedule/system)
   */
    private updateCacheWithTrustedState;
    /**
     * Get the last known temperature or a reasonable approximation
     * This helps provide a smoother UX during temperature transitions
     * @param deviceId Device identifier
     * @param targetTemp Target temperature to use if no cached temperature
     * @returns Best guess at current temperature
     */
    private getLastKnownTemperature;
    /**
   * Parse a device status from raw API response
   * Extracted to a separate method for reuse
   * @param response API response data
   * @returns Parsed device status
   */
    private parseDeviceStatus;
    /**
   * Process the request queue with improved priority handling
   * and adaptive rate limiting
   */
    private processQueue;
    /**
   * Determine if there are any queued requests
   */
    private hasQueuedRequests;
    /**
     * Get the next request from the appropriate priority queue
     * With improved OFF command prioritization
     * @returns Next request to process or undefined if all queues empty
     */
    private getNextRequest;
    /**
     * Remove a request from its queue
     * @param request Request to remove
     */
    private removeRequest;
    /**
     * Requeue a request after a failure, with appropriate priority handling
     * @param request Request to requeue
     */
    private requeueRequest;
    /**
   * Cancel pending requests of a specific type for a device
   * @param deviceId Device ID
   * @param operationType Optional type of operation to cancel (if not specified, cancels all)
   */
    private cancelPendingRequests;
    /**
     * Make a request to the SleepMe API with improved priority handling
     * @param options Request options
     * @returns Promise resolving to response data
     */
    private makeRequest;
    /**
   * Handle API errors with better logging
   * @param context Context where the error occurred
   * @param error The error that occurred
   */
    private handleApiError;
    /**
     * Update the average response time
     * @param newResponseTime New response time in milliseconds
     */
    private updateAverageResponseTime;
    /**
     * Extract a nested property value from an object
     * @param obj Object to extract from
     * @param path Dot-notation path to property
     * @returns Extracted value or undefined if not found
     */
    extractNestedValue(obj: Record<string, unknown>, path: string): unknown;
    /**
     * Extract a temperature value from nested properties
     * @param data Object to extract from
     * @param paths Array of possible property paths
     * @param defaultValue Default value if not found
     * @returns Extracted temperature or default value
     */
    private extractTemperature;
    /**
     * Extract thermal status from API response
     * @param data API response data
     * @returns Thermal status
     */
    private extractThermalStatus;
    /**
     * Extract power state from API response
     * @param data API response data
     * @returns Power state
     */
    private extractPowerState;
    /**
     * Find a request in all queues by ID
     * @param requestId The request ID to find
     * @returns Queue and index information if found
     */
    private findRequestInQueues;
    /**
     * Remove a request from a specific queue
     * @param queue The queue to remove from
     * @param index The index to remove
     */
    private removeRequestFromQueue;
    /**
     * Find an existing request for the same device and operation (for deduplication)
     * @param deviceId Device ID to search for
     * @param operationType Operation type to match
     * @returns Existing request if found, undefined otherwise
     */
    private findExistingRequest;
    /**
     * Convert Celsius to Fahrenheit
     * @param celsius Temperature in Celsius
     * @returns Temperature in Fahrenheit
     */
    private convertCtoF;
    /**
     * Convert Fahrenheit to Celsius
     * @param fahrenheit Temperature in Fahrenheit
     * @returns Temperature in Celsius
     */
    private convertFtoC;
}
