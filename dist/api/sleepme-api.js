/**
 * SleepMe API client implementation with robust error handling and rate limiting
 */
import axios from 'axios';
import { API_BASE_URL, MAX_REQUESTS_PER_MINUTE, DEFAULT_CACHE_VALIDITY_MS, MAX_RETRIES, RequestPriority } from '../settings.js';
import { ThermalStatus, PowerState } from './types.js';
import { EmpiricalRateLimiter } from './empirical-rate-limiter.js';
/**
 * SleepMe API Client
 * Handles API communication with rate limiting and robust error handling
 */
export class SleepMeApi {
    apiToken;
    logger;
    // Request queue - separate queues by priority for better management
    criticalQueue = [];
    highPriorityQueue = [];
    normalPriorityQueue = [];
    lowPriorityQueue = [];
    // Rate limiting state
    requestsThisMinute = 0;
    minuteStartTime = Date.now();
    lastRequestTime = 0;
    processingQueue = false;
    rateLimitBackoffUntil = 0;
    consecutiveErrors = 0;
    rateExceededLogged = false; // Flag to prevent redundant log messages
    // Empirical rate limiter
    empiricalRateLimiter;
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
    // Initial startup delay 
    startupComplete;
    startupFinished = false;
    initialDiscoveryComplete = false;
    startupTime = Date.now();
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
        // Startup will be marked complete by the platform after initial discovery
        this.startupComplete = new Promise(resolve => {
            // The platform will call markStartupComplete() when ready
            const checkStartup = () => {
                if (this.startupFinished) {
                    resolve();
                }
                else {
                    setTimeout(checkStartup, 100);
                }
            };
            checkStartup();
        });
        // Start the queue processor
        this.processQueue();
        // Set up cache cleanup interval
        setInterval(() => this.cleanupCache(), 300000); // Clean up cache every 5 minutes
        // Initialize empirical rate limiter
        this.empiricalRateLimiter = new EmpiricalRateLimiter({
            maxRequestsPerMinute: MAX_REQUESTS_PER_MINUTE,
            allowCriticalBypass: true,
            safetyMargin: 0.25 // 25% safety margin
        });
        this.logger.info('SleepMe API client initialized with empirical rate limiting');
    }
    /**
     * Get API statistics
     * @returns Current API statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Get empirical rate limiter statistics
     * @returns Current rate limiter statistics and recommendations
     */
    getRateLimiterStats() {
        return {
            stats: this.empiricalRateLimiter.getStats(),
            recommendations: this.empiricalRateLimiter.getRecommendations()
        };
    }
    /**
     * Mark startup as complete (called by platform when initial discovery is done)
     * This allows the platform to control when startup is considered finished
     */
    markStartupComplete() {
        this.startupFinished = true;
        this.logger.debug('Startup marked as complete by platform');
    }
    /**
     * Mark initial discovery as complete (called by platform after first device discovery)
     * This ensures device discovery uses NORMAL priority during initial startup
     */
    markInitialDiscoveryComplete() {
        this.initialDiscoveryComplete = true;
        this.logger.debug('Initial discovery marked as complete');
    }
    /**
     * Create a simple hash of device ID for consistent jitter
     * @param deviceId Device identifier
     * @returns Hash value for jitter calculation
     */
    hashDeviceId(deviceId) {
        let hash = 0;
        for (let i = 0; i < deviceId.length; i++) {
            const char = deviceId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
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
     * Get devices from the SleepMe API
     * @returns Array of devices or empty array if error
     */
    async getDevices() {
        try {
            this.logger.debug('Fetching devices...');
            // Use NORMAL priority during initial startup to avoid rate limits, HIGH for subsequent discovery
            const priority = this.initialDiscoveryComplete ? RequestPriority.HIGH : RequestPriority.NORMAL;
            this.logger.verbose(`Using ${priority} priority for device discovery (initialDiscovery: ${this.initialDiscoveryComplete})`);
            const response = await this.makeRequest({
                method: 'GET',
                url: '/devices',
                priority: priority,
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
                    // Adjust validity period based on confidence and source
                    if (cachedStatus.confidence === 'high' && !cachedStatus.isOptimistic) {
                        // Extend validity for high confidence updates, especially if they came from a PATCH
                        validityPeriod = cachedStatus.source === 'patch' ?
                            DEFAULT_CACHE_VALIDITY_MS * 3 : // Much longer validity for PATCH responses
                            DEFAULT_CACHE_VALIDITY_MS * 2; // Standard extension for high confidence
                    }
                    else if (cachedStatus.isOptimistic) {
                        validityPeriod = DEFAULT_CACHE_VALIDITY_MS / 2; // Shorter validity for optimistic updates
                    }
                    // Add jitter to prevent thundering herd when multiple devices have synchronized cache expiration
                    // Use device ID as seed for consistent but distributed jitter per device
                    const deviceHash = this.hashDeviceId(deviceId);
                    const jitterPercent = (deviceHash % 21) - 10; // ±10% jitter (-10% to +10%)
                    const jitteredValidityPeriod = validityPeriod + (validityPeriod * jitterPercent / 100);
                    if (now - cachedStatus.timestamp < jitteredValidityPeriod) {
                        const ageSeconds = Math.round((now - cachedStatus.timestamp) / 1000);
                        const confidenceInfo = cachedStatus.confidence
                            ? ` (${cachedStatus.confidence} confidence)`
                            : '';
                        const optimisticFlag = cachedStatus.isOptimistic ? ' (optimistic)' : '';
                        const verifiedFlag = cachedStatus.verified ? ' (verified)' : '';
                        this.logger.verbose(`Using cached status for device ${deviceId} (${ageSeconds}s old${optimisticFlag}${confidenceInfo}${verifiedFlag}) ` +
                            `[jitter: ${jitterPercent}%]`);
                        return cachedStatus.status;
                    }
                }
            }
            // At this point, we need fresh data
            this.logger.debug(`Fetching status for device ${deviceId}...`);
            // MORE CONSERVATIVE APPROACH:
            // Only use HIGH priority when explicitly requested by user actions
            // For system-initiated refreshes (including initial polls), use NORMAL or LOW
            const isSystemInitiated = !forceFresh || (this.startupFinished === false);
            const priority = isSystemInitiated ?
                RequestPriority.NORMAL :
                RequestPriority.HIGH;
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
   * Turn device on and set temperature in a single operation
   * With trust-based approach (no verification GET)
   * @param deviceId Device identifier
   * @param temperature Target temperature in Celsius
   * @returns Whether operation was successful
   */
    async turnDeviceOn(deviceId, temperature) {
        try {
            // Default temperature if none provided
            const targetTemp = temperature !== undefined ? temperature : 21;
            this.logger.info(`Turning device ${deviceId} ON with temperature ${targetTemp}°C`);
            // Cancel any pending requests for this device to prevent race conditions
            this.cancelAllDeviceRequests(deviceId);
            // Create payload for API - using integers for temperature values
            const payload = {
                // Set Fahrenheit as primary temp (matching API expectation)
                set_temperature_f: Math.round(this.convertCtoF(targetTemp)),
                thermal_control_status: 'active'
            };
            this.logger.verbose(`Turn ON payload: ${JSON.stringify(payload)}`);
            const success = await this.updateDeviceSettings(deviceId, payload);
            if (success) {
                // Update cache with complete device state based on our command
                // This is critical for the trust-based approach
                this.updateCacheWithTrustedState(deviceId, {
                    powerState: PowerState.ON,
                    targetTemperature: targetTemp,
                    thermalStatus: ThermalStatus.ACTIVE,
                    // We don't know current temperature yet, but we'll assume it's moving toward target
                    // This gives better UX without requiring a GET
                    currentTemperature: this.getLastKnownTemperature(deviceId, targetTemp)
                });
                this.logger.verbose(`Device ${deviceId} turned ON successfully`);
                return true;
            }
            else {
                this.logger.error(`Failed to turn device ${deviceId} ON`);
                return false;
            }
        }
        catch (error) {
            this.handleApiError(`turnDeviceOn(${deviceId})`, error);
            return false;
        }
    }
    /**
   * Turn device off
   * @param deviceId Device identifier
   * @returns Whether operation was successful
   */
    async turnDeviceOff(deviceId) {
        try {
            this.logger.info(`Turning device ${deviceId} OFF`);
            // Cancel any pending requests for this device
            this.cancelAllDeviceRequests(deviceId);
            // Create payload with standby status
            const payload = {
                thermal_control_status: 'standby'
            };
            this.logger.verbose(`Turn OFF payload: ${JSON.stringify(payload)}`);
            const success = await this.updateDeviceSettings(deviceId, payload);
            if (success) {
                // Update cache with correct power state
                // This MUST set both thermalStatus AND powerState
                this.updateCacheWithTrustedState(deviceId, {
                    powerState: PowerState.OFF,
                    thermalStatus: ThermalStatus.STANDBY
                });
                this.logger.verbose(`Device ${deviceId} turned OFF successfully`);
                return true;
            }
            else {
                this.logger.error(`Failed to turn device ${deviceId} OFF`);
                return false;
            }
        }
        catch (error) {
            this.handleApiError(`turnDeviceOff(${deviceId})`, error);
            return false;
        }
    }
    /**
   * Set device temperature
   * With trust-based approach (no verification GET)
   * @param deviceId Device identifier
   * @param temperature Target temperature in Celsius
   * @returns Whether operation was successful
   */
    async setTemperature(deviceId, temperature) {
        try {
            this.logger.info(`Setting device ${deviceId} temperature to ${temperature}°C`);
            // Convert to Fahrenheit and round to integer (matching API expectation)
            const tempF = Math.round(this.convertCtoF(temperature));
            // Create payload following API format
            const payload = {
                set_temperature_f: tempF
            };
            this.logger.verbose(`Set temperature payload: ${JSON.stringify(payload)}`);
            const success = await this.updateDeviceSettings(deviceId, payload);
            if (success) {
                // Update cache with trusted state - key to trust-based approach
                this.updateCacheWithTrustedState(deviceId, {
                    targetTemperature: temperature,
                    // Setting temperature implies the device is ON
                    powerState: PowerState.ON,
                    thermalStatus: ThermalStatus.ACTIVE
                });
                this.logger.verbose(`Device ${deviceId} temperature set successfully to ${temperature}°C`);
                return true;
            }
            else {
                this.logger.error(`Failed to set device ${deviceId} temperature to ${temperature}°C`);
                return false;
            }
        }
        catch (error) {
            this.handleApiError(`setTemperature(${deviceId})`, error);
            return false;
        }
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
     * @returns Whether operation was successful
     */
    async updateDeviceSettings(deviceId, settings) {
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
            // Make the request with CRITICAL priority for user-initiated actions
            await this.makeRequest({
                method: 'PATCH',
                url: `/devices/${deviceId}`,
                data: settings,
                priority: RequestPriority.CRITICAL,
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
                `Update requested=${updates.powerState || 'none'}`);
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
                // Get the next request from prioritized queues first
                const request = this.getNextRequest();
                if (!request) {
                    break; // No requests to process
                }
                // Use empirical rate limiter to check if request should be allowed
                const rateLimitCheck = this.empiricalRateLimiter.shouldAllowRequest(request.priority);
                if (!rateLimitCheck.allowed) {
                    // Only log this once, not repeatedly
                    if (!this.rateExceededLogged) {
                        const waitTimeSeconds = Math.ceil(rateLimitCheck.waitTime / 1000);
                        this.logger.info(`Empirical rate limiter: ${rateLimitCheck.reason}, waiting ${waitTimeSeconds}s`);
                        this.rateExceededLogged = true;
                    }
                    // Wait for the recommended time
                    await new Promise(resolve => setTimeout(resolve, rateLimitCheck.waitTime));
                    continue;
                }
                // Reset rate exceeded logging on successful check
                this.rateExceededLogged = false;
                // Mark the request as executing
                request.executing = true;
                request.lastAttempt = Date.now();
                const now = Date.now();
                const startTime = now;
                try {
                    // Update rate limiting counters (but don't count CRITICAL requests against our limit)
                    if (request.priority !== RequestPriority.CRITICAL) {
                        this.requestsThisMinute++;
                    }
                    this.lastRequestTime = now;
                    // Add auth token to request
                    request.config.headers = {
                        ...(request.config.headers || {}),
                        Authorization: `Bearer ${this.apiToken}`
                    };
                    this.logger.verbose(`Executing request ${request.id}: ${request.method} ${request.url} [${request.priority}]`);
                    // Execute the request
                    this.stats.totalRequests++;
                    const response = await axios(request.config);
                    this.stats.successfulRequests++;
                    this.stats.lastRequest = new Date();
                    // Track response time
                    const responseTime = Date.now() - startTime;
                    this.updateAverageResponseTime(responseTime);
                    // Record successful request in empirical rate limiter
                    this.empiricalRateLimiter.recordRequest(request.priority, true, responseTime, false);
                    // Resolve the promise with the data
                    request.resolve(response.data);
                    this.logger.verbose(`Request ${request.id} completed in ${responseTime}ms`);
                    // Reset consecutive errors on success
                    this.consecutiveErrors = 0;
                }
                catch (error) {
                    const axiosError = error;
                    this.stats.failedRequests++;
                    this.stats.lastError = axiosError;
                    // Handle rate limiting (HTTP 429)
                    if (axiosError.response?.status === 429) {
                        const responseTime = Date.now() - startTime;
                        // Record rate limit in empirical rate limiter
                        this.empiricalRateLimiter.recordRequest(request.priority, false, responseTime, true);
                        this.logger.warn(`Rate limit exceeded (429) for ${request.priority} request. Empirical rate limiter will handle backoff.`);
                        // Reset our internal counter to prevent double-counting
                        this.requestsThisMinute = 0;
                        // Requeue the request
                        this.requeueRequest(request);
                        // Don't remove the request from queue - it was requeued
                        continue;
                    }
                    else {
                        // For other errors, check retry logic by priority
                        this.consecutiveErrors++;
                        const responseTime = Date.now() - startTime;
                        // Record failed request in empirical rate limiter
                        this.empiricalRateLimiter.recordRequest(request.priority, false, responseTime, false);
                        // Critical and high priority get more retries
                        const maxRetries = request.priority === RequestPriority.CRITICAL
                            ? MAX_RETRIES + 2
                            : request.priority === RequestPriority.HIGH
                                ? MAX_RETRIES
                                : MAX_RETRIES - 1;
                        if (request.retryCount < maxRetries) {
                            this.logger.warn(`Request failed (${axiosError.message}), retry ${request.retryCount + 1}/${maxRetries}`);
                            this.requeueRequest(request);
                            // Don't remove the request from queue - it was requeued
                            continue;
                        }
                        else {
                            // Max retries exceeded
                            this.logger.error(`Request failed after ${request.retryCount} retries: ${axiosError.message}`);
                            request.reject(error);
                        }
                    }
                }
                finally {
                    // Remove request from appropriate queue only if not requeued
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
        return this.criticalQueue.length > 0 ||
            this.highPriorityQueue.length > 0 ||
            this.normalPriorityQueue.length > 0 ||
            this.lowPriorityQueue.length > 0;
    }
    /**
     * Check and reset rate limit counter using discrete minute windows
     * Enhanced to handle API timing mismatches
     */
    checkRateLimit() {
        const now = Date.now();
        // Get current discrete minute (aligned to clock minutes)
        const currentMinute = Math.floor(now / 60000) * 60000;
        // If we've moved to a new discrete minute, reset counter
        if (currentMinute > this.minuteStartTime) {
            // Only reset if we're not in a backoff period
            // This prevents resetting the counter when the API is still enforcing rate limits
            if (this.rateLimitBackoffUntil <= now) {
                this.requestsThisMinute = 0;
                this.minuteStartTime = currentMinute;
                this.rateExceededLogged = false;
                this.logger.debug(`Resetting rate limit counter (new discrete minute: ${new Date(currentMinute).toISOString()})`);
            }
            else {
                // We're in a new minute but still in backoff - log this condition
                const backoffRemaining = Math.ceil((this.rateLimitBackoffUntil - now) / 1000);
                this.logger.debug(`New discrete minute but still in backoff for ${backoffRemaining}s (API timing mismatch)`);
            }
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
        // Check each queue for OFF commands first
        let nextRequest = findOffCommands(this.criticalQueue);
        if (nextRequest)
            return nextRequest;
        nextRequest = findOffCommands(this.highPriorityQueue);
        if (nextRequest)
            return nextRequest;
        // Then process remaining commands in priority order
        if (this.criticalQueue.length > 0) {
            const pendingRequests = this.criticalQueue.filter(r => !r.executing);
            if (pendingRequests.length > 0) {
                return pendingRequests.sort((a, b) => a.timestamp - b.timestamp)[0];
            }
        }
        // Then, try high priority requests
        if (this.highPriorityQueue.length > 0) {
            const pendingRequests = this.highPriorityQueue.filter(r => !r.executing);
            if (pendingRequests.length > 0) {
                return pendingRequests.sort((a, b) => a.timestamp - b.timestamp)[0];
            }
        }
        // Next, try normal priority requests
        if (this.normalPriorityQueue.length > 0) {
            const pendingRequests = this.normalPriorityQueue.filter(r => !r.executing);
            if (pendingRequests.length > 0) {
                return pendingRequests.sort((a, b) => a.timestamp - b.timestamp)[0];
            }
        }
        // Finally, try low priority requests
        if (this.lowPriorityQueue.length > 0) {
            const pendingRequests = this.lowPriorityQueue.filter(r => !r.executing);
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
                queue = this.criticalQueue;
                break;
            case RequestPriority.HIGH:
                queue = this.highPriorityQueue;
                break;
            case RequestPriority.NORMAL:
                queue = this.normalPriorityQueue;
                break;
            case RequestPriority.LOW:
                queue = this.lowPriorityQueue;
                break;
            default:
                queue = this.normalPriorityQueue;
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
                this.criticalQueue.unshift(newRequest);
                break;
            case RequestPriority.HIGH:
                // High priority goes to the high priority queue
                this.highPriorityQueue.push(newRequest);
                break;
            case RequestPriority.NORMAL:
                // Normal priority goes to normal queue
                this.normalPriorityQueue.push(newRequest);
                break;
            case RequestPriority.LOW:
                // Low priority goes to low priority queue
                this.lowPriorityQueue.push(newRequest);
                break;
            default:
                // Default to normal priority
                this.normalPriorityQueue.push(newRequest);
        }
    }
    /**
   * Cancel pending requests of a specific type for a device
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
        processQueue(this.criticalQueue);
        processQueue(this.highPriorityQueue);
        processQueue(this.normalPriorityQueue);
        processQueue(this.lowPriorityQueue);
    }
    /**
     * Make a request to the SleepMe API with improved priority handling
     * @param options Request options
     * @returns Promise resolving to response data
     */
    async makeRequest(options) {
        // Set default priority
        const priority = options.priority || RequestPriority.NORMAL;
        // Skip redundant status updates if queue is getting large
        if (this.criticalQueue.length + this.highPriorityQueue.length > 3 &&
            options.operationType === 'getDeviceStatus' &&
            priority !== RequestPriority.CRITICAL &&
            priority !== RequestPriority.HIGH) {
            this.logger.debug(`Skipping non-critical status update due to queue backlog`);
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
        // Wait for startup delay to complete for non-critical requests
        if (priority !== RequestPriority.CRITICAL && !this.startupFinished) {
            await this.startupComplete;
        }
        // Return a new promise
        return new Promise((resolve, reject) => {
            // Generate a unique ID for this request
            const requestId = `req_${++this.requestIdCounter}`;
            // Create request config
            const config = {
                method: options.method,
                url: API_BASE_URL + options.url,
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
            // Add to the appropriate queue based on priority
            switch (priority) {
                case RequestPriority.CRITICAL:
                    this.criticalQueue.push(request);
                    break;
                case RequestPriority.HIGH:
                    this.highPriorityQueue.push(request);
                    break;
                case RequestPriority.NORMAL:
                    this.normalPriorityQueue.push(request);
                    break;
                case RequestPriority.LOW:
                    this.lowPriorityQueue.push(request);
                    break;
                default:
                    this.normalPriorityQueue.push(request);
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