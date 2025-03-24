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
 * Increased from 180 to 240 seconds (4 minutes) to reduce API calls
 */
export const DEFAULT_POLLING_INTERVAL = 90;

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
 * Increased from 5000ms to 10000ms (10 seconds) to help prevent rate limiting
 */
export const MIN_REQUEST_INTERVAL = 7000; 

/**
 * Maximum API requests per minute (to respect rate limits)
 * Decreased from 5 to 4 to provide a larger safety margin
 */
export const MAX_REQUESTS_PER_MINUTE = 5; // published limit is 10, using 4 for safety

/**
 * Default cache validity period in milliseconds
 * Increased from 300000ms to 600000ms (10 minutes) to reduce API calls
 */
export const DEFAULT_CACHE_VALIDITY_MS = 6000;

/**
 * Logging levels
 */
export enum LogLevel {
  NORMAL = 'normal',
  DEBUG = 'debug',
  VERBOSE = 'verbose'
}
