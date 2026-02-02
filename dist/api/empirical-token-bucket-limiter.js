/**
 * Empirical Discrete Window Rate Limiter for SleepMe API
 * Based on live testing revealing TRUE API behavior:
 * - Burst capacity: 0-1 requests maximum
 * - Window behavior: Discrete ~60s windows (NOT token bucket)
 * - Recovery pattern: Success windows followed by rate limit periods
 * - Critical finding: API does NOT use continuous token bucket
 */
import { RequestPriority } from '../settings.js';
export class EmpiricalDiscreteWindowLimiter {
    config;
    state;
    requestHistory = [];
    constructor(config = {}) {
        this.config = {
            // TRUE API PARAMETERS (from live testing)
            windowDurationMs: 60000,
            requestsPerWindow: 1,
            minWindowGapMs: 15000,
            safetyMargin: 0.5,
            // PRIORITY HANDLING
            allowCriticalBypass: true,
            criticalBypassLimit: 1,
            // ADAPTIVE BEHAVIOR
            adaptiveBackoffMultiplier: 2.0,
            maxAdaptiveBackoffMs: 300000,
            ...config
        };
        // Apply safety margin to timing
        const safetyFactor = 1 + this.config.safetyMargin;
        this.config.windowDurationMs = Math.floor(this.config.windowDurationMs * safetyFactor);
        this.config.minWindowGapMs = Math.floor(this.config.minWindowGapMs * safetyFactor);
        // Initialize state with wall-clock aligned windows
        const now = Date.now();
        const wallClockWindowStart = Math.floor(now / this.config.windowDurationMs) * this.config.windowDurationMs;
        this.state = {
            currentWindowStart: wallClockWindowStart,
            requestsInCurrentWindow: 0,
            lastRequestTime: 0,
            consecutiveRateLimits: 0,
            lastRateLimitTime: 0,
            adaptiveBackoffUntil: 0,
            criticalBypassesUsed: 0,
            criticalBypassResetTime: wallClockWindowStart
        };
    }
    /**
     * Check if a request should be allowed based on discrete window limits
     */
    shouldAllowRequest(priority) {
        const now = Date.now();
        // Update current window
        this.updateCurrentWindow(now);
        // Check for adaptive backoff
        if (this.state.adaptiveBackoffUntil > now) {
            if (priority === RequestPriority.CRITICAL && this.canUseCriticalBypass()) {
                this.state.criticalBypassesUsed++;
                return {
                    allowed: true,
                    reason: 'Critical bypass during adaptive backoff',
                    waitTimeMs: 0,
                    requestsRemaining: this.config.requestsPerWindow - this.state.requestsInCurrentWindow,
                    nextWindowTime: this.calculateNextWindowTime(),
                    recommendation: 'Critical request bypassed adaptive backoff'
                };
            }
            const backoffWaitTime = Math.max(0, this.state.adaptiveBackoffUntil - now);
            return {
                allowed: false,
                reason: 'Adaptive backoff active',
                waitTimeMs: backoffWaitTime,
                requestsRemaining: this.config.requestsPerWindow - this.state.requestsInCurrentWindow,
                nextWindowTime: this.calculateNextWindowTime(),
                recommendation: `Wait ${Math.ceil(backoffWaitTime / 1000)}s for adaptive backoff to end`
            };
        }
        // Check minimum gap since last request
        const timeSinceLastRequest = now - this.state.lastRequestTime;
        if (this.state.lastRequestTime > 0 && timeSinceLastRequest < this.config.minWindowGapMs) {
            const waitTime = this.config.minWindowGapMs - timeSinceLastRequest;
            return {
                allowed: false,
                reason: 'Minimum gap not met',
                waitTimeMs: waitTime,
                requestsRemaining: this.config.requestsPerWindow - this.state.requestsInCurrentWindow,
                nextWindowTime: this.calculateNextWindowTime(),
                recommendation: `Wait ${Math.ceil(waitTime / 1000)}s for minimum gap`
            };
        }
        // Check if we have requests available in current window
        if (this.state.requestsInCurrentWindow < this.config.requestsPerWindow) {
            // Reserve the request slot
            this.state.requestsInCurrentWindow++;
            this.state.lastRequestTime = now;
            return {
                allowed: true,
                reason: 'Request slot available in current window',
                waitTimeMs: 0,
                requestsRemaining: this.config.requestsPerWindow - this.state.requestsInCurrentWindow,
                nextWindowTime: this.calculateNextWindowTime(),
                recommendation: 'Request allowed - slot reserved'
            };
        }
        // No slots available - check for critical bypass
        if (priority === RequestPriority.CRITICAL && this.canUseCriticalBypass()) {
            this.state.criticalBypassesUsed++;
            this.state.lastRequestTime = now;
            return {
                allowed: true,
                reason: 'Critical bypass - window full',
                waitTimeMs: 0,
                requestsRemaining: 0,
                nextWindowTime: this.calculateNextWindowTime(),
                recommendation: 'Critical request bypassed full window'
            };
        }
        // Calculate wait time for next window
        const waitTimeMs = this.calculateWaitTimeForNextWindow();
        return {
            allowed: false,
            reason: 'Window request limit reached',
            waitTimeMs,
            requestsRemaining: 0,
            nextWindowTime: this.calculateNextWindowTime(),
            recommendation: `Wait ${Math.ceil(waitTimeMs / 1000)}s for next window`
        };
    }
    /**
     * Record the result of a request
     */
    recordRequest(priority, allowed, rateLimited) {
        const now = Date.now();
        // Record in history
        this.requestHistory.push({
            timestamp: now,
            priority,
            allowed,
            rateLimited,
            requestsInWindow: this.state.requestsInCurrentWindow
        });
        // Clean old history (keep last 10 minutes)
        this.requestHistory = this.requestHistory.filter(r => r.timestamp > now - 600000);
        // Request slots are already reserved in shouldAllowRequest()
        // No need to modify counts here
        // Handle rate limiting
        if (rateLimited) {
            this.handleRateLimit(now);
        }
        else {
            // Reset consecutive rate limits on success
            this.state.consecutiveRateLimits = 0;
        }
    }
    /**
     * Handle rate limit response
     */
    handleRateLimit(now) {
        this.state.consecutiveRateLimits++;
        this.state.lastRateLimitTime = now;
        // Mark current window as exhausted
        this.state.requestsInCurrentWindow = this.config.requestsPerWindow;
        // Calculate adaptive backoff
        const baseBackoff = this.config.windowDurationMs;
        const adaptiveMultiplier = Math.pow(this.config.adaptiveBackoffMultiplier, this.state.consecutiveRateLimits - 1);
        const backoffTime = Math.min(baseBackoff * adaptiveMultiplier, this.config.maxAdaptiveBackoffMs);
        this.state.adaptiveBackoffUntil = now + backoffTime;
        // Force new window after rate limit
        this.state.currentWindowStart = now + backoffTime;
    }
    /**
     * Update current window and reset counters if needed
     * CRITICAL FIX: Align windows to wall clock time (every minute on the minute)
     */
    updateCurrentWindow(now) {
        // Calculate wall-clock aligned window start (every minute on the minute)
        const wallClockWindowStart = Math.floor(now / this.config.windowDurationMs) * this.config.windowDurationMs;
        // Check if we need to start a new window (wall clock aligned)
        if (this.state.currentWindowStart !== wallClockWindowStart) {
            this.state.currentWindowStart = wallClockWindowStart;
            this.state.requestsInCurrentWindow = 0;
        }
        // Reset critical bypass counter per window (also wall clock aligned)
        const bypassWindowStart = Math.floor(now / this.config.windowDurationMs) * this.config.windowDurationMs;
        if (this.state.criticalBypassResetTime < bypassWindowStart) {
            this.state.criticalBypassesUsed = 0;
            this.state.criticalBypassResetTime = bypassWindowStart;
        }
    }
    /**
     * Check if critical bypass can be used
     */
    canUseCriticalBypass() {
        return this.config.allowCriticalBypass &&
            this.state.criticalBypassesUsed < this.config.criticalBypassLimit;
    }
    /**
     * Use a critical bypass slot (called when critical request is about to execute)
     */
    useCriticalBypass() {
        if (this.canUseCriticalBypass()) {
            this.state.criticalBypassesUsed++;
            return true;
        }
        return false;
    }
    /**
     * Calculate wait time for next window
     */
    calculateWaitTimeForNextWindow() {
        const now = Date.now();
        const windowAge = now - this.state.currentWindowStart;
        const timeUntilNextWindow = this.config.windowDurationMs - windowAge;
        return Math.max(0, timeUntilNextWindow);
    }
    /**
     * Calculate when next window will start
     */
    calculateNextWindowTime() {
        return this.state.currentWindowStart + this.config.windowDurationMs;
    }
    /**
     * Get current status
     */
    getStatus() {
        const now = Date.now();
        this.updateCurrentWindow(now);
        const recentRequests = this.requestHistory.filter(r => r.timestamp > now - 60000);
        const recentRateLimits = recentRequests.filter(r => r.rateLimited).length;
        const successRate = recentRequests.length > 0 ?
            recentRequests.filter(r => r.allowed && !r.rateLimited).length / recentRequests.length : 1;
        return {
            requestsInCurrentWindow: this.state.requestsInCurrentWindow,
            maxRequestsPerWindow: this.config.requestsPerWindow,
            windowDurationMs: this.config.windowDurationMs,
            nextWindowTime: this.calculateNextWindowTime(),
            adaptiveBackoffActive: this.state.adaptiveBackoffUntil > now,
            adaptiveBackoffUntil: this.state.adaptiveBackoffUntil,
            consecutiveRateLimits: this.state.consecutiveRateLimits,
            criticalBypassesUsed: this.state.criticalBypassesUsed,
            criticalBypassesRemaining: this.config.criticalBypassLimit - this.state.criticalBypassesUsed,
            recentRequests: recentRequests.length,
            recentRateLimits,
            successRate: successRate * 100
        };
    }
    /**
     * Get recommendations for optimal usage
     */
    getRecommendations() {
        const status = this.getStatus();
        const recommendations = [];
        // Window availability
        if (status.requestsInCurrentWindow >= status.maxRequestsPerWindow) {
            const waitTime = Math.max(0, status.nextWindowTime - Date.now());
            recommendations.push(`Window exhausted - wait ${Math.ceil(waitTime / 1000)}s for next window`);
        }
        // Adaptive backoff
        if (status.adaptiveBackoffActive) {
            const backoffTime = Math.max(0, status.adaptiveBackoffUntil - Date.now());
            recommendations.push(`Adaptive backoff active - wait ${Math.ceil(backoffTime / 1000)}s`);
        }
        // Consecutive failures
        if (status.consecutiveRateLimits > 0) {
            recommendations.push(`${status.consecutiveRateLimits} consecutive rate limits - system is being cautious`);
        }
        // Critical bypasses
        if (status.criticalBypassesUsed > 0) {
            recommendations.push(`${status.criticalBypassesUsed}/${this.config.criticalBypassLimit} critical bypasses used this window`);
        }
        // Success rate
        if (status.successRate < 80) {
            recommendations.push(`Low success rate (${status.successRate.toFixed(1)}%) - requests too frequent`);
        }
        // Optimal timing
        const windowIntervalS = Math.ceil(this.config.windowDurationMs / 1000);
        recommendations.push(`Optimal request interval: ${windowIntervalS}s windows with ${this.config.requestsPerWindow} request each`);
        return recommendations;
    }
    /**
     * Get detailed statistics
     */
    getDetailedStats() {
        const recentRequests = this.requestHistory.filter(r => r.timestamp > Date.now() - 600000);
        const successfulRequests = recentRequests.filter(r => r.allowed && !r.rateLimited).length;
        const rateLimitedRequests = recentRequests.filter(r => r.rateLimited).length;
        return {
            empiricalParameters: {
                windowDurationMs: this.config.windowDurationMs,
                requestsPerWindow: this.config.requestsPerWindow,
                minWindowGapMs: this.config.minWindowGapMs,
                safetyMargin: this.config.safetyMargin
            },
            currentState: { ...this.state },
            performance: {
                totalRequests: recentRequests.length,
                successfulRequests,
                rateLimitedRequests,
                successRate: recentRequests.length > 0 ? (successfulRequests / recentRequests.length) * 100 : 100
            },
            recommendations: this.getRecommendations()
        };
    }
}
//# sourceMappingURL=empirical-token-bucket-limiter.js.map