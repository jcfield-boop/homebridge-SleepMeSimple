/**
 * Extended test runner for comprehensive leaky bucket analysis
 * Entry point for 2+ hour comprehensive API rate limiting analysis
 */
import { ExtendedLeakyBucketTester, LeakyBucketTestConfig } from './extended-leaky-bucket-tests.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runExtendedTests(): Promise<void> {
  console.log('🔬 SleepMe API Extended Rate Limiting Analysis');
  console.log('============================================');
  console.log('This comprehensive test suite will:');
  console.log('  • Run for 2+ hours to gather extensive data');
  console.log('  • Analyze leaky bucket / token bucket parameters');
  console.log('  • Derive actual API implementation details');
  console.log('  • Generate ultra-conservative rate limiting recommendations');
  console.log('');

  // Validate required environment variables
  const apiToken = process.env.SLEEPME_API_TOKEN;
  if (!apiToken) {
    console.error('❌ SLEEPME_API_TOKEN environment variable is required');
    console.error('Please copy .env.example to .env and configure your API token');
    process.exit(1);
  }

  // Build extended test configuration
  const config: LeakyBucketTestConfig = {
    apiToken,
    deviceId: process.env.SLEEPME_DEVICE_ID,
    baseUrl: 'https://api.developer.sleep.me/v1',
    testDurationMinutes: parseInt(process.env.EXTENDED_TEST_DURATION_MINUTES || '120'), // 2 hours default
    extendedTestDurationMinutes: parseInt(process.env.EXTENDED_TEST_DURATION_MINUTES || '120'),
    tokenRefillAnalysisMinutes: parseInt(process.env.TOKEN_REFILL_ANALYSIS_MINUTES || '20'),
    burstCapacityAnalysisMinutes: parseInt(process.env.BURST_CAPACITY_ANALYSIS_MINUTES || '10'),
    precisionTestingMinutes: parseInt(process.env.PRECISION_TESTING_MINUTES || '5'),
    maxRequestsPerTest: parseInt(process.env.MAX_REQUESTS_PER_TEST || '1000'),
    verboseLogging: process.env.VERBOSE_LOGGING === 'true',
    exportResults: process.env.EXPORT_RESULTS !== 'false'
  };

  console.log('Extended Test Configuration:');
  console.log(`  API Token: ${config.apiToken.substring(0, 8)}...`);
  console.log(`  Device ID: ${config.deviceId || 'Not provided'}`);
  console.log(`  Base URL: ${config.baseUrl}`);
  console.log(`  Total Test Duration: ${config.extendedTestDurationMinutes} minutes`);
  console.log(`  Token Refill Analysis: ${config.tokenRefillAnalysisMinutes} minutes`);
  console.log(`  Burst Capacity Analysis: ${config.burstCapacityAnalysisMinutes} minutes`);
  console.log(`  Precision Testing: ${config.precisionTestingMinutes} minutes`);
  console.log(`  Max Requests: ${config.maxRequestsPerTest}`);
  console.log(`  Verbose Logging: ${config.verboseLogging}`);
  console.log(`  Export Results: ${config.exportResults}`);

  // Confirm before running long test
  console.log('\n⚠️  WARNING: This test will run for multiple hours!');
  console.log('⚠️  It will make hundreds of API requests to systematically probe rate limits.');
  console.log('⚠️  Ensure you have a stable internet connection and the process won\'t be interrupted.');
  console.log('');
  console.log('Press Ctrl+C to cancel, or wait 10 seconds to begin...');
  
  await new Promise(resolve => setTimeout(resolve, 10000));

  try {
    console.log('\n🚀 Starting Extended Analysis...');
    console.log(`Expected completion time: ${new Date(Date.now() + config.extendedTestDurationMinutes * 60000).toLocaleString()}`);
    
    // Run the extended analysis
    const tester = new ExtendedLeakyBucketTester(config);
    await tester.runExtendedAnalysis();
    
    console.log('\n✅ Extended analysis completed successfully!');
    console.log('\n🎯 Next Steps:');
    console.log('  1. Review the detailed analysis and final recommendations');
    console.log('  2. Implement the conservative rate limiting parameters');
    console.log('  3. Update the empirical-rate-limiter.ts with new parameters');
    console.log('  4. Test the updated implementation with real-world usage');
    console.log('  5. Monitor for any remaining rate limit issues');
    
  } catch (error) {
    console.error('\n❌ Extended analysis failed:', error);
    console.error('\n🔍 Troubleshooting:');
    console.error('  • Check internet connection stability');
    console.error('  • Verify API token is valid and not expired');
    console.error('  • Ensure device ID is correct (if provided)');
    console.error('  • Check for any API service outages');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Extended analysis cancelled by user');
  console.log('Note: Partial results may have been exported to results/ directory');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Extended analysis terminated');
  process.exit(0);
});

// Run extended tests
runExtendedTests().catch(error => {
  console.error('💥 Fatal error in extended analysis:', error);
  process.exit(1);
});