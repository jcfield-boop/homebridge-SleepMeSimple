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
 * Based on empirical testing: 7 tokens max, 1 token per 15s = ~4 requests/minute sustainable
 * Ultra-conservative to prevent 429 errors
 */
export const DEFAULT_POLLING_INTERVAL = 300; // 5 minutes - much safer for real rate limits
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
 * Default cache validity period in milliseconds
 * Extended significantly due to empirical rate limits (7 tokens, 15s refill)
 * Better to show cached data than trigger 429 errors
 */
export const DEFAULT_CACHE_VALIDITY_MS = 480000; // 8 minutes - aggressive caching for rate limits
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
//# sourceMappingURL=settings.js.map