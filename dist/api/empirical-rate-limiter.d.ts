/**
 * Empirically-derived rate limiter for SleepMe API
 * Based on comprehensive API testing and analysis
 */
import { RequestPriority } from '../settings.js';
export interface EmpiricalRateLimiterConfig {
    maxRequestsPerMinute: number;
    useFixedWindow: boolean;
    safetyMargin: number;
    allowCriticalBypass: boolean;
    startupGracePeriod: number;
    allowHighPriorityStartupBypass: boolean;
}
export interface RequestMetrics {
    timestamp: number;
    priority: RequestPriority;
    success: boolean;
    responseTime: number;
    rateLimited: boolean;
}
export declare class EmpiricalRateLimiter {
    private config;
    private requestHistory;
    private currentMinuteStart;
    private requestsThisMinute;
    private lastRateLimitTime;
    private adaptiveBackoffUntil;
    private startupTime;
    constructor(config?: Partial<EmpiricalRateLimiterConfig>);
    /**
     * Check if a request should be allowed
     */
    shouldAllowRequest(priority: RequestPriority): {
        allowed: boolean;
        waitTime: number;
        reason?: string;
    };
    /**
     * Record a request and its outcome
     */
    recordRequest(priority: RequestPriority, success: boolean, responseTime: number, rateLimited?: boolean): void;
    /**
     * Handle rate limit response
     */
    private handleRateLimit;
    /**
     * Update minute window if needed
     */
    private updateMinuteWindow;
    /**
     * Get current minute start timestamp
     */
    private getCurrentMinuteStart;
    /**
     * Calculate time until next minute
     */
    private timeUntilNextMinute;
    /**
     * Clean old request history
     */
    private cleanOldHistory;
    /**
     * Get current statistics
     */
    getStats(): {
        requestsThisMinute: number;
        maxRequestsPerMinute: number;
        adaptiveBackoffActive: boolean;
        backoffTimeRemaining: number;
        recentRateLimitErrors: number;
        averageResponseTime: number;
        startupGracePeriodActive: boolean;
        startupGracePeriodRemaining: number;
    };
    /**
     * Get recommendations for optimizing request patterns
     */
    getRecommendations(): string[];
}
