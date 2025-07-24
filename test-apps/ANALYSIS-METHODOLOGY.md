# SleepMe API Rate Limiting Analysis Methodology

## Problem Statement

The current homebridge-sleepme-simple plugin experiences frequent 429 rate limit errors despite implementing sophisticated rate limiting. Empirical analysis is needed to determine the true rate limiting behavior of the SleepMe API.

## Evidence of Current Issues

From production logs:
- Token bucket shows identical counts over 2+ minute periods (not refilling properly)
- 429 errors occur with seemingly adequate tokens available  
- Recovery times don't match theoretical refill rates
- Burst capacity estimates appear incorrect

Example problematic log:
```
07:30:50: 8.07 tokens remaining
07:32:51: 8.07 tokens remaining (no refill in 2 minutes!)
08:02:14: 429 Rate Limit Hit with 0.03/9 tokens
```

## Analysis Approach

### Phase 1: Burst Capacity Discovery
**Goal**: Determine maximum number of rapid requests before first 429

**Method**: 
- Send requests as fast as possible (100ms intervals)
- Record first 429 error and count of successful requests
- Measure timing between requests and responses

**Expected Output**: True burst capacity (currently estimated at 8-10)

### Phase 2: Refill Rate Analysis  
**Goal**: Determine actual token refill rate

**Method**:
- Trigger rate limit (empty bucket)
- Test recovery at intervals: 5s, 10s, 15s, 20s, 25s, 30s, 45s, 60s, 90s, 120s, 180s
- Record first successful request after each wait period
- Calculate implied refill rate

**Expected Output**: Actual refill rate (currently estimated at 1 token per 15-20s)

### Phase 3: Sustained Rate Testing
**Goal**: Find maximum sustainable request frequency

**Method**:
- Test different intervals: 10s, 15s, 20s, 25s, 30s, 45s, 60s
- Send 10 requests at each interval
- Count consecutive successes before any 429
- Identify longest sustainable rate

**Expected Output**: Safe polling interval (currently using 90s base)

### Phase 4: Rate Limit Window Analysis
**Goal**: Determine if API uses discrete time windows

**Method**:
- Send requests at exact minute boundaries
- Send requests at mid-minute intervals  
- Compare rate limiting behavior
- Look for discrete reset patterns

**Expected Output**: Window behavior (fixed vs sliding window)

## Data Collection

Each request records:
- Timestamp (precise)
- HTTP status code
- Response time
- Any rate limit headers
- Request method and endpoint

## Analysis Tools

### `api-rate-limit-analyzer.js`
Main analysis engine that performs all four test phases systematically.

### `analyze-results.js`  
Post-processing tool that:
- Analyzes patterns in raw data
- Generates plugin configuration recommendations
- Produces code snippets for implementation
- Calculates confidence intervals

### `validate-setup.js`
Pre-flight checks to ensure:
- Configuration file exists and is valid
- API token is configured
- Dependencies are installed
- Network connectivity works

## Expected Outcomes

### Immediate
- Accurate rate limiting parameters for plugin
- Elimination of steady-state 429 errors
- Better user experience with responsive controls

### Long-term  
- Template for ongoing API behavior monitoring
- Ability to detect API changes over time
- Foundation for adaptive rate limiting

## Validation Criteria

Analysis is successful when:
1. **Reproducible**: Multiple runs produce consistent results
2. **Comprehensive**: All test phases complete with adequate data
3. **Actionable**: Clear recommendations for plugin configuration
4. **Effective**: Implementing recommendations eliminates 429 errors in testing

## Risk Mitigation

- **API Abuse**: Built-in delays prevent overwhelming the API
- **Partial Results**: Tool saves data incrementally in case of interruption  
- **Token Safety**: Only GET requests used, no device modifications
- **Rate Limit Recovery**: Extended waits between test phases

## Success Metrics

- Zero 429 errors in steady-state operation after implementing recommendations
- Responsive HomeKit controls (sub-2 second latency)
- Sustainable operation over 24+ hour periods
- Burst handling for user interactions

This methodology provides a scientific approach to solving the empirical rate limiting problem plaguing the plugin.