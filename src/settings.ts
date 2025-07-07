/**
 * Plugin settings and constants
 */

/**
 * Platform name used to register the plugin in Homebridge
 */
export const PLATFORM_NAME = 'SleepMeSimple';

/**
 * Plugin identifier - must match package.json name property
 */
export const PLUGIN_NAME = 'homebridge-sleepme-simple';

/**
 * SleepMe API base URL
 */
export const API_BASE_URL = 'https://api.developer.sleep.me/v1';

/**
 * Default polling interval in seconds
 * Reduced to better utilize available API capacity (4 requests/minute sustainable)
 * With context-aware caching, we can poll more frequently without hitting rate limits
 */
export const DEFAULT_POLLING_INTERVAL = 120; // 2 minutes - better balance of responsiveness and efficiency

/**
 * Minimum allowed temperature in Celsius
 */
export const MIN_TEMPERATURE_C = 13; // ~55°F

/**
 * Maximum allowed temperature in Celsius
 */
export const MAX_TEMPERATURE_C = 46; // ~115°F

/**
 * Default temperature step granularity
 */
export const TEMPERATURE_STEP = 1;

/**
 * Minimum time between LOW PRIORITY API requests in milliseconds
 * Only applies to background polling - user interactions bypass this
 */
export const MIN_REQUEST_INTERVAL = 3000; // CHANGED: Reduced from 6000ms

/**
 * ACTUAL empirically determined API limits (NOT the documented "10/minute")
 * Based on testing: 7 token bucket, 1 token per 15s = ~4 sustainable requests/minute
 * Documentation claims "10 requests per discrete minute" but real limit is much lower
 */
export const MAX_REQUESTS_PER_MINUTE = 4; // Reality: token bucket with ~4/min sustainable

/**
 * Background request threshold - start throttling background requests
 * when we reach this percentage of MAX_REQUESTS_PER_MINUTE
 * This reserves capacity for user interactions
 */
export const BACKGROUND_REQUEST_THRESHOLD = 0.8; // NEW: Add this constant

/**
 * Cache validity periods for different contexts (in milliseconds)
 * Optimized for available API capacity (4 requests/minute sustainable)
 */
export const CACHE_USER_ACTIVE = 60000;      // 1 minute when user is actively interacting
export const CACHE_DEVICE_ACTIVE = 90000;    // 1.5 minutes for heating/cooling devices
export const CACHE_NORMAL = 180000;          // 3 minutes normal operation
export const CACHE_IDLE = 300000;           // 5 minutes when system is idle
export const CACHE_RECOVERY = 600000;       // 10 minutes during rate limit recovery

/**
 * Default cache validity period in milliseconds
 * Reduced to 3 minutes to better utilize available API capacity
 */
export const DEFAULT_CACHE_VALIDITY_MS = CACHE_NORMAL; // 3 minutes - balanced for responsiveness

/**
 * Maximum number of retries for API requests 
 * Higher priority requests will be retried more times
 */
export const MAX_RETRIES = 3;

/**
 * Initial backoff time in milliseconds for rate limiting
 * Reduced for critical user interactions
 */
export const INITIAL_BACKOFF_MS = 5000; // CHANGED: Reduced from 30000ms

/**
 * Maximum backoff time in milliseconds
 */
export const MAX_BACKOFF_MS = 300000; // 5 minutes

/**
 * Post-user-action quiet period in milliseconds
 * Reduced to allow quicker status verification after user actions
 */
export const USER_ACTION_QUIET_PERIOD_MS = 15000; // CHANGED: Reduced to 15s for faster external detection


/**
 * Logging levels
 */
export enum LogLevel {
  NORMAL = 'normal',
  DEBUG = 'debug',
  VERBOSE = 'verbose'
}

/**
 * Request priority levels for more intelligent queue management
 */
export enum RequestPriority {
  CRITICAL = 'critical', // User-initiated power changes, must succeed
  HIGH = 'high',         // User-initiated temperature changes
  NORMAL = 'normal',     // Regular status updates
  LOW = 'low'            // Background operations
}

/**
 * HomeKit interface modes
 */
export enum InterfaceMode {
  SWITCH = 'switch',         // Simple power switch + temperature sensor
  THERMOSTAT = 'thermostat', // Traditional thermostat interface  
  HYBRID = 'hybrid'          // Power switch + temperature control + schedules
}

/**
 * Default interface mode - hybrid provides best user experience
 */
export const DEFAULT_INTERFACE_MODE = InterfaceMode.HYBRID;

/**
 * Enable individual schedule switches by default
 */
export const DEFAULT_SHOW_INDIVIDUAL_SCHEDULES = true;

/**
 * Enable warm hug feature by default
 */
export const DEFAULT_ENABLE_WARM_HUG = true;
