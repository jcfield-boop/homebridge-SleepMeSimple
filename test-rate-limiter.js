/**
 * Quick test script to validate the new EmpiricalTokenBucketLimiter
 * Tests the rate limiter logic without making actual API calls
 */

import { EmpiricalTokenBucketLimiter } from './dist/api/empirical-token-bucket-limiter.js';
import { RequestPriority } from './dist/settings.js';

const limiter = new EmpiricalTokenBucketLimiter({
  bucketCapacity: 8,
  refillRatePerSecond: 1/20,
  minRecoveryTimeMs: 10000,
  safetyMargin: 0.2,
  allowCriticalBypass: true,
  criticalBypassLimit: 3,
  adaptiveBackoffMultiplier: 1.5,
  maxAdaptiveBackoffMs: 300000
});

console.log('🧪 Testing EmpiricalTokenBucketLimiter');
console.log('====================================');

// Test 1: Check initial state
console.log('\n📊 Test 1: Initial State');
let status = limiter.getStatus();
console.log(`Tokens: ${status.tokens.toFixed(2)}/${status.maxTokens}`);
console.log(`Refill rate: ${status.refillRate.toFixed(4)} tokens/second`);
console.log(`Success rate: ${status.successRate.toFixed(1)}%`);

// Test 2: Test burst capacity
console.log('\n🚀 Test 2: Burst Capacity');
let burstCount = 0;
for (let i = 0; i < 10; i++) {
  const decision = limiter.shouldAllowRequest(RequestPriority.NORMAL);
  if (decision.allowed) {
    burstCount++;
    limiter.recordRequest(RequestPriority.NORMAL, true, false);
    console.log(`Request ${i + 1}: ✅ Allowed (${decision.tokensRemaining.toFixed(2)} tokens remaining)`);
  } else {
    console.log(`Request ${i + 1}: ❌ Denied - ${decision.reason}`);
    break;
  }
}
console.log(`Burst capacity: ${burstCount} requests`);

// Test 3: Test refill behavior
console.log('\n⏱️  Test 3: Token Refill Behavior');
status = limiter.getStatus();
console.log(`Current tokens: ${status.tokens.toFixed(2)}`);
console.log(`Next token in: ${Math.ceil((status.nextTokenTime - Date.now()) / 1000)}s`);

// Simulate time passing
setTimeout(() => {
  console.log('\n⏱️  After 5 seconds:');
  const newStatus = limiter.getStatus();
  console.log(`Tokens: ${newStatus.tokens.toFixed(2)}/${newStatus.maxTokens}`);
  
  // Test another request
  const decision = limiter.shouldAllowRequest(RequestPriority.NORMAL);
  console.log(`Request allowed: ${decision.allowed ? '✅' : '❌'}`);
  if (!decision.allowed) {
    console.log(`Reason: ${decision.reason}`);
    console.log(`Wait time: ${Math.ceil(decision.waitTimeMs / 1000)}s`);
  }
}, 5000);

// Test 4: Test rate limit handling
console.log('\n🔴 Test 4: Rate Limit Handling');
limiter.recordRequest(RequestPriority.NORMAL, false, true); // Simulate rate limit
status = limiter.getStatus();
console.log(`After rate limit - Tokens: ${status.tokens.toFixed(2)}`);
console.log(`Adaptive backoff active: ${status.adaptiveBackoffActive}`);
console.log(`Consecutive rate limits: ${status.consecutiveRateLimits}`);

// Test 5: Test critical bypass
console.log('\n🚨 Test 5: Critical Request Bypass');
const criticalDecision = limiter.shouldAllowRequest(RequestPriority.CRITICAL);
console.log(`Critical request allowed: ${criticalDecision.allowed ? '✅' : '❌'}`);
console.log(`Reason: ${criticalDecision.reason}`);

// Test 6: Get recommendations
console.log('\n💡 Test 6: Recommendations');
const recommendations = limiter.getRecommendations();
recommendations.forEach((rec, i) => {
  console.log(`${i + 1}. ${rec}`);
});

// Test 7: Detailed stats
console.log('\n📈 Test 7: Detailed Statistics');
const detailedStats = limiter.getDetailedStats();
console.log(`Bucket capacity: ${detailedStats.empiricalParameters.bucketCapacity} tokens`);
console.log(`Refill rate: ${detailedStats.empiricalParameters.refillRatePerSecond.toFixed(4)} tokens/second`);
console.log(`Recovery time: ${detailedStats.empiricalParameters.minRecoveryTimeMs}ms`);
console.log(`Safety margin: ${detailedStats.empiricalParameters.safetyMargin * 100}%`);
console.log(`Success rate: ${detailedStats.performance.successRate.toFixed(1)}%`);

console.log('\n✅ Rate limiter validation complete!');
console.log('\nExpected behavior:');
console.log('  • 8 tokens initial burst capacity');
console.log('  • 1 token per 20 seconds refill rate');
console.log('  • 10 seconds minimum recovery after rate limits');
console.log('  • Critical requests can bypass with limits');
console.log('  • Adaptive backoff on consecutive failures');