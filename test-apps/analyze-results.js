#!/usr/bin/env node

/**
 * Analysis Results Processor
 * 
 * Processes the raw data from rate limit analysis and provides
 * actionable recommendations for plugin configuration.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESULTS_FILE = path.join(__dirname, 'rate-limit-analysis-results.json');

class ResultsAnalyzer {
  constructor() {
    if (!fs.existsSync(RESULTS_FILE)) {
      console.error(`❌ Results file not found: ${RESULTS_FILE}`);
      console.log('Run the analysis first: npm run analyze');
      process.exit(1);
    }
    
    this.results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
  }

  analyzeResponseTimes() {
    const responseTimes = this.results.rawData
      .filter(r => r.success)
      .map(r => r.responseTime);

    if (responseTimes.length === 0) return null;

    const sorted = responseTimes.sort((a, b) => a - b);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)]
    };
  }

  analyzeRateLimitPatterns() {
    const rateLimitedRequests = this.results.rawData.filter(r => r.rateLimited);
    const patterns = {
      totalRateLimits: rateLimitedRequests.length,
      rateLimitTimes: rateLimitedRequests.map(r => new Date(r.timestamp)),
      averageGapBeforeRateLimit: null,
      commonRateLimitScenarios: []
    };

    // Analyze time gaps before rate limits
    const gaps = [];
    for (let i = 1; i < this.results.rawData.length; i++) {
      const current = this.results.rawData[i];
      const previous = this.results.rawData[i-1];
      
      if (current.rateLimited && previous.success) {
        const gap = new Date(current.timestamp) - new Date(previous.timestamp);
        gaps.push(gap);
      }
    }

    if (gaps.length > 0) {
      patterns.averageGapBeforeRateLimit = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length / 1000; // seconds
    }

    return patterns;
  }

  generatePluginRecommendations() {
    const recommendations = {
      tokenBucketConfig: {},
      pollingIntervals: {},
      rateLimitHandling: {},
      emergencyMeasures: {}
    };

    // Analyze burst capacity
    const burstTest = this.results.tests.find(t => t.name === 'burst_capacity');
    if (burstTest && burstTest.consecutiveSuccesses) {
      const capacity = burstTest.consecutiveSuccesses;
      recommendations.tokenBucketConfig.bucketCapacity = Math.max(1, Math.floor(capacity * 0.8)); // 20% safety margin
      recommendations.tokenBucketConfig.reason = `Based on ${capacity} consecutive successful requests in burst test`;
    }

    // Analyze refill timing
    const refillTest = this.results.tests.find(t => t.name === 'refill_timing');
    if (refillTest) {
      const firstSuccess = refillTest.results.find(r => r.success);
      if (firstSuccess) {
        const refillSeconds = firstSuccess.waitTime;
        recommendations.tokenBucketConfig.refillRatePerSecond = 1 / (refillSeconds * 1.2); // 20% safety margin
        recommendations.tokenBucketConfig.refillReason = `Based on first successful request after ${refillSeconds}s wait`;
      }
    }

    // Analyze sustained rate
    const sustainedTest = this.results.tests.find(t => t.name === 'sustained_rate');
    if (sustainedTest) {
      const sustainableResult = sustainedTest.results.find(r => !r.rateLimitHit && r.consecutiveSuccesses >= 8);
      if (sustainableResult) {
        recommendations.pollingIntervals.basePolling = sustainableResult.interval * 1.5; // 50% safety margin
        recommendations.pollingIntervals.reason = `Based on sustainable ${sustainableResult.interval}s interval`;
      }
    }

    // Response time recommendations
    const responseTimes = this.analyzeResponseTimes();
    if (responseTimes) {
      recommendations.requestTimeouts = {
        recommended: Math.max(5000, responseTimes.p95 * 2),
        reason: `Based on 95th percentile response time: ${responseTimes.p95}ms`
      };
    }

    // Rate limit recovery recommendations
    const rateLimitPatterns = this.analyzeRateLimitPatterns();
    if (rateLimitPatterns.averageGapBeforeRateLimit) {
      recommendations.rateLimitHandling.minBackoffMs = Math.max(5000, rateLimitPatterns.averageGapBeforeRateLimit * 1000 * 2);
      recommendations.rateLimitHandling.reason = `Based on average ${rateLimitPatterns.averageGapBeforeRateLimit.toFixed(1)}s gap before rate limits`;
    }

    return recommendations;
  }

  generateCodeSnippets() {
    const recommendations = this.generatePluginRecommendations();
    const code = {
      tokenBucketConfig: null,
      pollingIntervals: null,
      settingsUpdate: null
    };

    if (recommendations.tokenBucketConfig.bucketCapacity) {
      code.tokenBucketConfig = `
// Empirically-derived token bucket configuration
this.tokenBucketLimiter = new EmpiricalTokenBucketLimiter({
  bucketCapacity: ${recommendations.tokenBucketConfig.bucketCapacity},
  refillRatePerSecond: ${recommendations.tokenBucketConfig.refillRatePerSecond?.toFixed(4) || '1/20'},
  minRecoveryTimeMs: ${recommendations.rateLimitHandling.minBackoffMs || 8000},
  safetyMargin: 0.1, // Additional 10% safety margin
  allowCriticalBypass: true,
  criticalBypassLimit: 3,
  adaptiveBackoffMultiplier: 1.2,
  maxAdaptiveBackoffMs: 120000
});`.trim();
    }

    if (recommendations.pollingIntervals.basePolling) {
      code.pollingIntervals = `
// Empirically-derived polling intervals  
export const POLLING_INTERVALS = {
  BASE: ${Math.ceil(recommendations.pollingIntervals.basePolling)},
  ACTIVE: ${Math.ceil(recommendations.pollingIntervals.basePolling * 0.67)},
  RESPONSIVE: ${Math.ceil(recommendations.pollingIntervals.basePolling * 0.5)}
};`.trim();
    }

    if (recommendations.pollingIntervals.basePolling) {
      code.settingsUpdate = `
// Update settings.ts with empirical data
export const DEFAULT_POLLING_INTERVAL = ${Math.ceil(recommendations.pollingIntervals.basePolling)};`.trim();
    }

    return code;
  }

  printReport() {
    console.log('📊 SleepMe API Rate Limit Analysis Report');
    console.log('========================================\n');

    // Basic stats
    console.log('📈 Request Statistics:');
    console.log(`   Total Requests: ${this.results.rawData.length}`);
    console.log(`   Successful: ${this.results.rawData.filter(r => r.success).length}`);
    console.log(`   Rate Limited: ${this.results.rawData.filter(r => r.rateLimited).length}`);
    console.log(`   Success Rate: ${(this.results.rawData.filter(r => r.success).length / this.results.rawData.length * 100).toFixed(1)}%`);

    // Response times
    const responseTimes = this.analyzeResponseTimes();
    if (responseTimes) {
      console.log('\n⏱️  Response Time Analysis:');
      console.log(`   Average: ${responseTimes.avg.toFixed(0)}ms`);
      console.log(`   Median: ${responseTimes.median}ms`);
      console.log(`   95th Percentile: ${responseTimes.p95}ms`);
      console.log(`   Range: ${responseTimes.min}ms - ${responseTimes.max}ms`);
    }

    // Rate limit patterns
    const rateLimitPatterns = this.analyzeRateLimitPatterns();
    console.log('\n🚫 Rate Limit Analysis:');
    console.log(`   Total Rate Limits: ${rateLimitPatterns.totalRateLimits}`);
    if (rateLimitPatterns.averageGapBeforeRateLimit) {
      console.log(`   Average Gap Before Rate Limit: ${rateLimitPatterns.averageGapBeforeRateLimit.toFixed(1)}s`);
    }

    // Test results
    console.log('\n🧪 Test Results:');
    this.results.tests.forEach(test => {
      switch (test.name) {
        case 'burst_capacity':
          console.log(`   Burst Capacity: ${test.consecutiveSuccesses} consecutive requests`);
          break;
        case 'refill_timing':
          const firstSuccess = test.results.find(r => r.success);
          if (firstSuccess) {
            console.log(`   Token Refill: ~${firstSuccess.waitTime}s for first recovery`);
          }
          break;
        case 'sustained_rate':
          const sustainable = test.results.find(r => !r.rateLimitHit && r.consecutiveSuccesses >= 8);
          if (sustainable) {
            console.log(`   Sustainable Rate: ${sustainable.interval}s intervals (${sustainable.requestsPerHour} req/hour)`);
          }
          break;
      }
    });

    // Recommendations
    const recommendations = this.generatePluginRecommendations();
    console.log('\n💡 Plugin Configuration Recommendations:');
    
    if (recommendations.tokenBucketConfig.bucketCapacity) {
      console.log(`   Token Bucket Capacity: ${recommendations.tokenBucketConfig.bucketCapacity}`);
      console.log(`   Token Refill Rate: ${recommendations.tokenBucketConfig.refillRatePerSecond?.toFixed(4) || 'N/A'} tokens/sec`);
    }
    
    if (recommendations.pollingIntervals.basePolling) {
      console.log(`   Base Polling Interval: ${Math.ceil(recommendations.pollingIntervals.basePolling)}s`);
    }

    if (recommendations.requestTimeouts.recommended) {
      console.log(`   Request Timeout: ${recommendations.requestTimeouts.recommended}ms`);
    }

    // Code snippets
    const code = this.generateCodeSnippets();
    if (code.tokenBucketConfig || code.pollingIntervals) {
      console.log('\n💻 Suggested Code Updates:');
      
      if (code.tokenBucketConfig) {
        console.log('\n📝 Token Bucket Configuration:');
        console.log(code.tokenBucketConfig);
      }
      
      if (code.pollingIntervals) {
        console.log('\n📝 Polling Intervals:');
        console.log(code.pollingIntervals);
      }
      
      if (code.settingsUpdate) {
        console.log('\n📝 Settings Update:');
        console.log(code.settingsUpdate);
      }
    }

    console.log('\n✅ Analysis complete! Use these recommendations to update your plugin configuration.');
  }

  exportRecommendations() {
    const recommendations = this.generatePluginRecommendations();
    const code = this.generateCodeSnippets();
    const responseTimes = this.analyzeResponseTimes();
    
    const exportData = {
      timestamp: new Date().toISOString(),
      recommendations,
      code,
      responseTimes,
      rateLimitPatterns: this.analyzeRateLimitPatterns(),
      rawDataSummary: {
        totalRequests: this.results.rawData.length,
        successRate: this.results.rawData.filter(r => r.success).length / this.results.rawData.length,
        rateLimitRate: this.results.rawData.filter(r => r.rateLimited).length / this.results.rawData.length
      }
    };

    const exportFile = path.join(__dirname, 'plugin-recommendations.json');
    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
    console.log(`\n💾 Detailed recommendations exported to: ${exportFile}`);
  }
}

// Run the analysis
const analyzer = new ResultsAnalyzer();
analyzer.printReport();
analyzer.exportRecommendations();