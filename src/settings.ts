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
 * Increased to 120 seconds (2 minutes) to significantly reduce API calls
 * while still maintaining reasonable responsiveness
 */
export const DEFAULT_POLLING_INTERVAL = 120;

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
 * Increased to 10000ms (10 seconds) to strictly avoid rate limiting issues
 */
export const MIN_REQUEST_INTERVAL = 10000;

/**
 * Maximum API requests per minute (to respect rate limits)
 * Reduced to 4 to provide a larger safety margin against rate limiting
 * API documentation suggests a limit of 10, but we're being conservative
 */
export const MAX_REQUESTS_PER_MINUTE = 4;

/**
 * Default cache validity period in milliseconds
 * Set to 5 minutes (300000ms) to reduce API calls while keeping data fresh enough
 */
export const DEFAULT_CACHE_VALIDITY_MS = 300000;

/**
 * Maximum number of retries for API requests 
 * Higher priority requests will be retried more times
 */
export const MAX_RETRIES = 3;

/**
 * Initial backoff time in milliseconds for rate limiting
 * This is how long to wait initially when a rate limit is hit
 */
export const INITIAL_BACKOFF_MS = 15000; // 15 seconds

/**
 * Maximum backoff time in milliseconds
 * Upper limit for exponential backoff to prevent excessive waiting
 */
export const MAX_BACKOFF_MS = 180000; // 3 minutes

/**
 * Post-user-action quiet period in milliseconds
 * After a user action, how long to wait before resuming polling
 */
export const USER_ACTION_QUIET_PERIOD_MS = 45000; // 45 seconds

/**
 * Command debounce delay in milliseconds
 * How long to wait after receiving a command before processing it
 * to allow for multiple rapid inputs to be consolidated
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
