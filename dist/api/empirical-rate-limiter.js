/**
 * Empirically-derived rate limiter for SleepMe API
 * Based on comprehensive API testing and analysis
 */
import { RequestPriority } from '../settings.js';
export class EmpiricalRateLimiter {
    config;
    requestHistory = [];
    currentMinuteStart;
    requestsThisMinute = 0;
    lastRateLimitTime = 0;
    adaptiveBackoffUntil = 0;
    startupTime;
    constructor(config = {}) {
        this.config = {
            maxRequestsPerMinute: 3,
            useFixedWindow: true,
            safetyMargin: 0.25,
            allowCriticalBypass: true,
            startupGracePeriod: 120000,
            allowHighPriorityStartupBypass: true,
            ...config
        };
        this.currentMinuteStart = this.getCurrentMinuteStart();
        this.startupTime = Date.now();
    }
    /**
     * Check if a request should be allowed
     */
    shouldAllowRequest(priority) {
        const now = Date.now();
        // Update minute window if needed
        this.updateMinuteWindow(now);
        // Check if we're in startup grace period
        const inStartupGracePeriod = (now - this.startupTime) < this.config.startupGracePeriod;
        // Check if we're in adaptive backoff period
        if (this.adaptiveBackoffUntil > now) {
            // Critical requests can bypass adaptive backoff
            if (priority === RequestPriority.CRITICAL && this.config.allowCriticalBypass) {
                return { allowed: true, waitTime: 0, reason: 'Critical bypass during backoff' };
            }
            // HIGH priority requests can bypass backoff during startup grace period
            // BUT NOT if we've had recent rate limit errors (we need to respect the backoff)
            if (priority === RequestPriority.HIGH && inStartupGracePeriod && this.config.allowHighPriorityStartupBypass) {
                // Check if we've had a recent rate limit error - if so, don't bypass
                const recentRateLimitError = this.requestHistory.find(r => r.rateLimited &&
                    r.timestamp > now - 60000 && // Within last minute
                    r.priority === priority);
                if (!recentRateLimitError) {
                    return { allowed: true, waitTime: 0, reason: 'HIGH priority startup grace period bypass' };
                }
            }
            const waitTime = Math.max(0, this.adaptiveBackoffUntil - now);
            return {
                allowed: false,
                waitTime,
                reason: `Adaptive backoff active (${Math.ceil(waitTime / 1000)}s remaining)`
            };
        }
        // Calculate effective limit with safety margin
        let effectiveLimit = Math.floor(this.config.maxRequestsPerMinute * (1 - this.config.safetyMargin));
        // During startup grace period, be more lenient with HIGH priority requests
        // BUT NOT if we've had recent rate limit errors
        if (inStartupGracePeriod && priority === RequestPriority.HIGH && this.config.allowHighPriorityStartupBypass) {
            const recentRateLimitError = this.requestHistory.find(r => r.rateLimited &&
                r.timestamp > now - 60000 && // Within last minute
                r.priority === priority);
            if (!recentRateLimitError) {
                effectiveLimit = Math.max(effectiveLimit, this.config.maxRequestsPerMinute - 1); // Allow up to max-1 during startup
            }
        }
        // Critical requests can bypass normal rate limits
        if (priority === RequestPriority.CRITICAL && this.config.allowCriticalBypass) {
            // Even critical requests should respect some limit to avoid API abuse
            if (this.requestsThisMinute >= this.config.maxRequestsPerMinute + 2) {
                const waitTime = this.timeUntilNextMinute();
                return {
                    allowed: false,
                    waitTime,
                    reason: 'Critical request limit exceeded'
                };
            }
            return { allowed: true, waitTime: 0, reason: 'Critical bypass' };
        }
        // Normal rate limiting
        if (this.requestsThisMinute >= effectiveLimit) {
            const waitTime = this.timeUntilNextMinute();
            const gracePeriodInfo = inStartupGracePeriod ? ' (startup grace period active)' : '';
            return {
                allowed: false,
                waitTime,
                reason: `Rate limit reached (${this.requestsThisMinute}/${effectiveLimit})${gracePeriodInfo}`
            };
        }
        const bypassReason = inStartupGracePeriod && priority === RequestPriority.HIGH ?
            'Startup grace period - HIGH priority' : undefined;
        return { allowed: true, waitTime: 0, reason: bypassReason };
    }
    /**
     * Record a request and its outcome
     */
    recordRequest(priority, success, responseTime, rateLimited = false) {
        const now = Date.now();
        // Update minute window
        this.updateMinuteWindow(now);
        // Record metrics
        const metrics = {
            timestamp: now,
            priority,
            success,
            responseTime,
            rateLimited
        };
        this.requestHistory.push(metrics);
        // Increment counter for non-critical requests
        if (priority !== RequestPriority.CRITICAL || !this.config.allowCriticalBypass) {
            this.requestsThisMinute++;
        }
        // Handle rate limiting
        if (rateLimited) {
            this.handleRateLimit(now, priority);
        }
        // Clean old history (keep last 10 minutes)
        this.cleanOldHistory(now);
    }
    /**
     * Handle rate limit response
     */
    handleRateLimit(timestamp, priority) {
        this.lastRateLimitTime = timestamp;
        // Implement adaptive backoff based on priority
        let backoffTime;
        switch (priority) {
            case RequestPriority.CRITICAL:
                // Short backoff for critical requests
                backoffTime = 5000; // 5 seconds
                break;
            case RequestPriority.HIGH:
                // Medium backoff for high priority
                backoffTime = 15000; // 15 seconds
                break;
            default:
                // Long backoff for normal requests - wait until next minute
                backoffTime = this.timeUntilNextMinute();
                break;
        }
        this.adaptiveBackoffUntil = timestamp + backoffTime;
        // Reset request counter to be conservative
        this.requestsThisMinute = this.config.maxRequestsPerMinute;
    }
    /**
     * Update minute window if needed
     */
    updateMinuteWindow(now) {
        const currentMinute = this.getCurrentMinuteStart();
        if (currentMinute > this.currentMinuteStart) {
            // New minute started
            this.currentMinuteStart = currentMinute;
            this.requestsThisMinute = 0;
            // Clear adaptive backoff if it was due to minute boundary
            if (this.adaptiveBackoffUntil <= now) {
                this.adaptiveBackoffUntil = 0;
            }
        }
    }
    /**
     * Get current minute start timestamp
     */
    getCurrentMinuteStart() {
        const now = Date.now();
        return Math.floor(now / 60000) * 60000;
    }
    /**
     * Calculate time until next minute
     */
    timeUntilNextMinute() {
        const now = Date.now();
        const nextMinute = this.currentMinuteStart + 60000;
        return Math.max(0, nextMinute - now);
    }
    /**
     * Clean old request history
     */
    cleanOldHistory(now) {
        const tenMinutesAgo = now - (10 * 60 * 1000);
        this.requestHistory = this.requestHistory.filter(r => r.timestamp > tenMinutesAgo);
    }
    /**
     * Get current statistics
     */
    getStats() {
        const now = Date.now();
        const recentRequests = this.requestHistory.filter(r => r.timestamp > now - 60000);
        const rateLimitErrors = recentRequests.filter(r => r.rateLimited).length;
        const avgResponseTime = recentRequests.length > 0
            ? recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / recentRequests.length
            : 0;
        const startupGracePeriodActive = (now - this.startupTime) < this.config.startupGracePeriod;
        const startupGracePeriodRemaining = startupGracePeriodActive ?
            this.config.startupGracePeriod - (now - this.startupTime) : 0;
        return {
            requestsThisMinute: this.requestsThisMinute,
            maxRequestsPerMinute: this.config.maxRequestsPerMinute,
            adaptiveBackoffActive: this.adaptiveBackoffUntil > now,
            backoffTimeRemaining: Math.max(0, this.adaptiveBackoffUntil - now),
            recentRateLimitErrors: rateLimitErrors,
            averageResponseTime: avgResponseTime,
            startupGracePeriodActive,
            startupGracePeriodRemaining
        };
    }
    /**
     * Get recommendations for optimizing request patterns
     */
    getRecommendations() {
        const stats = this.getStats();
        const recommendations = [];
        if (stats.startupGracePeriodActive) {
            recommendations.push(`Startup grace period active - ${Math.ceil(stats.startupGracePeriodRemaining / 1000)}s remaining`);
            recommendations.push('HIGH priority requests have enhanced rate limit bypass during startup');
        }
        if (stats.recentRateLimitErrors > 0) {
            recommendations.push('Recent rate limit errors detected - consider increasing request intervals');
        }
        if (stats.requestsThisMinute >= stats.maxRequestsPerMinute * 0.8) {
            recommendations.push('Approaching rate limit - consider delaying non-critical requests');
        }
        if (stats.averageResponseTime > 2000) {
            recommendations.push('High response times detected - API may be under stress');
        }
        if (stats.adaptiveBackoffActive) {
            recommendations.push(`Adaptive backoff active - ${Math.ceil(stats.backoffTimeRemaining / 1000)}s remaining`);
        }
        return recommendations;
    }
}
//# sourceMappingURL=empirical-rate-limiter.js.map