/**
 * Test runner for SleepMe API rate limiting analysis
 */
import { SleepMeApiClient } from './api-client.js';
import { TestConfig, TestResult, TestType, TestParameters, RequestResult } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

export class RateLimitTestRunner {
  private client: SleepMeApiClient;
  private config: TestConfig;
  private results: TestResult[] = [];

  constructor(config: TestConfig) {
    this.config = config;
    this.client = new SleepMeApiClient(config.baseUrl, config.apiToken);
  }

  /**
   * Run all test suites
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting SleepMe API Rate Limiting Analysis');
    console.log('='.repeat(60));

    try {
      // Test 1: Burst test - find immediate rate limit
      await this.runBurstTest();
      
      // Test 2: Sustained test - find sustainable rate
      await this.runSustainedTest();
      
      // Test 3: Window test - determine if fixed or sliding window
      await this.runWindowTest();
      
      // Test 4: Recovery test - how long to recover from rate limit
      await this.runRecoveryTest();
      
      // Test 5: Endpoint comparison - different limits for different endpoints
      await this.runEndpointComparisonTest();

      // Export results
      if (this.config.exportResults) {
        await this.exportResults();
      }

      // Print summary
      this.printSummary();

    } catch (error) {
      console.error('❌ Test execution failed:', error);
      throw error;
    }
  }

  /**
   * Test 1: Burst test - send requests as fast as possible
   */
  private async runBurstTest(): Promise<void> {
    console.log('\\n🔥 Running Burst Test');
    console.log('Sending requests as fast as possible to find immediate rate limit...');

    const startTime = Date.now();
    const requests: RequestResult[] = [];
    let consecutiveErrors = 0;

    for (let i = 0; i < 20; i++) {
      const result = await this.client.getDevices();
      requests.push(result);

      if (result.statusCode === 429) {
        consecutiveErrors++;
        console.log(`⚠️  Rate limit hit on request ${i + 1}`);
        
        if (consecutiveErrors >= 3) {
          console.log('🛑 Stopping burst test after 3 consecutive rate limit errors');
          break;
        }
      } else {
        consecutiveErrors = 0;
      }

      // Small delay to prevent overwhelming the API
      await this.client.wait(100);
    }

    const testResult: TestResult = {
      testName: 'Burst Test',
      startTime,
      endTime: Date.now(),
      totalRequests: requests.length,
      successfulRequests: requests.filter(r => r.success).length,
      failedRequests: requests.filter(r => !r.success).length,
      rateLimitErrors: requests.filter(r => r.statusCode === 429).length,
      averageResponseTime: requests.reduce((sum, r) => sum + r.responseTime, 0) / requests.length,
      requestResults: requests,
      analysis: {
        maxBurstSize: requests.findIndex(r => r.statusCode === 429) || requests.length,
        recommendations: this.analyzeBurstResults(requests)
      }
    };

    this.results.push(testResult);
    console.log(`✅ Burst test completed: ${testResult.successfulRequests}/${testResult.totalRequests} successful`);
  }

  /**
   * Test 2: Sustained test - test various intervals
   */
  private async runSustainedTest(): Promise<void> {
    console.log('\\n⏱️  Running Sustained Test');
    console.log('Testing various request intervals...');

    const intervals = [1000, 2000, 5000, 10000, 15000, 30000, 60000]; // 1s to 60s
    
    for (const interval of intervals) {
      console.log(`\\nTesting ${interval}ms interval...`);
      
      const startTime = Date.now();
      const requests: RequestResult[] = [];
      const maxRequests = Math.min(10, Math.floor(this.config.testDurationMinutes * 60000 / interval));

      for (let i = 0; i < maxRequests; i++) {
        const result = await this.client.getDevices();
        requests.push(result);

        if (result.statusCode === 429) {
          console.log(`⚠️  Rate limit hit at interval ${interval}ms on request ${i + 1}`);
          break;
        }

        if (i < maxRequests - 1) {
          await this.client.wait(interval);
        }
      }

      const testResult: TestResult = {
        testName: `Sustained Test (${interval}ms)`,
        startTime,
        endTime: Date.now(),
        totalRequests: requests.length,
        successfulRequests: requests.filter(r => r.success).length,
        failedRequests: requests.filter(r => !r.success).length,
        rateLimitErrors: requests.filter(r => r.statusCode === 429).length,
        averageResponseTime: requests.reduce((sum, r) => sum + r.responseTime, 0) / requests.length,
        requestResults: requests,
        analysis: {
          optimalInterval: requests.every(r => r.statusCode !== 429) ? interval : undefined,
          recommendations: this.analyzeSustainedResults(requests, interval)
        }
      };

      this.results.push(testResult);
      console.log(`✅ ${interval}ms test: ${testResult.successfulRequests}/${testResult.totalRequests} successful`);
    }
  }

