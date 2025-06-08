import { Device, DeviceStatus, ApiStats, Logger } from './types.js';
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
    private requestsThisMinute;
    private minuteStartTime;
    private lastRequestTime;
    private processingQueue;
    private rateLimitBackoffUntil;
    private rateLimitRetries;
    private consecutiveErrors;
    private rateExceededLogged;
    private requestIdCounter;
    private deviceStatusCache;
    private stats;
    private readonly startupComplete;
    private startupFinished;
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
     * Update device settings
     * @param deviceId Device identifier
     * @param settings Settings to update
     * @param priority Request priority level
     * @returns Whether operation was successful
     */
    private updateDeviceSettings;
    /**
   * Update cache with a trusted device state based on our commands
   * Enhanced with better consistency handling
   * @param deviceId Device identifier
   * @param updates Status updates to apply
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
   * Determine if we should wait for rate limits based on request priority
   */
    private shouldWaitForRateLimit;
    /**
     * Handle rate limit errors with priority-aware backoff
     */
    private handleRateLimitError;
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
     * Check and reset rate limit counter using discrete minute windows
     */
    private checkRateLimit;
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
   * Enhanced with deduplication to prevent concurrent polling conflicts
   * @param deviceId Device ID
   * @param operationType Optional type of operation to cancel (if not specified, cancels all)
   */
    private cancelPendingRequests;
    /**
     * Check for duplicate requests and deduplicate them
     * Prevents multiple concurrent requests for the same device/operation
     * @param newRequest New request to check
     * @returns true if request should be queued, false if duplicate found
     */
    private shouldQueueRequest;
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
