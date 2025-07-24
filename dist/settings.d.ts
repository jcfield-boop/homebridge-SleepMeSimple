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
 * Base rate: 90s for sustained operations (more conservative)
 * Adaptive acceleration during active periods
 */
export declare const DEFAULT_POLLING_INTERVAL = 90;
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
 * Based on empirical testing: 20-25 seconds for reliability
 * Conservative setting for sustained operations
 */
export declare const MIN_REQUEST_INTERVAL = 20000;
/**
 * Maximum API requests per minute (empirically determined through comprehensive testing)
 * Based on 45+ minutes of testing with 70+ requests:
 * - True API limit: 10-token bucket with 1 token per 18-20 seconds
 * - Conservative implementation: 8 tokens with 1 token per 20 seconds = 3 requests/minute
 * - Empirical token bucket provides optimal balance of responsiveness and reliability
 */
export declare const MAX_REQUESTS_PER_MINUTE = 3;
/**
 * Cache validity periods in milliseconds
 */
export declare const DEFAULT_CACHE_VALIDITY_MS = 120000;
export declare const USER_COMMAND_CACHE_VALIDITY_MS = 180000;
export declare const SCHEDULE_CACHE_VALIDITY_MS = 90000;
export declare const ACTIVE_PERIOD_CACHE_VALIDITY_MS = 60000;
/**
 * Maximum number of retries for API requests
 * Higher priority requests will be retried more times
 */
export declare const MAX_RETRIES = 3;
/**
 * Initial backoff time in milliseconds for rate limiting
 * Based on empirical testing: 10 seconds minimum recovery
 */
export declare const INITIAL_BACKOFF_MS = 10000;
/**
 * Maximum backoff time in milliseconds
 */
export declare const MAX_BACKOFF_MS = 300000;
/**
 * Post-user-action quiet period in milliseconds
 * Only applies to user actions, not system/schedule operations
 */
export declare const USER_ACTION_QUIET_PERIOD_MS = 30000;
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
/**
 * Polling intervals for different contexts (in seconds)
 */
export declare const POLLING_INTERVALS: {
    BASE: number;
    ACTIVE: number;
    RESPONSIVE: number;
};
/**
 * Context periods for adaptive polling (in milliseconds)
 */
export declare const POLLING_CONTEXTS: {
    RESPONSIVE_PERIOD: number;
    SCHEDULE_ACTIVE_PERIOD: number;
    STARTUP_PERIOD: number;
};
