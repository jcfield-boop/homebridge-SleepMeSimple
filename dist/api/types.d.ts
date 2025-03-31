/**
 * Type definitions for the SleepMe API
 */
/**
 * Device information returned by the API
 */
export interface Device {
    id: string;
    name: string;
    attachments?: string[];
}
/**
 * Device status information
 */
export interface DeviceStatus {
    currentTemperature: number;
    targetTemperature: number;
    thermalStatus: ThermalStatus;
    powerState: PowerState;
    firmwareVersion?: string;
    connected?: boolean;
    waterLevel?: number;
    isWaterLow?: boolean;
    rawResponse?: Record<string, any>;
}
/**
 * Possible thermal control states
 */
export declare enum ThermalStatus {
    OFF = "off",
    HEATING = "heating",
    COOLING = "cooling",
    ACTIVE = "active",
    STANDBY = "standby",
    UNKNOWN = "unknown"
}
/**
 * Power state of the device
 */
export declare enum PowerState {
    ON = "on",
    OFF = "off",
    UNKNOWN = "unknown"
}
/**
 * Error from the SleepMe API
 */
export interface ApiError {
    status: number;
    message: string;
    code?: string;
    details?: string;
}
/**
 * API request statistics for monitoring
 */
export interface ApiStats {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    lastRequest: Date | null;
    lastError: Error | null;
    averageResponseTime: number;
}
/**
 * Logger interface for standardizing log output
 */
export interface Logger {
    debug(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    verbose(message: string): void;
    isVerbose(): boolean;
    isDebug(): boolean;
}
