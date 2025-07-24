# SleepMe API Empirical Rate Limiting Analysis

## Critical Findings

### Burst Capacity (Phase 1)
- **Reality**: 0-1 requests maximum before 429 error
- **Previous Estimate**: 8-10 tokens
- **Impact**: Token bucket capacity was drastically over-estimated

### Refill Pattern (Phase 2)  
- **10s Window**: Usually succeeds after 10s wait
- **Recovery**: ~15-30s windows where requests work
- **Rate Limit**: Frequent 429s even after successful requests
- **Pattern**: NOT continuous refill - appears to be discrete windows

### API Behavior Analysis
The SleepMe API appears to use:
1. **Very small burst capacity** (0-1 requests)
2. **Discrete time windows** (not token bucket)
3. **Window duration**: ~10-30 seconds
4. **Strict enforcement**: 429s dominate even with conservative requests

## Recommended Plugin Changes

### Immediate Actions
1. **Reduce burst capacity** from 10 to 1
2. **Increase base polling** from 90s to 120s minimum
3. **Implement discrete window logic** instead of token bucket
4. **Add much longer backoffs** (60s minimum)

### Code Changes Needed
```javascript
// Replace token bucket with discrete window approach
const WINDOW_DURATION = 60000; // 60 seconds
const REQUESTS_PER_WINDOW = 1;
let windowStart = 0;
let windowRequests = 0;

// Only allow 1 request per 60s window
```

## Status
- Phase 1: COMPLETE - Burst capacity = 0-1 requests
- Phase 2: PARTIAL - Recovery pattern identified  
- Phase 3: PENDING - Sustained rate testing
- Phase 4: PENDING - Window boundary analysis

**Next Steps**: Implement discrete window rate limiter based on findings.