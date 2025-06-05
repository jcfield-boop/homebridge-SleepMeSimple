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
     * Unregister a device from polling
     */
    unregisterDevice(deviceId) {
        this.devices.delete(deviceId);
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
        // Initial poll after short delay
        setTimeout(() => this.pollAllDevices(), 5000);
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
        // Process devices sequentially to respect rate limits
        for (const [deviceId, device] of this.devices) {
            try {
                // Check if we should force fresh data for potentially active devices
                // Every 5th cycle, force fresh data for better temperature tracking (reduced frequency)
                const shouldForceFresh = (this.currentPollCycle % 5 === 0);
                const status = await this.api.getDeviceStatus(deviceId, shouldForceFresh);
                if (status) {
                    device.onStatusUpdate(status);
                    successCount++;
                    // Track active devices for logging
                    const isActive = status.powerState === 'on' &&
                        (status.thermalStatus === 'active' ||
                            status.thermalStatus === 'heating' ||
                            status.thermalStatus === 'cooling');
                    if (isActive)
                        activeDeviceCount++;
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
                    await new Promise(resolve => setTimeout(resolve, 1000));
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
            isActive: this.pollingActive
        };
    }
    /**
     * Cleanup when shutting down
     */
    cleanup() {
        this.stopPolling();
        this.devices.clear();
        this.logger.info('Polling manager cleaned up');
    }
}
//# sourceMappingURL=polling-manager.js.map