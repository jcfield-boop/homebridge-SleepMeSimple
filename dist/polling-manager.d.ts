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
    private activePollingTimer?;
    private pollingActive;
    private currentPollCycle;
    private activeDevices;
    private deviceActivityTimestamps;
    private readonly ACTIVE_DEVICE_POLL_INTERVAL;
    private readonly NORMAL_POLL_INTERVAL;
    private nextActivePolls;
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
     * Start aggressive polling for active devices (10 seconds)
     */
    private startActiveDevicePolling;
    /**
     * Stop aggressive polling for active devices
     */
    private stopActiveDevicePolling;
    /**
     * Validate cached devices are still accessible without consuming fresh API calls
     * Returns devices that respond successfully to cached status requests
     */
    validateCachedDevices(deviceIds: string[]): Promise<string[]>;
    /**
     * Poll only active devices aggressively (every 15 seconds)
     * This provides near real-time updates for devices that are heating/cooling
     */
    private pollActiveDevices;
    /**
     * Poll a single active device
     * @param deviceId Device to poll
     * @param counters Optional counters object for tracking success/error counts
     */
    private pollSingleActiveDevice;
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
     * Check if a user interaction for an active device should trigger immediate poll
     * or can wait for the next scheduled poll (within 3 seconds)
     * @param deviceId Device that had user interaction
     * @returns true if should poll immediately, false if can wait for scheduled poll
     */
    shouldTriggerImmediatePoll(deviceId: string): boolean;
    /**
     * Trigger immediate poll for a specific active device if needed
     * Uses smart joining logic to avoid duplicate polls
     * @param deviceId Device to poll
     */
    triggerDevicePollIfNeeded(deviceId: string): void;
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
