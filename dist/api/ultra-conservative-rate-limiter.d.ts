/**
 * Ultra-Conservative Rate Limiter for SleepMe API
 * Based on extended empirical testing results showing:
 * - Bucket size: 3-4 tokens
 * - Recovery time: 5-30 seconds (variable)
 * - Very aggressive rate limiting behavior
 */
import { RequestPriority } from '../settings.js';
export interface UltraConservativeRateLimiterConfig {
    bucketCapacity: number;
    refillIntervalMs: number;
    maxBurstSize: number;
    allowCriticalBypass: boolean;
    emergencyBackoffMs: number;
    startupGracePeriodMs: number;
}
export interface TokenBucket {
    tokens: number;
    lastRefillTime: number;
    consecutiveFailures: number;
    emergencyBackoffUntil: number;
}
export interface RequestDecision {
    allowed: boolean;
    waitTimeMs: number;
    reason: string;
    tokensRemaining: number;
    nextRefillTime: number;
}
export declare class UltraConservativeRateLimiter {
    private config;
    private bucket;
    private startupTime;
    private requestHistory;
    constructor(config?: Partial<UltraConservativeRateLimiterConfig>);
    /**
     * Check if a request should be allowed
     */
    shouldAllowRequest(priority: RequestPriority): RequestDecision;
    /**
     * Record the result of a request
     */
    recordRequest(priority: RequestPriority, success: boolean, rateLimited?: boolean): void;
    /**
     * Handle rate limit response
     */
    private handleRateLimit;
    /**
     * Refill tokens based on time elapsed
     */
    private refillTokens;
    /**
     * Force refill tokens (for testing or recovery)
     */
    forceRefill(): void;
    /**
     * Get current rate limiter status
     */
    getStatus(): {
        tokens: number;
        maxTokens: number;
        nextRefillTime: number;
        consecutiveFailures: number;
        emergencyBackoffActive: boolean;
        emergencyBackoffUntil: number;
        startupGraceActive: boolean;
        recentRequests: number;
        recentRateLimits: number;
    };
    /**
     * Get recommendations for optimal usage
     */
    getRecommendations(): string[];
    /**
     * Calculate optimal wait time for next request
     */
    getOptimalWaitTime(priority: RequestPriority): number;
}