  /**
   * Test 3: Window test - determine rate limit window type
   */
  private async runWindowTest(): Promise<void> {
    console.log('\\n🪟 Running Window Test');
    console.log('Testing rate limit window behavior...');

    const startTime = Date.now();
    const requests: RequestResult[] = [];

    // Send requests at the start of minute boundaries
    for (let i = 0; i < 3; i++) {
      const now = new Date();
      const secondsToNextMinute = 60 - now.getSeconds();
      
      console.log(`Waiting ${secondsToNextMinute}s for next minute boundary...`);
      await this.client.wait(secondsToNextMinute * 1000);

      console.log(`\\nTesting at minute boundary ${i + 1}...`);
      
      // Send multiple requests right at the minute boundary
      for (let j = 0; j < 8; j++) {
        const result = await this.client.getDevices();
        requests.push(result);
        
        if (result.statusCode === 429) {
          console.log(`⚠️  Rate limit hit on request ${j + 1} at minute boundary`);
          break;
        }
        
        await this.client.wait(1000); // 1 second between requests
      }
    }

    const testResult: TestResult = {
      testName: 'Window Test',
      startTime,
      endTime: Date.now(),
      totalRequests: requests.length,
      successfulRequests: requests.filter(r => r.success).length,
      failedRequests: requests.filter(r => !r.success).length,
      rateLimitErrors: requests.filter(r => r.statusCode === 429).length,
      averageResponseTime: requests.reduce((sum, r) => sum + r.responseTime, 0) / requests.length,
      requestResults: requests,
      analysis: {
        rateLimitPattern: this.analyzeWindowPattern(requests),
        recommendations: this.analyzeWindowResults(requests)
      }
    };

    this.results.push(testResult);
    console.log(`✅ Window test completed: ${testResult.successfulRequests}/${testResult.totalRequests} successful`);
  }

  /**
   * Test 4: Recovery test - how long to recover from rate limit
   */
  private async runRecoveryTest(): Promise<void> {
    console.log('\\n🔄 Running Recovery Test');
    console.log('Testing recovery time after hitting rate limit...');

    const startTime = Date.now();
    const requests: RequestResult[] = [];

    // First, trigger a rate limit
    console.log('Triggering rate limit...');
    let rateLimitHit = false;
    
    for (let i = 0; i < 10; i++) {
      const result = await this.client.getDevices();
      requests.push(result);
      
      if (result.statusCode === 429) {
        console.log(`⚠️  Rate limit triggered on request ${i + 1}`);
        rateLimitHit = true;
        break;
      }
      
      await this.client.wait(500); // Fast requests to trigger rate limit
    }

    if (!rateLimitHit) {
      console.log('⚠️  Could not trigger rate limit, testing recovery anyway...');
    }

    // Now test recovery at different intervals
    const recoveryIntervals = [10, 30, 60, 120]; // seconds
    
    for (const seconds of recoveryIntervals) {
      console.log(`\\nWaiting ${seconds}s before testing recovery...`);
      await this.client.wait(seconds * 1000);
      
      const result = await this.client.getDevices();
      requests.push(result);
      
      if (result.statusCode !== 429) {
        console.log(`✅ Recovery confirmed after ${seconds}s`);
        break;
      } else {
        console.log(`⚠️  Still rate limited after ${seconds}s`);
      }
    }

    const testResult: TestResult = {
      testName: 'Recovery Test',
      startTime,
      endTime: Date.now(),
      totalRequests: requests.length,
      successfulRequests: requests.filter(r => r.success).length,
      failedRequests: requests.filter(r => !r.success).length,
      rateLimitErrors: requests.filter(r => r.statusCode === 429).length,
      averageResponseTime: requests.reduce((sum, r) => sum + r.responseTime, 0) / requests.length,
      requestResults: requests,
      analysis: {
        recommendations: this.analyzeRecoveryResults(requests)
      }
    };

    this.results.push(testResult);
    console.log(`✅ Recovery test completed`);
  }

