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
export const TEMPERATURE_STEP = 0.5;
/**
 * Minimum time between API requests in milliseconds
 */
export const MIN_REQUEST_INTERVAL = 2000; // 2 seconds
/**
 * Maximum API requests per minute (to respect rate limits)
 */
export const MAX_REQUESTS_PER_MINUTE = 8; // published limit is 10 - safety margin
/**
 * Default cache validity period in milliseconds
 */
export const DEFAULT_CACHE_VALIDITY_MS = 90000; // 90 seconds
/**
 * Logging levels
 */
export var LogLevel;
(function (LogLevel) {
    LogLevel["NORMAL"] = "normal";
    LogLevel["DEBUG"] = "debug";
    LogLevel["VERBOSE"] = "verbose";
})(LogLevel = LogLevel || (LogLevel = {}));
//# sourceMappingURL=settings.js.map