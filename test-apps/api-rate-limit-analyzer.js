#!/usr/bin/env node

/**
 * Comprehensive SleepMe API Rate Limit Analysis Tool
 * 
 * This tool performs systematic testing to determine the true rate limiting
 * behavior of the SleepMe API through empirical measurement.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = 'https://api.developer.sleep.me/v1';
const CONFIG_FILE = path.join(__dirname, 'api-test-config.json');
const RESULTS_FILE = path.join(__dirname, 'rate-limit-analysis-results.json');

class APIRateLimitAnalyzer {
  constructor() {
    this.config = this.loadConfig();
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {},
      rawData: []
    };
    this.deviceId = null;
  }

  loadConfig() {
    if (!fs.existsSync(CONFIG_FILE)) {
      console.error(`❌ Config file not found: ${CONFIG_FILE}`);
      console.log('Create api-test-config.json with:');
      console.log(JSON.stringify({
        apiToken: "your-api-token-here",
        deviceId: "your-device-id-here" // optional, will auto-discover
      }, null, 2));
      process.exit(1);
    }
    
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    const startTime = Date.now();
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      },
      validateStatus: () => true // Accept all status codes
    };

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      const endTime = Date.now();
      
      const result = {
        timestamp: new Date().toISOString(),
        method,
        endpoint,
        status: response.status,
        responseTime: endTime - startTime,
        success: response.status >= 200 && response.status < 300,
        rateLimited: response.status === 429,
        headers: {
          'x-ratelimit-limit': response.headers['x-ratelimit-limit'],
          'x-ratelimit-remaining': response.headers['x-ratelimit-remaining'],
          'x-ratelimit-reset': response.headers['x-ratelimit-reset'],
          'retry-after': response.headers['retry-after']
        },
        data: response.status === 429 ? null : response.data
      };

      this.results.rawData.push(result);
      return result;
    } catch (error) {
      const endTime = Date.now();
      const result = {
        timestamp: new Date().toISOString(),
        method,
        endpoint,
        status: 0,
        responseTime: endTime - startTime,
        success: false,
        rateLimited: false,
        error: error.message,
        headers: {}
      };

      this.results.rawData.push(result);
      return result;
    }
  }

  async discoverDevice() {
    if (this.config.deviceId) {
      this.deviceId = this.config.deviceId;
      console.log(`Using configured device ID: ${this.deviceId}`);
      return;
    }

    console.log('🔍 Discovering devices...');
    const result = await this.makeRequest('/devices');
    
    if (result.success && result.data) {
      const devices = Array.isArray(result.data) ? result.data : result.data.devices || [];
      if (devices.length > 0) {
        this.deviceId = devices[0].id;
        console.log(`✅ Auto-discovered device ID: ${this.deviceId}`);
      } else {
        throw new Error('No devices found');
      }
    } else {
      throw new Error(`Device discovery failed: ${result.status}`);
    }
  }

  async testBurstCapacity() {
    console.log('\n📊 Phase 1: Testing Burst Capacity');
    console.log('Sending rapid requests to find initial rate limit...');
    
    const burstResults = [];
    let consecutiveSuccesses = 0;
    let firstRateLimit = null;

    // Send requests as fast as possible until we hit a 429
    for (let i = 0; i < 50; i++) {
      const result = await this.makeRequest(`/devices/${this.deviceId}`);
      burstResults.push({
        requestNumber: i + 1,
        ...result
      });

      console.log(`Request ${i + 1}: ${result.status} (${result.responseTime}ms)`);

      if (result.success) {
        consecutiveSuccesses++;
      } else if (result.rateLimited && !firstRateLimit) {
        firstRateLimit = {
          requestNumber: i + 1,
          consecutiveSuccesses,
          ...result
        };
        console.log(`🚫 First rate limit at request ${i + 1} after ${consecutiveSuccesses} successes`);
        break;
      }

      // Small delay to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.results.tests.push({
      name: 'burst_capacity',
      consecutiveSuccesses,
      firstRateLimit,
      requests: burstResults
    });

    return { consecutiveSuccesses, firstRateLimit };
  }

  async testRefillTiming() {
    console.log('\n⏱️  Phase 2: Testing Refill Timing');
    console.log('Measuring token refill rate after rate limit...');

    const refillResults = [];
    
    // First, trigger a rate limit
    let rateLimited = false;
    while (!rateLimited) {
      const result = await this.makeRequest(`/devices/${this.deviceId}`);
      if (result.rateLimited) {
        rateLimited = true;
        console.log('✅ Rate limit triggered, now testing refill...');
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Test recovery at various intervals
    const testIntervals = [5, 10, 15, 20, 25, 30, 45, 60, 90, 120, 180];
    
    for (const interval of testIntervals) {
      console.log(`Waiting ${interval}s then testing...`);
      await new Promise(resolve => setTimeout(resolve, interval * 1000));
      
      const result = await this.makeRequest(`/devices/${this.deviceId}`);
      refillResults.push({
        waitTime: interval,
        ...result
      });
      
      console.log(`After ${interval}s: ${result.status} (${result.responseTime}ms)`);
      
      if (result.success) {
        console.log(`✅ First success after waiting ${interval}s`);
        break;
      }
    }

    this.results.tests.push({
      name: 'refill_timing',
      results: refillResults
    });

    return refillResults;
  }

  async testSustainedRate() {
    console.log('\n🔄 Phase 3: Testing Sustained Rate');
    console.log('Finding maximum sustainable request rate...');

    const sustainedResults = [];
    const testIntervals = [10, 15, 20, 25, 30, 45, 60]; // seconds between requests
    
    for (const interval of testIntervals) {
      console.log(`\nTesting ${interval}s intervals (${3600/interval} requests/hour)...`);
      
      const intervalResults = [];
      let consecutiveSuccesses = 0;
      let rateLimitHit = false;

      // Test 10 requests at this interval
      for (let i = 0; i < 10; i++) {
        const result = await this.makeRequest(`/devices/${this.deviceId}`);
        intervalResults.push({
          requestNumber: i + 1,
          interval,
          ...result
        });

        if (result.success) {
          consecutiveSuccesses++;
          console.log(`  Request ${i + 1}: ✅ ${result.status} (${consecutiveSuccesses} consecutive)`);
        } else if (result.rateLimited) {
          rateLimitHit = true;
          console.log(`  Request ${i + 1}: 🚫 429 after ${consecutiveSuccesses} successes`);
          break;
        }

        if (i < 9) { // Don't wait after last request
          await new Promise(resolve => setTimeout(resolve, interval * 1000));
        }
      }

      sustainedResults.push({
        interval,
        requestsPerHour: Math.round(3600 / interval),
        consecutiveSuccesses,
        rateLimitHit,
        results: intervalResults
      });

      console.log(`${interval}s interval: ${consecutiveSuccesses}/10 successes, rate limit: ${rateLimitHit ? 'YES' : 'NO'}`);

      // If we found a sustainable rate, we can probably skip longer intervals
      if (!rateLimitHit && consecutiveSuccesses >= 8) {
        console.log(`✅ Found sustainable rate: ${interval}s intervals`);
        break;
      }

      // Wait a bit between interval tests
      await new Promise(resolve => setTimeout(resolve, 30000));
    }

    this.results.tests.push({
      name: 'sustained_rate',
      results: sustainedResults
    });

    return sustainedResults;
  }

  async testRateLimitWindows() {
    console.log('\n🪟 Phase 4: Testing Rate Limit Windows');
    console.log('Determining if rate limits use discrete time windows...');

    const windowResults = [];
    
    // Test requests at exact minute boundaries vs random times
    const now = new Date();
    const nextMinute = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
                               now.getHours(), now.getMinutes() + 1, 0, 0);
    
    console.log(`Waiting until next minute boundary: ${nextMinute.toLocaleTimeString()}`);
    await new Promise(resolve => setTimeout(resolve, nextMinute.getTime() - now.getTime()));

    // Send requests at minute boundary
    console.log('Testing requests at minute boundary...');
    for (let i = 0; i < 5; i++) {
      const result = await this.makeRequest(`/devices/${this.deviceId}`);
      windowResults.push({
        type: 'minute_boundary',
        requestNumber: i + 1,
        ...result
      });
      console.log(`Boundary request ${i + 1}: ${result.status}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Wait 30 seconds and test mid-minute
    await new Promise(resolve => setTimeout(resolve, 30000));
    console.log('Testing requests mid-minute...');
    for (let i = 0; i < 5; i++) {
      const result = await this.makeRequest(`/devices/${this.deviceId}`);
      windowResults.push({
        type: 'mid_minute',
        requestNumber: i + 1,
        ...result
      });
      console.log(`Mid-minute request ${i + 1}: ${result.status}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    this.results.tests.push({
      name: 'rate_limit_windows',  
      results: windowResults
    });

    return windowResults;
  }

  generateSummary() {
    console.log('\n📈 Generating Analysis Summary...');
    
    const summary = {
      totalRequests: this.results.rawData.length,
      successfulRequests: this.results.rawData.filter(r => r.success).length,
      rateLimitedRequests: this.results.rawData.filter(r => r.rateLimited).length,
      averageResponseTime: this.results.rawData.reduce((sum, r) => sum + r.responseTime, 0) / this.results.rawData.length,
      
      // Extract patterns
      burstCapacity: null,
      estimatedRefillRate: null,
      sustainableInterval: null,
      windowBehavior: 'unknown'
    };

    // Analyze burst capacity
    const burstTest = this.results.tests.find(t => t.name === 'burst_capacity');
    if (burstTest) {
      summary.burstCapacity = burstTest.consecutiveSuccesses;
    }

    // Analyze sustained rate
    const sustainedTest = this.results.tests.find(t => t.name === 'sustained_rate');
    if (sustainedTest) {
      const sustainable = sustainedTest.results.find(r => !r.rateLimitHit && r.consecutiveSuccesses >= 8);
      if (sustainable) {
        summary.sustainableInterval = sustainable.interval;
        summary.sustainableRate = sustainable.requestsPerHour;
      }
    }

    // Analyze refill timing
    const refillTest = this.results.tests.find(t => t.name === 'refill_timing');
    if (refillTest) {
      const firstSuccess = refillTest.results.find(r => r.success);
      if (firstSuccess) {
        summary.estimatedRefillRate = `~1 token per ${firstSuccess.waitTime}s`;
      }
    }

    this.results.summary = summary;
    
    console.log('\n📊 ANALYSIS SUMMARY:');
    console.log(`Total Requests: ${summary.totalRequests}`);
    console.log(`Success Rate: ${(summary.successfulRequests / summary.totalRequests * 100).toFixed(1)}%`);
    console.log(`Burst Capacity: ${summary.burstCapacity || 'Unknown'} consecutive requests`);
    console.log(`Sustainable Interval: ${summary.sustainableInterval || 'Unknown'}s between requests`);
    console.log(`Estimated Refill Rate: ${summary.estimatedRefillRate || 'Unknown'}`);
    console.log(`Average Response Time: ${summary.averageResponseTime.toFixed(0)}ms`);
  }

  saveResults() {
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Results saved to: ${RESULTS_FILE}`);
    console.log(`📊 Total data points collected: ${this.results.rawData.length}`);
  }

  async run() {
    console.log('🚀 SleepMe API Rate Limit Analysis Tool');
    console.log('=====================================\n');

    try {
      await this.discoverDevice();
      
      const burstResults = await this.testBurstCapacity();
      await new Promise(resolve => setTimeout(resolve, 5000)); // Brief pause
      
      const refillResults = await this.testRefillTiming();
      await new Promise(resolve => setTimeout(resolve, 10000)); // Longer pause
      
      const sustainedResults = await this.testSustainedRate();
      await new Promise(resolve => setTimeout(resolve, 10000)); // Pause
      
      const windowResults = await this.testRateLimitWindows();
      
      this.generateSummary();
      this.saveResults();
      
      console.log('\n✅ Analysis complete!');
      console.log('Use these results to implement accurate rate limiting in your application.');
      
    } catch (error) {
      console.error(`\n❌ Analysis failed: ${error.message}`);
      this.saveResults(); // Save partial results
      process.exit(1);
    }
  }
}

// Check if config exists before running
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
SleepMe API Rate Limit Analysis Tool

Usage: node api-rate-limit-analyzer.js

Before running, create api-test-config.json with:
{
  "apiToken": "your-api-token-here",
  "deviceId": "optional-device-id"
}

The tool will:
1. Test burst capacity (how many rapid requests before 429)
2. Test refill timing (how long to recover from rate limits)  
3. Test sustained rates (maximum sustainable request frequency)
4. Test rate limit windows (discrete vs continuous limiting)

Results are saved to rate-limit-analysis-results.json
`);
  process.exit(0);
}

// Run the analyzer
const analyzer = new APIRateLimitAnalyzer();
analyzer.run();