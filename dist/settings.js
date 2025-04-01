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
 * Increased to better balance API usage with responsiveness
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
 * Provides a safer buffer to prevent rate limiting
 */
export const MIN_REQUEST_INTERVAL = 6000;
/**
 * Maximum API requests per minute (to respect rate limits)
 * More conservative limit to avoid rate limiting
 */
export const MAX_REQUESTS_PER_MINUTE = 10;
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
 */
export const INITIAL_BACKOFF_MS = 30000; // 30 seconds
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
//# sourceMappingURL=settings.js.map