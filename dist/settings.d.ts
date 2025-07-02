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
 * Reduced to better utilize available API capacity (4 requests/minute sustainable)
 * With context-aware caching, we can poll more frequently without hitting rate limits
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
export declare const TEMPERATURE_STEP = 1;
/**
 * Minimum time between LOW PRIORITY API requests in milliseconds
 * Only applies to background polling - user interactions bypass this
 */
export declare const MIN_REQUEST_INTERVAL = 3000;
/**
 * ACTUAL empirically determined API limits (NOT the documented "10/minute")
 * Based on testing: 7 token bucket, 1 token per 15s = ~4 sustainable requests/minute
 * Documentation claims "10 requests per discrete minute" but real limit is much lower
 */
export declare const MAX_REQUESTS_PER_MINUTE = 4;
/**
 * Background request threshold - start throttling background requests
 * when we reach this percentage of MAX_REQUESTS_PER_MINUTE
 * This reserves capacity for user interactions
 */
export declare const BACKGROUND_REQUEST_THRESHOLD = 0.8;
/**
 * Cache validity periods for different contexts (in milliseconds)
 * Optimized for available API capacity (4 requests/minute sustainable)
 */
export declare const CACHE_USER_ACTIVE = 60000;
export declare const CACHE_DEVICE_ACTIVE = 90000;
export declare const CACHE_NORMAL = 180000;
export declare const CACHE_IDLE = 300000;
export declare const CACHE_RECOVERY = 600000;
/**
 * Default cache validity period in milliseconds
 * Reduced to 3 minutes to better utilize available API capacity
 */
export declare const DEFAULT_CACHE_VALIDITY_MS = 180000;
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
export declare const USER_ACTION_QUIET_PERIOD_MS = 15000;
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
/**
 * HomeKit interface modes
 */
export declare enum InterfaceMode {
    SWITCH = "switch",
    THERMOSTAT = "thermostat",
    HYBRID = "hybrid"
}
/**
 * Default interface mode - hybrid provides best user experience
 */
export declare const DEFAULT_INTERFACE_MODE = InterfaceMode.HYBRID;
/**
 * Enable individual schedule switches by default
 */
export declare const DEFAULT_SHOW_INDIVIDUAL_SCHEDULES = true;
/**
 * Enable warm hug feature by default
 */
export declare const DEFAULT_ENABLE_WARM_HUG = true;
