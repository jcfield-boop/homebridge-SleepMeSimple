/**
 * Empirically-derived rate limiter for SleepMe API
 * Based on comprehensive API testing and analysis
 */

import { RequestPriority } from '../settings.js';

export interface EmpiricalRateLimiterConfig {
  // Empirically determined: 4 requests per minute maximum
  maxRequestsPerMinute: number;
  // Fixed window aligned to clock minutes
  useFixedWindow: boolean;
  // Conservative safety margin
  safetyMargin: number;
  // Critical request bypass
  allowCriticalBypass: boolean;
}

export interface RequestMetrics {
  timestamp: number;
  priority: RequestPriority;
  success: boolean;
  responseTime: number;
  rateLimited: boolean;
}

export class EmpiricalRateLimiter {
  private config: EmpiricalRateLimiterConfig;
  private requestHistory: RequestMetrics[] = [];
  private currentMinuteStart: number;
  private requestsThisMinute: number = 0;
  private lastRateLimitTime: number = 0;
  private adaptiveBackoffUntil: number = 0;

  constructor(config: Partial<EmpiricalRateLimiterConfig> = {}) {
    this.config = {
      maxRequestsPerMinute: 3, // Conservative: 3 instead of empirical 4
      useFixedWindow: true,
      safetyMargin: 0.25, // 25% safety margin
      allowCriticalBypass: true,
      ...config
    };

    this.currentMinuteStart = this.getCurrentMinuteStart();
  }

  /**
   * Check if a request should be allowed
   */
  public shouldAllowRequest(priority: RequestPriority): {
    allowed: boolean;
    waitTime: number;
    reason?: string;
  } {
    const now = Date.now();
    
    // Update minute window if needed
    this.updateMinuteWindow(now);
    
    // Check if we're in adaptive backoff period
    if (this.adaptiveBackoffUntil > now) {
      // Critical requests can bypass adaptive backoff
      if (priority === RequestPriority.CRITICAL && this.config.allowCriticalBypass) {
        return { allowed: true, waitTime: 0, reason: 'Critical bypass during backoff' };
      }
      
      const waitTime = this.adaptiveBackoffUntil - now;
      return { 
        allowed: false, 
        waitTime, 
        reason: `Adaptive backoff active (${Math.ceil(waitTime / 1000)}s remaining)` 
      };
    }

    // Calculate effective limit with safety margin
    const effectiveLimit = Math.floor(this.config.maxRequestsPerMinute * (1 - this.config.safetyMargin));
    
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
      return { 
        allowed: false, 
        waitTime, 
        reason: `Rate limit reached (${this.requestsThisMinute}/${effectiveLimit})` 
      };
    }

    return { allowed: true, waitTime: 0 };
  }

  /**
   * Record a request and its outcome
   */
  public recordRequest(priority: RequestPriority, success: boolean, responseTime: number, rateLimited: boolean = false): void {
    const now = Date.now();
    
    // Update minute window
    this.updateMinuteWindow(now);
    
    // Record metrics
    const metrics: RequestMetrics = {
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
  private handleRateLimit(timestamp: number, priority: RequestPriority): void {
    this.lastRateLimitTime = timestamp;
    
    // Implement adaptive backoff based on priority
    let backoffTime: number;
    
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
  private updateMinuteWindow(now: number): void {
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
  private getCurrentMinuteStart(): number {
    const now = Date.now();
    return Math.floor(now / 60000) * 60000;
  }

  /**
   * Calculate time until next minute
   */
  private timeUntilNextMinute(): number {
    const now = Date.now();
    const nextMinute = this.currentMinuteStart + 60000;
    return Math.max(0, nextMinute - now);
  }

  /**
   * Clean old request history
   */
  private cleanOldHistory(now: number): void {
    const tenMinutesAgo = now - (10 * 60 * 1000);
    this.requestHistory = this.requestHistory.filter(r => r.timestamp > tenMinutesAgo);
  }

  /**
   * Get current statistics
   */
  public getStats(): {
    requestsThisMinute: number;
    maxRequestsPerMinute: number;
    adaptiveBackoffActive: boolean;
    backoffTimeRemaining: number;
    recentRateLimitErrors: number;
    averageResponseTime: number;
  } {
    const now = Date.now();
    const recentRequests = this.requestHistory.filter(r => r.timestamp > now - 60000);
    const rateLimitErrors = recentRequests.filter(r => r.rateLimited).length;
    const avgResponseTime = recentRequests.length > 0 
      ? recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / recentRequests.length 
      : 0;

    return {
      requestsThisMinute: this.requestsThisMinute,
      maxRequestsPerMinute: this.config.maxRequestsPerMinute,
      adaptiveBackoffActive: this.adaptiveBackoffUntil > now,
      backoffTimeRemaining: Math.max(0, this.adaptiveBackoffUntil - now),
      recentRateLimitErrors: rateLimitErrors,
      averageResponseTime: avgResponseTime
    };
  }

  /**
   * Get recommendations for optimizing request patterns
   */
  public getRecommendations(): string[] {
    const stats = this.getStats();
    const recommendations: string[] = [];

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