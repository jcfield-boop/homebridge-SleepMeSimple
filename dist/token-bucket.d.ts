/**
 * Token Bucket Rate Limiting Implementation
 * Based on empirical testing of SleepMe API rate limits
 *
 * Findings:
 * - Burst capacity: 7 tokens
 * - Refill rate: 1 token every 15 seconds
 * - Algorithm: Token bucket (not sliding window)
 */
import { Logger } from './api/types.js';
export interface TokenBucketConfig {
    maxTokens: number;
    refillRate: number;
    refillInterval: number;
    initialTokens?: number;
}
export interface TokenBucketStats {
    tokensAvailable: number;
    maxTokens: number;
    refillRate: number;
    refillInterval: number;
    lastRefillTime: number;
    totalRequests: number;
    allowedRequests: number;
    rejectedRequests: number;
    nextRefillIn: number;
}
/**
 * Client-side token bucket implementation to prevent 429 errors
 * Mirrors the server-side rate limiting behavior
 */
export declare class TokenBucket {
    private readonly config;
    private readonly logger;
    private tokens;
    private readonly maxTokens;
    private readonly refillRate;
    private readonly refillInterval;
    private lastRefillTime;
    private totalRequests;
    private allowedRequests;
    private rejectedRequests;
    constructor(config: TokenBucketConfig, logger: Logger);
    /**
     * Check if a request is allowed and consume a token if so
     * @param isUserAction Whether this is a user-initiated action (affects logging)
     * @returns true if request is allowed, false if rate limited
     */
    consume(isUserAction?: boolean): boolean;
    /**
     * Check if request would be allowed without consuming token
     * @returns true if request would be allowed
     */
    canConsume(): boolean;
    /**
     * Reserve tokens for user actions by checking minimum threshold
     * @param reservedTokens Number of tokens to keep reserved
     * @returns true if background request is allowed
     */
    canConsumeBackground(reservedTokens?: number): boolean;
    /**
     * Get time until next token refill
     * @returns milliseconds until next refill
     */
    getTimeUntilNextRefill(): number;
    /**
     * Get current bucket statistics
     * @returns TokenBucketStats object
     */
    getStats(): TokenBucketStats;
    /**
     * Reset bucket to full capacity (use sparingly, e.g., after long idle periods)
     */
    reset(): void;
    /**
     * Manually trigger token refill calculation
     * Called automatically by consume() and canConsume()
     */
    private refillTokens;
    /**
     * Wait until at least one token is available
     * @param timeout Maximum time to wait in milliseconds
     * @returns Promise that resolves when token is available or timeout
     */
    waitForToken(timeout?: number): Promise<boolean>;
    /**
     * Get recommended wait time before making a request
     * @param isUserAction Whether this is for a user action
     * @returns milliseconds to wait, or 0 if can proceed immediately
     */
    getRecommendedWaitTime(isUserAction?: boolean): number;
    /**
     * Log current bucket status for debugging
     */
    logStatus(context?: string): void;
}
/**
 * Create a token bucket configured for SleepMe API limits
 * Based on empirical testing results
 */
export declare function createSleepMeTokenBucket(logger: Logger): TokenBucket;
