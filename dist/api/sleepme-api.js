/**
 * SleepMe API client implementation with robust error handling and rate limiting
 */
import axios from 'axios';
import { API_BASE_URL, MAX_REQUESTS_PER_MINUTE, MIN_REQUEST_INTERVAL, DEFAULT_CACHE_VALIDITY_MS } from '../settings.js';
import { ThermalStatus, PowerState } from './types.js';
/**
 * Priority levels for API requests
 * Used to determine order of execution when requests are queued
 */
var RequestPriority;
(function (RequestPriority) {
    RequestPriority["HIGH"] = "high";
    RequestPriority["NORMAL"] = "normal";
    RequestPriority["LOW"] = "low"; // Background or non-essential operations
})(RequestPriority || (RequestPriority = {}));
/**
 * SleepMe API Client
 * Handles API communication with rate limiting and robust error handling
 */
export class SleepMeApi {
    /**
     * Create a new SleepMe API client
     * @param apiToken API authentication token
     * @param logger Logging utility
     */
    constructor(apiToken, logger) {
        this.apiToken = apiToken;
        this.logger = logger;
        // Request queue
        this.requestQueue = [];
        // Rate limiting state
        this.requestsThisMinute = 0;
        this.minuteStartTime = Date.now();
        this.lastRequestTime = 0;
        this.processingQueue = false;
        this.rateLimitBackoffUntil = 0;
        this.consecutiveErrors = 0;
        // Request ID counter
        this.requestIdCounter = 0;
        // Device status cache
        this.deviceStatusCache = new Map();
        // API statistics for monitoring
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            lastRequest: null,
            lastError: null,
            averageResponseTime: 0
        };
        this.startupFinished = false;
        // Validate API token
        if (!apiToken || apiToken.trim() === '') {
            this.logger.error('Invalid API token provided');
            throw new Error('Invalid API token provided');
        }
        // Create a startup delay to prevent immediate requests
        this.startupComplete = new Promise(resolve => {
            setTimeout(() => {
                this.logger.debug('Initial startup delay complete');
                this.startupFinished = true;
                resolve();
            }, 5000); // 5 second startup delay
        });
        // Start the queue processor
        this.processQueue();
        // Set up cache cleanup interval
        setInterval(() => this.cleanupCache(), 300000); // Clean up cache every 5 minutes
        this.logger.info('SleepMe API client initialized');
    }
    /**
     * Get API statistics
     * @returns Current API statistics
     */
    getStats() {
        return { ...this.stats };
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
     * Get status for a specific device with intelligent caching
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
                // Use cache if valid - even if optimistic but for a shorter time
                if (cachedStatus &&
                    (now - cachedStatus.timestamp < (cachedStatus.isOptimistic ?
                        DEFAULT_CACHE_VALIDITY_MS / 2 : DEFAULT_CACHE_VALIDITY_MS))) {
                    const ageSeconds = Math.round((now - cachedStatus.timestamp) / 1000);
                    const optimisticFlag = cachedStatus.isOptimistic ? ' (optimistic)' : '';
                    this.logger.verbose(`Using cached status for device ${deviceId} (${ageSeconds}s old${optimisticFlag})`);
                    return cachedStatus.status;
                }
            }
            this.logger.debug(`Fetching status for device ${deviceId}...`);
            const response = await this.makeRequest({
                method: 'GET',
                url: `/devices/${deviceId}`,
                priority: forceFresh ? RequestPriority.HIGH : RequestPriority.NORMAL,
                deviceId,
                operationType: 'getDeviceStatus'
            });
            if (!response) {
                this.logger.error(`Empty response for device ${deviceId}`);
                return null;
            }
            // Parse the device status from the response
            const status = {
                // Extract current temperature (various possible locations in API)
                currentTemperature: this.extractTemperature(response, [
                    'status.water_temperature_c',
                    'water_temperature_c',
                    'control.current_temperature_c',
                    'current_temperature_c'
                ], 21),
                // Extract target temperature
                targetTemperature: this.extractTemperature(response, [
                    'control.set_temperature_c',
                    'set_temperature_c'
                ], 21),
                // Extract thermal status
                thermalStatus: this.extractThermalStatus(response),
                // Extract power state
                powerState: this.extractPowerState(response),
                // Include raw response for debugging
                rawResponse: response
            };
            // Extract firmware version
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
            // Update cache with fresh data
            this.deviceStatusCache.set(deviceId, {
                status,
                timestamp: Date.now(),
                isOptimistic: false
            });
            return status;
        }
        catch (error) {
            this.handleApiError(`getDeviceStatus(${deviceId})`, error);
            return null;
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
     * Turn device on
     * @param deviceId Device identifier
     * @param temperature Optional target temperature in Celsius
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
                // Update cache optimistically
                this.updateCacheOptimistically(deviceId, {
                    powerState: PowerState.ON,
                    targetTemperature: targetTemp,
                    thermalStatus: ThermalStatus.ACTIVE
                });
                this.logger.verbose(`Device ${deviceId} turned ON successfully`);
            }
            else {
                this.logger.error(`Failed to turn device ${deviceId} ON`);
                return false;
            }
            // Verify the state change
            const newStatus = await this.getDeviceStatus(deviceId, true);
            if (newStatus &&
                (newStatus.thermalStatus === ThermalStatus.ACTIVE ||
                    newStatus.powerState === PowerState.ON)) {
                return true;
            }
            return success;
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
            // Cancel any pending requests for this device to prevent race conditions
            this.cancelAllDeviceRequests(deviceId);
            // Create payload with standby status
            const payload = {
                thermal_control_status: 'standby'
            };
            this.logger.verbose(`Turn OFF payload: ${JSON.stringify(payload)}`);
            const success = await this.updateDeviceSettings(deviceId, payload);
            if (success) {
                // Update cache optimistically
                this.updateCacheOptimistically(deviceId, {
                    powerState: PowerState.OFF,
                    thermalStatus: ThermalStatus.STANDBY
                });
                this.logger.verbose(`Device ${deviceId} turned OFF successfully`);
            }
            else {
                this.logger.error(`Failed to turn device ${deviceId} OFF`);
                return false;
            }
            // Verify the state change
            const newStatus = await this.getDeviceStatus(deviceId, true);
            if (newStatus &&
                (newStatus.thermalStatus === ThermalStatus.STANDBY ||
                    newStatus.powerState === PowerState.OFF)) {
                return true;
            }
            return success;
        }
        catch (error) {
            this.handleApiError(`turnDeviceOff(${deviceId})`, error);
            return false;
        }
    }
    /**
     * Set device temperature
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
                // Update cache optimistically
                this.updateCacheOptimistically(deviceId, {
                    targetTemperature: temperature
                });
                this.logger.verbose(`Device ${deviceId} temperature set successfully to ${temperature}°C`);
            }
            else {
                this.logger.error(`Failed to set device ${deviceId} temperature to ${temperature}°C`);
            }
            return success;
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
            const response = await this.makeRequest({
                method: 'PATCH',
                url: `/devices/${deviceId}`,
                data: settings,
                priority: RequestPriority.HIGH,
                deviceId,
                operationType: 'updateDeviceSettings'
            });
            // If successful response
            if (response) {
                this.logger.info(`Successfully updated device ${deviceId} settings`);
                // Log full response in verbose mode
                if (this.logger.isVerbose()) {
                    this.logger.verbose(`Update response: ${JSON.stringify(response)}`);
                }
                // Reset consecutive errors on success
                this.consecutiveErrors = 0;
                return true;
            }
            return false;
        }
        catch (error) {
            this.handleApiError(`updateDeviceSettings(${deviceId})`, error);
            return false;
        }
    }
    /**
     * Update the device status cache optimistically based on settings changes
     * @param deviceId Device identifier
     * @param updates Status updates to apply
     */
    updateCacheOptimistically(deviceId, updates) {
        // Get current cached status
        const cachedEntry = this.deviceStatusCache.get(deviceId);
        if (cachedEntry) {
            // Merge updates with current status
            const updatedStatus = {
                ...cachedEntry.status,
                ...updates
            };
            // Store updated status as optimistic
            this.deviceStatusCache.set(deviceId, {
                status: updatedStatus,
                timestamp: Date.now(),
                isOptimistic: true
            });
            this.logger.verbose(`Optimistically updated cache for device ${deviceId}: ` +
                `Power=${updatedStatus.powerState}, ` +
                `Target=${updatedStatus.targetTemperature}°C, ` +
                `Status=${updatedStatus.thermalStatus}`);
        }
    }
    /**
     * Process the request queue
     * This is the core method for rate-limiting and prioritizing requests
     */
    async processQueue() {
        var _a;
        // If already processing, exit
        if (this.processingQueue) {
            return;
        }
        this.processingQueue = true;
        try {
            while (this.requestQueue.length > 0) {
                // Check if we need to reset rate limit counter
                this.checkRateLimit();
                // Check if we're in backoff mode
                if (this.rateLimitBackoffUntil > Date.now()) {
                    const backoffTimeRemaining = Math.ceil((this.rateLimitBackoffUntil - Date.now()) / 1000);
                    this.logger.info(`In rate limit backoff mode for ${backoffTimeRemaining}s`);
                    break;
                }
                // Check if we've hit the rate limit
                if (this.requestsThisMinute >= MAX_REQUESTS_PER_MINUTE) {
                    const resetTime = this.minuteStartTime + 60000;
                    const waitTime = resetTime - Date.now();
                    this.logger.info(`Rate limit approached (${this.requestsThisMinute}/${MAX_REQUESTS_PER_MINUTE} requests), ` +
                        `waiting ${Math.ceil(waitTime / 1000)}s before continuing`);
                    // Wait for rate limit reset
                    setTimeout(() => this.processQueue(), waitTime + 1000);
                    return;
                }
                // Check if we need to wait between requests
                const timeSinceLastRequest = Date.now() - this.lastRequestTime;
                if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
                    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
                    // Only log this at verbose level to reduce noise
                    if (this.logger.isVerbose()) {
                        this.logger.verbose(`Waiting ${waitTime}ms between requests to prevent rate limiting`);
                    }
                    // Wait for minimum interval
                    setTimeout(() => this.processQueue(), waitTime);
                    return;
                }
                // Get the next request with priority
                const request = this.getNextRequest();
                if (!request) {
                    break;
                }
                // Mark the request as executing
                request.executing = true;
                try {
                    // Update rate limiting counters
                    this.requestsThisMinute++;
                    this.lastRequestTime = Date.now();
                    // Add auth token to request
                    request.config.headers = {
                        ...(request.config.headers || {}),
                        Authorization: `Bearer ${this.apiToken}`
                    };
                    this.logger.verbose(`Executing request ${request.id}: ${request.method} ${request.url}`);
                    const startTime = Date.now();
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
                    // Reset consecutive errors on success
                    this.consecutiveErrors = 0;
                }
                catch (error) {
                    const axiosError = error;
                    this.stats.failedRequests++;
                    this.stats.lastError = axiosError;
                    // Handle rate limiting (HTTP 429)
                    if (((_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.status) === 429) {
                        // Implement backoff
                        this.consecutiveErrors++;
                        const backoffTime = Math.min(30000, 1000 * Math.pow(2, this.consecutiveErrors));
                        this.rateLimitBackoffUntil = Date.now() + backoffTime;
                        this.logger.warn(`Rate limit exceeded (429). Backing off for ${backoffTime / 1000}s`);
                        // Requeue the request
                        this.requestQueue.unshift({
                            ...request,
                            executing: false,
                            retryCount: request.retryCount + 1
                        });
                    }
                    else {
                        // For other errors, just reject
                        this.consecutiveErrors++;
                        request.reject(error);
                    }
                }
                finally {
                    // Remove request from queue
                    this.removeRequest(request.id);
                }
            }
        }
        finally {
            this.processingQueue = false;
            // If there are still requests in the queue, continue processing
            if (this.requestQueue.length > 0) {
                // Small delay to prevent CPU spinning
                setTimeout(() => this.processQueue(), 100);
            }
        }
    }
    /**
     * Check and reset rate limit counter if needed
     */
    checkRateLimit() {
        const now = Date.now();
        // Reset rate limit counter if a minute has passed
        if (now - this.minuteStartTime >= 60000) {
            this.requestsThisMinute = 0;
            this.minuteStartTime = now;
            // If we've passed the backoff period, clear the rate limit flag
            if (now > this.rateLimitBackoffUntil) {
                this.rateLimitBackoffUntil = 0;
            }
            this.logger.debug('Resetting rate limit counter (1 minute has passed)');
        }
    }
    /**
     * Get the next request from the queue, prioritizing by type and timestamp
     * @returns Next request to process or undefined if queue is empty
     */
    getNextRequest() {
        // Skip requests that are already being executed
        const pendingRequests = this.requestQueue.filter(r => !r.executing);
        if (pendingRequests.length === 0) {
            return undefined;
        }
        // Prioritize requests by priority level
        const highPriorityRequests = pendingRequests.filter(r => r.priority === RequestPriority.HIGH);
        const normalPriorityRequests = pendingRequests.filter(r => r.priority === RequestPriority.NORMAL);
        const lowPriorityRequests = pendingRequests.filter(r => r.priority === RequestPriority.LOW);
        // First, try high priority requests
        if (highPriorityRequests.length > 0) {
            // Sort by timestamp (oldest first)
            return highPriorityRequests.sort((a, b) => a.timestamp - b.timestamp)[0];
        }
        // Then, try normal priority requests
        if (normalPriorityRequests.length > 0) {
            return normalPriorityRequests.sort((a, b) => a.timestamp - b.timestamp)[0];
        }
        // Finally, try low priority requests
        if (lowPriorityRequests.length > 0) {
            return lowPriorityRequests.sort((a, b) => a.timestamp - b.timestamp)[0];
        }
        return undefined;
    }
    /**
     * Remove a request from the queue
     * @param id Request ID
     */
    removeRequest(id) {
        const index = this.requestQueue.findIndex(r => r.id === id);
        if (index !== -1) {
            this.requestQueue.splice(index, 1);
        }
    }
    /**
     * Cancel pending requests of a specific type for a device
     * @param deviceId Device ID
     * @param operationType Optional type of operation to cancel (if not specified, cancels all)
     */
    cancelPendingRequests(deviceId, operationType) {
        // Find requests to cancel
        const requestsToCancel = this.requestQueue.filter(r => !r.executing && r.deviceId === deviceId &&
            (!operationType || r.operationType === operationType));
        // Cancel each request
        for (const request of requestsToCancel) {
            this.logger.verbose(`Canceling pending ${request.operationType} request for device ${deviceId}`);
            this.removeRequest(request.id);
            request.resolve(null); // Resolve with null rather than rejecting
        }
    }
    /**
     * Make a request to the SleepMe API
     * @param options Request options
     * @returns Promise resolving to response data
     */
    async makeRequest(options) {
        // Set default priority
        const priority = options.priority || RequestPriority.NORMAL;
        // Add detailed logging for the request
        if (this.logger.isVerbose()) {
            this.logger.verbose(`API Request ${options.method} ${options.url} [${priority}]` +
                (options.data ? ` with payload: ${JSON.stringify(options.data)}` : ''));
        }
        // Wait for startup delay to complete for non-high priority requests
        if (priority !== RequestPriority.HIGH && !this.startupFinished) {
            await this.startupComplete;
        }
        // Return a new promise
        return new Promise((resolve, reject) => {
            // Generate a unique ID for this request
            const requestId = `req_${++this.requestIdCounter}`;
            // Create request config
            const config = {
                method: options.method,
                url: API_BASE_URL + options.url
            };
            // Add data if provided
            if (options.data) {
                config.data = options.data;
            }
            // Add to queue
            this.requestQueue.push({
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
                operationType: options.operationType
            });
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
        var _a, _b;
        // Cast to Axios error if possible
        const axiosError = error;
        // Details for the log
        let errorMessage = '';
        let responseStatus = 0;
        let responseData = null;
        // Get error details
        if (axios.isAxiosError(axiosError)) {
            responseStatus = ((_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.status) || 0;
            responseData = (_b = axiosError.response) === null || _b === void 0 ? void 0 : _b.data;
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