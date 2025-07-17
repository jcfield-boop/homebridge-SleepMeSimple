/**
 * SleepMe API client implementation with robust error handling and rate limiting
 */
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { 
  API_BASE_URL, 
  MAX_REQUESTS_PER_MINUTE,
  MIN_REQUEST_INTERVAL,
  DEFAULT_CACHE_VALIDITY_MS,
  MAX_RETRIES,
  INITIAL_BACKOFF_MS,
  MAX_BACKOFF_MS,
  RequestPriority
} from '../settings.js';
import { 
  Device, 
  DeviceStatus,
  ApiStats, 
  ThermalStatus, 
  PowerState,
  Logger
} from './types.js';
import { EmpiricalRateLimiter } from './empirical-rate-limiter.js';
import { UltraConservativeRateLimiter } from './ultra-conservative-rate-limiter.js';
import { EmpiricalTokenBucketLimiter } from './empirical-token-bucket-limiter.js';

/**
 * Interface for a cached device status entry
 * Enhanced with confidence level and trust status
 */
interface DeviceStatusCache {
  status: DeviceStatus;                      // Cached device status
  timestamp: number;                         // When the status was cached
  isOptimistic: boolean;                     // Whether this is an optimistic update
  confidence?: 'low' | 'medium' | 'high';    // Confidence in the cache data
  source?: 'get' | 'patch' | 'inferred';     // Source of the cache data
  verified?: boolean;                        // Whether this has been verified by GET
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
  lastAttempt?: number;                // When the request was last attempted
  data?: Record<string, unknown>;      // Optional data payload for convenience
}

/**
 * SleepMe API Client
 * Handles API communication with rate limiting and robust error handling
 */
export class SleepMeApi {
  // Request queue - separate queues by priority for better management
  private criticalQueue: QueuedRequest[] = [];
  private highPriorityQueue: QueuedRequest[] = [];
  private normalPriorityQueue: QueuedRequest[] = [];
  private lowPriorityQueue: QueuedRequest[] = [];
  
  // Rate limiting state
  private requestsThisMinute = 0;
  private minuteStartTime = Date.now();
  private lastRequestTime = 0;
  private processingQueue = false;
  private rateLimitBackoffUntil = 0;
  private consecutiveErrors = 0;
  private rateExceededLogged = false;  // Flag to prevent redundant log messages
  
  // Legacy empirical rate limiter (kept for monitoring)
  private empiricalRateLimiter: EmpiricalRateLimiter;
  
  // Ultra-conservative rate limiter (fallback)
  private ultraConservativeRateLimiter: UltraConservativeRateLimiter;
  
  // Primary rate limiter - empirical token bucket (based on comprehensive testing)
  private tokenBucketLimiter: EmpiricalTokenBucketLimiter;
  
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
  private initialDiscoveryComplete = false;
  private startupTime = Date.now();
  
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
    
    // Startup will be marked complete by the platform after initial discovery
    this.startupComplete = new Promise(resolve => {
      // The platform will call markStartupComplete() when ready
      const checkStartup = () => {
        if (this.startupFinished) {
          resolve();
        } else {
          setTimeout(checkStartup, 100);
        }
      };
      checkStartup();
    });
    
    // Start the queue processor
    this.processQueue();
    
    // Set up cache cleanup interval
    setInterval(() => this.cleanupCache(), 300000); // Clean up cache every 5 minutes
    
    // Initialize legacy empirical rate limiter (kept for monitoring)
    this.empiricalRateLimiter = new EmpiricalRateLimiter({
      maxRequestsPerMinute: MAX_REQUESTS_PER_MINUTE,
      allowCriticalBypass: true,
      safetyMargin: 0.25 // 25% safety margin
    });
    
    // Initialize ultra-conservative rate limiter (fallback)
    this.ultraConservativeRateLimiter = new UltraConservativeRateLimiter({
      bucketCapacity: 2, // Ultra-conservative: 2 tokens based on testing
      refillIntervalMs: 45000, // 45 seconds based on observed recovery patterns
      maxBurstSize: 2,
      allowCriticalBypass: true,
      emergencyBackoffMs: 120000, // 2 minutes
      startupGracePeriodMs: 180000 // 3 minutes
    });
    
