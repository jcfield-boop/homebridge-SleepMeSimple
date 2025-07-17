/**
 * Validation test for empirical API parameters
 * Quick test to validate the 10-token bucket with 15-second refill
 */
import { SleepMeApiClient } from './api-client.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function runValidationTest(): Promise<void> {
  console.log('🎯 SleepMe API Parameter Validation Test');
  console.log('======================================');
  
  const apiToken = process.env.SLEEPME_API_TOKEN;
  if (!apiToken) {
    console.error('❌ SLEEPME_API_TOKEN required');
    process.exit(1);
  }

  const client = new SleepMeApiClient('https://api.developer.sleep.me/v1', apiToken);
  
  console.log('Testing empirical parameters:');
  console.log('  • Bucket capacity: 10 tokens');
  console.log('  • Refill rate: 1 token per 15 seconds');
  console.log('  • Continuous refill pattern');
  console.log('');

  // Test 1: Verify burst capacity
  console.log('🚀 Test 1: Burst Capacity Validation');
  console.log('Sending requests rapidly to find exact bucket size...');
  
  // Wait 2 minutes to ensure bucket is full
  console.log('Waiting 2 minutes to ensure bucket is full...');
  await client.wait(120000);
  
  let burstCount = 0;
  const burstStart = Date.now();
  
  for (let i = 0; i < 15; i++) {
    const result = await client.getDevices();
    const elapsed = Date.now() - burstStart;
    
    console.log(`[${i + 1}] ${result.success ? '✅' : '❌'} ${result.statusCode} (${elapsed}ms elapsed)`);
    
    if (result.statusCode === 429) {
      console.log(`⚠️  Rate limit hit after ${burstCount} successful requests`);
      break;
    }
    
    if (result.success) {
      burstCount++;
    }
    
    await client.wait(200); // Small delay to prevent overwhelming
  }
  
  console.log(`✅ Burst capacity confirmed: ${burstCount} tokens`);
  
  // Test 2: Verify refill rate
  console.log('\n⏱️  Test 2: Refill Rate Validation');
  console.log('Testing 15-second intervals for sustainability...');
  
  const refillTests = [];
  for (let i = 0; i < 5; i++) {
    console.log(`Waiting 15 seconds for token refill...`);
    await client.wait(15000);
    
    const result = await client.getDevices();
    refillTests.push(result.success);
    
    console.log(`[${i + 1}] ${result.success ? '✅' : '❌'} ${result.statusCode} (15s interval)`);
  }
  
  const refillSuccessRate = refillTests.filter(s => s).length / refillTests.length;
  console.log(`✅ 15-second interval success rate: ${(refillSuccessRate * 100).toFixed(1)}%`);
  
  // Test 3: Verify recovery time
  console.log('\n🔄 Test 3: Recovery Time Validation');
  console.log('Testing minimum recovery time after rate limit...');
  
  // Trigger rate limit
  let rateLimitTriggered = false;
  for (let i = 0; i < 3; i++) {
    const result = await client.getDevices();
    if (result.statusCode === 429) {
      rateLimitTriggered = true;
      console.log(`⚠️  Rate limit triggered on attempt ${i + 1}`);
      break;
    }
    await client.wait(500);
  }
  
  if (!rateLimitTriggered) {
    console.log('⚠️  Could not trigger rate limit, testing recovery anyway...');
  }
  
  // Test recovery intervals
  const recoveryIntervals = [5, 10, 15];
  for (const seconds of recoveryIntervals) {
    console.log(`Testing recovery after ${seconds} seconds...`);
    await client.wait(seconds * 1000);
    
    const result = await client.getDevices();
    console.log(`[${seconds}s] ${result.success ? '✅' : '❌'} ${result.statusCode}`);
    
    if (result.success) {
      console.log(`✅ Recovery confirmed after ${seconds} seconds`);
      break;
    }
  }
  
  // Test 4: Sustainable rate validation
  console.log('\n📊 Test 4: Sustainable Rate Validation');
  console.log('Testing 20-second intervals for reliability...');
  
  const sustainableTests = [];
  for (let i = 0; i < 4; i++) {
    console.log(`Waiting 20 seconds for sustainable rate...`);
    await client.wait(20000);
    
    const result = await client.getDevices();
    sustainableTests.push(result.success);
    
    console.log(`[${i + 1}] ${result.success ? '✅' : '❌'} ${result.statusCode} (20s interval)`);
  }
  
  const sustainableSuccessRate = sustainableTests.filter(s => s).length / sustainableTests.length;
  console.log(`✅ 20-second interval success rate: ${(sustainableSuccessRate * 100).toFixed(1)}%`);
  
  // Summary
  console.log('\n📈 Validation Summary');
  console.log('==================');
  console.log(`Burst Capacity: ${burstCount} tokens`);
  console.log(`15s Interval Success Rate: ${(refillSuccessRate * 100).toFixed(1)}%`);
  console.log(`20s Interval Success Rate: ${(sustainableSuccessRate * 100).toFixed(1)}%`);
  
  console.log('\n🎯 Recommendations:');
  if (burstCount >= 8) {
    console.log(`  ✅ Burst capacity of ${burstCount} tokens is sufficient for implementation`);
  } else {
    console.log(`  ⚠️  Burst capacity of ${burstCount} tokens is lower than expected`);
  }
  
  if (refillSuccessRate >= 0.8) {
    console.log(`  ✅ 15-second intervals are sustainable (${(refillSuccessRate * 100).toFixed(1)}% success)`);
  } else {
    console.log(`  ⚠️  15-second intervals may be too aggressive (${(refillSuccessRate * 100).toFixed(1)}% success)`);
  }
  
  if (sustainableSuccessRate >= 0.9) {
    console.log(`  ✅ 20-second intervals are highly reliable (${(sustainableSuccessRate * 100).toFixed(1)}% success)`);
  } else {
    console.log(`  ⚠️  20-second intervals need adjustment (${(sustainableSuccessRate * 100).toFixed(1)}% success)`);
  }
  
  console.log('\n🔧 Implementation Parameters:');
  console.log(`  • Bucket Capacity: ${Math.floor(burstCount * 0.8)} tokens (20% safety margin)`);
  console.log(`  • Refill Rate: 1 token per ${refillSuccessRate >= 0.8 ? 15 : 20} seconds`);
  console.log(`  • Sustainable Interval: ${sustainableSuccessRate >= 0.9 ? 20 : 25} seconds`);
  console.log(`  • Recovery Time: 10 seconds minimum`);
}

// Run validation test
runValidationTest().catch(error => {
  console.error('💥 Validation test failed:', error);
  process.exit(1);
});