/**
 * Plugin settings and constants
 */
/**
 * Platform name used to register the plugin in Homebridge
 */
export declare const PLATFORM_NAME = "SleepMeSimple";
/**
 * Plugin identifier - must match package.json name property
 */
export declare const PLUGIN_NAME = "homebridge-sleepme-simple";
/**
 * SleepMe API base URL
 */
export declare const API_BASE_URL = "https://api.developer.sleep.me/v1";
/**
 * Default polling interval in seconds
 * Increased to avoid rate limiting issues
 */
export declare const DEFAULT_POLLING_INTERVAL = 180;
/**
 * Minimum allowed temperature in Celsius
 */
export declare const MIN_TEMPERATURE_C = 13;
/**
 * Maximum allowed temperature in Celsius
 */
export declare const MAX_TEMPERATURE_C = 46;
/**
 * Default temperature step granularity
 */
export declare const TEMPERATURE_STEP = 1;
/**
 * Minimum time between LOW PRIORITY API requests in milliseconds
 * Only applies to background polling - user interactions bypass this
 */
export declare const MIN_REQUEST_INTERVAL = 3000;
/**
 * Maximum API requests per minute (to respect rate limits)
 * Very conservative limit due to potential shared API usage
 */
export declare const MAX_REQUESTS_PER_MINUTE = 10;
/**
 * Background request threshold - start throttling background requests
 * when we reach this percentage of MAX_REQUESTS_PER_MINUTE
 * This reserves capacity for user interactions
 */
export declare const BACKGROUND_REQUEST_THRESHOLD = 0.8;
/**
 * Default cache validity period in milliseconds
 * Base period for cache entries - will be adjusted based on device state
 */
export declare const DEFAULT_CACHE_VALIDITY_MS = 120000;
/**
 * Maximum number of retries for API requests
 * Higher priority requests will be retried more times
 */
export declare const MAX_RETRIES = 3;
/**
 * Initial backoff time in milliseconds for rate limiting
 * Reduced for critical user interactions
 */
export declare const INITIAL_BACKOFF_MS = 5000;
/**
 * Maximum backoff time in milliseconds
 */
export declare const MAX_BACKOFF_MS = 300000;
/**
 * Post-user-action quiet period in milliseconds
 * Reduced to allow quicker status verification after user actions
 */
export declare const USER_ACTION_QUIET_PERIOD_MS = 30000;
/**
 * Command debounce delay in milliseconds
 * Prevents rapid-fire duplicate commands from users
 */
export declare const COMMAND_DEBOUNCE_DELAY_MS = 500;
/**
 * Logging levels
 */
export declare enum LogLevel {
    NORMAL = "normal",
    DEBUG = "debug",
    VERBOSE = "verbose"
}
/**
 * Request priority levels for more intelligent queue management
 */
export declare enum RequestPriority {
    CRITICAL = "critical",
    HIGH = "high",
    NORMAL = "normal",
    LOW = "low"
}
