# Extended SleepMe API Rate Limiting Analysis

This extended test suite provides comprehensive analysis of the SleepMe API's rate limiting implementation, specifically designed to identify leaky bucket/token bucket parameters through systematic probing.

## Overview

The extended analysis runs for 2+ hours and performs systematic testing to determine:

- **Bucket Capacity**: Maximum number of requests that can be made in a burst
- **Token Refill Rate**: How quickly tokens are replenished (requests per second)
- **Refill Interval**: How often tokens are added to the bucket
- **Algorithm Type**: Whether the API uses fixed windows, sliding windows, or token bucket
- **Recovery Patterns**: How long it takes to recover from rate limiting

## Test Phases

### Phase 1: Burst Capacity Analysis (10 minutes)
- Tests maximum burst size before rate limiting
- Performs multiple burst tests with recovery periods
- Determines token bucket capacity

### Phase 2: Token Refill Rate Analysis (20 minutes)
- Tests various sustained request intervals
- Identifies sustainable request rates
- Calculates token refill rate

### Phase 3: Refill Interval Analysis (30 minutes)
- Tests recovery timing after bucket exhaustion
- Determines how often tokens are added
- Identifies discrete vs continuous refill patterns

### Phase 4: Long-term Pattern Analysis (60+ minutes)
- Validates parameters over extended duration
- Tests for consistency and edge cases
- Confirms sustainable operation

### Phase 5: Precision Testing (5 minutes)
- Tests derived parameters for accuracy
- Validates final recommendations
- Provides confidence assessment

## Usage

### Basic Setup
```bash
cd test-apps/sleepme-api-probe
npm install
cp .env.example .env
# Edit .env with your API token
```

### Running Extended Tests
```bash
# Full 2-hour comprehensive analysis
npm run extended

# Alternative command (same as extended)
npm run leaky-bucket
```

### Configuration Options
Edit `.env` to configure test parameters:

```env
# Extended test duration (default: 120 minutes)
EXTENDED_TEST_DURATION_MINUTES=120

# Individual phase durations
TOKEN_REFILL_ANALYSIS_MINUTES=20
BURST_CAPACITY_ANALYSIS_MINUTES=10
PRECISION_TESTING_MINUTES=5

# Basic settings
SLEEPME_API_TOKEN=your_token_here
SLEEPME_DEVICE_ID=your_device_id_here
VERBOSE_LOGGING=true
EXPORT_RESULTS=true
```

## Expected Output

The extended analysis provides:

### Real-time Progress
- Phase-by-phase progress updates
- Request counts and success rates
- Rate limit detection alerts
- Parameter estimation updates

### Final Analysis Report
```
🎯 Final Analysis
============================================
API Rate Limiting Implementation Analysis:
  Algorithm Type: Token Bucket / Leaky Bucket
  Bucket Capacity: 4 tokens
  Refill Rate: 0.0667 tokens/second
  Refill Interval: 15 seconds
  Confidence Level: high

📊 Test Statistics:
  Total Requests: 847
  Rate Limit Errors: 23
  Error Rate: 2.71%

🚀 Implementation Recommendations:
  • Implement token bucket with 4 token capacity
  • Refill 0.0667 tokens per second
  • Use 15s refill interval
  • Apply 25% safety margin to all parameters

⚠️  Conservative Implementation Advice:
  • Use 3 token bucket capacity
  • Limit to 0.0500 tokens/second
  • Wait 19s between refills
  • Implement exponential backoff on 429 errors
  • Use priority queues for critical operations
```

### Exported Data
Results are exported to `results/extended-leaky-bucket-analysis-[timestamp].json`:

```json
{
  "timestamp": "2025-07-17T10:30:00.000Z",
  "testDuration": 120,
  "totalRequests": 847,
  "finalAnalysis": {
    "estimatedBucketSize": 4,
    "estimatedRefillRate": 0.0667,
    "estimatedRefillInterval": 15000,
    "confidenceLevel": "high",
    "recommendations": [...]
  },
  "results": [...],
  "rawData": [...],
  "summary": {...}
}
```

## Implementation Guide

### Applying Results to Main Plugin

1. **Update empirical-rate-limiter.ts**:
   ```typescript
   this.config = {
     maxRequestsPerMinute: Math.floor(refillRate * 60 * 0.75), // 25% safety margin
     bucketCapacity: Math.floor(bucketSize * 0.75),
     refillInterval: Math.ceil(refillInterval * 1.25),
     // ... other config
   };
   ```

2. **Implement Token Bucket Logic**:
   ```typescript
   private tokens: number = this.config.bucketCapacity;
   private lastRefill: number = Date.now();
   
   shouldAllowRequest(): boolean {
     this.refillTokens();
     if (this.tokens > 0) {
       this.tokens--;
       return true;
     }
     return false;
   }
   
   private refillTokens(): void {
     const now = Date.now();
     const timeSinceLastRefill = now - this.lastRefill;
     const tokensToAdd = Math.floor(timeSinceLastRefill / this.config.refillInterval);
     
     if (tokensToAdd > 0) {
       this.tokens = Math.min(this.config.bucketCapacity, this.tokens + tokensToAdd);
       this.lastRefill = now;
     }
   }
   ```

3. **Add Priority Handling**:
   ```typescript
   // Critical requests can exceed bucket capacity
   if (priority === RequestPriority.CRITICAL) {
     // Allow but consume more tokens
     this.tokens = Math.max(0, this.tokens - 2);
     return true;
   }
   ```

## Safety Considerations

### API Impact
- Extended tests make hundreds of API requests
- Designed to find but not abuse rate limits
- Includes recovery periods between test phases
- Exports comprehensive data for analysis

### Rate Limit Respect
- Tests are designed to trigger rate limits systematically
- Includes exponential backoff when rate limited
- Respects API server stability
- Stops if excessive errors occur

### Resource Usage
- Tests run for 2+ hours
- Requires stable internet connection
- Exports detailed results for offline analysis
- Can be interrupted safely (partial results saved)

## Troubleshooting

### Common Issues
1. **Test fails immediately**: Check API token validity
2. **High error rates**: API may be under stress, wait and retry
3. **Inconsistent results**: Network instability, ensure stable connection
4. **No rate limits detected**: API may have very high limits or be malfunctioning

### Debug Mode
Enable verbose logging:
```env
VERBOSE_LOGGING=true
```

### Shorter Test Duration
For faster testing (less accurate):
```env
EXTENDED_TEST_DURATION_MINUTES=30
```

## Contributing

To enhance the extended analysis:

1. **Add New Test Phases**: Implement additional analysis phases in `extended-leaky-bucket-tests.ts`
2. **Improve Algorithms**: Enhance parameter estimation algorithms
3. **Add Visualizations**: Create charts and graphs from exported data
4. **Refine Analysis**: Improve confidence calculations and recommendations

## Results Interpretation

### High Confidence Results
- Multiple test phases confirm same parameters
- Low error rates during precision testing
- Consistent patterns across all phases

### Medium Confidence Results
- Some inconsistencies between phases
- Moderate error rates during testing
- Parameters estimated but need validation

### Low Confidence Results
- Significant inconsistencies
- High error rates throughout testing
- API behavior doesn't match expected patterns

Use conservative parameters (with larger safety margins) for medium/low confidence results.