    // Initialize PRIMARY rate limiter - empirical token bucket (based on comprehensive testing)
    this.tokenBucketLimiter = new EmpiricalTokenBucketLimiter({
      bucketCapacity: 8,              // 20% safety margin from observed 10 tokens
      refillRatePerSecond: 1/20,      // 1 token per 20 seconds (conservative)
      minRecoveryTimeMs: 10000,       // 10 seconds minimum recovery
      safetyMargin: 0.2,              // 20% safety margin
      allowCriticalBypass: true,
      criticalBypassLimit: 3,         // Max 3 critical bypasses per minute
      adaptiveBackoffMultiplier: 1.5, // 50% increase per consecutive failure
      maxAdaptiveBackoffMs: 300000    // 5 minutes max backoff
    });
    
    this.logger.info('SleepMe API client initialized with empirical token bucket rate limiting');
  }
  
  /**
   * Get API statistics
   * @returns Current API statistics
   */
  public getStats(): ApiStats {
    return { ...this.stats };
  }
  
  /**
   * Get empirical rate limiter statistics
   * @returns Current rate limiter statistics and recommendations
   */
  public getRateLimiterStats(): {
    stats: ReturnType<EmpiricalRateLimiter['getStats']>;
    recommendations: string[];
  } {
    return {
      stats: this.empiricalRateLimiter.getStats(),
      recommendations: this.empiricalRateLimiter.getRecommendations()
    };
  }

  /**
   * Get ultra-conservative rate limiter statistics and recommendations
   * @returns Current rate limiter status and recommendations
   */
  public getUltraConservativeStats(): {
    status: ReturnType<UltraConservativeRateLimiter['getStatus']>;
    recommendations: string[];
  } {
    return {
      status: this.ultraConservativeRateLimiter.getStatus(),
      recommendations: this.ultraConservativeRateLimiter.getRecommendations()
    };
  }

  /**
   * Get primary token bucket rate limiter statistics and recommendations
   * @returns Current rate limiter status and detailed statistics
   */
  public getTokenBucketStats(): {
    status: ReturnType<EmpiricalTokenBucketLimiter['getStatus']>;
    detailedStats: ReturnType<EmpiricalTokenBucketLimiter['getDetailedStats']>;
    recommendations: string[];
  } {
    return {
      status: this.tokenBucketLimiter.getStatus(),
      detailedStats: this.tokenBucketLimiter.getDetailedStats(),
      recommendations: this.tokenBucketLimiter.getRecommendations()
    };
  }
  
  /**
   * Mark startup as complete (called by platform when initial discovery is done)
   * This allows the platform to control when startup is considered finished
   */
  public markStartupComplete(): void {
    this.startupFinished = true;
    this.logger.debug('Startup marked as complete by platform');
  }
  
  /**
   * Mark initial discovery as complete (called by platform after first device discovery)
   * This ensures device discovery uses NORMAL priority during initial startup
   */
  public markInitialDiscoveryComplete(): void {
    this.initialDiscoveryComplete = true;
    this.logger.debug('Initial discovery marked as complete');
  }
  
  /**
   * Create a simple hash of device ID for consistent jitter
   * @param deviceId Device identifier
   * @returns Hash value for jitter calculation
   */
  private hashDeviceId(deviceId: string): number {
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
      
      // Use NORMAL priority during initial startup to avoid rate limits, HIGH for subsequent discovery
      const priority = this.initialDiscoveryComplete ? RequestPriority.HIGH : RequestPriority.NORMAL;
      
      this.logger.verbose(`Using ${priority} priority for device discovery (initialDiscovery: ${this.initialDiscoveryComplete})`);
      
      const response = await this.makeRequest<Device[] | { devices: Device[] }>({
        method: 'GET',
        url: '/devices',
        priority: priority,
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
 * Get status for a specific device with trust-based caching
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
      
      // Use cache with dynamic validity based on confidence and source
      // High confidence cache (from PATCH responses) can be used longer
      if (cachedStatus) {
        let validityPeriod = DEFAULT_CACHE_VALIDITY_MS;
        
        // Adjust validity period based on confidence and source
        if (cachedStatus.confidence === 'high' && !cachedStatus.isOptimistic) {
          // Extend validity for high confidence updates, especially if they came from a PATCH
          validityPeriod = cachedStatus.source === 'patch' ? 
                          DEFAULT_CACHE_VALIDITY_MS * 3 : // Much longer validity for PATCH responses
                          DEFAULT_CACHE_VALIDITY_MS * 2;  // Standard extension for high confidence
        } else if (cachedStatus.isOptimistic) {
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
          
          this.logger.verbose(
            `Using cached status for device ${deviceId} (${ageSeconds}s old${optimisticFlag}${confidenceInfo}${verifiedFlag}) ` +
            `[jitter: ${jitterPercent}%]`
          );
          
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

const response = await this.makeRequest<Record<string, unknown>>({
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
      verified: true  // This is from a GET so it's verified by definition
    });
    
    return status;
  } catch (error) {
    this.handleApiError(`getDeviceStatus(${deviceId})`, error);
    
    // Enhanced fallback logic for rate limiting errors
    const axiosError = error as any;
    if (axiosError?.response?.status === 429) {
      // If rate limited, try to return cached data if available
      const cachedEntry = this.deviceStatusCache.get(deviceId);
      if (cachedEntry) {
        const ageSeconds = Math.round((Date.now() - cachedEntry.timestamp) / 1000);
        const ageMinutes = Math.round(ageSeconds / 60);
        
        // Use cached data if it's not too old (up to 30 minutes for rate limit scenarios)
        if (ageSeconds < 1800) { // 30 minutes
          this.logger.warn(
            `Rate limited (429) for device ${deviceId}, using cached data (${ageMinutes}m old)`
          );
          return cachedEntry.status;
        } else {
          this.logger.warn(
            `Rate limited (429) for device ${deviceId}, cached data too old (${ageMinutes}m), returning null`
          );
        }
      } else {
        this.logger.warn(
          `Rate limited (429) for device ${deviceId}, no cached data available`
        );
      }
    }
    
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
    } else {
      this.logger.error(`Failed to turn device ${deviceId} OFF`);
      return false;
    }
  } catch (error) {
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
      // Update cache with trusted state - key to trust-based approach
      this.updateCacheWithTrustedState(deviceId, {
        targetTemperature: temperature,
        // Setting temperature implies the device is ON
        powerState: PowerState.ON,
        thermalStatus: ThermalStatus.ACTIVE
      });
      
      this.logger.verbose(`Device ${deviceId} temperature set successfully to ${temperature}°C`);
      return true;
    } else {
      this.logger.error(`Failed to set device ${deviceId} temperature to ${temperature}°C`);
      return false;
    }
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
      
      // Make the request with CRITICAL priority for user-initiated actions
      await this.makeRequest<Record<string, unknown>>({
        method: 'PATCH',
        url: `/devices/${deviceId}`,
        data: settings,
        priority: RequestPriority.CRITICAL, // User-initiated actions are critical priority
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
 * Update cache with a trusted device state based on our commands
 * Enhanced with better consistency handling
 * @param deviceId Device identifier
 * @param updates Status updates to apply
 */
private updateCacheWithTrustedState(deviceId: string, updates: Partial<DeviceStatus>): void {
  // Get current cached status
  const cachedEntry = this.deviceStatusCache.get(deviceId);
  
  let updatedStatus: DeviceStatus;
  
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
      } else if (updates.thermalStatus === ThermalStatus.ACTIVE ||
                 updates.thermalStatus === ThermalStatus.COOLING ||
                 updates.thermalStatus === ThermalStatus.HEATING) {
        // Always set power to ON for active states
        updatedStatus.powerState = PowerState.ON;
      }
    }
    
    // Explicitly log the before and after power states for debugging
    this.logger.verbose(
      `Cache update: Previous power=${cachedEntry.status.powerState}, ` +
      `New power=${updatedStatus.powerState}, ` +
      `Update requested=${updates.powerState || 'none'}`
    );
  } else {
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
    } else if (updates.thermalStatus === ThermalStatus.ACTIVE ||
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
    verified: false  // Not verified yet, but trusted until proven otherwise
  });
  
  this.logger.verbose(
    `Updated cache with trusted state for device ${deviceId}: ` +
    `Power=${updatedStatus.powerState}, ` +
    `Target=${updatedStatus.targetTemperature}°C, ` +
    `Status=${updatedStatus.thermalStatus}`
  );
}

/**
 * Get the last known temperature or a reasonable approximation
 * This helps provide a smoother UX during temperature transitions
 * @param deviceId Device identifier
 * @param targetTemp Target temperature to use if no cached temperature
 * @returns Best guess at current temperature
 */
private getLastKnownTemperature(deviceId: string, targetTemp: number): number {
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
private parseDeviceStatus(response: Record<string, unknown>): DeviceStatus {
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
  
  return status;
}
  /**
 * Process the request queue with improved priority handling
 * and adaptive rate limiting
 */
private async processQueue(): Promise<void> {
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

      // Use empirical token bucket rate limiter (primary) to check if request should be allowed
      const rateLimitCheck = this.tokenBucketLimiter.shouldAllowRequest(request.priority);
      
      if (!rateLimitCheck.allowed) {
        // Only log this once, not repeatedly
        if (!this.rateExceededLogged) {
          const waitTimeSeconds = Math.ceil(rateLimitCheck.waitTimeMs / 1000);
          this.logger.info(
            `Token bucket rate limiter: ${rateLimitCheck.reason}, waiting ${waitTimeSeconds}s (${rateLimitCheck.tokensRemaining} tokens)`
          );
          this.logger.debug(`Rate limiter recommendation: ${rateLimitCheck.recommendation}`);
          this.rateExceededLogged = true;
        }
        
        // Wait for the recommended time
        await new Promise(resolve => setTimeout(resolve, rateLimitCheck.waitTimeMs));
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
        
        this.logger.verbose(
          `Executing request ${request.id}: ${request.method} ${request.url} [${request.priority}]`
        );
        // Execute the request
        this.stats.totalRequests++;
        const response = await axios(request.config);
        this.stats.successfulRequests++;
        this.stats.lastRequest = new Date();
        
        // Track response time
        const responseTime = Date.now() - startTime;
        this.updateAverageResponseTime(responseTime);
        
        // Record successful request in all rate limiters
        this.empiricalRateLimiter.recordRequest(request.priority, true, responseTime, false);
        this.ultraConservativeRateLimiter.recordRequest(request.priority, true, false);
        this.tokenBucketLimiter.recordRequest(request.priority, true, false);
        
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
          const responseTime = Date.now() - startTime;
          
          // Record rate limit in all rate limiters
          this.empiricalRateLimiter.recordRequest(request.priority, false, responseTime, true);
          this.ultraConservativeRateLimiter.recordRequest(request.priority, false, true);
          this.tokenBucketLimiter.recordRequest(request.priority, false, true);
          
          this.logger.warn(
            `Rate limit exceeded (429) for ${request.priority} request. Token bucket rate limiter will handle backoff.`
          );
          
          // Reset our internal counter to prevent double-counting
          this.requestsThisMinute = 0;
          
          // For 429 errors, don't immediately requeue - let the empirical rate limiter handle backoff
          // The request will be retried when the rate limiter allows it
          if (request.retryCount < MAX_RETRIES) {
            request.retryCount++;
            this.requeueRequest(request);
            // Don't remove the request from queue - it was requeued
            continue;
          } else {
            // Max retries exceeded
            this.logger.error(
              `Rate limit (429) retries exceeded for ${request.priority} request`
            );
            request.reject(error);
          }
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
            this.logger.warn(
              `Request failed (${axiosError.message}), retry ${request.retryCount + 1}/${maxRetries}`
            );
            this.requeueRequest(request);
            // Don't remove the request from queue - it was requeued
            continue;
          } else {
            // Max retries exceeded
            this.logger.error(
              `Request failed after ${request.retryCount} retries: ${axiosError.message}`
            );
            request.reject(error);
          }
        }
      } finally {
        // Remove request from appropriate queue only if not requeued
        this.removeRequest(request);
      }
    }
  } finally {
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
private hasQueuedRequests(): boolean {
  return this.criticalQueue.length > 0 || 
         this.highPriorityQueue.length > 0 || 
         this.normalPriorityQueue.length > 0 || 
         this.lowPriorityQueue.length > 0;
}
/**
 * Check and reset rate limit counter using discrete minute windows
 * Enhanced to handle API timing mismatches
 */
private checkRateLimit(): void {
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
    } else {
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
private getNextRequest(): QueuedRequest | undefined {
  // First identify and prioritize OFF commands (they're the most important for UX)
  const findOffCommands = (queue: QueuedRequest[]): QueuedRequest | undefined => {
    const pendingRequests = queue.filter(r => !r.executing);
    if (pendingRequests.length === 0) return undefined;
    
    // Look for standby commands (OFF commands)
    const offCommands = pendingRequests.filter(r => 
      r.data && 
      typeof r.data === 'object' && 
      'thermal_control_status' in r.data && 
      r.data.thermal_control_status === 'standby'
    );
    
    if (offCommands.length > 0) {
      // Sort by timestamp and return the oldest
      return offCommands.sort((a, b) => a.timestamp - b.timestamp)[0];
    }
    
    return undefined;
  };
  
  // Check each queue for OFF commands first
  let nextRequest = findOffCommands(this.criticalQueue);
  if (nextRequest) return nextRequest;
  
  nextRequest = findOffCommands(this.highPriorityQueue);
  if (nextRequest) return nextRequest;
  
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
private removeRequest(request: QueuedRequest): void {
  let queue: QueuedRequest[];
  
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
private requeueRequest(request: QueuedRequest): void {
  // Create new request with incremented retry count
  const newRequest: QueuedRequest = {
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
private cancelPendingRequests(deviceId: string, operationType?: string): void {
  // Function to find and cancel requests in a queue
  const processQueue = (queue: QueuedRequest[]): void => {
    const requestsToCancel = queue.filter(r => 
      !r.executing && r.deviceId === deviceId && 
      (!operationType || r.operationType === operationType)
    );
    
    for (const request of requestsToCancel) {
      this.logger.verbose(
        `Canceling pending ${request.operationType} request for device ${deviceId}`
      );
      
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
private async makeRequest<T>(options: {
  method: string;
  url: string;
  data?: unknown;
  priority?: RequestPriority;
  deviceId?: string;
  operationType?: string;
}): Promise<T> {
  // Set default priority
  const priority = options.priority || RequestPriority.NORMAL;
  
  // Skip redundant status updates if queue is getting large
  if (this.criticalQueue.length + this.highPriorityQueue.length > 3 && 
      options.operationType === 'getDeviceStatus' && 
      priority !== RequestPriority.CRITICAL && 
      priority !== RequestPriority.HIGH) {
    this.logger.debug(`Skipping non-critical status update due to queue backlog`);
    return Promise.resolve(null as unknown as T);
  }
  
  // Log request at different levels based on operation type to reduce noise
  if (options.operationType === 'getDeviceStatus') {
    this.logger.verbose(
      `API Request ${options.method} ${options.url} [${priority}]` + 
      (options.data ? ` with payload: ${JSON.stringify(options.data)}` : '')
    );
  } else {
    this.logger.info(
      `API Request ${options.method} ${options.url} [${priority}]` + 
      (options.data ? ` with payload: ${JSON.stringify(options.data)}` : '')
    );
  }
  
  // Wait for startup delay to complete for non-critical requests
  if (priority !== RequestPriority.CRITICAL && !this.startupFinished) {
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
    
    // Create new request
    const request: QueuedRequest = {
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
      operationType: options.operationType,
      data: options.data as Record<string, unknown>  // Store data for filtering in getNextRequest
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
