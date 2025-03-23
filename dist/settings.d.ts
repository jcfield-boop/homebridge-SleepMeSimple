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
 */
export declare const DEFAULT_POLLING_INTERVAL = 120;
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
export declare const TEMPERATURE_STEP = 0.5;
/**
 * Minimum time between API requests in milliseconds
 */
export declare const MIN_REQUEST_INTERVAL = 2000;
/**
 * Maximum API requests per minute (to respect rate limits)
 */
export declare const MAX_REQUESTS_PER_MINUTE = 8;
/**
 * Default cache validity period in milliseconds
 */
export declare const DEFAULT_CACHE_VALIDITY_MS = 90000;
/**
 * Logging levels
 */
export declare enum LogLevel {
    NORMAL = "normal",
    DEBUG = "debug",
    VERBOSE = "verbose"
}
