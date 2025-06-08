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
 * Increased to avoid rate limiting issues
 */
export const DEFAULT_POLLING_INTERVAL = 180; // 3 minutes - safer for rate limits

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
 * Maximum API requests per minute (to respect rate limits)
 * Very conservative limit due to potential shared API usage
 */
export const MAX_REQUESTS_PER_MINUTE = 10; // Standard rate limit

/**
 * Background request threshold - start throttling background requests
 * when we reach this percentage of MAX_REQUESTS_PER_MINUTE
 * This reserves capacity for user interactions
 */
export const BACKGROUND_REQUEST_THRESHOLD = 0.8; // NEW: Add this constant

/**
 * Default cache validity period in milliseconds
 * Base period for cache entries - will be adjusted based on device state
 */
export const DEFAULT_CACHE_VALIDITY_MS = 120000; // 2 minutes base validity

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
export const USER_ACTION_QUIET_PERIOD_MS = 30000; // CHANGED: Reduced from 60000ms

/**
 * Command debounce delay in milliseconds
 * Prevents rapid-fire duplicate commands from users
 */
export const COMMAND_DEBOUNCE_DELAY_MS = 500; // CHANGED: Reduced from 800ms

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
