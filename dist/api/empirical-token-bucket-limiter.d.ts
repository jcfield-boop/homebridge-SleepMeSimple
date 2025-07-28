/**
 * Empirical Discrete Window Rate Limiter for SleepMe API
 * Based on live testing revealing TRUE API behavior:
 * - Burst capacity: 0-1 requests maximum
 * - Window behavior: Discrete ~60s windows (NOT token bucket)
 * - Recovery pattern: Success windows followed by rate limit periods
 * - Critical finding: API does NOT use continuous token bucket
 */
import { RequestPriority } from '../settings.js';
export interface EmpiricalDiscreteWindowConfig {
    windowDurationMs: number;
    requestsPerWindow: number;
    minWindowGapMs: number;
    safetyMargin: number;
    allowCriticalBypass: boolean;
    criticalBypassLimit: number;
    adaptiveBackoffMultiplier: number;
    maxAdaptiveBackoffMs: number;
}
export interface DiscreteWindowState {
    currentWindowStart: number;
    requestsInCurrentWindow: number;
    lastRequestTime: number;
    consecutiveRateLimits: number;
    lastRateLimitTime: number;
    adaptiveBackoffUntil: number;
    criticalBypassesUsed: number;
    criticalBypassResetTime: number;
}
export interface RateLimitDecision {
    allowed: boolean;
    reason: string;
    waitTimeMs: number;
    requestsRemaining: number;
    nextWindowTime: number;
    recommendation: string;
}
export declare class EmpiricalDiscreteWindowLimiter {
    private config;
    private state;
    private requestHistory;
    constructor(config?: Partial<EmpiricalDiscreteWindowConfig>);
    /**
     * Check if a request should be allowed based on discrete window limits
     */
    shouldAllowRequest(priority: RequestPriority): RateLimitDecision;
    /**
     * Record the result of a request
     */
    recordRequest(priority: RequestPriority, allowed: boolean, rateLimited: boolean): void;
    /**
     * Handle rate limit response
     */
    private handleRateLimit;
    /**
     * Update current window and reset counters if needed
     */
    private updateCurrentWindow;
    /**
     * Check if critical bypass can be used
     */
    private canUseCriticalBypass;
    /**
     * Use a critical bypass slot (called when critical request is about to execute)
     */
    useCriticalBypass(): boolean;
    /**
     * Calculate wait time for next window
     */
    private calculateWaitTimeForNextWindow;
    /**
     * Calculate when next window will start
     */
    private calculateNextWindowTime;
    /**
     * Get current status
     */
    getStatus(): {
        requestsInCurrentWindow: number;
        maxRequestsPerWindow: number;
        windowDurationMs: number;
        nextWindowTime: number;
        adaptiveBackoffActive: boolean;
        adaptiveBackoffUntil: number;
        consecutiveRateLimits: number;
        criticalBypassesUsed: number;
        criticalBypassesRemaining: number;
        recentRequests: number;
        recentRateLimits: number;
        successRate: number;
    };
    /**
     * Get recommendations for optimal usage
     */
    getRecommendations(): string[];
    /**
     * Get detailed statistics
     */
    getDetailedStats(): {
        empiricalParameters: {
            windowDurationMs: number;
            requestsPerWindow: number;
            minWindowGapMs: number;
            safetyMargin: number;
        };
        currentState: DiscreteWindowState;
        performance: {
            totalRequests: number;
            successfulRequests: number;
            rateLimitedRequests: number;
            successRate: number;
        };
        recommendations: string[];
    };
}
