/**
 * Token Bucket Rate Limiting Implementation
 * Based on empirical testing of SleepMe API rate limits
 *
 * Findings:
 * - Burst capacity: 7 tokens
 * - Refill rate: 1 token every 15 seconds
 * - Algorithm: Token bucket (not sliding window)
 */
/**
 * Client-side token bucket implementation to prevent 429 errors
 * Mirrors the server-side rate limiting behavior
 */
export class TokenBucket {
    config;
    logger;
    tokens;
    maxTokens;
    refillRate;
    refillInterval;
    lastRefillTime;
    totalRequests = 0;
    allowedRequests = 0;
    rejectedRequests = 0;
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.maxTokens = config.maxTokens;
        this.refillRate = config.refillRate;
        this.refillInterval = config.refillInterval;
        this.tokens = config.initialTokens ?? config.maxTokens;
        this.lastRefillTime = Date.now();
        this.logger.info(`Token bucket initialized: ${this.maxTokens} tokens, ` +
            `refill ${this.refillRate} every ${this.refillInterval / 1000}s`);
    }
    /**
     * Check if a request is allowed and consume a token if so
     * @param isUserAction Whether this is a user-initiated action (affects logging)
     * @returns true if request is allowed, false if rate limited
     */
    consume(isUserAction = false) {
        this.totalRequests++;
        this.refillTokens();
        const actionType = isUserAction ? 'USER ACTION' : 'background';
        if (this.tokens >= 1) {
            this.tokens -= 1;
            this.allowedRequests++;
            this.logger.verbose(`Token consumed for ${actionType}: ${this.tokens}/${this.maxTokens} remaining`);
            return true;
        }
        else {
            this.rejectedRequests++;
            const nextRefillIn = this.getTimeUntilNextRefill();
            this.logger.warn(`Token bucket empty, rejecting ${actionType} request. ` +
                `Next token in ${Math.ceil(nextRefillIn / 1000)}s`);
            return false;
        }
    }
    /**
     * Check if request would be allowed without consuming token
     * @returns true if request would be allowed
     */
    canConsume() {
        this.refillTokens();
        return this.tokens >= 1;
    }
    /**
     * Reserve tokens for user actions by checking minimum threshold
     * @param reservedTokens Number of tokens to keep reserved
     * @returns true if background request is allowed
     */
    canConsumeBackground(reservedTokens = 2) {
        this.refillTokens();
        return this.tokens > reservedTokens;
    }
    /**
     * Get time until next token refill
     * @returns milliseconds until next refill
     */
    getTimeUntilNextRefill() {
        if (this.tokens >= this.maxTokens) {
            return 0; // Bucket is full
        }
        const timeSinceLastRefill = Date.now() - this.lastRefillTime;
        const timeUntilNextRefill = this.refillInterval - (timeSinceLastRefill % this.refillInterval);
        return Math.max(0, timeUntilNextRefill);
    }
    /**
     * Get current bucket statistics
     * @returns TokenBucketStats object
     */
    getStats() {
        this.refillTokens();
        return {
            tokensAvailable: this.tokens,
            maxTokens: this.maxTokens,
            refillRate: this.refillRate,
            refillInterval: this.refillInterval,
            lastRefillTime: this.lastRefillTime,
            totalRequests: this.totalRequests,
            allowedRequests: this.allowedRequests,
            rejectedRequests: this.rejectedRequests,
            nextRefillIn: this.getTimeUntilNextRefill()
        };
    }
    /**
     * Reset bucket to full capacity (use sparingly, e.g., after long idle periods)
     */
    reset() {
        this.tokens = this.maxTokens;
        this.lastRefillTime = Date.now();
        this.logger.debug(`Token bucket reset to full capacity (${this.maxTokens} tokens)`);
    }
    /**
     * Manually trigger token refill calculation
     * Called automatically by consume() and canConsume()
     */
    refillTokens() {
        const now = Date.now();
        const timeSinceLastRefill = now - this.lastRefillTime;
        // Calculate how many refill intervals have passed
        const refillIntervals = Math.floor(timeSinceLastRefill / this.refillInterval);
        if (refillIntervals > 0) {
            // Add tokens based on intervals passed
            const tokensToAdd = refillIntervals * this.refillRate;
            const oldTokens = this.tokens;
            this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
            this.lastRefillTime = now;
            if (tokensToAdd > 0 && this.tokens > oldTokens) {
                this.logger.verbose(`Token bucket refilled: +${tokensToAdd} tokens ` +
                    `(${oldTokens} → ${this.tokens}/${this.maxTokens})`);
            }
        }
    }
    /**
     * Wait until at least one token is available
     * @param timeout Maximum time to wait in milliseconds
     * @returns Promise that resolves when token is available or timeout
     */
    async waitForToken(timeout = 30000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            if (this.canConsume()) {
                return true;
            }
            const waitTime = Math.min(1000, this.getTimeUntilNextRefill());
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        this.logger.warn(`Token bucket wait timed out after ${timeout / 1000}s`);
        return false;
    }
    /**
     * Get recommended wait time before making a request
     * @param isUserAction Whether this is for a user action
     * @returns milliseconds to wait, or 0 if can proceed immediately
     */
    getRecommendedWaitTime(isUserAction = false) {
        this.refillTokens();
        if (this.tokens >= 1) {
            return 0; // Can proceed immediately
        }
        if (isUserAction) {
            // For user actions, only wait for next token
            return this.getTimeUntilNextRefill();
        }
        else {
            // For background actions, wait longer to keep tokens reserved
            const reserveTokens = 2;
            const tokensNeeded = reserveTokens + 1 - this.tokens;
            return tokensNeeded * this.refillInterval;
        }
    }
    /**
     * Log current bucket status for debugging
     */
    logStatus(context = '') {
        const stats = this.getStats();
        const contextStr = context ? ` [${context}]` : '';
        this.logger.debug(`Token bucket status${contextStr}: ${stats.tokensAvailable}/${stats.maxTokens} tokens, ` +
            `${stats.allowedRequests}/${stats.totalRequests} requests allowed, ` +
            `next refill in ${Math.ceil(stats.nextRefillIn / 1000)}s`);
    }
}
/**
 * Create a token bucket configured for SleepMe API limits
 * Based on empirical testing results
 */
export function createSleepMeTokenBucket(logger) {
    const config = {
        maxTokens: 7,
        refillRate: 1,
        refillInterval: 15000,
        initialTokens: 7 // Start with full bucket
    };
    return new TokenBucket(config, logger);
}
//# sourceMappingURL=token-bucket.js.map