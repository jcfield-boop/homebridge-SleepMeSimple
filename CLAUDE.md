# CLAUDE.md - Rate Limiting Fix Instructions

## Problem Summary
The API rate limiting system was too conservative, causing user interactions (temperature/power changes) to wait unnecessarily for rate limit boundaries instead of processing immediately. Users experienced 10-second delays when they should have had instant responses.

## Solution Overview
Implement priority-based rate limiting that reserves API capacity for user interactions while throttling background operations. User actions get immediate processing; background polling respects rate limits.

## Files to Modify

### 1. `src/settings.ts` - Update Rate Limiting Constants

**Purpose**: Adjust rate limiting parameters to be more responsive to user interactions.

**Changes Required**:
```typescript
// FIND these existing constants and UPDATE them:

/**
 * Minimum time between LOW PRIORITY API requests in milliseconds
 * Only applies to background polling - user interactions bypass this
 */
export const MIN_REQUEST_INTERVAL = 3000; // CHANGED: Reduced from 6000ms

/**
 * Background request threshold - start throttling background requests
 * when we reach this percentage of MAX_REQUESTS_PER_MINUTE
 * This reserves capacity for user interactions
 */
export const BACKGROUND_REQUEST_THRESHOLD = 0.8; // NEW: Add this constant

/**
 * Initial backoff time in milliseconds for rate limiting
 * Reduced for critical user interactions
 */
export const INITIAL_BACKOFF_MS = 5000; // CHANGED: Reduced from 30000ms

/**
 * Post-user-action quiet period in milliseconds
 * Reduced to allow quicker status verification after user actions
 */
export const USER_ACTION_QUIET_PERIOD_MS = 30000; // CHANGED: Reduced from 60000ms

/**
 * Command debounce delay in milliseconds
 * Prevents rapid-fire duplicate commands from users
 */
export const COMMAND_DEBOUNCE_DELAY_MS = 500; // CHANGED: Reduced from 800ms
```

**Key Concepts**:
- `MIN_REQUEST_INTERVAL`: Only applies to LOW priority requests (background polling)
- `BACKGROUND_REQUEST_THRESHOLD`: New concept - throttle background at 80% to reserve 20% for users
- Reduced timeouts across the board for better user responsiveness

---

### 2. `src/api/sleepme-api.ts` - Replace Queue Processing Logic

**Purpose**: Implement intelligent priority-based request processing that prioritizes user interactions.

**Location**: Replace the entire `processQueue()` method (around line 200-300)

**Key Changes**:

#### A. New Helper Methods (ADD these methods):

```typescript
/**
 * Determine if we should wait for rate limits based on request priority
 */
private shouldWaitForRateLimit(): { shouldWait: boolean; waitTime: number; message: string } {
  const now = Date.now();
  
  // Check if we have critical or high priority requests
  const hasCriticalRequest = this.criticalQueue.some(r => !r.executing);
  const hasHighPriorityRequest = this.highPriorityQueue.some(r => !r.executing);
  
  // Allow user requests to proceed even near rate limit
  if (hasCriticalRequest || hasHighPriorityRequest) {
    if (this.requestsThisMinute >= MAX_REQUESTS_PER_MINUTE) {
      const resetTime = this.minuteStartTime + 60000;
      const waitTime = resetTime - now + 1000;
      return {
        shouldWait: true,
        waitTime,
        message: `Rate limit reached, waiting for user request`
      };
    }
    return { shouldWait: false, waitTime: 0, message: '' };
  }
  
  // For background requests, be more conservative
  const backgroundThreshold = Math.floor(MAX_REQUESTS_PER_MINUTE * 0.8);
  if (this.requestsThisMinute >= backgroundThreshold) {
    const resetTime = this.minuteStartTime + 60000;
    const waitTime = resetTime - now + 1000;
    return {
      shouldWait: true,
      waitTime,
      message: `Background request threshold reached`
    };
  }
  
  return { shouldWait: false, waitTime: 0, message: '' };
}

/**
 * Handle rate limit errors with priority-aware backoff
 */
private handleRateLimitError(request: QueuedRequest): void {
  const now = Date.now();
  
  if (request.priority === RequestPriority.CRITICAL) {
    this.rateLimitBackoffUntil = now + 5000; // Only 5 seconds for critical
    this.logger.warn('Rate limit exceeded for critical request. Short backoff (5s)');
  } else {
    const currentMinute = Math.floor(now / 60000) * 60000;
    const nextMinute = currentMinute + 60000;
    const waitTime = (nextMinute - now) + 2000;
    this.rateLimitBackoffUntil = now + waitTime;
    this.logger.warn(`Rate limit exceeded. Waiting until next minute: ${Math.ceil(waitTime/1000)}s`);
  }
  
  this.requeueRequest(request);
}
```

