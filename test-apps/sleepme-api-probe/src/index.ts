/**
 * Main entry point for SleepMe API rate limiting probe
 */
import { RateLimitTestRunner } from './test-runner.js';
import { TestConfig } from './types.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main(): Promise<void> {
  console.log('🔬 SleepMe API Rate Limiting Probe');
  console.log('==================================');

  // Validate required environment variables
  const apiToken = process.env.SLEEPME_API_TOKEN;
  if (!apiToken) {
    console.error('❌ SLEEPME_API_TOKEN environment variable is required');
    console.error('Please copy .env.example to .env and configure your API token');
    process.exit(1);
  }

  // Build test configuration
  const config: TestConfig = {
    apiToken,
    deviceId: process.env.SLEEPME_DEVICE_ID,
    baseUrl: 'https://api.developer.sleep.me/v1',
    testDurationMinutes: parseInt(process.env.TEST_DURATION_MINUTES || '10'),
    maxRequestsPerTest: parseInt(process.env.MAX_REQUESTS_PER_TEST || '100'),
    verboseLogging: process.env.VERBOSE_LOGGING === 'true',
    exportResults: process.env.EXPORT_RESULTS !== 'false'
  };

  console.log('Configuration:');
  console.log(`  API Token: ${config.apiToken.substring(0, 8)}...`);
  console.log(`  Device ID: ${config.deviceId || 'Not provided'}`);
  console.log(`  Base URL: ${config.baseUrl}`);
  console.log(`  Test Duration: ${config.testDurationMinutes} minutes`);
  console.log(`  Max Requests: ${config.maxRequestsPerTest}`);
  console.log(`  Verbose Logging: ${config.verboseLogging}`);
  console.log(`  Export Results: ${config.exportResults}`);

  // Confirm before running
  console.log('\\n⚠️  This will make API requests to the SleepMe API to test rate limiting behavior.');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
  
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    // Run tests
    const testRunner = new RateLimitTestRunner(config);
    await testRunner.runAllTests();
    
    console.log('\\n✅ All tests completed successfully!');
    console.log('\\nNext steps:');
    console.log('  1. Review the test results and recommendations');
    console.log('  2. Analyze the exported JSON data for detailed patterns');
    console.log('  3. Use findings to improve the main API client rate limiting');
    
  } catch (error) {
    console.error('\\n❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n👋 Test execution cancelled by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\\n👋 Test execution terminated');
  process.exit(0);
});

// Run main function
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});