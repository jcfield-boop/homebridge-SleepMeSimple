/**
 * Centralized polling manager that batches device status requests
 * Significantly reduces API call overhead from N×2 to N calls per cycle
 */
export class PollingManager {
    api;
    logger;
    pollingInterval;
    devices = new Map();
    pollingTimer;
    pollingActive = false;
    currentPollCycle = 0;
    activeDevices = new Set(); // Track which devices are currently active
    deviceActivityTimestamps = new Map(); // Track when devices became active
    constructor(api, logger, pollingInterval = 60000 // Default 60s
    ) {
        this.api = api;
        this.logger = logger;
        this.pollingInterval = pollingInterval;
    }
    /**
     * Register a device for centralized polling
     */
    registerDevice(device) {
        this.devices.set(device.deviceId, device);
        this.logger.debug(`Registered device ${device.deviceId} for centralized polling`);
        // Start polling if this is the first device
        if (this.devices.size === 1 && !this.pollingActive) {
            this.startPolling();
        }
    }
    /**
     * Notify that a device is now active (heating/cooling)
     * Active devices get more frequent polling for progress monitoring
     */
    notifyDeviceActive(deviceId) {
        if (!this.activeDevices.has(deviceId)) {
            this.activeDevices.add(deviceId);
            this.deviceActivityTimestamps.set(deviceId, Date.now());
            this.logger.debug(`Device ${deviceId} marked as active - will poll more frequently`);
        }
    }
    /**
     * Notify that a device is now inactive (standby/off)
     */
    notifyDeviceInactive(deviceId) {
        if (this.activeDevices.has(deviceId)) {
            this.activeDevices.delete(deviceId);
            this.deviceActivityTimestamps.delete(deviceId);
            this.logger.debug(`Device ${deviceId} marked as inactive - returning to normal polling`);
        }
    }
    /**
     * Unregister a device from polling
     */
    unregisterDevice(deviceId) {
        this.devices.delete(deviceId);
        this.activeDevices.delete(deviceId);
        this.deviceActivityTimestamps.delete(deviceId);
        this.logger.debug(`Unregistered device ${deviceId} from centralized polling`);
        // Stop polling if no devices remain
        if (this.devices.size === 0) {
            this.stopPolling();
        }
    }
    /**
     * Start the centralized polling cycle
     */
    startPolling() {
        if (this.pollingActive)
            return;
        this.pollingActive = true;
        this.logger.info(`Starting centralized polling for ${this.devices.size} devices every ${this.pollingInterval / 1000}s`);
        // Start polling after initial device status fetches complete to avoid rate limiting collision
        setTimeout(() => this.pollAllDevices(), 5000); // 5 seconds after discovery
        // Set up regular polling
        this.pollingTimer = setInterval(() => {
            this.pollAllDevices();
        }, this.pollingInterval);
    }
    /**
     * Stop the polling cycle
     */
    stopPolling() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = undefined;
        }
        this.pollingActive = false;
        this.logger.info('Stopped centralized polling');
    }
    /**
     * Validate cached devices are still accessible without consuming fresh API calls
     * Returns devices that respond successfully to cached status requests
     */
    async validateCachedDevices(deviceIds) {
        this.logger.info(`Validating ${deviceIds.length} cached devices...`);
        const validDevices = [];
        for (const deviceId of deviceIds) {
            try {
                // Use cached status check only - no fresh API calls during startup validation
                const status = await this.api.getDeviceStatus(deviceId, false);
                if (status) {
                    validDevices.push(deviceId);
                    this.logger.verbose(`Cached device ${deviceId} validated successfully`);
                }
                else {
                    this.logger.warn(`Cached device ${deviceId} has no cached status, may need rediscovery`);
                }
            }
            catch (error) {
                this.logger.warn(`Cached device ${deviceId} validation failed: ${error}`);
            }
            // Small delay between validation checks
            if (deviceIds.length > 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        this.logger.info(`${validDevices.length}/${deviceIds.length} cached devices validated`);
        return validDevices;
    }
    /**
     * Poll all registered devices in a single batch
     * This is the core optimization - 1 API call per device instead of 2+
     * Enhanced with adaptive polling for active vs inactive devices
     */
    async pollAllDevices() {
        if (this.devices.size === 0)
            return;
        this.currentPollCycle++;
        this.logger.verbose(`Starting poll cycle ${this.currentPollCycle} for ${this.devices.size} devices`);
        const startTime = Date.now();
        let successCount = 0;
        let errorCount = 0;
        let activeDeviceCount = 0;
        let freshCallCount = 0;
        // Clean up stale active devices (active for more than 30 minutes)
        this.cleanupStaleActiveDevices();
        // Process devices sequentially to respect rate limits
        for (const [deviceId, device] of this.devices) {
            try {
                const isActiveDevice = this.activeDevices.has(deviceId);
                // With improved API utilization, we can poll every cycle
                // Context-aware caching in the API client handles the optimization
                let shouldForceFresh = false;
                if (isActiveDevice) {
                    // Active devices: force fresh every cycle for progress monitoring
                    shouldForceFresh = true;
                }
                else {
                    // Inactive devices: force fresh every 2nd cycle for external change detection
                    shouldForceFresh = (this.currentPollCycle % 2 === 0);
                }
                const status = await this.api.getDeviceStatus(deviceId, shouldForceFresh);
                if (status) {
                    device.onStatusUpdate(status);
                    successCount++;
                    // Track active devices for logging and auto-cleanup inactive ones
                    const isActive = status.powerState === 'on' &&
                        (status.thermalStatus === 'active' ||
                            status.thermalStatus === 'heating' ||
                            status.thermalStatus === 'cooling');
                    if (isActive) {
                        activeDeviceCount++;
                        // Auto-mark device as active if we detect it's running
                        if (!this.activeDevices.has(deviceId)) {
                            this.notifyDeviceActive(deviceId);
                        }
                    }
                    else {
                        // Auto-mark device as inactive if we detect it's not running
                        if (this.activeDevices.has(deviceId)) {
                            this.notifyDeviceInactive(deviceId);
                        }
                    }
                    if (shouldForceFresh)
                        freshCallCount++;
                }
                else {
                    // Null response is likely due to queue backlog or rate limiting - this is intentional, not an error
                    // We'll just skip this poll cycle and try again next time
                    this.logger.verbose(`Skipped poll for device ${deviceId} (queue backlog or rate limiting)`);
                }
                // Small delay between devices to be gentle on the API
                if (this.devices.size > 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            catch (error) {
                errorCount++;
                const errorObj = error instanceof Error ? error : new Error(String(error));
                device.onError(errorObj);
                this.logger.error(`Poll error for device ${deviceId}: ${errorObj.message}`);
            }
        }
        const duration = Date.now() - startTime;
        this.logger.info(`Poll cycle ${this.currentPollCycle} completed: ${successCount} success, ${errorCount} errors ` +
            `(${duration}ms) [${activeDeviceCount} active, ${freshCallCount} fresh calls]`);
    }
    /**
     * Clean up devices that have been marked active for too long
     * Prevents active devices from staying in aggressive polling mode indefinitely
     */
    cleanupStaleActiveDevices() {
        const now = Date.now();
        const ACTIVE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
        for (const [deviceId, timestamp] of this.deviceActivityTimestamps) {
            if (now - timestamp > ACTIVE_TIMEOUT) {
                this.logger.debug(`Device ${deviceId} has been active for over 30 minutes, returning to normal polling`);
                this.notifyDeviceInactive(deviceId);
            }
        }
    }
    /**
     * Trigger an immediate poll for all devices
     */
    triggerImmediatePoll() {
        if (this.devices.size > 0) {
            this.logger.debug('Triggering immediate poll for all devices');
            this.pollAllDevices();
        }
    }
    /**
     * Get polling statistics
     */
    getStats() {
        return {
            deviceCount: this.devices.size,
            cycleCount: this.currentPollCycle,
            isActive: this.pollingActive,
            activeDevices: this.activeDevices.size
        };
    }
    /**
     * Cleanup when shutting down
     */
    cleanup() {
        this.stopPolling();
        this.devices.clear();
        this.activeDevices.clear();
        this.deviceActivityTimestamps.clear();
        this.logger.info('Polling manager cleaned up');
    }
    /**
     * Get the set of currently active devices
     */
    getActiveDevices() {
        return new Set(this.activeDevices);
    }
    /**
     * Check if a specific device is marked as active
     */
    isDeviceActive(deviceId) {
        return this.activeDevices.has(deviceId);
    }
}
//# sourceMappingURL=polling-manager.js.map