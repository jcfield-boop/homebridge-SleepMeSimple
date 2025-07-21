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
  // TRUE API PARAMETERS (from testing)
  bucketCapacity: number;        // 10 tokens max burst
  refillRatePerSecond: number;   // ~0.0667 tokens/second (1 per 15s)
  minRecoveryTimeMs: number;     // 5000ms minimum recovery
  safetyMargin: number;          // Apply safety margin to all parameters
  
  // PRIORITY HANDLING
  allowCriticalBypass: boolean;
  criticalBypassLimit: number;   // Max critical requests during rate limit
  
  // ADAPTIVE BEHAVIOR
  adaptiveBackoffMultiplier: number;  // Increase backoff on consecutive failures
  maxAdaptiveBackoffMs: number;       // Maximum adaptive backoff time
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

export class EmpiricalTokenBucketLimiter {
  private config: EmpiricalTokenBucketConfig;
  private state: TokenBucketState;
  private requestHistory: Array<{
    timestamp: number;
    priority: RequestPriority;
    allowed: boolean;
    rateLimited: boolean;
    tokensAtRequest: number;
  }> = [];

  constructor(config: Partial<EmpiricalTokenBucketConfig> = {}) {
    this.config = {
      // TRUE API PARAMETERS (from comprehensive testing)
      bucketCapacity: 10,                    // Observed max burst
      refillRatePerSecond: 1/15,            // 1 token per 15 seconds
      minRecoveryTimeMs: 5000,              // 5 seconds minimum recovery
      safetyMargin: 0.2,                    // 20% safety margin
      
      // PRIORITY HANDLING
      allowCriticalBypass: true,
      criticalBypassLimit: 3,               // Max 3 critical bypasses during rate limit
      
      // ADAPTIVE BEHAVIOR
      adaptiveBackoffMultiplier: 1.5,       // 50% increase per consecutive failure
      maxAdaptiveBackoffMs: 300000,         // 5 minutes max backoff
      
      ...config
    };

    // Apply safety margin only to bucket capacity, not refill rate
    // This provides safety without unnecessarily slowing recovery
    const safetyFactor = 1 - this.config.safetyMargin;
    this.config.bucketCapacity = Math.floor(this.config.bucketCapacity * safetyFactor);
    // Keep refill rate at full speed for faster recovery
    // this.config.refillRatePerSecond = this.config.refillRatePerSecond * safetyFactor;

    // Initialize state with full bucket
    this.state = {
      tokens: this.config.bucketCapacity,
      lastRefillTime: Date.now(),
      consecutiveRateLimits: 0,
      lastRateLimitTime: 0,
      adaptiveBackoffUntil: 0,
      criticalBypassesUsed: 0,
      criticalBypassResetTime: Date.now()
    };
  }

  /**
   * Check if a request should be allowed and atomically reserve tokens
   */
  public shouldAllowRequest(priority: RequestPriority): RateLimitDecision {
    const now = Date.now();
    
    // Always refill tokens first
    this.refillTokens(now);
    
    // Check for adaptive backoff
    if (this.state.adaptiveBackoffUntil > now) {
      if (priority === RequestPriority.CRITICAL && this.canUseCriticalBypass()) {
        this.state.criticalBypassesUsed++;
        return {
          allowed: true,
          reason: 'Critical bypass during adaptive backoff',
          waitTimeMs: 0,
          tokensRemaining: this.state.tokens,
          nextTokenTime: this.calculateNextTokenTime(),
          recommendation: 'Critical request bypassed adaptive backoff'
        };
      }
      
      return {
        allowed: false,
        reason: 'Adaptive backoff active',
        waitTimeMs: this.state.adaptiveBackoffUntil - now,
        tokensRemaining: this.state.tokens,
        nextTokenTime: this.calculateNextTokenTime(),
        recommendation: `Wait ${Math.ceil((this.state.adaptiveBackoffUntil - now) / 1000)}s for adaptive backoff to end`
      };
    }

    // Check if we have tokens available and atomically reserve one
    if (this.state.tokens >= 1) {
      // Atomically consume the token here to prevent race conditions
      this.state.tokens = Math.max(0, this.state.tokens - 1);
      return {
        allowed: true,
        reason: 'Token available',
        waitTimeMs: 0,
        tokensRemaining: this.state.tokens,
        nextTokenTime: this.calculateNextTokenTime(),
        recommendation: 'Request allowed - token reserved'
      };
    }

    // No tokens available - check for critical bypass
    if (priority === RequestPriority.CRITICAL && this.canUseCriticalBypass()) {
      this.state.criticalBypassesUsed++;
      return {
        allowed: true,
        reason: 'Critical bypass - no tokens',
        waitTimeMs: 0,
        tokensRemaining: 0,
        nextTokenTime: this.calculateNextTokenTime(),
        recommendation: 'Critical request bypassed empty bucket'
      };
    }

    // Calculate wait time for next token
    const waitTimeMs = this.calculateWaitTimeForNextToken();
    
    return {
      allowed: false,
      reason: 'No tokens available',
      waitTimeMs,
      tokensRemaining: 0,
      nextTokenTime: this.calculateNextTokenTime(),
      recommendation: `Wait ${Math.ceil(waitTimeMs / 1000)}s for next token`
    };
  }