  /**
   * Test 5: Endpoint comparison test
   */
  private async runEndpointComparisonTest(): Promise<void> {
    console.log('\\n🔍 Running Endpoint Comparison Test');
    console.log('Testing different endpoints for rate limit differences...');

    if (!this.config.deviceId) {
      console.log('⚠️  No device ID provided, skipping endpoint comparison test');
      return;
    }

    const endpoints = [
      { name: 'GET /devices', test: () => this.client.getDevices() },
      { name: 'GET /devices/{id}', test: () => this.client.getDeviceStatus(this.config.deviceId!) }
    ];

    for (const endpoint of endpoints) {
      console.log(`\\nTesting ${endpoint.name}...`);
      
      const startTime = Date.now();
      const requests: RequestResult[] = [];
      
      for (let i = 0; i < 8; i++) {
        const result = await endpoint.test();
        requests.push(result);
        
        if (result.statusCode === 429) {
          console.log(`⚠️  Rate limit hit on ${endpoint.name} request ${i + 1}`);
          break;
        }
        
        await this.client.wait(2000); // 2 seconds between requests
      }

      const testResult: TestResult = {
        testName: `Endpoint Test: ${endpoint.name}`,
        startTime,
        endTime: Date.now(),
        totalRequests: requests.length,
        successfulRequests: requests.filter(r => r.success).length,
        failedRequests: requests.filter(r => !r.success).length,
        rateLimitErrors: requests.filter(r => r.statusCode === 429).length,
        averageResponseTime: requests.reduce((sum, r) => sum + r.responseTime, 0) / requests.length,
        requestResults: requests,
        analysis: {
          recommendations: this.analyzeEndpointResults(requests, endpoint.name)
        }
      };

      this.results.push(testResult);
      console.log(`✅ ${endpoint.name} test: ${testResult.successfulRequests}/${testResult.totalRequests} successful`);
    }
  }

  /**
   * Analysis methods
   */
  private analyzeBurstResults(requests: RequestResult[]): string[] {
    const firstRateLimit = requests.findIndex(r => r.statusCode === 429);
    const recommendations = [];

    if (firstRateLimit === -1) {
      recommendations.push('No rate limit hit during burst test - API may be very permissive');
    } else {
      recommendations.push(`Rate limit hit after ${firstRateLimit} rapid requests`);
      recommendations.push(`Consider limiting burst size to ${Math.max(1, firstRateLimit - 1)} requests`);
    }

    return recommendations;
  }

  private analyzeSustainedResults(requests: RequestResult[], interval: number): string[] {
    const recommendations = [];
    const rateLimitHit = requests.some(r => r.statusCode === 429);

    if (rateLimitHit) {
      recommendations.push(`${interval}ms interval is too aggressive - rate limit hit`);
    } else {
      recommendations.push(`${interval}ms interval appears safe for sustained requests`);
    }

    return recommendations;
  }

  private analyzeWindowPattern(requests: RequestResult[]): string {
    // Analyze timestamps to determine window pattern
    const rateLimitTimestamps = requests
      .filter(r => r.statusCode === 429)
      .map(r => r.timestamp);

    if (rateLimitTimestamps.length === 0) {
      return 'No rate limits detected';
    }

    // Check if rate limits occur at minute boundaries
    const minuteBoundaryAligned = rateLimitTimestamps.every(ts => {
      const date = new Date(ts);
      return date.getSeconds() < 5; // Within 5 seconds of minute boundary
    });

    return minuteBoundaryAligned ? 'Fixed window (minute-aligned)' : 'Sliding window or complex pattern';
  }

