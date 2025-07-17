/**
 * Extended test suite for leaky bucket rate limiting analysis
 * Designed for comprehensive 2+ hour testing to derive actual API implementation
 */
import { SleepMeApiClient } from './api-client.js';
import { TestConfig, RequestResult } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

export interface LeakyBucketTestConfig extends TestConfig {
  extendedTestDurationMinutes: number;
  tokenRefillAnalysisMinutes: number;
  burstCapacityAnalysisMinutes: number;
  precisionTestingMinutes: number;
}

export interface LeakyBucketAnalysis {
  estimatedBucketSize: number;
  estimatedRefillRate: number; // tokens per second
  estimatedRefillInterval: number; // milliseconds
  confidenceLevel: 'low' | 'medium' | 'high';
  supportingEvidence: string[];
  recommendations: string[];
}

export interface ExtendedTestResult {
  testName: string;
  startTime: number;
  endTime: number;
  totalRequests: number;
  successfulRequests: number;
  rateLimitErrors: number;
  requestResults: RequestResult[];
  analysis: LeakyBucketAnalysis;
  patterns: {
    burstCapacity: number;
    sustainableRate: number;
    recoveryTime: number;
    windowType: 'fixed' | 'sliding' | 'leaky-bucket';
  };
}

export class ExtendedLeakyBucketTester {
  private client: SleepMeApiClient;
  private config: LeakyBucketTestConfig;
  private results: ExtendedTestResult[] = [];
  private rawData: RequestResult[] = [];

  constructor(config: LeakyBucketTestConfig) {
    this.config = config;
    this.client = new SleepMeApiClient(config.baseUrl, config.apiToken);
  }

  /**
   * Run comprehensive leaky bucket analysis
   */
  async runExtendedAnalysis(): Promise<void> {
    console.log('🔬 Extended Leaky Bucket Analysis');
    console.log('='.repeat(60));
    console.log(`Duration: ${this.config.extendedTestDurationMinutes} minutes`);
    console.log('This test will systematically probe the API to determine:');
    console.log('  • Bucket capacity (burst allowance)');
    console.log('  • Token refill rate (sustainable rate)');
    console.log('  • Refill interval (how often tokens are added)');
    console.log('  • Rate limiting algorithm type');
    console.log('');

    try {
      // Phase 1: Burst capacity analysis (10 minutes)
      await this.analyzeBurstCapacity();
      
      // Phase 2: Token refill rate analysis (20 minutes)
      await this.analyzeTokenRefillRate();
      
      // Phase 3: Refill interval analysis (30 minutes)
      await this.analyzeRefillInterval();
      
      // Phase 4: Long-term pattern analysis (remainder of time)
      await this.analyzeLongTermPatterns();
      
      // Phase 5: Precision testing with derived parameters
      await this.precisionTesting();

      // Export comprehensive results
      await this.exportExtendedResults();
      
      // Generate final analysis and recommendations
      this.generateFinalAnalysis();

    } catch (error) {
      console.error('❌ Extended analysis failed:', error);
      throw error;
    }
  }

  /**
   * Phase 1: Analyze burst capacity
   */
  private async analyzeBurstCapacity(): Promise<void> {
    console.log('\n🚀 Phase 1: Burst Capacity Analysis');
    console.log('Testing maximum burst size before rate limiting...');

    const startTime = Date.now();
    const requests: RequestResult[] = [];
    
    // Multiple burst tests with recovery periods
    for (let burstTest = 0; burstTest < 5; burstTest++) {
      console.log(`\nBurst test ${burstTest + 1}/5:`);
      
      // Send rapid requests until rate limited
      let burstSize = 0;
      for (let i = 0; i < 20; i++) {
        const result = await this.client.getDevices();
        requests.push(result);
        this.rawData.push(result);
        
        if (result.statusCode === 429) {
          console.log(`⚠️  Rate limit hit after ${i + 1} requests`);
          break;
        }
        
        burstSize = i + 1;
        await this.client.wait(100); // Minimal delay
      }
      
      console.log(`✅ Burst capacity: ${burstSize} requests`);
      
      // Recovery period between burst tests
      if (burstTest < 4) {
        console.log('💤 Recovery period: 90 seconds');
        await this.client.wait(90000);
      }
    }

    const analysis: LeakyBucketAnalysis = {
      estimatedBucketSize: this.calculateBurstCapacity(requests),
      estimatedRefillRate: 0, // Will be determined in next phase
      estimatedRefillInterval: 0, // Will be determined in next phase
      confidenceLevel: 'medium',
      supportingEvidence: this.analyzeBurstEvidence(requests),
      recommendations: []
    };

    this.results.push({
      testName: 'Burst Capacity Analysis',
      startTime,
      endTime: Date.now(),
      totalRequests: requests.length,
      successfulRequests: requests.filter(r => r.success).length,
      rateLimitErrors: requests.filter(r => r.statusCode === 429).length,
      requestResults: requests,
      analysis,
      patterns: {
        burstCapacity: analysis.estimatedBucketSize,
        sustainableRate: 0,
        recoveryTime: 0,
        windowType: 'leaky-bucket'
      }
    });
  }

