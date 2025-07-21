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
 * Base rate: 60s (1 request/minute) for sustained operations
 * Adaptive acceleration during active periods
 */
export const DEFAULT_POLLING_INTERVAL = 60;
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
 * Cache validity periods in milliseconds
 */
export const DEFAULT_CACHE_VALIDITY_MS = 120000; // 2 minutes base
export const USER_COMMAND_CACHE_VALIDITY_MS = 180000; // 3 minutes for user commands
export const SCHEDULE_CACHE_VALIDITY_MS = 90000; // 1.5 minutes for schedule operations
export const ACTIVE_PERIOD_CACHE_VALIDITY_MS = 60000; // 1 minute during active periods
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
 * Only applies to user actions, not system/schedule operations
 */
export const USER_ACTION_QUIET_PERIOD_MS = 30000; // 30 seconds
/**
 * Command debounce delay in milliseconds
 */
export const COMMAND_DEBOUNCE_DELAY_MS = 800; // 800ms
/**
 * Logging levels
 */
export var LogLevel;
(function (LogLevel) {
    LogLevel["NORMAL"] = "normal";
    LogLevel["DEBUG"] = "debug";
    LogLevel["VERBOSE"] = "verbose";
})(LogLevel = LogLevel || (LogLevel = {}));
/**
 * Request priority levels for more intelligent queue management
 */
export var RequestPriority;
(function (RequestPriority) {
    RequestPriority["CRITICAL"] = "critical";
    RequestPriority["HIGH"] = "high";
    RequestPriority["NORMAL"] = "normal";
    RequestPriority["LOW"] = "low"; // Background operations
})(RequestPriority = RequestPriority || (RequestPriority = {}));
/**
 * HomeKit interface modes
 */
export var InterfaceMode;
(function (InterfaceMode) {
    InterfaceMode["SWITCH"] = "switch";
    InterfaceMode["THERMOSTAT"] = "thermostat";
    InterfaceMode["HYBRID"] = "hybrid"; // Power switch + temperature control + schedules
})(InterfaceMode = InterfaceMode || (InterfaceMode = {}));
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
/**
 * Polling intervals for different contexts (in seconds)
 */
export const POLLING_INTERVALS = {
    BASE: 60,
    ACTIVE: 30,
    RESPONSIVE: 20 // After user commands (brief period)
};
/**
 * Context periods for adaptive polling (in milliseconds)
 */
export const POLLING_CONTEXTS = {
    RESPONSIVE_PERIOD: 120000,
    SCHEDULE_ACTIVE_PERIOD: 300000,
    STARTUP_PERIOD: 180000 // 3 minutes of more frequent polling at startup
};
//# sourceMappingURL=settings.js.map