#### B. Updated Main Processing Logic:

Replace the main `processQueue()` method with logic that:
1. Checks `shouldWaitForRateLimit()` instead of blanket rate limiting
2. Processes CRITICAL/HIGH priority requests even during backoff periods
3. Only applies `MIN_REQUEST_INTERVAL` to LOW priority requests
4. Uses `handleRateLimitError()` for smart 429 error handling

---

### 3. `src/api/sleepme-api.ts` - Update API Method Priorities

**Purpose**: Ensure user-initiated API calls use appropriate priorities for immediate processing.

**Methods to Update**:

#### A. `getDeviceStatus()` method:
```typescript
// FIND this line (around line 150):
const priority = isSystemInitiated ? RequestPriority.NORMAL : RequestPriority.HIGH;

// REPLACE with:
const priority = forceFresh ? RequestPriority.HIGH : RequestPriority.NORMAL;
```

#### B. `updateDeviceSettings()` method:
```typescript
// ADD a priority parameter to the method signature:
private async updateDeviceSettings(
  deviceId: string, 
  settings: Record<string, unknown>,
  priority: RequestPriority = RequestPriority.CRITICAL  // NEW parameter
): Promise<boolean>

// UPDATE the makeRequest call to use the priority parameter:
await this.makeRequest<Record<string, unknown>>({
  method: 'PATCH',
  url: `/devices/${deviceId}`,
  data: settings,
  priority: priority,  // CHANGED: use parameter instead of hardcoded CRITICAL
  deviceId,
  operationType: 'updateDeviceSettings'
});
```

#### C. Update calls to `updateDeviceSettings()`:
```typescript
// In turnDeviceOn():
const success = await this.updateDeviceSettings(deviceId, payload, RequestPriority.CRITICAL);

// In turnDeviceOff():
const success = await this.updateDeviceSettings(deviceId, payload, RequestPriority.CRITICAL);

// In setTemperature():
const success = await this.updateDeviceSettings(deviceId, payload, RequestPriority.HIGH);
```

---

### 4. `src/accessory.ts` - Update Accessory Priority Handling

**Purpose**: Ensure user interactions in HomeKit are marked with appropriate priorities.

**Methods to Update**:

#### A. Update logging in user interaction handlers:
```typescript
// In handleTargetTemperatureSet():
this.platform.log.info(`User set target temp: ${newTemp}°C for ${this.deviceId} - IMMEDIATE`);

// In handleTargetHeatingCoolingStateSet():
this.platform.log.info(`User power change: ${shouldPowerOn ? 'ON' : 'OFF'} for ${this.deviceId} - IMMEDIATE`);
```

#### B. Update status refresh priority:
```typescript
// In refreshDeviceStatus(), ensure background status checks use NORMAL priority:
const forceFresh = isInitialSetup;
const status = await this.api.getDeviceStatus(this.deviceId, forceFresh);
```

---

## Implementation Order

1. **Start with `settings.ts`** - Update constants first
2. **Update `sleepme-api.ts`** - Add helper methods, then replace processQueue()
3. **Update API method priorities** - Modify the API method calls
4. **Update `accessory.ts`** - Ensure user interactions use correct priorities
5. **Test thoroughly** - Verify user interactions are immediate

## Testing Verification

After implementing changes, verify:

1. **User Temperature Changes**: Should be instant (< 1 second response)
2. **User Power Changes**: Should be instant (< 1 second response) 
3. **Background Polling**: Should continue normally but not block user actions
4. **Rate Limit Compliance**: Should stay within 10 requests/minute overall
5. **Log Messages**: Should show priority levels in logs for debugging

## Key Architecture Concepts

- **Priority Queues**: CRITICAL > HIGH > NORMAL > LOW
- **Capacity Reservation**: Background requests throttle at 80% to reserve 20% for users
- **Smart Backoff**: Different backoff periods based on request priority
- **Queue Bypass**: User requests can jump ahead of background requests
- **Optimistic Updates**: UI updates immediately while API call processes in background

## Debugging Tips

- Look for priority levels in log messages: `[CRITICAL PRIORITY]`, `[HIGH PRIORITY]`
- Monitor queue lengths: Critical/High queues should stay small
- Check rate limit utilization: Should see background throttling before hitting limits
- Verify timing: User actions should log "IMMEDIATE" processing

## Common Pitfalls

1. **Don't** apply MIN_REQUEST_INTERVAL to user interactions
2. **Don't** wait for minute boundaries for CRITICAL/HIGH priority requests  
3. **Do** preserve the debounce logic to prevent rapid-fire user commands
4. **Do** maintain cache updating for optimistic UI responses
5. **Do** log priority levels for easier debugging