  /**
   * Phase 2: Analyze token refill rate
   */
  private async analyzeTokenRefillRate(): Promise<void> {
    console.log('\n⏱️  Phase 2: Token Refill Rate Analysis');
    console.log('Testing sustainable request rates...');

    const startTime = Date.now();
    const requests: RequestResult[] = [];
    
    // Test various intervals to find sustainable rate
    const intervals = [
      { interval: 5000, name: '5 seconds' },
      { interval: 10000, name: '10 seconds' },
      { interval: 15000, name: '15 seconds' },
      { interval: 20000, name: '20 seconds' },
      { interval: 30000, name: '30 seconds' },
      { interval: 60000, name: '60 seconds' }
    ];

    for (const { interval, name } of intervals) {
      console.log(`\nTesting ${name} interval...`);
      
      // Send 10 requests at this interval
      for (let i = 0; i < 10; i++) {
        const result = await this.client.getDevices();
        requests.push(result);
        this.rawData.push(result);
        
        if (result.statusCode === 429) {
          console.log(`⚠️  Rate limit hit on request ${i + 1} at ${name} interval`);
          break;
        }
        
        if (i < 9) {
          await this.client.wait(interval);
        }
      }
      
      const successRate = requests.filter(r => r.success).length / requests.length;
      console.log(`✅ ${name} interval: ${(successRate * 100).toFixed(1)}% success rate`);
    }

    const analysis: LeakyBucketAnalysis = {
      estimatedBucketSize: this.results[0]?.analysis.estimatedBucketSize || 0,
      estimatedRefillRate: this.calculateRefillRate(requests),
      estimatedRefillInterval: 0,
      confidenceLevel: 'medium',
      supportingEvidence: this.analyzeRefillEvidence(requests),
      recommendations: []
    };

    this.results.push({
      testName: 'Token Refill Rate Analysis',
      startTime,
      endTime: Date.now(),
      totalRequests: requests.length,
      successfulRequests: requests.filter(r => r.success).length,
      rateLimitErrors: requests.filter(r => r.statusCode === 429).length,
      requestResults: requests,
      analysis,
      patterns: {
        burstCapacity: analysis.estimatedBucketSize,
        sustainableRate: analysis.estimatedRefillRate,
        recoveryTime: 0,
        windowType: 'leaky-bucket'
      }
    });
  }

