/**
 * Empirical Token Bucket Rate Limiter for SleepMe API
 * Based on comprehensive 30-minute testing revealing true API behavior:
 * - Burst capacity: 10 tokens
 * - Refill rate: ~1 token per 15 seconds (4 per minute)
 * - Continuous refill (not discrete windows)
 * - 5-second minimum recovery after rate limit
 */
import { RequestPriority } from '../settings.js';
export interface EmpiricalTokenBucketConfig {
    bucketCapacity: number;
    refillRatePerSecond: number;
    minRecoveryTimeMs: number;
    safetyMargin: number;
    allowCriticalBypass: boolean;
    criticalBypassLimit: number;
    adaptiveBackoffMultiplier: number;
    maxAdaptiveBackoffMs: number;
}
export interface TokenBucketState {
    tokens: number;
    lastRefillTime: number;
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
    tokensRemaining: number;
    nextTokenTime: number;
    recommendation: string;
}
export declare class EmpiricalTokenBucketLimiter {
    private config;
    private state;
    private requestHistory;
    constructor(config?: Partial<EmpiricalTokenBucketConfig>);
    /**
     * Check if a request should be allowed and atomically reserve tokens
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
     * Refill tokens based on elapsed time
     */
    private refillTokens;
    /**
     * Check if critical bypass can be used
     */
    private canUseCriticalBypass;
    /**
     * Calculate wait time for next token
     */
    private calculateWaitTimeForNextToken;
    /**
     * Calculate when next token will be available
     */
    private calculateNextTokenTime;
    /**
     * Get current status
     */
    getStatus(): {
        tokens: number;
        maxTokens: number;
        refillRate: number;
        nextTokenTime: number;
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
            bucketCapacity: number;
            refillRatePerSecond: number;
            minRecoveryTimeMs: number;
            safetyMargin: number;
        };
        currentState: TokenBucketState;
        performance: {
            totalRequests: number;
            successfulRequests: number;
            rateLimitedRequests: number;
            successRate: number;
        };
        recommendations: string[];
    };
}
