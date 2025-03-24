/**
 * SleepMe API client implementation with robust error handling and rate limiting
 */
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { 
  API_BASE_URL, 
  MAX_REQUESTS_PER_MINUTE,
  MIN_REQUEST_INTERVAL,
  DEFAULT_CACHE_VALIDITY_MS
} from '../settings.js';
import { 
  Device, 
  DeviceStatus,
  ApiStats, 
  ThermalStatus, 
  PowerState,
  Logger
} from './types.js';

/**
 * Priority levels for API requests
 * Used to determine order of execution when requests are queued
 */
enum RequestPriority {
  HIGH = 'high',       // Critical user-initiated actions (power, temperature changes)
  NORMAL = 'normal',   // Regular status updates
  LOW = 'low'          // Background or non-essential operations
}

/**
 * Interface for a request in the queue
 */
interface QueuedRequest {
  id: string;                          // Unique ID for the request
  config: AxiosRequestConfig;          // Request configuration
  priority: RequestPriority;           // Request priority
  resolve: (value: unknown) => void;   // Promise resolution function
  reject: (reason: unknown) => void;   // Promise rejection function
  retryCount: number;                  // Number of retries attempted
  timestamp: number;                   // When the request was queued
  executing?: boolean;                 // Whether the request is currently executing
  method: string;                      // HTTP method (for logging)
  url: string;                         // Endpoint URL (for logging)
  deviceId?: string;                   // Device ID if applicable
  operationType?: string;              // Operation type for deduplication
}

/**
 * Interface for a cached device status entry
 */
interface DeviceStatusCache {
  status: DeviceStatus;                // Cached device status
  timestamp: number;                   // When the status was cached
  isOptimistic: boolean;               // Whether this is an optimistic update
}

/**
 * SleepMe API Client
 * Handles API communication with rate limiting and robust error handling
 */
export class SleepMeApi {
  // Request queue
  private requestQueue: QueuedRequest[] = [];
  
  // Rate limiting state
  private requestsThisMinute = 0;
  private minuteStartTime = Date.now();
  private lastRequestTime = 0;
  private processingQueue = false;
  private rateLimitBackoffUntil = 0;
  private consecutiveErrors = 0;
  private rateExceededLogged = false; // Flag to prevent redundant log messages
  
  // Request ID counter
  private requestIdCounter = 0;
  
  // Device status cache
  private deviceStatusCache: Map<string, DeviceStatusCache> = new Map();
  