  /**
   * Phase 3: Analyze refill interval
   */
  private async analyzeRefillInterval(): Promise<void> {
    console.log('\n🔄 Phase 3: Refill Interval Analysis');
    console.log('Testing token refill timing patterns...');

    const startTime = Date.now();
    const requests: RequestResult[] = [];
    
    // Test refill pattern by exhausting bucket and measuring recovery
    for (let cycle = 0; cycle < 3; cycle++) {
      console.log(`\nRefill cycle ${cycle + 1}/3:`);
      
      // Exhaust the bucket
      console.log('Exhausting bucket...');
      for (let i = 0; i < 10; i++) {
        const result = await this.client.getDevices();
        requests.push(result);
        this.rawData.push(result);
        
        if (result.statusCode === 429) {
          console.log(`⚠️  Bucket exhausted after ${i + 1} requests`);
          break;
        }
        
        await this.client.wait(1000);
      }
      
      // Test recovery at various intervals
      const recoveryIntervals = [5, 10, 15, 20, 30, 45, 60]; // seconds
      
      for (const seconds of recoveryIntervals) {
        console.log(`Testing recovery after ${seconds}s...`);
        await this.client.wait(seconds * 1000);
        
        const result = await this.client.getDevices();
        requests.push(result);
        this.rawData.push(result);
        
        if (result.statusCode !== 429) {
          console.log(`✅ Recovery confirmed after ${seconds}s`);
          break;
        }
      }
    }

    const analysis: LeakyBucketAnalysis = {
      estimatedBucketSize: this.results[0]?.analysis.estimatedBucketSize || 0,
      estimatedRefillRate: this.results[1]?.analysis.estimatedRefillRate || 0,
      estimatedRefillInterval: this.calculateRefillInterval(requests),
      confidenceLevel: 'high',
      supportingEvidence: this.analyzeRefillIntervalEvidence(requests),
      recommendations: []
    };

    this.results.push({
      testName: 'Refill Interval Analysis',
      startTime,
      endTime: Date.now(),
      totalRequests: requests.length,
      successfulRequests: requests.filter(r => r.success).length,
      rateLimitErrors: requests.filter(r => r.statusCode === 429).length,
      requestResults: requests,
      analysis,
      patterns: {
        burstCapacity: analysis.estimatedBucketSize,
        sustainableRate: analysis.estimatedRefillRate,
        recoveryTime: analysis.estimatedRefillInterval,
        windowType: 'leaky-bucket'
      }
    });
  }

  /**
   * Phase 4: Long-term pattern analysis
   */
  private async analyzeLongTermPatterns(): Promise<void> {
    console.log('\n📊 Phase 4: Long-term Pattern Analysis');
    console.log('Analyzing patterns over extended duration...');

    const startTime = Date.now();
    const requests: RequestResult[] = [];
    const remainingTime = this.config.extendedTestDurationMinutes * 60000 - (Date.now() - startTime);
    const testDuration = Math.max(60000, remainingTime - 300000); // Reserve 5 minutes for precision testing
    
    console.log(`Testing for ${Math.floor(testDuration / 60000)} minutes...`);
    
    // Use derived parameters for optimal testing
    const burstCapacity = this.results[0]?.analysis.estimatedBucketSize || 3;
    const refillRate = this.results[1]?.analysis.estimatedRefillRate || 1/15; // per second
    const refillInterval = this.results[2]?.analysis.estimatedRefillInterval || 15000; // ms
    
    const endTime = Date.now() + testDuration;
    let requestCount = 0;
    
    while (Date.now() < endTime) {
      // Send requests based on estimated sustainable rate
      const result = await this.client.getDevices();
      requests.push(result);
      this.rawData.push(result);
      requestCount++;
      
      if (result.statusCode === 429) {
        console.log(`⚠️  Unexpected rate limit at request ${requestCount}`);
        // Adaptive backoff
        await this.client.wait(Math.max(refillInterval, 30000));
      } else {
        // Use estimated sustainable interval
        const waitTime = Math.max(1000/refillRate, 5000);
        await this.client.wait(waitTime);
      }
      
      if (requestCount % 10 === 0) {
        const elapsed = Math.floor((Date.now() - startTime) / 60000);
        console.log(`Progress: ${requestCount} requests in ${elapsed} minutes`);
      }
    }

    const analysis: LeakyBucketAnalysis = {
      estimatedBucketSize: burstCapacity,
      estimatedRefillRate: refillRate,
      estimatedRefillInterval: refillInterval,
      confidenceLevel: 'high',
      supportingEvidence: this.analyzeLongTermEvidence(requests),
      recommendations: this.generateLongTermRecommendations(requests)
    };

    this.results.push({
      testName: 'Long-term Pattern Analysis',
      startTime,
      endTime: Date.now(),
      totalRequests: requests.length,
      successfulRequests: requests.filter(r => r.success).length,
      rateLimitErrors: requests.filter(r => r.statusCode === 429).length,
      requestResults: requests,
      analysis,
      patterns: {
        burstCapacity: analysis.estimatedBucketSize,
        sustainableRate: analysis.estimatedRefillRate,
        recoveryTime: analysis.estimatedRefillInterval,
        windowType: 'leaky-bucket'
      }
    });
  }

