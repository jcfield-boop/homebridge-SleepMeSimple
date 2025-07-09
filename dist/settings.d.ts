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
 * Increased to better balance API usage with responsiveness
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
 * Minimum time between API requests in milliseconds
 * Provides a safer buffer to prevent rate limiting
 */
export declare const MIN_REQUEST_INTERVAL = 6000;
/**
 * Maximum API requests per minute (to respect rate limits)
 * More conservative limit to avoid rate limiting
 */
export declare const MAX_REQUESTS_PER_MINUTE = 10;
/**
 * Default cache validity period in milliseconds
 * Increased for trusted cache entries
 */
export declare const DEFAULT_CACHE_VALIDITY_MS = 600000;
/**
 * Maximum number of retries for API requests
 * Higher priority requests will be retried more times
 */
export declare const MAX_RETRIES = 3;
/**
 * Initial backoff time in milliseconds for rate limiting
 */
export declare const INITIAL_BACKOFF_MS = 30000;
/**
 * Maximum backoff time in milliseconds
 */
export declare const MAX_BACKOFF_MS = 300000;
/**
 * Post-user-action quiet period in milliseconds
 * Increased as we trust API responses more
 */
export declare const USER_ACTION_QUIET_PERIOD_MS = 60000;
/**
 * Command debounce delay in milliseconds
 */
export declare const COMMAND_DEBOUNCE_DELAY_MS = 800;
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
