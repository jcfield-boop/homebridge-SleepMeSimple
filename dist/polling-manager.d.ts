/**
 * Centralized polling manager to optimize API usage
 * Reduces N individual polls to 1 batch poll per cycle
 */
import { SleepMeApi } from './api/sleepme-api.js';
import { Logger } from './api/types.js';
export interface PollableDevice {
    deviceId: string;
    onStatusUpdate: (status: any) => void;
    onError: (error: Error) => void;
    onValidationFailure?: (deviceId: string) => void;
}
/**
 * Centralized polling manager that batches device status requests
 * Significantly reduces API call overhead from N×2 to N calls per cycle
 */
export declare class PollingManager {
    private readonly api;
    private readonly logger;
    private readonly pollingInterval;
    private devices;
    private pollingTimer?;
    private pollingActive;
    private currentPollCycle;
    private activeDevices;
    private deviceActivityTimestamps;
    constructor(api: SleepMeApi, logger: Logger, pollingInterval?: number);
    /**
     * Register a device for centralized polling
     */
    registerDevice(device: PollableDevice): void;
    /**
     * Notify that a device is now active (heating/cooling)
     * Active devices get more frequent polling for progress monitoring
     */
    notifyDeviceActive(deviceId: string): void;
    /**
     * Notify that a device is now inactive (standby/off)
     */
    notifyDeviceInactive(deviceId: string): void;
    /**
     * Unregister a device from polling
     */
    unregisterDevice(deviceId: string): void;
    /**
     * Start the centralized polling cycle
     */
    private startPolling;
    /**
     * Stop the polling cycle
     */
    private stopPolling;
    /**
     * Validate cached devices are still accessible without consuming fresh API calls
     * Returns devices that respond successfully to cached status requests
     */
    validateCachedDevices(deviceIds: string[]): Promise<string[]>;
    /**
     * Poll all registered devices in a single batch
     * This is the core optimization - 1 API call per device instead of 2+
     * Enhanced with adaptive polling for active vs inactive devices
     */
    private pollAllDevices;
    /**
     * Clean up devices that have been marked active for too long
     * Prevents active devices from staying in aggressive polling mode indefinitely
     */
    private cleanupStaleActiveDevices;
    /**
     * Trigger an immediate poll for all devices
     */
    triggerImmediatePoll(): void;
    /**
     * Get polling statistics
     */
    getStats(): {
        deviceCount: number;
        cycleCount: number;
        isActive: boolean;
        activeDevices: number;
    };
    /**
     * Cleanup when shutting down
     */
    cleanup(): void;
    /**
     * Get the set of currently active devices
     */
    getActiveDevices(): Set<string>;
    /**
     * Check if a specific device is marked as active
     */
    isDeviceActive(deviceId: string): boolean;
}