  /**
   * Record the result of a request
   */
  public recordRequest(priority: RequestPriority, allowed: boolean, rateLimited: boolean): void {
    const now = Date.now();
    
    // Record in history
    this.requestHistory.push({
      timestamp: now,
      priority,
      allowed,
      rateLimited,
      tokensAtRequest: this.state.tokens
    });

    // Clean old history (keep last 10 minutes)
    this.requestHistory = this.requestHistory.filter(r => r.timestamp > now - 600000);

    // Token consumption now happens in shouldAllowRequest() to prevent race conditions
    // No need to consume tokens here since they were already reserved

    // Handle rate limiting
    if (rateLimited) {
      this.handleRateLimit(now);
    } else {
      // Reset consecutive rate limits on success
      this.state.consecutiveRateLimits = 0;
    }
  }

  /**
   * Handle rate limit response
   */
  private handleRateLimit(now: number): void {
    this.state.consecutiveRateLimits++;
    this.state.lastRateLimitTime = now;
    
    // Empty the bucket immediately
    this.state.tokens = 0;
    
    // Calculate adaptive backoff
    const baseBackoff = this.config.minRecoveryTimeMs;
    const adaptiveMultiplier = Math.pow(
      this.config.adaptiveBackoffMultiplier, 
      this.state.consecutiveRateLimits - 1
    );
    const backoffTime = Math.min(
      baseBackoff * adaptiveMultiplier,
      this.config.maxAdaptiveBackoffMs
    );
    
    this.state.adaptiveBackoffUntil = now + backoffTime;
    
    // Reset refill time to account for backoff
    this.state.lastRefillTime = now + backoffTime;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(now: number): void {
    const timeSinceLastRefill = now - this.state.lastRefillTime;
    
    if (timeSinceLastRefill > 0) {
      // Calculate tokens to add (continuous refill)
      const tokensToAdd = (timeSinceLastRefill / 1000) * this.config.refillRatePerSecond;
      
      if (tokensToAdd > 0) {
        this.state.tokens = Math.min(
          this.config.bucketCapacity,
          this.state.tokens + tokensToAdd
        );
        this.state.lastRefillTime = now;
      }
    }
    
    // Reset critical bypass counter based on API rate limit window (approximately 30-40 seconds)
    // This aligns better with empirical API behavior
    if (now - this.state.criticalBypassResetTime > 35000) {
      this.state.criticalBypassesUsed = 0;
      this.state.criticalBypassResetTime = now;
    }
  }

  /**
   * Check if critical bypass can be used
   */
  private canUseCriticalBypass(): boolean {
    return this.config.allowCriticalBypass && 
           this.state.criticalBypassesUsed < this.config.criticalBypassLimit;
  }

  /**
   * Calculate wait time for next token
   */
  private calculateWaitTimeForNextToken(): number {
    const timeForOneToken = 1000 / this.config.refillRatePerSecond; // ms per token
    const timeSinceLastRefill = Date.now() - this.state.lastRefillTime;
    
    return Math.max(0, timeForOneToken - timeSinceLastRefill);
  }

  /**
   * Calculate when next token will be available
   */
  private calculateNextTokenTime(): number {
    const timeForOneToken = 1000 / this.config.refillRatePerSecond;
    return this.state.lastRefillTime + timeForOneToken;
  }

  /**
   * Get current status
   */
  public getStatus(): {
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
  } {
    const now = Date.now();
    this.refillTokens(now);
    
    const recentRequests = this.requestHistory.filter(r => r.timestamp > now - 60000);
    const recentRateLimits = recentRequests.filter(r => r.rateLimited).length;
    const successRate = recentRequests.length > 0 ? 
      recentRequests.filter(r => r.allowed && !r.rateLimited).length / recentRequests.length : 1;

    return {
      tokens: this.state.tokens,
      maxTokens: this.config.bucketCapacity,
      refillRate: this.config.refillRatePerSecond,
      nextTokenTime: this.calculateNextTokenTime(),
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
  public getRecommendations(): string[] {
    const status = this.getStatus();
    const recommendations: string[] = [];

    // Token availability
    if (status.tokens === 0) {
      const waitTime = Math.max(0, status.nextTokenTime - Date.now());
      recommendations.push(`No tokens available - wait ${Math.ceil(waitTime / 1000)}s for next token`);
    } else if (status.tokens < status.maxTokens * 0.3) {
      recommendations.push('Token bucket low - space out requests');
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
      recommendations.push(`${status.criticalBypassesUsed}/${this.config.criticalBypassLimit} critical bypasses used this minute`);
    }

    // Success rate
    if (status.successRate < 80) {
      recommendations.push(`Low success rate (${status.successRate.toFixed(1)}%) - requests too frequent`);
    }

    // Optimal timing
    const optimalInterval = Math.ceil(1000 / this.config.refillRatePerSecond);
    recommendations.push(`Optimal request interval: ${optimalInterval}s (${this.config.refillRatePerSecond.toFixed(4)} tokens/s)`);

    return recommendations;
  }

  /**
   * Get detailed statistics
   */
  public getDetailedStats(): {
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
  } {
    const recentRequests = this.requestHistory.filter(r => r.timestamp > Date.now() - 600000);
    const successfulRequests = recentRequests.filter(r => r.allowed && !r.rateLimited).length;
    const rateLimitedRequests = recentRequests.filter(r => r.rateLimited).length;

    return {
      empiricalParameters: {
        bucketCapacity: this.config.bucketCapacity,
        refillRatePerSecond: this.config.refillRatePerSecond,
        minRecoveryTimeMs: this.config.minRecoveryTimeMs,
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