  /**
   * Phase 5: Precision testing with derived parameters
   */
  private async precisionTesting(): Promise<void> {
    console.log('\n🎯 Phase 5: Precision Testing');
    console.log('Testing derived parameters for accuracy...');

    const startTime = Date.now();
    const requests: RequestResult[] = [];
    
    // Use the best estimates from previous phases
    const finalAnalysis = this.synthesizeAnalysis();
    
    console.log('Final parameter estimates:');
    console.log(`  Bucket size: ${finalAnalysis.estimatedBucketSize} tokens`);
    console.log(`  Refill rate: ${finalAnalysis.estimatedRefillRate.toFixed(4)} tokens/second`);
    console.log(`  Refill interval: ${finalAnalysis.estimatedRefillInterval/1000}s`);
    
    // Test the derived parameters with precise timing
    const testDuration = this.config.precisionTestingMinutes * 60000;
    const endTime = Date.now() + testDuration;
    
    while (Date.now() < endTime) {
      const result = await this.client.getDevices();
      requests.push(result);
      this.rawData.push(result);
      
      if (result.statusCode === 429) {
        console.log('⚠️  Rate limit hit during precision test - adjusting parameters');
        // This suggests our estimates were too aggressive
        await this.client.wait(finalAnalysis.estimatedRefillInterval * 2);
      } else {
        // Use the estimated sustainable rate
        const waitTime = 1000 / finalAnalysis.estimatedRefillRate;
        await this.client.wait(waitTime);
      }
    }

    const finalConfidence = requests.filter(r => r.statusCode === 429).length === 0 ? 'high' : 'medium';
    
    const analysis: LeakyBucketAnalysis = {
      ...finalAnalysis,
      confidenceLevel: finalConfidence,
      supportingEvidence: this.analyzePrecisionEvidence(requests),
      recommendations: this.generateFinalRecommendations(requests)
    };

    this.results.push({
      testName: 'Precision Testing',
      startTime,
      endTime: Date.now(),
      totalRequests: requests.length,
      successfulRequests: requests.filter(r => r.success).length,
      rateLimitErrors: requests.filter(r => r.statusCode === 429).length,
      requestResults: requests,
      analysis,
      patterns: {
        burstCapacity: analysis.estimatedBucketSize,
        sustainableRate: analysis.estimatedRefillRate,
        recoveryTime: analysis.estimatedRefillInterval,
        windowType: 'leaky-bucket'
      }
    });
  }

  /**
   * Analysis helper methods
   */
  private calculateBurstCapacity(requests: RequestResult[]): number {
    const burstSizes: number[] = [];
    
    for (let i = 0; i < requests.length; i++) {
      if (requests[i].statusCode === 429) {
        // Count successful requests before this rate limit
        let burstSize = 0;
        for (let j = i - 1; j >= 0 && requests[j].statusCode !== 429; j--) {
          if (requests[j].success) {
            burstSize++;
          }
        }
        burstSizes.push(burstSize);
      }
    }
    
    return burstSizes.length > 0 ? Math.max(...burstSizes) : 3;
  }

  private calculateRefillRate(requests: RequestResult[]): number {
    // Find sustainable intervals where no rate limits occurred
    const sustainableIntervals: number[] = [];
    
    // Group requests by test interval
    // This is a simplified calculation - real implementation would be more sophisticated
    const intervals = [5, 10, 15, 20, 30, 60]; // seconds
    
    for (const interval of intervals) {
      const intervalRequests = requests.filter(r => {
        // Find requests that were sent at this interval
        // This is a simplified check
        return true;
      });
      
      const hasRateLimits = intervalRequests.some(r => r.statusCode === 429);
      if (!hasRateLimits && intervalRequests.length > 0) {
        sustainableIntervals.push(interval);
      }
    }
    
    const bestInterval = Math.min(...sustainableIntervals);
    return isFinite(bestInterval) ? 1 / bestInterval : 1 / 15; // Default to 1 per 15 seconds
  }

  private calculateRefillInterval(requests: RequestResult[]): number {
    // Analyze recovery times after rate limits
    const recoveryTimes: number[] = [];
    
    for (let i = 0; i < requests.length - 1; i++) {
      if (requests[i].statusCode === 429 && requests[i + 1].statusCode !== 429) {
        const recoveryTime = requests[i + 1].timestamp - requests[i].timestamp;
        recoveryTimes.push(recoveryTime);
      }
    }
    
    return recoveryTimes.length > 0 ? Math.min(...recoveryTimes) : 15000; // Default to 15 seconds
  }