  private analyzeWindowResults(requests: RequestResult[]): string[] {
    const recommendations = [];
    const pattern = this.analyzeWindowPattern(requests);
    
    recommendations.push(`Window pattern: ${pattern}`);
    
    if (pattern.includes('Fixed window')) {
      recommendations.push('Align requests to avoid minute boundaries');
      recommendations.push('Implement discrete minute-based rate limiting');
    } else {
      recommendations.push('Use sliding window or adaptive rate limiting');
    }

    return recommendations;
  }

  private analyzeRecoveryResults(requests: RequestResult[]): string[] {
    const recommendations = [];
    const rateLimitIndex = requests.findIndex(r => r.statusCode === 429);
    const recoveryIndex = requests.findIndex((r, i) => i > rateLimitIndex && r.statusCode !== 429);

    if (rateLimitIndex === -1) {
      recommendations.push('No rate limit was triggered during recovery test');
    } else if (recoveryIndex === -1) {
      recommendations.push('Recovery not observed within test duration');
      recommendations.push('Consider longer backoff periods (>2 minutes)');
    } else {
      const recoveryTime = requests[recoveryIndex].timestamp - requests[rateLimitIndex].timestamp;
      recommendations.push(`Recovery observed after ${Math.round(recoveryTime / 1000)}s`);
      recommendations.push(`Minimum backoff should be ${Math.ceil(recoveryTime / 1000)}s`);
    }

    return recommendations;
  }

  private analyzeEndpointResults(requests: RequestResult[], endpointName: string): string[] {
    const recommendations = [];
    const rateLimitHit = requests.some(r => r.statusCode === 429);

    if (rateLimitHit) {
      recommendations.push(`${endpointName} has rate limits`);
    } else {
      recommendations.push(`${endpointName} appears to have lenient rate limits`);
    }

    return recommendations;
  }

  /**
   * Export results to JSON file
   */
  private async exportResults(): Promise<void> {
    const resultsDir = path.join(process.cwd(), 'results');
    
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `sleepme-rate-limit-test-${timestamp}.json`;
    const filepath = path.join(resultsDir, filename);

    const exportData = {
      timestamp: new Date().toISOString(),
      config: this.config,
      results: this.results,
      summary: this.generateSummary()
    };

    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
    console.log(`\\n📊 Results exported to: ${filepath}`);
  }

  /**
   * Generate summary of all test results
   */
  private generateSummary(): any {
    const summary = {
      totalTests: this.results.length,
      totalRequests: this.results.reduce((sum, r) => sum + r.totalRequests, 0),
      totalRateLimitErrors: this.results.reduce((sum, r) => sum + r.rateLimitErrors, 0),
      averageResponseTime: this.results.reduce((sum, r) => sum + r.averageResponseTime, 0) / this.results.length,
      recommendations: [] as string[]
    };

    // Generate overall recommendations
    const rateLimitRate = summary.totalRateLimitErrors / summary.totalRequests;
    
    if (rateLimitRate > 0.1) {
      summary.recommendations.push('High rate limit error rate - implement more conservative rate limiting');
    }

    if (rateLimitRate === 0) {
      summary.recommendations.push('No rate limits hit - current limits may be too conservative');
    }

    return summary;
  }

  /**
   * Print test summary
   */
  private printSummary(): void {
    console.log('\\n📊 Test Summary');
    console.log('='.repeat(40));
    
    const summary = this.generateSummary();
    
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Total Requests: ${summary.totalRequests}`);
    console.log(`Rate Limit Errors: ${summary.totalRateLimitErrors}`);
    console.log(`Average Response Time: ${summary.averageResponseTime.toFixed(2)}ms`);
    
    console.log('\\n🎯 Recommendations:');
    summary.recommendations.forEach((rec: string) => console.log(`  • ${rec}`));
    
    console.log('\\n📈 Individual Test Results:');
    this.results.forEach(result => {
      const successRate = (result.successfulRequests / result.totalRequests * 100).toFixed(1);
      console.log(`  ${result.testName}: ${successRate}% success rate (${result.rateLimitErrors} rate limit errors)`);
    });
  }
}