/**
 * Ultra-Conservative Rate Limiter for SleepMe API
 * Based on extended empirical testing results showing:
 * - Bucket size: 3-4 tokens
 * - Recovery time: 5-30 seconds (variable)
 * - Very aggressive rate limiting behavior
 */
import { RequestPriority } from '../settings.js';
export class UltraConservativeRateLimiter {
    config;
    bucket;
    startupTime;
    requestHistory = [];
    constructor(config = {}) {
        this.config = {
            bucketCapacity: 2,
            refillIntervalMs: 45000,
            maxBurstSize: 2,
            allowCriticalBypass: true,
            emergencyBackoffMs: 120000,
            startupGracePeriodMs: 180000,
            ...config
        };
        this.bucket = {
            tokens: this.config.bucketCapacity,
            lastRefillTime: Date.now(),
            consecutiveFailures: 0,
            emergencyBackoffUntil: 0
        };
        this.startupTime = Date.now();
    }
    /**
     * Check if a request should be allowed
     */
    shouldAllowRequest(priority) {
        const now = Date.now();
        // Always refill tokens first
        this.refillTokens(now);
        // Check for emergency backoff
        if (this.bucket.emergencyBackoffUntil > now) {
            // Only critical requests can bypass emergency backoff
            if (priority === RequestPriority.CRITICAL && this.config.allowCriticalBypass) {
                return {
                    allowed: true,
                    waitTimeMs: 0,
                    reason: 'Critical bypass during emergency backoff',
                    tokensRemaining: this.bucket.tokens,
                    nextRefillTime: this.bucket.lastRefillTime + this.config.refillIntervalMs
                };
            }
            return {
                allowed: false,
                waitTimeMs: this.bucket.emergencyBackoffUntil - now,
                reason: `Emergency backoff (${this.bucket.consecutiveFailures} consecutive failures)`,
                tokensRemaining: this.bucket.tokens,
                nextRefillTime: this.bucket.lastRefillTime + this.config.refillIntervalMs
            };
        }
        // Check if we're in startup grace period
        const inStartupGrace = (now - this.startupTime) < this.config.startupGracePeriodMs;
        // Critical requests can always bypass rate limits (with some restrictions)
        if (priority === RequestPriority.CRITICAL && this.config.allowCriticalBypass) {
            // Even critical requests respect emergency backoff and some limits
            if (this.bucket.consecutiveFailures < 3) {
                return {
                    allowed: true,
                    waitTimeMs: 0,
                    reason: 'Critical request bypass',
                    tokensRemaining: Math.max(0, this.bucket.tokens - 1),
                    nextRefillTime: this.bucket.lastRefillTime + this.config.refillIntervalMs
                };
            }
        }
        // During startup grace period, be slightly more lenient with HIGH priority
        if (inStartupGrace && priority === RequestPriority.HIGH) {
            if (this.bucket.tokens > 0 || this.bucket.consecutiveFailures === 0) {
                return {
                    allowed: true,
                    waitTimeMs: 0,
                    reason: 'Startup grace period - HIGH priority',
                    tokensRemaining: Math.max(0, this.bucket.tokens - 1),
                    nextRefillTime: this.bucket.lastRefillTime + this.config.refillIntervalMs
                };
            }
        }
        // Normal token bucket logic
        if (this.bucket.tokens > 0) {
            return {
                allowed: true,
                waitTimeMs: 0,
                reason: 'Token available',
                tokensRemaining: this.bucket.tokens - 1,
                nextRefillTime: this.bucket.lastRefillTime + this.config.refillIntervalMs
            };
        }
        // No tokens available - calculate wait time
        const waitTime = (this.bucket.lastRefillTime + this.config.refillIntervalMs) - now;
        return {
            allowed: false,
            waitTimeMs: Math.max(0, waitTime),
            reason: 'No tokens available',
            tokensRemaining: 0,
            nextRefillTime: this.bucket.lastRefillTime + this.config.refillIntervalMs
        };
    }
    /**
     * Record the result of a request
     */
    recordRequest(priority, success, rateLimited = false) {
        const now = Date.now();
        // Record in history
        this.requestHistory.push({
            timestamp: now,
            priority,
            success,
            rateLimited
        });
        // Clean old history (keep last 10 minutes)
        this.requestHistory = this.requestHistory.filter(r => r.timestamp > now - 600000);
        // If request was allowed, consume token (except for critical bypass)
        if (success || !rateLimited) {
            if (priority !== RequestPriority.CRITICAL || this.bucket.tokens > 0) {
                this.bucket.tokens = Math.max(0, this.bucket.tokens - 1);
            }
        }
        // Handle rate limiting
        if (rateLimited) {
            this.handleRateLimit();
        }
        else if (success) {
            // Reset consecutive failures on success
            this.bucket.consecutiveFailures = 0;
        }
    }
    /**
     * Handle rate limit response
     */
    handleRateLimit() {
        this.bucket.consecutiveFailures++;
        // Empty the bucket immediately on rate limit
        this.bucket.tokens = 0;
        // Extend refill time based on consecutive failures
        const additionalDelay = this.bucket.consecutiveFailures * 15000; // 15s per failure
        this.bucket.lastRefillTime = Date.now() + additionalDelay;
        // Activate emergency backoff after 3 consecutive failures
        if (this.bucket.consecutiveFailures >= 3) {
            this.bucket.emergencyBackoffUntil = Date.now() + this.config.emergencyBackoffMs;
        }
    }
    /**
     * Refill tokens based on time elapsed
     */
    refillTokens(now) {
        const timeSinceRefill = now - this.bucket.lastRefillTime;
        if (timeSinceRefill >= this.config.refillIntervalMs) {
            // Add one token per refill interval
            const tokensToAdd = Math.floor(timeSinceRefill / this.config.refillIntervalMs);
            this.bucket.tokens = Math.min(this.config.bucketCapacity, this.bucket.tokens + tokensToAdd);
            this.bucket.lastRefillTime = now;
        }
    }
    /**
     * Force refill tokens (for testing or recovery)
     */
    forceRefill() {
        this.bucket.tokens = this.config.bucketCapacity;
        this.bucket.lastRefillTime = Date.now();
        this.bucket.consecutiveFailures = 0;
        this.bucket.emergencyBackoffUntil = 0;
    }
    /**
     * Get current rate limiter status
     */
    getStatus() {
        const now = Date.now();
        const recentRequests = this.requestHistory.filter(r => r.timestamp > now - 60000);
        return {
            tokens: this.bucket.tokens,
            maxTokens: this.config.bucketCapacity,
            nextRefillTime: this.bucket.lastRefillTime + this.config.refillIntervalMs,
            consecutiveFailures: this.bucket.consecutiveFailures,
            emergencyBackoffActive: this.bucket.emergencyBackoffUntil > now,
            emergencyBackoffUntil: this.bucket.emergencyBackoffUntil,
            startupGraceActive: (now - this.startupTime) < this.config.startupGracePeriodMs,
            recentRequests: recentRequests.length,
            recentRateLimits: recentRequests.filter(r => r.rateLimited).length
        };
    }
    /**
     * Get recommendations for optimal usage
     */
    getRecommendations() {
        const status = this.getStatus();
        const recommendations = [];
        if (status.emergencyBackoffActive) {
            recommendations.push('EMERGENCY BACKOFF ACTIVE - System detected consecutive failures');
            recommendations.push('Wait for backoff period to end before making requests');
        }
        if (status.tokens === 0) {
            const waitTime = Math.max(0, status.nextRefillTime - Date.now());
            recommendations.push(`No tokens available - wait ${Math.ceil(waitTime / 1000)}s for refill`);
        }
        if (status.consecutiveFailures > 0) {
            recommendations.push(`${status.consecutiveFailures} consecutive failures - system is being extra cautious`);
        }
        if (status.startupGraceActive) {
            recommendations.push('Startup grace period active - HIGH priority requests have enhanced allowance');
        }
        if (status.recentRateLimits > 0) {
            recommendations.push(`${status.recentRateLimits} rate limits in last minute - consider reducing request frequency`);
        }
        if (status.tokens < status.maxTokens / 2) {
            recommendations.push('Token bucket less than half full - space out requests');
        }
        return recommendations;
    }
    /**
     * Calculate optimal wait time for next request
     */
    getOptimalWaitTime(priority) {
        const decision = this.shouldAllowRequest(priority);
        if (decision.allowed) {
            return 0;
        }
        // Add 10% buffer to wait time
        return Math.ceil(decision.waitTimeMs * 1.1);
    }
}
//# sourceMappingURL=ultra-conservative-rate-limiter.js.map