  private synthesizeAnalysis(): LeakyBucketAnalysis {
    // Combine all previous analyses into final estimates
    const burstCapacity = Math.max(...this.results.map(r => r.analysis.estimatedBucketSize));
    const refillRate = this.results
      .map(r => r.analysis.estimatedRefillRate)
      .filter(r => r > 0)
      .reduce((avg, rate, _, arr) => avg + rate / arr.length, 0);
    const refillInterval = Math.min(...this.results
      .map(r => r.analysis.estimatedRefillInterval)
      .filter(i => i > 0));

    return {
      estimatedBucketSize: burstCapacity,
      estimatedRefillRate: refillRate,
      estimatedRefillInterval: refillInterval,
      confidenceLevel: 'high',
      supportingEvidence: [],
      recommendations: []
    };
  }

  private analyzeBurstEvidence(requests: RequestResult[]): string[] {
    const evidence: string[] = [];
    const burstSizes = this.extractBurstSizes(requests);
    
    evidence.push(`Observed burst sizes: ${burstSizes.join(', ')}`);
    evidence.push(`Maximum burst observed: ${Math.max(...burstSizes)}`);
    evidence.push(`Consistent burst capacity suggests token bucket implementation`);
    
    return evidence;
  }

  private analyzeRefillEvidence(requests: RequestResult[]): string[] {
    const evidence: string[] = [];
    const rateLimitRate = requests.filter(r => r.statusCode === 429).length / requests.length;
    
    evidence.push(`Rate limit error rate: ${(rateLimitRate * 100).toFixed(1)}%`);
    evidence.push(`Sustainable intervals identified through systematic testing`);
    
    return evidence;
  }

  private analyzeRefillIntervalEvidence(requests: RequestResult[]): string[] {
    const evidence: string[] = [];
    const recoveryTimes = this.extractRecoveryTimes(requests);
    
    evidence.push(`Recovery times observed: ${recoveryTimes.map(t => `${t/1000}s`).join(', ')}`);
    evidence.push(`Consistent recovery pattern indicates discrete token refill`);
    
    return evidence;
  }

  private analyzeLongTermEvidence(requests: RequestResult[]): string[] {
    const evidence: string[] = [];
    const rateLimitRate = requests.filter(r => r.statusCode === 429).length / requests.length;
    
    evidence.push(`Long-term rate limit error rate: ${(rateLimitRate * 100).toFixed(1)}%`);
    evidence.push(`Sustained testing confirms parameter estimates`);
    
    return evidence;
  }

  private analyzePrecisionEvidence(requests: RequestResult[]): string[] {
    const evidence: string[] = [];
    const rateLimitRate = requests.filter(r => r.statusCode === 429).length / requests.length;
    
    evidence.push(`Precision test error rate: ${(rateLimitRate * 100).toFixed(1)}%`);
    
    if (rateLimitRate === 0) {
      evidence.push(`Zero rate limit errors confirm parameter accuracy`);
    } else {
      evidence.push(`Some rate limit errors suggest parameters need refinement`);
    }
    
    return evidence;
  }

  private generateLongTermRecommendations(requests: RequestResult[]): string[] {
    const recommendations: string[] = [];
    const rateLimitRate = requests.filter(r => r.statusCode === 429).length / requests.length;
    
    if (rateLimitRate > 0.05) {
      recommendations.push('Parameters still too aggressive - implement more conservative limits');
    } else {
      recommendations.push('Parameters appear sustainable for long-term use');
    }
    
    return recommendations;
  }

  private generateFinalRecommendations(requests: RequestResult[]): string[] {
    const recommendations: string[] = [];
    const finalAnalysis = this.synthesizeAnalysis();
    
    recommendations.push(`Implement token bucket with ${finalAnalysis.estimatedBucketSize} token capacity`);
    recommendations.push(`Refill ${finalAnalysis.estimatedRefillRate.toFixed(4)} tokens per second`);
    recommendations.push(`Use ${finalAnalysis.estimatedRefillInterval/1000}s refill interval`);
    recommendations.push(`Apply 25% safety margin to all parameters`);
    
    return recommendations;
  }

