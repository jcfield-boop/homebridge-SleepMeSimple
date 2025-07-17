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
 * Based on empirical testing: 30 seconds balances responsiveness with API limits
 * Token bucket allows for more frequent polling when needed
 */
export const DEFAULT_POLLING_INTERVAL = 30;

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
 * Minimum time between API requests in milliseconds
 * Based on empirical testing: 20-25 seconds for reliability
 * Conservative setting for sustained operations
 */
export const MIN_REQUEST_INTERVAL = 20000;

/**
 * Maximum API requests per minute (empirically determined through comprehensive testing)
 * Based on 45+ minutes of testing with 70+ requests:
 * - True API limit: 10-token bucket with 1 token per 18-20 seconds
 * - Conservative implementation: 8 tokens with 1 token per 20 seconds = 3 requests/minute
 * - Empirical token bucket provides optimal balance of responsiveness and reliability
 */
export const MAX_REQUESTS_PER_MINUTE = 3;

/**
 * Default cache validity period in milliseconds
 * Increased for trusted cache entries
 */
export const DEFAULT_CACHE_VALIDITY_MS = 600000;

/**
 * Maximum number of retries for API requests 
 * Higher priority requests will be retried more times
 */
export const MAX_RETRIES = 3;

/**
 * Initial backoff time in milliseconds for rate limiting
 * Based on empirical testing: 10 seconds minimum recovery
 */
export const INITIAL_BACKOFF_MS = 10000; // 10 seconds

/**
 * Maximum backoff time in milliseconds
 */
export const MAX_BACKOFF_MS = 300000; // 5 minutes

/**
 * Post-user-action quiet period in milliseconds
 * Increased as we trust API responses more
 */
export const USER_ACTION_QUIET_PERIOD_MS = 60000; // 60 seconds

/**
 * Command debounce delay in milliseconds
 */
export const COMMAND_DEBOUNCE_DELAY_MS = 800; // 800ms

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
