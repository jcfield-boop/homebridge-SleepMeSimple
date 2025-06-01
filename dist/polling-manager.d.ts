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
    constructor(api: SleepMeApi, logger: Logger, pollingInterval?: number);
    /**
     * Register a device for centralized polling
     */
    registerDevice(device: PollableDevice): void;
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
     * Poll all registered devices in a single batch
     * This is the core optimization - 1 API call per device instead of 2+
     * Enhanced with adaptive polling for active vs inactive devices
     */
    private pollAllDevices;
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
    };
    /**
     * Cleanup when shutting down
     */
    cleanup(): void;
}