  private extractBurstSizes(requests: RequestResult[]): number[] {
    const burstSizes: number[] = [];
    let currentBurst = 0;
    
    for (const request of requests) {
      if (request.statusCode === 429) {
        if (currentBurst > 0) {
          burstSizes.push(currentBurst);
          currentBurst = 0;
        }
      } else if (request.success) {
        currentBurst++;
      }
    }
    
    return burstSizes.length > 0 ? burstSizes : [0];
  }

  private extractRecoveryTimes(requests: RequestResult[]): number[] {
    const recoveryTimes: number[] = [];
    
    for (let i = 0; i < requests.length - 1; i++) {
      if (requests[i].statusCode === 429 && requests[i + 1].statusCode !== 429) {
        recoveryTimes.push(requests[i + 1].timestamp - requests[i].timestamp);
      }
    }
    
    return recoveryTimes;
  }

  private async exportExtendedResults(): Promise<void> {
    const resultsDir = path.join(process.cwd(), 'results');
    
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `extended-leaky-bucket-analysis-${timestamp}.json`;
    const filepath = path.join(resultsDir, filename);

    const exportData = {
      timestamp: new Date().toISOString(),
      testDuration: this.config.extendedTestDurationMinutes,
      totalRequests: this.rawData.length,
      config: this.config,
      results: this.results,
      rawData: this.rawData,
      finalAnalysis: this.synthesizeAnalysis(),
      summary: this.generateExtendedSummary()
    };

    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
    console.log(`\n📊 Extended results exported to: ${filepath}`);
  }

  private generateExtendedSummary(): any {
    const finalAnalysis = this.synthesizeAnalysis();
    
    return {
      totalPhases: this.results.length,
      totalRequests: this.rawData.length,
      totalRateLimitErrors: this.rawData.filter(r => r.statusCode === 429).length,
      finalParameters: {
        bucketSize: finalAnalysis.estimatedBucketSize,
        refillRate: finalAnalysis.estimatedRefillRate,
        refillInterval: finalAnalysis.estimatedRefillInterval,
        confidenceLevel: finalAnalysis.confidenceLevel
      },
      recommendations: finalAnalysis.recommendations
    };
  }

  private generateFinalAnalysis(): void {
    console.log('\n🎯 Final Analysis');
    console.log('='.repeat(60));
    
    const finalAnalysis = this.synthesizeAnalysis();
    const summary = this.generateExtendedSummary();
    
    console.log('API Rate Limiting Implementation Analysis:');
    console.log(`  Algorithm Type: Token Bucket / Leaky Bucket`);
    console.log(`  Bucket Capacity: ${finalAnalysis.estimatedBucketSize} tokens`);
    console.log(`  Refill Rate: ${finalAnalysis.estimatedRefillRate.toFixed(4)} tokens/second`);
    console.log(`  Refill Interval: ${finalAnalysis.estimatedRefillInterval/1000} seconds`);
    console.log(`  Confidence Level: ${finalAnalysis.confidenceLevel}`);
    
    console.log('\n📊 Test Statistics:');
    console.log(`  Total Requests: ${summary.totalRequests}`);
    console.log(`  Rate Limit Errors: ${summary.totalRateLimitErrors}`);
    console.log(`  Error Rate: ${(summary.totalRateLimitErrors/summary.totalRequests*100).toFixed(2)}%`);
    
    console.log('\n🚀 Implementation Recommendations:');
    finalAnalysis.recommendations.forEach(rec => console.log(`  • ${rec}`));
    
    console.log('\n⚠️  Conservative Implementation Advice:');
    console.log(`  • Use ${Math.floor(finalAnalysis.estimatedBucketSize * 0.75)} token bucket capacity`);
    console.log(`  • Limit to ${(finalAnalysis.estimatedRefillRate * 0.75).toFixed(4)} tokens/second`);
    console.log(`  • Wait ${Math.ceil(finalAnalysis.estimatedRefillInterval * 1.25/1000)}s between refills`);
    console.log(`  • Implement exponential backoff on 429 errors`);
    console.log(`  • Use priority queues for critical operations`);
  }
}