  // API statistics for monitoring
  private stats: ApiStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastRequest: null,
    lastError: null,
    averageResponseTime: 0
  };
  
  // Initial startup delay 
  private readonly startupComplete: Promise<void>;
  private startupFinished = false;
  
  /**
   * Create a new SleepMe API client
   * @param apiToken API authentication token
   * @param logger Logging utility
   */
  constructor(
    private readonly apiToken: string,
    private readonly logger: Logger
  ) {
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
  public getStats(): ApiStats {
    return { ...this.stats };
  }
  
  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
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
  public async getDevices(): Promise<Device[]> {
    try {
      this.logger.debug('Fetching devices...');
      
      const response = await this.makeRequest<Device[] | { devices: Device[] }>({
        method: 'GET',
        url: '/devices',
        priority: RequestPriority.HIGH, // Device discovery is a high priority operation
        operationType: 'getDevices'
      });
      
      // Handle different API response formats
      let devices: Device[];
      if (Array.isArray(response)) {
        devices = response;
      } else if (response && typeof response === 'object' && 'devices' in response) {
        devices = response.devices;
      } else {
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
    } catch (error) {
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
  public async getDeviceStatus(deviceId: string, forceFresh = false): Promise<DeviceStatus | null> {
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
            DEFAULT_CACHE_VALIDITY_MS/2 : DEFAULT_CACHE_VALIDITY_MS))) {
            
          const ageSeconds = Math.round((now - cachedStatus.timestamp) / 1000);
          const optimisticFlag = cachedStatus.isOptimistic ? ' (optimistic)' : '';
          this.logger.verbose(
            `Using cached status for device ${deviceId} (${ageSeconds}s old${optimisticFlag})`
          );
          
          return cachedStatus.status;
        }
      }
      
      this.logger.debug(`Fetching status for device ${deviceId}...`);
      
      const response = await this.makeRequest<Record<string, unknown>>({
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
      const status: DeviceStatus = {
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
      this.logger.verbose(
        `Device status: Temp=${status.currentTemperature}°C, ` +
        `Target=${status.targetTemperature}°C, ` +
        `Status=${status.thermalStatus}, ` +
        `Power=${status.powerState}` +
        (status.waterLevel !== undefined ? `, Water=${status.waterLevel}%` : '')
      );
      
      // Update cache with fresh data
      this.deviceStatusCache.set(deviceId, {
        status,
        timestamp: Date.now(),
        isOptimistic: false
      });
      
      return status;
    } catch (error) {
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
  public extractNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let value: unknown = obj;
    
    for (const part of parts) {
      if (value === null || value === undefined || typeof value !== 'object') {
        return undefined;
      }
      
      value = (value as Record<string, unknown>)[part];
    }
    
    return value;
  }
  
  /**
   * Turn device on
   * @param deviceId Device identifier
   * @param temperature Optional target temperature in Celsius
   * @returns Whether operation was successful
   */
  public async turnDeviceOn(deviceId: string, temperature?: number): Promise<boolean> {
    try {
      // Default temperature if none provided
      const targetTemp = temperature !== undefined ? temperature : 21;
      
      this.logger.info(`Turning device ${deviceId} ON with temperature ${targetTemp}°C`);
      
      // Cancel any pending requests for this device to prevent race conditions
      this.cancelAllDeviceRequests(deviceId);
      
      // Create payload for API - using integers for temperature values
      const payload: Record<string, unknown> = {
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
        return true;
      } else {
        this.logger.error(`Failed to turn device ${deviceId} ON`);
        return false;
      }
    } catch (error) {
      this.handleApiError(`turnDeviceOn(${deviceId})`, error);
      return false;
    }
  }

  /**
   * Turn device off
   * @param deviceId Device identifier
   * @returns Whether operation was successful
   */
  public async turnDeviceOff(deviceId: string): Promise<boolean> {
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
      } else {
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
    } catch (error) {
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
  public async setTemperature(deviceId: string, temperature: number): Promise<boolean> {
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
      } else {
        this.logger.error(`Failed to set device ${deviceId} temperature to ${temperature}°C`);
      }
      
      return success;
    } catch (error) {
      this.handleApiError(`setTemperature(${deviceId})`, error);
      return false;
    }
  }

  /**
   * Cancel all pending requests for a device
   * @param deviceId Device ID
   */
  public cancelAllDeviceRequests(deviceId: string): void {
    this.cancelPendingRequests(deviceId);
  }

  /**
   * Update device settings
   * @param deviceId Device identifier
   * @param settings Settings to update
   * @returns Whether operation was successful
   */
  private async updateDeviceSettings(deviceId: string, settings: Record<string, unknown>): Promise<boolean> {
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
      
      // Make the request
      await this.makeRequest<Record<string, unknown>>({
        method: 'PATCH',
        url: `/devices/${deviceId}`,
        data: settings,
        priority: RequestPriority.HIGH, // User-initiated actions are high priority
        deviceId,
        operationType: 'updateDeviceSettings'
      });
      
      // If we reach here, no exception was thrown, so the request succeeded
      this.logger.info(`Successfully updated device ${deviceId} settings`);
      
      // Reset consecutive errors on success
      this.consecutiveErrors = 0;
      
      return true;
    } catch (error) {
      this.handleApiError(`updateDeviceSettings(${deviceId})`, error);
      return false;
    }
  }

  /**
   * Update the device status cache optimistically based on settings changes
   * @param deviceId Device identifier
   * @param updates Status updates to apply
   */
  private updateCacheOptimistically(deviceId: string, updates: Partial<DeviceStatus>): void {
    // Get current cached status
    const cachedEntry = this.deviceStatusCache.get(deviceId);
    
    if (cachedEntry) {
      // Merge updates with current status
      const updatedStatus: DeviceStatus = {
        ...cachedEntry.status,
        ...updates
      };
      
      // Store updated status as optimistic
      this.deviceStatusCache.set(deviceId, {
        status: updatedStatus,
        timestamp: Date.now(),
        isOptimistic: true
      });
      
      this.logger.verbose(
        `Optimistically updated cache for device ${deviceId}: ` +
        `Power=${updatedStatus.powerState}, ` +
        `Target=${updatedStatus.targetTemperature}°C, ` +
        `Status=${updatedStatus.thermalStatus}`
      );
    }
  }
/**
 * Process the request queue
 * This is the core method for rate-limiting and prioritizing requests
 */
private async processQueue(): Promise<void> {
  // If already processing, exit
  if (this.processingQueue) {
    return;
  }
  
  this.processingQueue = true;
  
  try {
    while (this.requestQueue.length > 0) {
      // Check if we need to reset rate limit counter
      const now = Date.now();
      if (now - this.minuteStartTime >= 60000) {
        this.requestsThisMinute = 0;
        this.minuteStartTime = now;
        this.rateExceededLogged = false; // Reset logging flag
        this.logger.debug('Resetting rate limit counter (1 minute has passed)');
      }
      
      // Check if we're in backoff mode
      if (this.rateLimitBackoffUntil > now) {
        // Only log this once, not repeatedly
        if (!this.rateExceededLogged) {
          this.logger.info(`Rate limit backoff active, waiting ${Math.ceil((this.rateLimitBackoffUntil - now) / 1000)}s before retry`);
          this.rateExceededLogged = true;
        }
        
        // Use a single timer rather than polling
        await new Promise(resolve => 
          setTimeout(resolve, this.rateLimitBackoffUntil - now + 1000)
        );
        continue;
      }
      
      // Check if we've hit the rate limit
      if (this.requestsThisMinute >= MAX_REQUESTS_PER_MINUTE) {
        const resetTime = this.minuteStartTime + 60000;
        const waitTime = resetTime - now;
        
        // Only log this once, not repeatedly
        if (!this.rateExceededLogged) {
          this.logger.info(
            `Rate limit approached (${this.requestsThisMinute}/${MAX_REQUESTS_PER_MINUTE} requests), ` +
            `waiting ${Math.ceil(waitTime / 1000)}s before continuing`
          );
          this.rateExceededLogged = true;
        }
        
        // Wait for rate limit reset with a single timer
        await new Promise(resolve => setTimeout(resolve, waitTime + 1000));
        continue;
      }
      
      // Check if we need to wait between requests
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
        
        // Only log this for debug level, not for every check
        if (this.logger.isDebug()) {
          this.logger.debug(`Waiting ${Math.round(waitTime/1000)}s between requests (rate limiting)`);
        }
        
        // Use a single timer instead of polling
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
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
        this.lastRequestTime = now;
        
        // Add auth token to request
        request.config.headers = {
          ...(request.config.headers || {}),
          Authorization: `Bearer ${this.apiToken}`
        };
        
        this.logger.verbose(
          `Executing request ${request.id}: ${request.method} ${request.url}`
        );
        
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
        
        this.logger.verbose(
          `Request ${request.id} completed in ${responseTime}ms`
        );
        
        // Reset consecutive errors on success
        this.consecutiveErrors = 0;
      } catch (error) {
        const axiosError = error as AxiosError;
        
        this.stats.failedRequests++;
        this.stats.lastError = axiosError;
        
        // Handle rate limiting (HTTP 429)
        if (axiosError.response?.status === 429) {
          // Implement more effective backoff
          this.consecutiveErrors++;
          // Start with 15 seconds backoff, increasing with consecutive errors
          // Cap at 2 minutes max backoff
          const backoffTime = Math.min(120000, 15000 * Math.pow(1.5, this.consecutiveErrors));
          this.rateLimitBackoffUntil = Date.now() + backoffTime;
          
          // Simplified logging
          this.logger.warn(`Rate limit exceeded (429). Implementing backoff strategy for ${Math.ceil(backoffTime/1000)}s.`);
          
          // Requeue the request
          this.requestQueue.unshift({
            ...request,
            executing: false,
            retryCount: request.retryCount + 1
          });
        } else {
          // For other errors, just reject
          this.consecutiveErrors++;
          request.reject(error);
        }
      } finally {
        // Remove request from queue
        this.removeRequest(request.id);
      }
    }
  } finally {
    this.processingQueue = false;
    
    // If there are still requests in the queue, continue processing
    if (this.requestQueue.length > 0) {
      // Use a real delay here instead of immediate re-processing
      setTimeout(() => this.processQueue(), 500);
    }
  }
}

  /**
   * Check and reset rate limit counter if needed
   */
  private checkRateLimit(): void {
    const now = Date.now();
    
    // Reset rate limit counter if a minute has passed
    if (now - this.minuteStartTime >= 60000) {
      this.requestsThisMinute = 0;
      this.minuteStartTime = now;
      this.rateExceededLogged = false; // Reset logging flag
      
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
  private getNextRequest(): QueuedRequest | undefined {
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
  private removeRequest(id: string): void {
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
  private cancelPendingRequests(deviceId: string, operationType?: string): void {
    // Find requests to cancel
    const requestsToCancel = this.requestQueue.filter(r => 
      !r.executing && r.deviceId === deviceId && 
      (!operationType || r.operationType === operationType)
    );
    
    // Cancel each request
    for (const request of requestsToCancel) {
      this.logger.verbose(
        `Canceling pending ${request.operationType} request for device ${deviceId}`
      );
      
      this.removeRequest(request.id);
      request.resolve(null); // Resolve with null rather than rejecting
    }
  }

  /**
   * Make a request to the SleepMe API
   * @param options Request options
   * @returns Promise resolving to response data
   */
  private async makeRequest<T>(options: {
    method: string;
    url: string;
    data?: unknown;
    priority?: RequestPriority;
    deviceId?: string;
    operationType?: string;
  }): Promise<T> {
    // Skip redundant status updates if queue is getting large
    if (this.requestQueue.length > 5 && 
        options.operationType === 'getDeviceStatus' && 
        options.priority !== RequestPriority.HIGH) {
      this.logger.debug(`Skipping non-critical status update due to queue backlog (${this.requestQueue.length} pending)`);
      return Promise.resolve(null as unknown as T);
    }
    
    // Log request at different levels based on operation type to reduce noise
    if (options.operationType === 'getDeviceStatus') {
      this.logger.verbose(
        `API Request ${options.method} ${options.url} [${options.priority || 'NORMAL'}]` + 
        (options.data ? ` with payload: ${JSON.stringify(options.data)}` : '')
      );
    } else {
      this.logger.info(
        `API Request ${options.method} ${options.url} [${options.priority || 'NORMAL'}]` + 
        (options.data ? ` with payload: ${JSON.stringify(options.data)}` : '')
      );
    }
    
    // Set default priority
    const priority = options.priority || RequestPriority.NORMAL;
    
    // Wait for startup delay to complete for non-high priority requests
    if (priority !== RequestPriority.HIGH && !this.startupFinished) {
      await this.startupComplete;
    }
    
    // Return a new promise
    return new Promise<T>((resolve, reject) => {
      // Generate a unique ID for this request
      const requestId = `req_${++this.requestIdCounter}`;
      
      // Create request config
      const config: AxiosRequestConfig = {
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
      
      // Add to queue
      this.requestQueue.push({
        id: requestId,
        config,
        priority,
        resolve: resolve as (value: unknown) => void,
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
  private handleApiError(context: string, error: unknown): void {
    // Cast to Axios error if possible
    const axiosError = error as AxiosError;
    
    // Details for the log
    let errorMessage = '';
    let responseStatus = 0;
    let responseData = null;
    
    // Get error details
    if (axios.isAxiosError(axiosError)) {
      responseStatus = axiosError.response?.status || 0;
      responseData = axiosError.response?.data;
      errorMessage = axiosError.message;
      
      this.logger.error(
        `API error in ${context}: ${errorMessage} (Status: ${responseStatus})`
      );
      
      if (responseData && this.logger.isVerbose()) {
        this.logger.verbose(`Response error data: ${JSON.stringify(responseData)}`);
      }
    } else {
      // Not an Axios error
      errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error in ${context}: ${errorMessage}`);
    }
  }
  
  /**
   * Update the average response time
   * @param newResponseTime New response time in milliseconds
   */
  private updateAverageResponseTime(newResponseTime: number): void {
    if (this.stats.averageResponseTime === 0) {
      this.stats.averageResponseTime = newResponseTime;
    } else {
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
  private extractTemperature(data: Record<string, unknown>, paths: string[], defaultValue = 21): number {
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
  private extractThermalStatus(data: Record<string, unknown>): ThermalStatus {
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
  private extractPowerState(data: Record<string, unknown>): PowerState {
    // Try different paths for power state
    const thermalStatus = this.extractThermalStatus(data);
    
    // If we have a thermal status, infer power state
    if (thermalStatus !== ThermalStatus.UNKNOWN) {
      if (thermalStatus === ThermalStatus.OFF || thermalStatus === ThermalStatus.STANDBY) {
        return PowerState.OFF;
      } else {
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
  private convertCtoF(celsius: number): number {
    return (celsius * 9/5) + 32;
  }

  /**
   * Convert Fahrenheit to Celsius
   * @param fahrenheit Temperature in Fahrenheit
   * @returns Temperature in Celsius
   */
  private convertFtoC(fahrenheit: number): number {
    return (fahrenheit - 32) * 5/9;
  }
}
