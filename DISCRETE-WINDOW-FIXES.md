# Discrete Window Rate Limiter Fixes - v7.0.27

## Issues Addressed

### 1. **Fixed Request Skipping Logic**
**Problem**: Window exhaustion caused ALL non-critical requests to return `null`, leading to parsing errors.

**Solution**: 
- Removed rate limiting from queue skipping logic (line 1286)
- Increased queue threshold from 5 to 8 items before skipping
- Added intelligent cache fallback when requests are skipped
- Let rate limiter handle rate limiting instead of pre-emptively dropping requests

### 2. **Added Intelligent Cache Fallback**
**Problem**: Rate-limited requests waited unnecessarily when cached data was available.

**Solution**:
- Check for cached data before waiting on rate limits (lines 919-945)
- Use cache if less than 2 minutes old for non-critical requests
- Remove request from queue and resolve with cached data
- Log cache usage for transparency

### 3. **Optimized Rate Limiter Configuration**
**Problem**: 22.5s minimum gaps were too conservative based on empirical 10-15s success windows.

**Solution**:
- Reduced `minWindowGapMs` from 22500ms to 15000ms (33% reduction)
- Reduced `windowDurationMs` from 90000ms to 75000ms (17% reduction)  
- Increased `safetyMargin` from 0.1 to 0.25 for balanced caution
- Based on empirical testing showing 10-15s success patterns

### 4. **Enhanced Logging**
**Problem**: Rate limiting messages were too verbose and appeared as errors.

**Solution**:
- Contextual message based on rate limit reason
- Debug level for expected waits ≤20s, info for longer waits
- Verbose details only when consecutive failures occur
- Clear explanation that API enforces discrete windows

### 5. **Added Helper Methods**
**Added**: `findRequestInQueues()` and `removeRequestFromQueue()` for proper queue management when using cache fallbacks.

## Expected Results

### Before Fixes:
```
[SleepMe Simple] Skipping non-critical status update due to queue backlog or low tokens
[SleepMe Simple] Empty response for device zx-cr48hfkn6kic7143dtkg
[SleepMe Simple] Status refresh error: Error: Failed to get status for device zx-cr48hfkn6kic7143dtkg
[SleepMe Simple] Discrete window rate limiter: Minimum gap not met, waiting 22s (0 requests remaining)
```

### After Fixes:
```
[SleepMe Simple] Using cached data for rate-limited request to device zx-cr48hfkn6kic7143dtkg (age: 45s)
[SleepMe Simple] Rate limited: waiting 15s between requests (API enforces discrete windows)
```

## Technical Impact

- **Responsiveness**: 33% faster minimum gaps (22.5s → 15s)
- **Reliability**: Eliminates null response errors through cache fallbacks
- **User Experience**: Transparent operation with contextual logging
- **Resource Efficiency**: Reduces unnecessary API calls through intelligent caching

## Configuration Changes

```typescript
// Old Configuration (v7.0.26)
windowDurationMs: 90000,    // 90s windows  
minWindowGapMs: 22500,      // 22.5s gaps
safetyMargin: 0.1           // 10% safety

// New Configuration (v7.0.27)  
windowDurationMs: 75000,    // 75s windows (17% faster)
minWindowGapMs: 15000,      // 15s gaps (33% faster)
safetyMargin: 0.25          // 25% safety (balanced)
```

This update maintains the empirical rate limiting benefits while fixing the usability issues that made the system appear broken to users.