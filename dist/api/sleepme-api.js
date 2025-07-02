/**
 * SleepMe API client implementation with robust error handling and rate limiting
 */
import axios from 'axios';
import { API_BASE_URL, MAX_REQUESTS_PER_MINUTE, MIN_REQUEST_INTERVAL, DEFAULT_CACHE_VALIDITY_MS, MAX_RETRIES, BACKGROUND_REQUEST_THRESHOLD, RequestPriority } from '../settings.js';
import { ThermalStatus, PowerState } from './types.js';
import { TokenBucket } from '../token-bucket.js';
/**
 * SleepMe API Client
 * Handles API communication with rate limiting and robust error handling
 */
export class SleepMeApi {
    apiToken;
    logger;
    // Simplified request queue - just two queues based on real API constraints
    userActionQueue = []; // CRITICAL + HIGH priority requests
    backgroundQueue = []; // NORMAL + LOW priority requests
    // Rate limiting state - now using token bucket for more accurate tracking
    tokenBucket;
    requestsThisMinute = 0;
    minuteStartTime = Date.now();
    lastRequestTime = 0;
    processingQueue = false;
    rateLimitBackoffUntil = 0;
    rateLimitRetries = 0;
    consecutiveErrors = 0;
    rateExceededLogged = false; // Flag to prevent redundant log messages
    // Request ID counter
    requestIdCounter = 0;
    // Device status cache
    deviceStatusCache = new Map();
    // API statistics for monitoring
    stats = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        lastRequest: null,
        lastError: null,
        averageResponseTime: 0
    };
    /**
     * Create a new SleepMe API client
     * @param apiToken API authentication token
     * @param logger Logging utility
     */
    constructor(apiToken, logger) {
        this.apiToken = apiToken;
        this.logger = logger;
        // Validate API token
        if (!apiToken || apiToken.trim() === '') {
            this.logger.error('Invalid API token provided');
            throw new Error('Invalid API token provided');
        }
        // Initialize token bucket with empirically tested parameters
        this.tokenBucket = new TokenBucket({
            maxTokens: 7,
            refillRate: 1,
            refillInterval: 15000,
            initialTokens: 3 // Start with partial tokens to be conservative but not zero
        }, this.logger);
        // Start the queue processor
        this.processQueue();
        // Set up cache cleanup interval
        setInterval(() => this.cleanupCache(), 300000); // Clean up cache every 5 minutes
        // Set up queue cleanup interval to remove stale requests
        setInterval(() => this.cleanupStaleRequests(), 60000); // Clean up queue every minute
        this.logger.info('SleepMe API client initialized');
    }
    /**
     * Get API statistics including token bucket status
     * @returns Current API statistics
     */
    getStats() {
        return {
            ...this.stats,
            tokenBucket: this.tokenBucket.getStats()
        };
    }
    /**
     * Check if token bucket allows this request based on priority
     * CRITICAL and HIGH priority requests can bypass token bucket constraints
     */
    async checkTokenBucketForRequest(priority) {
        // CRITICAL requests always bypass token bucket (user power commands)
        if (priority === RequestPriority.CRITICAL) {
            this.logger.verbose('[CRITICAL PRIORITY] Bypassing token bucket constraints');
            return true;
        }
        // HIGH priority requests bypass if bucket is nearly empty but not completely empty
        if (priority === RequestPriority.HIGH) {
            const stats = this.tokenBucket.getStats();
            if (stats.tokensAvailable >= 1) {
                this.logger.verbose('[HIGH PRIORITY] Using token bucket');
                return this.tokenBucket.consume(true); // HIGH priority = user action
            }
            else {
                this.logger.verbose('[HIGH PRIORITY] Bypassing empty token bucket');
                return true;
            }
        }
        // NORMAL and LOW priority requests must respect token bucket
        const canConsume = this.tokenBucket.consume(false); // background request
        if (!canConsume) {
            this.logger.verbose(`[${priority} PRIORITY] Token bucket depleted, waiting...`);
        }
        return canConsume;
    }
    /**
     * Clean up expired cache entries
     */
    cleanupCache() {
        const now = Date.now();
        let expiredCount = 0;
        for (const [deviceId, cacheEntry] of this.deviceStatusCache.entries()) {
            // Keep cache entries that are less than twice the validity period old
            if (now - cacheEntry.timestamp > DEFAULT_CACHE_VALIDITY_MS * 2) {
                this.deviceStatusCache.delete(deviceId);
                expiredCount++;
            }
        }
        if (expiredCount > 0) {
            this.logger.debug(`Cleaned up ${expiredCount} expired cache entries`);
        }
    }
    /**
     * Log current queue status for debugging
     */
    logQueueStatus(context) {
        const now = Date.now();
        const userActions = this.userActionQueue.filter(r => !r.executing);
        const background = this.backgroundQueue.filter(r => !r.executing);
        const executing = [
            ...this.userActionQueue.filter(r => r.executing),
            ...this.backgroundQueue.filter(r => r.executing)
        ];
        this.logger.warn(`${context}: Queue status - User Actions: ${userActions.length}, Background: ${background.length}, Executing: ${executing.length}`);
        // Log details about executing requests
        executing.forEach(req => {
            const executingTime = req.lastAttempt ? now - req.lastAttempt : 0;
            this.logger.warn(`  Executing: ${req.method} ${req.url} (${Math.round(executingTime / 1000)}s)`);
        });
        // Log details about oldest queued requests
        const allQueued = [...userActions, ...background].sort((a, b) => a.timestamp - b.timestamp);
        allQueued.slice(0, 3).forEach(req => {
            const age = Math.round((now - req.timestamp) / 1000);
            this.logger.warn(`  Queued: ${req.priority} ${req.method} ${req.url} (${age}s old)`);
        });
    }
    /**
     * Clean up stale requests from all queues
     */
    cleanupStaleRequests() {
        const now = Date.now();
        const maxAge = 300000; // 5 minutes
        const maxExecutingTime = 30000; // 30 seconds for executing requests
        let cleanedCount = 0;
        const cleanupQueue = (queue, queueName) => {
            const initialLength = queue.length;
            for (let i = queue.length - 1; i >= 0; i--) {
                const request = queue[i];
                const age = now - request.timestamp;
                const executingTime = request.lastAttempt ? now - request.lastAttempt : 0;
                let shouldRemove = false;
                let reason = '';
                // Remove very old requests
                if (age > maxAge) {
                    shouldRemove = true;
                    reason = `too old (${Math.round(age / 1000)}s)`;
                }
                // Remove requests that have been "executing" too long
                else if (request.executing && executingTime > maxExecutingTime) {
                    shouldRemove = true;
                    reason = `stuck executing (${Math.round(executingTime / 1000)}s)`;
                }
                if (shouldRemove) {
                    this.logger.warn(`Removing stale request from ${queueName}: ${request.method} ${request.url} - ${reason}`);
                    // For critical user commands that got stuck, we assume they succeeded
                    // This prevents the need for double-button presses
                    if (request.priority === RequestPriority.CRITICAL && request.method === 'PATCH') {
                        this.logger.info(`Assuming stuck CRITICAL command succeeded: ${request.method} ${request.url}`);
                        // Resolve with a success response for PATCH commands
                        request.resolve({ success: true, assumed: true });
                    }
                    else {
                        // For other requests, resolve with null to prevent hanging promises
                        request.resolve(null);
                    }
                    // Remove from queue
                    queue.splice(i, 1);
                    cleanedCount++;
                }
            }
        };
        // Clean up all queues
        cleanupQueue(this.userActionQueue, 'userActions');
        cleanupQueue(this.backgroundQueue, 'background');
        if (cleanedCount > 0) {
            this.logger.warn(`Cleaned up ${cleanedCount} stale requests from queues`);
        }
    }
    /**
     * Get devices from the SleepMe API
     * @returns Array of devices or empty array if error
     */
    async getDevices() {
        try {
            this.logger.debug('Fetching devices...');
            const response = await this.makeRequest({
                method: 'GET',
                url: '/devices',
                priority: RequestPriority.HIGH,
                operationType: 'getDevices'
            });
            // Handle different API response formats
            let devices;
            if (Array.isArray(response)) {
                devices = response;
            }
            else if (response && typeof response === 'object' && 'devices' in response) {
                devices = response.devices;
            }
            else {
                this.logger.error('Unexpected API response format for devices');
                return [];
            }
            // Validate and filter devices
            const validDevices = devices.filter(device => {
                if (!device.id) {
                    this.logger.warn(`Found device without ID: ${JSON.stringify(device)}`);
                    return false;
                }
                return true;
            });
            this.logger.info(`Found ${validDevices.length} devices`);
            return validDevices;
        }
        catch (error) {
            this.handleApiError('getDevices', error);
            return [];
        }
    }
    /**
    * Get status for a specific device with trust-based caching
    * @param deviceId Device identifier
    * @param forceFresh Whether to force a fresh status update
    * @returns Device status or null if error
    */
    async getDeviceStatus(deviceId, forceFresh = false) {
        if (!deviceId) {
            this.logger.error('Missing device ID in getDeviceStatus');
            return null;
        }
        try {
            // Check cache first if not forcing fresh data
            if (!forceFresh) {
                const cachedStatus = this.deviceStatusCache.get(deviceId);
                const now = Date.now();
                // Use cache with dynamic validity based on confidence and source
                // High confidence cache (from PATCH responses) can be used longer
                if (cachedStatus) {
                    let validityPeriod = DEFAULT_CACHE_VALIDITY_MS;
                    // Adjust validity period based on confidence, source, and device state
                    // More aggressive caching for routine polling efficiency, but shorter for active devices
                    if (cachedStatus.confidence === 'high' && !cachedStatus.isOptimistic) {
                        // Check if device is actively heating/cooling (needs more frequent updates)
                        const isDeviceActive = cachedStatus.status.powerState === PowerState.ON &&
                            (cachedStatus.status.thermalStatus === ThermalStatus.ACTIVE ||
                                cachedStatus.status.thermalStatus === ThermalStatus.HEATING ||
                                cachedStatus.status.thermalStatus === ThermalStatus.COOLING);
                        if (isDeviceActive) {
                            // Active devices need fresher data for temperature tracking
                            validityPeriod = cachedStatus.source === 'patch' ?
                                DEFAULT_CACHE_VALIDITY_MS * 2 : // Shorter validity for active PATCH responses
                                DEFAULT_CACHE_VALIDITY_MS * 1.5; // Shorter validity for active GET
                        }
                        else {
                            // Inactive devices can use longer cache periods
                            validityPeriod = cachedStatus.source === 'patch' ?
                                DEFAULT_CACHE_VALIDITY_MS * 4 : // Longer validity for inactive PATCH responses
                                DEFAULT_CACHE_VALIDITY_MS * 3; // Extended validity for inactive GET
                        }
                    }
                    else if (cachedStatus.isOptimistic) {
                        validityPeriod = DEFAULT_CACHE_VALIDITY_MS; // Normal validity for optimistic updates
                    }
                    if (now - cachedStatus.timestamp < validityPeriod) {
                        const ageSeconds = Math.round((now - cachedStatus.timestamp) / 1000);
                        const confidenceInfo = cachedStatus.confidence
                            ? ` (${cachedStatus.confidence} confidence)`
                            : '';
                        const optimisticFlag = cachedStatus.isOptimistic ? ' (optimistic)' : '';
                        const verifiedFlag = cachedStatus.verified ? ' (verified)' : '';
                        const isDeviceActive = cachedStatus.status.powerState === PowerState.ON &&
                            (cachedStatus.status.thermalStatus === ThermalStatus.ACTIVE ||
                                cachedStatus.status.thermalStatus === ThermalStatus.HEATING ||
                                cachedStatus.status.thermalStatus === ThermalStatus.COOLING);
                        const activityFlag = isDeviceActive ? ' (active)' : ' (inactive)';
                        this.logger.verbose(`Using cached status for device ${deviceId} (${ageSeconds}s old${optimisticFlag}${confidenceInfo}${verifiedFlag}${activityFlag})`);
                        return cachedStatus.status;
                    }
                }
            }
            // At this point, we need fresh data
            this.logger.debug(`Fetching status for device ${deviceId}...`);
            const priority = forceFresh ? RequestPriority.HIGH : RequestPriority.NORMAL;
            this.logger.verbose(`Using ${priority} priority for device status request (forceFresh: ${forceFresh})`);
            const response = await this.makeRequest({
                method: 'GET',
                url: `/devices/${deviceId}`,
                priority: priority,
                deviceId,
                operationType: 'getDeviceStatus'
            });
            if (!response) {
                this.logger.error(`Empty response for device ${deviceId}`);
                return null;
            }
            // Parse the device status from the response
            const status = this.parseDeviceStatus(response);
            // Update cache with fresh data and mark it as verified
            this.deviceStatusCache.set(deviceId, {
                status,
                timestamp: Date.now(),
                isOptimistic: false,
                confidence: 'high',
                source: 'get',
                verified: true // This is from a GET so it's verified by definition
            });
            return status;
        }
        catch (error) {
            this.handleApiError(`getDeviceStatus(${deviceId})`, error);
            return null;
        }
    }
    /**
   * Unified device control method
   * @param deviceId Device identifier
   * @param action Action to perform: 'on', 'off', or 'temperature'
   * @param temperature Optional temperature for 'on' and 'temperature' actions
   * @returns Whether operation was successful
   */
    async controlDevice(deviceId, action, temperature) {
        try {
            // Cancel any pending requests for this device
            this.cancelAllDeviceRequests(deviceId);
            let payload;
            let cacheUpdates;
            let logMessage;
            switch (action) {
                case 'on': {
                    const targetTemp = temperature !== undefined ? temperature : 21;
                    payload = {
                        set_temperature_f: Math.round(this.convertCtoF(targetTemp)),
                        thermal_control_status: 'active'
                    };
                    cacheUpdates = {
                        powerState: PowerState.ON,
                        targetTemperature: targetTemp,
                        thermalStatus: ThermalStatus.ACTIVE,
                        currentTemperature: this.getLastKnownTemperature(deviceId, targetTemp)
                    };
                    logMessage = `Turning device ${deviceId} ON with temperature ${targetTemp}°C`;
                    break;
                }
                case 'off':
                    payload = { thermal_control_status: 'standby' };
                    cacheUpdates = {
                        powerState: PowerState.OFF,
                        thermalStatus: ThermalStatus.STANDBY
                    };
                    logMessage = `Turning device ${deviceId} OFF`;
                    break;
                case 'temperature':
                    if (temperature === undefined) {
                        throw new Error('Temperature is required for temperature action');
                    }
                    payload = { set_temperature_f: Math.round(this.convertCtoF(temperature)) };
                    cacheUpdates = {
                        targetTemperature: temperature,
                        powerState: PowerState.ON,
                        thermalStatus: ThermalStatus.ACTIVE
                    };
                    logMessage = `Setting device ${deviceId} temperature to ${temperature}°C`;
                    break;
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
            this.logger.info(logMessage);
            this.logger.verbose(`${action.toUpperCase()} payload: ${JSON.stringify(payload)}`);
            const success = await this.updateDeviceSettings(deviceId, payload, RequestPriority.CRITICAL);
            if (success) {
                this.updateCacheWithTrustedState(deviceId, cacheUpdates);
                this.logger.verbose(`Device ${deviceId} ${action.toUpperCase()} operation successful`);
                return true;
            }
            else {
                this.logger.error(`Failed to ${action} device ${deviceId}`);
                return false;
            }
        }
        catch (error) {
            this.handleApiError(`controlDevice(${deviceId}, ${action})`, error);
            return false;
        }
    }
    /**
     * Turn device on and set temperature in a single operation
     * With trust-based approach (no verification GET)
     * @param deviceId Device identifier
     * @param temperature Target temperature in Celsius
     * @returns Whether operation was successful
     */
    async turnDeviceOn(deviceId, temperature) {
        return this.controlDevice(deviceId, 'on', temperature);
    }
    /**
   * Turn device off
   * @param deviceId Device identifier
   * @returns Whether operation was successful
   */
    async turnDeviceOff(deviceId) {
        // Get the current cache state before making the call
        const currentCache = this.deviceStatusCache.get(deviceId);
        const wasAlreadyOff = currentCache?.status.powerState === PowerState.OFF;
        // If already OFF, don't send another OFF command
        if (wasAlreadyOff) {
            this.logger.verbose(`Device ${deviceId} is already OFF, skipping redundant command`);
            return true;
        }
        return this.controlDevice(deviceId, 'off');
    }
    /**
   * Set device temperature
   * With trust-based approach (no verification GET)
   * @param deviceId Device identifier
   * @param temperature Target temperature in Celsius
   * @returns Whether operation was successful
   */
    async setTemperature(deviceId, temperature) {
        return this.controlDevice(deviceId, 'temperature', temperature);
    }
    /**
     * Cancel all pending requests for a device
     * @param deviceId Device ID
     */
    cancelAllDeviceRequests(deviceId) {
        this.cancelPendingRequests(deviceId);
    }
    /**
     * Update device settings
     * @param deviceId Device identifier
     * @param settings Settings to update
     * @param priority Request priority level
     * @returns Whether operation was successful
     */
    async updateDeviceSettings(deviceId, settings, priority = RequestPriority.CRITICAL) {
        if (!deviceId) {
            this.logger.error('Missing device ID in updateDeviceSettings');
            return false;
        }
        if (!settings || Object.keys(settings).length === 0) {
            this.logger.error('Empty settings in updateDeviceSettings');
            return false;
        }
        try {
            this.logger.debug(`Updating device ${deviceId} settings: ${JSON.stringify(settings)}`);
            // Cancel any pending device status requests for this device
            this.cancelPendingRequests(deviceId, 'getDeviceStatus');
            // Make the request with the specified priority
            await this.makeRequest({
                method: 'PATCH',
                url: `/devices/${deviceId}`,
                data: settings,
                priority: priority,
                deviceId,
                operationType: 'updateDeviceSettings'
            });
            // If we reach here, no exception was thrown, so the request succeeded
            this.logger.info(`Successfully updated device ${deviceId} settings`);
            // Reset consecutive errors on success
            this.consecutiveErrors = 0;
            return true;
        }
        catch (error) {
            this.handleApiError(`updateDeviceSettings(${deviceId})`, error);
            return false;
        }
    }
    /**
   * Update cache with a trusted device state based on our commands
   * Enhanced with better consistency handling
   * @param deviceId Device identifier
   * @param updates Status updates to apply
   */
    updateCacheWithTrustedState(deviceId, updates) {
        // Get current cached status
        const cachedEntry = this.deviceStatusCache.get(deviceId);
        let updatedStatus;
        if (cachedEntry) {
            // Merge updates with current status
            updatedStatus = {
                ...cachedEntry.status,
                ...updates
            };
            // Critical fix: Power state must be explicitly set based on thermal status
            // This ensures consistency between power state and thermal status
            if (updates.thermalStatus !== undefined) {
                if (updates.thermalStatus === ThermalStatus.STANDBY ||
                    updates.thermalStatus === ThermalStatus.OFF) {
                    // Always set power to OFF when thermal status is STANDBY or OFF
                    updatedStatus.powerState = PowerState.OFF;
                }
                else if (updates.thermalStatus === ThermalStatus.ACTIVE ||
                    updates.thermalStatus === ThermalStatus.COOLING ||
                    updates.thermalStatus === ThermalStatus.HEATING) {
                    // Always set power to ON for active states
                    updatedStatus.powerState = PowerState.ON;
                }
            }
            // Explicitly log the before and after power states for debugging
            this.logger.verbose(`Cache update: Previous power=${cachedEntry.status.powerState}, ` +
                `New power=${updatedStatus.powerState}, ` +
                `Update requested=${updates.powerState || (updates.thermalStatus ? this.inferPowerFromThermal(updates.thermalStatus) : 'none')}`);
        }
        else {
            // Create a new status with reasonable defaults
            updatedStatus = {
                currentTemperature: 21,
                targetTemperature: 21,
                thermalStatus: ThermalStatus.UNKNOWN,
                powerState: PowerState.UNKNOWN,
                ...updates
            };
            // Same consistency check for new status
            if (updates.thermalStatus === ThermalStatus.STANDBY ||
                updates.thermalStatus === ThermalStatus.OFF) {
                updatedStatus.powerState = PowerState.OFF;
            }
            else if (updates.thermalStatus === ThermalStatus.ACTIVE ||
                updates.thermalStatus === ThermalStatus.COOLING ||
                updates.thermalStatus === ThermalStatus.HEATING) {
                updatedStatus.powerState = PowerState.ON;
            }
        }
        // Store updated status as trusted (not optimistic)
        this.deviceStatusCache.set(deviceId, {
            status: updatedStatus,
            timestamp: Date.now(),
            isOptimistic: false,
            confidence: 'high',
            source: 'patch',
            verified: false // Not verified yet, but trusted until proven otherwise
        });
        this.logger.verbose(`Updated cache with trusted state for device ${deviceId}: ` +
            `Power=${updatedStatus.powerState}, ` +
            `Target=${updatedStatus.targetTemperature}°C, ` +
            `Status=${updatedStatus.thermalStatus}`);
    }
    /**
     * Helper method to infer power state from thermal status
     * @param thermalStatus The thermal status
     * @returns The corresponding power state
     */
    inferPowerFromThermal(thermalStatus) {
        if (thermalStatus === ThermalStatus.STANDBY || thermalStatus === ThermalStatus.OFF) {
            return 'off';
        }
        else if (thermalStatus === ThermalStatus.ACTIVE ||
            thermalStatus === ThermalStatus.COOLING ||
            thermalStatus === ThermalStatus.HEATING) {
            return 'on';
        }
        return 'unknown';
    }
    /**
     * Get the last known temperature or a reasonable approximation
     * This helps provide a smoother UX during temperature transitions
     * @param deviceId Device identifier
     * @param targetTemp Target temperature to use if no cached temperature
     * @returns Best guess at current temperature
     */
    getLastKnownTemperature(deviceId, targetTemp) {
        const cachedEntry = this.deviceStatusCache.get(deviceId);
        if (cachedEntry && !isNaN(cachedEntry.status.currentTemperature)) {
            // We have a cached temperature, use it
            return cachedEntry.status.currentTemperature;
        }
        // No cached temperature, approximate based on target
        return targetTemp;
    }
    /**
   * Parse a device status from raw API response
   * Extracted to a separate method for reuse
   * @param response API response data
   * @returns Parsed device status
   */
    parseDeviceStatus(response) {
        const status = {
            currentTemperature: this.extractTemperature(response, [
                'status.water_temperature_c',
                'water_temperature_c',
                'control.current_temperature_c',
                'current_temperature_c'
            ], 21),
            targetTemperature: this.extractTemperature(response, [
                'control.set_temperature_c',
                'set_temperature_c'
            ], 21),
            thermalStatus: this.extractThermalStatus(response),
            powerState: this.extractPowerState(response),
            rawResponse: response
        };
        // Extract firmware version and other details
        const firmwareVersion = this.extractNestedValue(response, 'about.firmware_version') ||
            this.extractNestedValue(response, 'firmware_version');
        if (firmwareVersion) {
            status.firmwareVersion = String(firmwareVersion);
        }
        // Extract connection status if available
        const connected = this.extractNestedValue(response, 'status.is_connected') ||
            this.extractNestedValue(response, 'is_connected');
        if (connected !== undefined) {
            status.connected = Boolean(connected);
        }
        // Extract water level information if available
        const waterLevel = this.extractNestedValue(response, 'status.water_level') ||
            this.extractNestedValue(response, 'water_level');
        if (waterLevel !== undefined) {
            status.waterLevel = Number(waterLevel);
        }
        const isWaterLow = this.extractNestedValue(response, 'status.is_water_low') ||
            this.extractNestedValue(response, 'is_water_low');
        if (isWaterLow !== undefined) {
            status.isWaterLow = Boolean(isWaterLow);
        }
        // Log the status information
        this.logger.verbose(`Device status: Temp=${status.currentTemperature}°C, ` +
            `Target=${status.targetTemperature}°C, ` +
            `Status=${status.thermalStatus}, ` +
            `Power=${status.powerState}` +
            (status.waterLevel !== undefined ? `, Water=${status.waterLevel}%` : ''));
        return status;
    }
    /**
   * Determine if we should wait for rate limits based on request priority
   */
    shouldWaitForRateLimit() {
        const now = Date.now();
        // Check if we have user action or background requests
        const hasUserActionRequest = this.userActionQueue.some(r => !r.executing);
        const hasBackgroundRequest = this.backgroundQueue.some(r => !r.executing);
        // User action requests always bypass rate limits for maximum responsiveness
        if (hasUserActionRequest) {
            return { shouldWait: false, waitTime: 0, message: '' };
        }
        // Background requests respect rate limits and get lower priority processing
        if (hasBackgroundRequest) {
            if (this.requestsThisMinute >= MAX_REQUESTS_PER_MINUTE) {
                const resetTime = this.minuteStartTime + 60000;
                const waitTime = resetTime - now + 1000;
                return {
                    shouldWait: true,
                    waitTime,
                    message: 'Rate limit reached, waiting for background request'
                };
            }
            return { shouldWait: false, waitTime: 0, message: '' };
        }
        // For LOW priority requests only, be more conservative
        const backgroundThreshold = Math.floor(MAX_REQUESTS_PER_MINUTE * BACKGROUND_REQUEST_THRESHOLD);
        if (this.requestsThisMinute >= backgroundThreshold) {
            const resetTime = this.minuteStartTime + 60000;
            const waitTime = resetTime - now + 1000;
            return {
                shouldWait: true,
                waitTime,
                message: `Background request threshold reached (LOW priority only)`
            };
        }
        return { shouldWait: false, waitTime: 0, message: '' };
    }
    /**
     * Handle rate limit errors with priority-aware backoff
     */
    handleRateLimitError(request) {
        const now = Date.now();
        // Sync our token bucket to server state (assume server bucket is empty)
        this.tokenBucket.syncToServerEmpty();
        if (request.priority === RequestPriority.CRITICAL) {
            this.rateLimitBackoffUntil = now + 5000; // Only 5 seconds for critical
            this.logger.warn('Rate limit exceeded for critical request. Short backoff (5s)');
        }
        else {
            // Use the same discrete minute calculation as rate limit reset
            const nextMinute = this.minuteStartTime + 60000;
            const waitTime = (nextMinute - now) + 1000; // 1 second buffer
            this.rateLimitBackoffUntil = now + waitTime;
            this.logger.warn(`Rate limit exceeded. Waiting until next minute: ${Math.ceil(waitTime / 1000)}s`);
        }
        this.requeueRequest(request);
    }
    /**
     * Process the request queue with improved priority handling
     * and adaptive rate limiting
     */
    async processQueue() {
        // If already processing, exit
        if (this.processingQueue) {
            return;
        }
        this.processingQueue = true;
        try {
            // Keep processing as long as there are requests
            while (this.hasQueuedRequests()) {
                // Check if we need to reset rate limit counter
                this.checkRateLimit();
                // Log queue status if we have significant backlog
                const totalQueued = this.userActionQueue.length + this.backgroundQueue.length;
                if (totalQueued >= 3) {
                    this.logQueueStatus('Queue backlog detected during processing');
                }
                // Check if we're in backoff mode - allow critical/high priority during shorter backoffs
                const now = Date.now();
                if (this.rateLimitBackoffUntil > now) {
                    const hasUserActionRequest = this.userActionQueue.some(r => !r.executing);
                    // Skip backoff for user actions if backoff is short
                    if (hasUserActionRequest &&
                        (this.rateLimitBackoffUntil - now) <= 10000) { // 10 seconds or less
                        this.logger.debug('Bypassing short backoff for user request');
                    }
                    else {
                        // Only log this once, not repeatedly
                        if (!this.rateExceededLogged) {
                            const waitTime = Math.ceil((this.rateLimitBackoffUntil - now) / 1000);
                            this.logger.info(`Rate limit backoff active, waiting ${waitTime}s before retry`);
                            this.rateExceededLogged = true;
                        }
                        // Use a single timer rather than polling
                        await new Promise(resolve => setTimeout(resolve, this.rateLimitBackoffUntil - now + 1000));
                        continue;
                    }
                }
                // Get the next request to check its priority
                const request = this.getNextRequest();
                if (!request) {
                    break; // No requests to process
                }
                // Apply minimum interval only to LOW priority requests
                const timeSinceLastRequest = now - this.lastRequestTime;
                if (request.priority === RequestPriority.LOW &&
                    this.lastRequestTime > 0 &&
                    timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
                    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
                    this.logger.debug(`Enforcing minimum request interval for LOW priority: waiting ${waitTime}ms`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue; // Re-check timing after wait
                }
                // Use smart rate limit checking
                const rateLimitCheck = this.shouldWaitForRateLimit();
                if (rateLimitCheck.shouldWait) {
                    // Only log this once, not repeatedly
                    if (!this.rateExceededLogged) {
                        this.logger.info(rateLimitCheck.message + `, waiting ${Math.ceil(rateLimitCheck.waitTime / 1000)}s`);
                        this.rateExceededLogged = true;
                    }
                    // Wait for rate limit reset with a single timer
                    await new Promise(resolve => setTimeout(resolve, rateLimitCheck.waitTime));
                    continue;
                }
                // Mark the request as executing
                request.executing = true;
                request.lastAttempt = now;
                try {
                    // Update rate limiting counters
                    this.requestsThisMinute++;
                    this.lastRequestTime = now;
                    // Add auth token to request
                    request.config.headers = {
                        ...(request.config.headers || {}),
                        Authorization: `Bearer ${this.apiToken}`
                    };
                    this.logger.verbose(`Executing request ${request.id}: ${request.method} ${request.url} [${request.priority}]`);
                    const startTime = now;
                    // Execute the request
                    this.stats.totalRequests++;
                    const response = await axios(request.config);
                    this.stats.successfulRequests++;
                    this.stats.lastRequest = new Date();
                    // Track response time
                    const responseTime = Date.now() - startTime;
                    this.updateAverageResponseTime(responseTime);
                    // Resolve the promise with the data
                    request.resolve(response.data);
                    this.logger.verbose(`Request ${request.id} completed in ${responseTime}ms`);
                    // Reset consecutive errors and rate limit retries on success
                    this.consecutiveErrors = 0;
                    this.rateLimitRetries = 0;
                }
                catch (error) {
                    const axiosError = error;
                    this.stats.failedRequests++;
                    this.stats.lastError = axiosError;
                    // Handle rate limiting (HTTP 429)
                    if (axiosError.response?.status === 429) {
                        this.logger.warn(`429 Rate limit error on request ${request.id}: ${request.method} ${request.url} (attempt ${request.retryCount + 1})`);
                        this.logger.warn(`Current request count: ${this.requestsThisMinute}/${MAX_REQUESTS_PER_MINUTE} in this minute window`);
                        // Reset our counter if server says we're rate limited but our counter is low
                        // This handles misalignment between client and server rate limit windows
                        if (this.requestsThisMinute <= 3) {
                            this.logger.warn('Server rate limit detected with low client count - possible window misalignment, resetting to server window');
                            // Reset to current minute and set counter to trigger backoff
                            this.minuteStartTime = Math.floor(Date.now() / 60000) * 60000;
                            this.requestsThisMinute = MAX_REQUESTS_PER_MINUTE;
                        }
                        this.handleRateLimitError(request);
                    }
                    else {
                        // For other errors, check retry logic by priority
                        this.consecutiveErrors++;
                        // Critical and high priority get more retries
                        const maxRetries = request.priority === RequestPriority.CRITICAL
                            ? MAX_RETRIES + 2
                            : request.priority === RequestPriority.HIGH
                                ? MAX_RETRIES
                                : MAX_RETRIES - 1;
                        if (request.retryCount < maxRetries) {
                            this.logger.warn(`Request failed (${axiosError.message}), retry ${request.retryCount + 1}/${maxRetries}`);
                            this.requeueRequest(request);
                        }
                        else {
                            // Max retries exceeded
                            this.logger.error(`Request failed after ${request.retryCount} retries: ${axiosError.message}`);
                            request.reject(error);
                        }
                    }
                }
                finally {
                    // Remove request from appropriate queue
                    this.removeRequest(request);
                }
            }
        }
        finally {
            this.processingQueue = false;
            // If there are still requests in any queue, continue processing after a short delay
            if (this.hasQueuedRequests()) {
                setTimeout(() => this.processQueue(), 1000);
            }
        }
    }
    /**
   * Determine if there are any queued requests
   */
    hasQueuedRequests() {
        return this.userActionQueue.length > 0 || this.backgroundQueue.length > 0;
    }
    /**
     * Check and reset rate limit counter using discrete minute windows
     */
    checkRateLimit() {
        const now = Date.now();
        // Get current discrete minute (aligned to clock minutes)
        const currentMinute = Math.floor(now / 60000) * 60000;
        // If we've moved to a new discrete minute, reset counter
        if (currentMinute > this.minuteStartTime) {
            this.requestsThisMinute = 0;
            this.minuteStartTime = currentMinute;
            this.rateExceededLogged = false;
            this.logger.debug(`Resetting rate limit counter (new discrete minute: ${new Date(currentMinute).toISOString()})`);
        }
    }
    /**
     * Get the next request from the appropriate priority queue
     * With improved OFF command prioritization
     * @returns Next request to process or undefined if all queues empty
     */
    getNextRequest() {
        // First identify and prioritize OFF commands (they're the most important for UX)
        const findOffCommands = (queue) => {
            const pendingRequests = queue.filter(r => !r.executing);
            if (pendingRequests.length === 0)
                return undefined;
            // Look for standby commands (OFF commands)
            const offCommands = pendingRequests.filter(r => r.data &&
                typeof r.data === 'object' &&
                'thermal_control_status' in r.data &&
                r.data.thermal_control_status === 'standby');
            if (offCommands.length > 0) {
                // Sort by timestamp and return the oldest
                return offCommands.sort((a, b) => a.timestamp - b.timestamp)[0];
            }
            return undefined;
        };
        // Check for OFF commands in user action queue first
        const nextRequest = findOffCommands(this.userActionQueue);
        if (nextRequest)
            return nextRequest;
        // Then process remaining commands in simplified priority order
        if (this.userActionQueue.length > 0) {
            const pendingRequests = this.userActionQueue.filter(r => !r.executing);
            if (pendingRequests.length > 0) {
                return pendingRequests.sort((a, b) => a.timestamp - b.timestamp)[0];
            }
        }
        // Finally, try background requests
        if (this.backgroundQueue.length > 0) {
            const pendingRequests = this.backgroundQueue.filter(r => !r.executing);
            if (pendingRequests.length > 0) {
                return pendingRequests.sort((a, b) => a.timestamp - b.timestamp)[0];
            }
        }
        return undefined;
    }
    /**
     * Remove a request from its queue
     * @param request Request to remove
     */
    removeRequest(request) {
        let queue;
        // Select the appropriate queue based on priority
        switch (request.priority) {
            case RequestPriority.CRITICAL:
                queue = this.userActionQueue;
                break;
            case RequestPriority.HIGH:
                queue = this.userActionQueue;
                break;
            case RequestPriority.NORMAL:
                queue = this.backgroundQueue;
                break;
            case RequestPriority.LOW:
                queue = this.backgroundQueue;
                break;
            default:
                queue = this.backgroundQueue;
        }
        const index = queue.findIndex(r => r.id === request.id);
        if (index !== -1) {
            queue.splice(index, 1);
        }
    }
    /**
     * Requeue a request after a failure, with appropriate priority handling
     * @param request Request to requeue
     */
    requeueRequest(request) {
        // Create new request with incremented retry count
        const newRequest = {
            ...request,
            executing: false,
            retryCount: request.retryCount + 1,
            timestamp: Date.now() // Update timestamp for proper sorting
        };
        // Add to the appropriate queue based on priority
        switch (request.priority) {
            case RequestPriority.CRITICAL:
                // Critical requests go to the front of the critical queue
                this.userActionQueue.unshift(newRequest);
                break;
            case RequestPriority.HIGH:
                // High priority goes to user action queue
                this.userActionQueue.push(newRequest);
                break;
            case RequestPriority.NORMAL:
                // Normal priority goes to background queue
                this.backgroundQueue.push(newRequest);
                break;
            case RequestPriority.LOW:
                // Low priority goes to background queue
                this.backgroundQueue.push(newRequest);
                break;
            default:
                // Default to normal priority
                this.backgroundQueue.push(newRequest);
        }
    }
    /**
   * Cancel pending requests of a specific type for a device
   * Enhanced with deduplication to prevent concurrent polling conflicts
   * @param deviceId Device ID
   * @param operationType Optional type of operation to cancel (if not specified, cancels all)
   */
    cancelPendingRequests(deviceId, operationType) {
        // Function to find and cancel requests in a queue
        const processQueue = (queue) => {
            const requestsToCancel = queue.filter(r => !r.executing && r.deviceId === deviceId &&
                (!operationType || r.operationType === operationType));
            for (const request of requestsToCancel) {
                this.logger.verbose(`Canceling pending ${request.operationType} request for device ${deviceId}`);
                const index = queue.findIndex(r => r.id === request.id);
                if (index !== -1) {
                    queue.splice(index, 1);
                }
                request.resolve(null); // Resolve with null rather than rejecting
            }
        };
        // Process all priority queues
        processQueue(this.userActionQueue);
        processQueue(this.backgroundQueue);
    }
    /**
     * Check for duplicate requests and deduplicate them
     * Prevents multiple concurrent requests for the same device/operation
     * @param newRequest New request to check
     * @returns true if request should be queued, false if duplicate found
     */
    shouldQueueRequest(newRequest) {
        const allQueues = [
            this.userActionQueue,
            this.backgroundQueue
        ];
        for (const queue of allQueues) {
            const duplicate = queue.find(r => !r.executing &&
                r.deviceId === newRequest.deviceId &&
                r.operationType === newRequest.operationType &&
                r.method === newRequest.method);
            if (duplicate) {
                this.logger.debug(`Skipping duplicate ${newRequest.operationType} request for device ${newRequest.deviceId}`);
                return false;
            }
        }
        return true;
    }
    /**
     * Make a request to the SleepMe API with improved priority handling
     * @param options Request options
     * @returns Promise resolving to response data
     */
    async makeRequest(options) {
        // Set default priority
        const priority = options.priority || RequestPriority.NORMAL;
        // Skip redundant status updates only when queue is significantly backlogged
        // More reasonable threshold to prevent permanent queue blockage
        const totalQueuedRequests = this.userActionQueue.length + this.backgroundQueue.length;
        const backgroundThreshold = Math.floor(MAX_REQUESTS_PER_MINUTE * BACKGROUND_REQUEST_THRESHOLD);
        if ((totalQueuedRequests >= backgroundThreshold) &&
            options.operationType === 'getDeviceStatus' &&
            (priority === RequestPriority.NORMAL || priority === RequestPriority.LOW)) {
            this.logger.debug(`Skipping routine status update due to significant queue backlog (${totalQueuedRequests} queued, threshold: ${backgroundThreshold})`);
            return Promise.resolve(null);
        }
        // Additional check: skip LOW priority requests if we recently had rate limiting
        if (priority === RequestPriority.LOW && Date.now() < this.rateLimitBackoffUntil) {
            this.logger.debug('Skipping LOW priority request due to recent rate limiting');
            return Promise.resolve(null);
        }
        // Log request at different levels based on operation type to reduce noise
        if (options.operationType === 'getDeviceStatus') {
            this.logger.verbose(`API Request ${options.method} ${options.url} [${priority}]` +
                (options.data ? ` with payload: ${JSON.stringify(options.data)}` : ''));
        }
        else {
            this.logger.info(`API Request ${options.method} ${options.url} [${priority}]` +
                (options.data ? ` with payload: ${JSON.stringify(options.data)}` : ''));
        }
        // Check token bucket availability (this may wait for tokens to be available)
        const tokenAllowed = await this.checkTokenBucketForRequest(priority);
        if (!tokenAllowed) {
            // For NORMAL/LOW priority requests that can't get tokens, wait for availability
            if (priority === RequestPriority.NORMAL || priority === RequestPriority.LOW) {
                this.logger.debug(`[${priority} PRIORITY] Waiting for token bucket availability...`);
                await this.tokenBucket.waitForToken();
                // Try to consume again after waiting
                if (!this.tokenBucket.consume(false)) { // retry as background
                    this.logger.warn(`[${priority} PRIORITY] Still no tokens available after waiting`);
                    return Promise.resolve(null);
                }
            }
        }
        // Return a new promise
        return new Promise((resolve, reject) => {
            // Generate a unique ID for this request
            const requestId = `req_${++this.requestIdCounter}`;
            // Create request config
            const config = {
                method: options.method,
                url: API_BASE_URL + options.url,
                timeout: priority === RequestPriority.CRITICAL ? 20000 : 15000,
                validateStatus: (status) => {
                    // Consider 2xx status codes as successful
                    return status >= 200 && status < 300;
                }
            };
            // Add data if provided
            if (options.data) {
                config.data = options.data;
            }
            // Create new request
            const request = {
                id: requestId,
                config,
                priority,
                resolve: resolve,
                reject,
                retryCount: 0,
                timestamp: Date.now(),
                method: options.method,
                url: options.url,
                deviceId: options.deviceId,
                operationType: options.operationType,
                data: options.data // Store data for filtering in getNextRequest
            };
            // Check for duplicates before queueing
            if (!this.shouldQueueRequest(request)) {
                // Duplicate found, resolve with null to avoid hanging promises
                resolve(null);
                return;
            }
            // Add to the appropriate queue based on priority
            switch (priority) {
                case RequestPriority.CRITICAL:
                    this.userActionQueue.push(request);
                    break;
                case RequestPriority.HIGH:
                    this.userActionQueue.push(request);
                    break;
                case RequestPriority.NORMAL:
                    this.backgroundQueue.push(request);
                    break;
                case RequestPriority.LOW:
                    this.backgroundQueue.push(request);
                    break;
                default:
                    this.backgroundQueue.push(request);
            }
            // Start processing the queue if not already running
            if (!this.processingQueue) {
                this.processQueue();
            }
        });
    }
    /**
   * Handle API errors with better logging
   * @param context Context where the error occurred
   * @param error The error that occurred
   */
    handleApiError(context, error) {
        // Cast to Axios error if possible
        const axiosError = error;
        // Details for the log
        let errorMessage = '';
        let responseStatus = 0;
        let responseData = null;
        // Get error details
        if (axios.isAxiosError(axiosError)) {
            responseStatus = axiosError.response?.status || 0;
            responseData = axiosError.response?.data;
            errorMessage = axiosError.message;
            this.logger.error(`API error in ${context}: ${errorMessage} (Status: ${responseStatus})`);
            if (responseData && this.logger.isVerbose()) {
                this.logger.verbose(`Response error data: ${JSON.stringify(responseData)}`);
            }
        }
        else {
            // Not an Axios error
            errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error in ${context}: ${errorMessage}`);
        }
    }
    /**
     * Update the average response time
     * @param newResponseTime New response time in milliseconds
     */
    updateAverageResponseTime(newResponseTime) {
        if (this.stats.averageResponseTime === 0) {
            this.stats.averageResponseTime = newResponseTime;
        }
        else {
            // Simple moving average calculation
            this.stats.averageResponseTime =
                (this.stats.averageResponseTime * 0.9) + (newResponseTime * 0.1);
        }
    }
    /**
     * Extract a nested property value from an object
     * @param obj Object to extract from
     * @param path Dot-notation path to property
     * @returns Extracted value or undefined if not found
     */
    extractNestedValue(obj, path) {
        const parts = path.split('.');
        let value = obj;
        for (const part of parts) {
            if (value === null || value === undefined || typeof value !== 'object') {
                return undefined;
            }
            value = value[part];
        }
        return value;
    }
    /**
     * Extract a temperature value from nested properties
     * @param data Object to extract from
     * @param paths Array of possible property paths
     * @param defaultValue Default value if not found
     * @returns Extracted temperature or default value
     */
    extractTemperature(data, paths, defaultValue = 21) {
        for (const path of paths) {
            const value = this.extractNestedValue(data, path);
            if (typeof value === 'number' && !isNaN(value)) {
                return value;
            }
        }
        return defaultValue;
    }
    /**
     * Extract thermal status from API response
     * @param data API response data
     * @returns Thermal status
     */
    extractThermalStatus(data) {
        // Try to get thermal status from control object
        const rawStatus = this.extractNestedValue(data, 'control.thermal_control_status') ||
            this.extractNestedValue(data, 'thermal_control_status');
        if (rawStatus) {
            switch (String(rawStatus).toLowerCase()) {
                case 'active':
                    return ThermalStatus.ACTIVE;
                case 'heating':
                    return ThermalStatus.HEATING;
                case 'cooling':
                    return ThermalStatus.COOLING;
                case 'standby':
                    return ThermalStatus.STANDBY;
                case 'off':
                    return ThermalStatus.OFF;
                default:
                    this.logger.warn(`Unknown thermal status: ${rawStatus}`);
                    return ThermalStatus.UNKNOWN;
            }
        }
        return ThermalStatus.UNKNOWN;
    }
    /**
     * Extract power state from API response
     * @param data API response data
     * @returns Power state
     */
    extractPowerState(data) {
        // Try different paths for power state
        const thermalStatus = this.extractThermalStatus(data);
        // If we have a thermal status, infer power state
        if (thermalStatus !== ThermalStatus.UNKNOWN) {
            if (thermalStatus === ThermalStatus.OFF || thermalStatus === ThermalStatus.STANDBY) {
                return PowerState.OFF;
            }
            else {
                return PowerState.ON;
            }
        }
        // Try to get from is_connected or other fields
        const isConnected = this.extractNestedValue(data, 'status.is_connected') ||
            this.extractNestedValue(data, 'is_connected');
        if (typeof isConnected === 'boolean') {
            return isConnected ? PowerState.ON : PowerState.OFF;
        }
        return PowerState.UNKNOWN;
    }
    /**
     * Convert Celsius to Fahrenheit
     * @param celsius Temperature in Celsius
     * @returns Temperature in Fahrenheit
     */
    convertCtoF(celsius) {
        return (celsius * 9 / 5) + 32;
    }
    /**
     * Convert Fahrenheit to Celsius
     * @param fahrenheit Temperature in Fahrenheit
     * @returns Temperature in Celsius
     */
    convertFtoC(fahrenheit) {
        return (fahrenheit - 32) * 5 / 9;
    }
}
//# sourceMappingURL=sleepme-api.js.map