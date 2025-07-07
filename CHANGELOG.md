# Changelog
## 6.12.5 (2025-01-07)

### Homebridge UX Compatibility Fix
- **Immediate Changelog Display Fix**: Ensures changelog displays properly in Homebridge v1.10.0 and UI v4.78.1
  - Publishes version with repository metadata already in place
  - Users upgrading from 6.12.4 → 6.12.5 will now see proper changelog display
  - Resolves "Release notes are only shown when updating to the latest version" message
  - Future updates will work correctly with new Homebridge UX requirements

## 6.12.4 (2025-01-07)

### Package Metadata Enhancement
- **Enhanced Package.json for Modern Homebridge UX**: Added required metadata fields for Homebridge v1.10.0 and UI v4.78.1
  - Added `repository` field with proper GitHub URL for changelog integration
  - Added `bugs` field for issue tracking integration
  - Added `homepage` field for better plugin discovery
  - Ensures proper changelog display in new Homebridge UX interface
  - Resolves "Release notes are only shown when updating to the latest version" requirement

## 6.12.3 (2025-01-07)

### Priority Assignment Refactoring
- **Context-Aware Priority System**: Replaced simple boolean flags with intelligent request prioritization
  - Added `RequestContext` interface to enable context-aware priority determination
  - Background polling for inactive devices now uses LOW priority instead of inappropriate HIGH priority
  - Active device polling uses NORMAL priority for better responsiveness without bypassing rate limits
  - Discovery operations now use LOW priority to avoid competing with user actions
  - Startup operations distinguish between user-triggered (HIGH) vs system-initiated (LOW) requests
- **Fixed Rate Limiting Issues**: Eliminated 429 errors during background polling with proper priority assignment
  - Aggressive polling was inappropriately using HIGH priority, bypassing rate limit protections
  - Background operations now respect rate limits while maintaining responsive user interactions
  - Context-aware system considers request source, urgency, device state, and operation type

### Technical Implementation
- **New RequestContext Interface**: Provides structured context for intelligent priority determination
  - `source`: 'user' | 'polling' | 'startup' | 'discovery' | 'system'
  - `urgency`: 'immediate' | 'routine' | 'background' | 'maintenance'
  - `deviceActive`: Boolean indicating if device is actively heating/cooling
  - `userTriggered`: Boolean indicating user-initiated vs system-initiated operations
  - `operation`: 'status' | 'control' | 'discovery' | 'validation'
- **Enhanced determinePriority() Method**: Context-aware logic replaces simple forceFresh boolean
  - User control actions remain CRITICAL priority for immediate responsiveness
  - User status requests use HIGH priority for immediate feedback
  - Active device routine polling gets NORMAL priority for good responsiveness
  - Background polling for inactive devices uses LOW priority
  - Discovery operations default to LOW priority unless user-triggered
- **Backward Compatibility**: Maintained existing API signatures while adding context-aware variants
  - `getDeviceStatus()` accepts both new RequestContext and legacy boolean parameters
  - All existing call sites updated to use appropriate context objects
  - No breaking changes to public API interface

### Benefits
- 🛡️ **Eliminated Rate Limiting**: Background polling no longer inappropriately bypasses rate limits
- 🎯 **Smarter Prioritization**: Context-aware system assigns priorities based on actual request importance
- ⚡ **Maintained Responsiveness**: User interactions remain immediate while background operations respect limits
- 🔄 **Better Resource Usage**: API capacity allocated appropriately based on request context
- 📊 **Consistent Behavior**: Eliminates unpredictable rate limiting from background operations

## 6.12.2 (2025-01-07)

### Performance Improvements
- **Aggressive polling for active devices**: Active devices (heating/cooling) now poll every 15 seconds instead of 3 minutes
  - Perfect API utilization: 15s interval matches 4 requests/minute rate limit exactly
  - Dramatically improved responsiveness for temperature monitoring and user interactions
  - Inactive devices continue efficient 2-minute polling to preserve API capacity
- **Smart user interaction joining**: User actions intelligently coordinate with scheduled polls
  - If scheduled poll is within 3 seconds, user action waits to "join" rather than duplicate
  - If poll is far away, triggers immediate poll and resets timer
  - Eliminates redundant API calls while maintaining immediate responsiveness
- **Dual polling system**: Separate optimized timers for active vs inactive devices
  - Active device timer: 15-second aggressive polling for real-time updates
  - Normal device timer: 2-minute standard polling for external change detection
  - Automatic switching based on device thermal status (active/heating/cooling vs standby/off)

### Technical Details
- Added `ACTIVE_DEVICE_POLL_INTERVAL` (15s) and poll timing coordination maps
- Enhanced `triggerDevicePollIfNeeded()` with smart joining logic (3s threshold)
- Implemented `pollActiveDevices()` and `pollSingleActiveDevice()` methods
- Updated accessory to use smart poll coordination after user actions
- Rate limiting protection via API client's existing priority system

### Benefits
- 🚀 **12x Faster Active Device Updates**: 15 seconds vs 3 minutes for active devices
- 🧠 **Smart API Usage**: Eliminates duplicate polls when user actions coincide with scheduled polls
- ⚡ **Immediate Responsiveness**: User actions trigger polls instantly when needed
- 🛡️ **Rate Limit Safety**: Perfect API utilization without exceeding limits
- 🔄 **Optimal Resource Usage**: Active devices get frequent updates, inactive devices remain efficient

**Result**: Near real-time monitoring for active devices while maintaining excellent API efficiency!

## 6.12.1 (2025-01-02)

### Bug Fixes
- **Fix thermostat-switch state synchronization**: Resolved state mismatch where thermostat showed AUTO while power switch showed OFF
  - Modified `getTargetHeatingCoolingState()` to return OFF when device is actually off instead of always AUTO
  - Added bidirectional sync logic in `handlePowerToggle()` to update thermostat when power switch changes
  - Enhanced `updateAllServices()` with cross-service validation and automatic correction
  - Added `syncThermostatState()` method for consistent state management
  - Implemented state consistency checks in `updateDeviceState()` for external control changes
  - Both power switch and thermostat now show consistent states while maintaining responsive temperature dial

## 6.12.0 (2025-01-07)

### Major Performance Optimization - Near-Immediate User Responsiveness ⚡
**Dramatically improved external change detection and API utilization for almost immediate user feedback.**

### Performance Improvements
- **Reduced Cache Duration**: Decreased from 30 minutes to 3 minutes base cache
- **Context-Aware Caching**: Dynamic cache periods based on user/device activity
  - User active: 60 seconds (immediate responsiveness) 
  - Device active: 90 seconds (temperature tracking)
  - Normal: 180 seconds (efficiency)
  - Idle: 300 seconds (conservation)
  - Rate limited: 600 seconds (recovery)
- **Faster Polling**: Reduced interval from 5 minutes to 2 minutes
- **Aggressive Polling Strategy**: Active devices poll every cycle, inactive every 2nd cycle
- **Better API Utilization**: Increased from 8% to 40-50% of available capacity

### User Experience
- **External Change Detection**: Reduced from 9+ minutes to 2-4 minutes
- **User Activity Tracking**: Automatically optimizes caching when users are active
- **Trust-Based Commands**: Maintains immediate user command feedback (no validation delays)
- **Smart Polling**: More frequent polls when needed, efficient when idle

### Technical Details
- **Available API Budget**: 240 requests/hour sustainable (4/minute)
- **New Usage Pattern**: ~100-120 requests/hour (50% utilization vs previous 8%)
- **Reserved Capacity**: 50% headroom for user interactions and bursts
- **Automatic Fallback**: Longer cache periods during rate limiting

### Benefits
- 🚀 **5x Faster External Change Detection**: Minutes instead of 9+ minutes
- ⚡ **Better API Efficiency**: 6x better utilization of available capacity
- 🎯 **Smart Resource Usage**: Context-aware optimization
- 🛡️ **Maintained Safety**: Robust rate limit protection with fallback

**Result**: Near real-time responsiveness while maintaining excellent rate limit safety!

## 6.11.14 (2025-01-07)

### Critical Rate Limiting Fix - Startup Collision ⚡
**Fixed 429 rate limit errors during startup caused by overlapping API requests.**

### Rate Limiting Fix
- **Startup Request Collision Fixed**: Initial status fetch and first polling cycle were colliding
  - Both requests fired within 1-2 seconds causing immediate 429 errors
  - Increased polling delay from 1s to 5s after discovery to prevent overlap
  - Ensures initial device status completes before polling begins
- **Cleaner Startup Sequence**: Eliminates race condition between initial fetch and polling

### Technical Details
- **Root Cause**: `req_1` (initial status) and `req_2` (poll cycle 1) fired simultaneously
- **Solution**: Delayed first poll cycle to 5 seconds after device discovery
- **Impact**: No more startup 429 errors and token bucket sync issues

### Benefits
- 🚫 **No More 429 Errors**: Clean startup without rate limiting collisions
- ⚡ **Stable Token Management**: Proper spacing between API requests
- 🔄 **Reliable Initialization**: Initial status always completes before polling starts

**Result**: Startup now works reliably without hitting rate limits on the very first requests!

## 6.11.13 (2025-01-07)

### Smart Initialization Fix - Target Temperature Reset 🎯
**Fixed target temperature initialization to always use current temperature at reboot for safer startup behavior.**

### Temperature Initialization
- **Safe Reboot Behavior**: Target temperature always set to current temperature on Homebridge restart
  - Prevents unwanted heating/cooling when system starts up
  - Target temperature no longer persists from previous sessions
  - Example: If room is 20.5°C at startup, target is set to 20.5°C (not previous 26°C setting)
- **Clear Startup Intent**: Neutral temperature state until user explicitly sets desired temperature
- **Improved Logging**: "Reboot initialization" messages clearly indicate startup behavior

### Benefits
- 🛡️ **Safe Startup**: No surprise heating/cooling when Homebridge restarts
- 🎯 **Predictable Behavior**: Target always matches current temperature initially
- 🔄 **Clean State**: Each restart begins with neutral temperature setting
- 📝 **Clear Logging**: Obvious distinction between reboot vs runtime behavior

### Runtime Behavior Unchanged
- External app temperature changes still respected during normal operation
- Long inactivity periods still reset target to current temperature
- All other defensive improvements from 6.11.12 remain active

**Result**: Much safer and more predictable startup behavior - no unexpected temperature changes when restarting Homebridge!

## 6.11.12 (2025-01-07)

### Defensive Improvements - Native App Coexistence 🤝
**Enhanced compatibility with native SleepMe app for seamless dual control.**

### External App Integration
- **Smart External Change Detection**: Plugin now detects when native SleepMe app changes temperature settings
  - Tracks API temperature changes that weren't initiated by HomeKit
  - Logs friendly "External control detected" messages instead of alarming warnings
  - Prevents smart initialization from overriding legitimate external temperature changes
- **Defensive Smart Temperature Logic**: More conservative initialization prevents conflicts
  - Only applies temperature overrides during true startup or after 5+ minutes of inactivity (vs 1 minute)
  - Completely skips smart initialization when recent external app activity detected
  - Respects external temperature settings from native app and schedules
- **Faster External Detection**: Reduced quiet period from 30s to 15s for quicker external change recognition

### Technical Improvements
- **External Activity Tracking**: New variables track external changes and timing
  - `lastKnownTargetTemp`: Monitors API temperature changes
  - `externalChangeDetected`: Flags recent external activity
  - `isFirstStatusUpdate`: Distinguishes startup from external changes
- **Improved Logging**: Clear distinction between HomeKit vs native app control
  - "🔄 External control detected" for native app changes
  - "⚡ HomeKit control" for HomeKit-initiated changes
- **Code Cleanup**: Removed unused debounce constant

### Benefits
- 🤝 **Seamless Dual Control**: Use both HomeKit and native SleepMe app without conflicts
- 🛡️ **Defensive Behavior**: Smart initialization won't interfere with external settings
- 📱 **Native App Friendly**: Respects temperature changes from SleepMe app and schedules
- 🔍 **Better Monitoring**: Clear logs distinguish between control sources

**Result**: Plugin now works harmoniously with native SleepMe app, allowing users to control devices from both interfaces without temperature override conflicts!

## 6.11.11 (2025-01-07)

### Power Switch Improvements - Instant Responsiveness ⚡
**Enhanced power toggle responsiveness with optimistic updates and duplicate command prevention.**

### UX Improvements
- **Instant Power Switch Feedback**: Power switch now shows ON/OFF state immediately when pressed
  - Uses optimistic updates for instant UI feedback
  - Automatically rolls back if API call fails
  - Eliminates the delay that caused users to press button multiple times
- **Duplicate Command Prevention**: Ignores duplicate power commands already in progress
  - Prevents multiple rapid OFF commands when user presses button repeatedly
  - Reduces unnecessary API calls and rate limiting issues

### Technical Enhancements
- **New `executeOperationWithRollback()` Method**: Supports optimistic updates with failure recovery
  - Performs UI update immediately
  - Calls API in background
  - Rolls back UI state if API fails
- **Enhanced Command Tracking**: Better detection of duplicate operations
- **Improved Error Handling**: Graceful recovery from API failures without user confusion

### Benefits
- ⚡ **Instant feedback**: Power switch responds immediately to button press
- 🚫 **No duplicate commands**: Prevents multiple OFF commands from rapid button pressing
- 🔄 **Smart rollback**: Automatically recovers from API failures
- 📱 **Better UX**: Feels like a native app with instant response

### All Previous Features Included
- Temperature dial always responsive (1-2 second startup)
- Smart target temperature initialization
- Enhanced debug logging and firmware display
- Complete delay elimination for fast startup

**Result**: Power switch now feels instant and prevents the multiple command issues seen in logs!

## 6.11.10 (2025-01-07)

### Major UX Improvements - Temperature Dial Responsiveness 🚀
**Stable release with dramatically improved startup performance and temperature dial usability.**

### Temperature Dial UX Fixes
- **Fixed Temperature Dial Responsiveness**: Temperature dial is now always interactive
  - Thermostat service always kept in AUTO mode for dial responsiveness
  - No need to manually select "Auto" first before adjusting temperature
  - Power state shown separately via power switch service
- **Smart Target Temperature Initialization**: Target temperature intelligently defaults to current temperature
  - Prevents unwanted heating/cooling on startup
  - Accounts for environmental temperature changes
  - Only uses API target temperature when device is actively controlled

### Performance Improvements
- **Eliminated All Unnecessary Delays**: Near-instant startup performance
  - Removed 60-second device discovery delay → Immediate
  - Removed 10-second device initialization delays → Immediate
  - Removed 2-second status fetch delays → Immediate
  - Reduced polling delays from 30s to 1s
  - Removed redundant manual debouncing (HomeKit handles this natively)
- **Optimized API Strategy**: Smart caching with fallback to fresh calls
  - Initial status uses cached data first to avoid rate limiting
  - Improved token bucket synchronization prevents 429 errors
  - Enhanced rate limiting with empirically-tested values (7 tokens, 15s refill)

### Technical Improvements  
- **Enhanced Power Switch Sync**: Better reliability for hybrid interface mode
  - Dual-checking approach for power switch state
  - Enhanced debug logging for troubleshooting
- **Fixed Firmware Version Display**: Proper extraction from API responses
  - Debug logging shows API response structure
  - Correctly displays firmware version (e.g., "5.39.2134")
- **Improved Device State Management**: Better initialization and updates
  - Immediate device status on startup
  - Proper handling of device power state changes

### Performance Timeline
- **Before**: 60s discovery + 10s×devices + 2s status + 30s polling = 100+ seconds
- **After**: Immediate discovery + immediate setup + immediate status + 1s polling = **1-2 seconds total**

### Key Benefits
- 🚀 Temperature dial responsive within 1-2 seconds of startup
- 🌡️ Always interactive temperature control (no manual mode switching)
- 🎯 Intelligent temperature defaults prevent unwanted heating/cooling
- ⚡ Dramatically faster startup and response times
- 🔄 Auto-power-on when temperature is adjusted
- 🔌 Clear separation of temperature control vs power control

## 6.12.0-beta.15 (2025-01-07)

### BETA Release - Eliminate Initialization Delays ⚡
⚠️ **This is a beta release for testing. Please test thoroughly before using in production.**

### Performance Improvements
- **Eliminated Device Discovery Delay**: Devices now initialize immediately when Homebridge starts
  - Removed unnecessary 5-second startup delay
  - Device discovery starts instantly after Homebridge launch
  - Temperature dial responsive within seconds, not minutes

- **Optimized Initial Status Fetch**: Smart caching strategy to avoid rate limiting
  - Tries cached data first for immediate state
  - Falls back to fresh API call with 2-second delay if no cache
  - Prevents 429 rate limit errors on startup

- **Reduced Polling Delays**: First poll cycle starts in 10 seconds instead of 30

### Timeline Improvements
- **Before**: Discovery delay (60s) + Status fetch (0-30s) + Polling (30s) = 90-120s total
- **After**: Discovery (immediate) + Cached status (immediate) + Fresh status (2s) = 2-10s total

### Expected Results
- Temperature dial responsive within 2-10 seconds
- Device state shows correctly almost immediately  
- Dramatically faster startup experience
- No more long waits for basic functionality

### All Previous Fixes Included
- Temperature dial always responsive (AUTO mode)
- Smart target temperature initialization
- Firmware version working correctly
- Enhanced debug logging

## 6.12.0-beta.14 (2025-01-07)

### BETA Release - Smart Target Temperature Initialization 🎯
⚠️ **This is a beta release for testing. Please test thoroughly before using in production.**

### Critical UX Improvement
- **Smart Target Temperature Initialization**: Target temperature now intelligently defaults to current temperature
  - When device is OFF and no recent user interaction, target = current temperature
  - Prevents device from immediately heating/cooling to arbitrary API values
  - Accounts for environmental temperature changes
  - Only uses API target temperature when device is actively controlled

### Logic Details
- **Initial State**: Target temperature matches current temperature (no unwanted heating/cooling)
- **User Interaction**: Target temperature follows user input (normal operation)
- **Device Active**: Uses API target temperature (device is intentionally running)
- **Environmental Changes**: Target adjusts to current temperature automatically

### Technical Implementation
- Enhanced target temperature update logic in `onStatusUpdate()`
- Tracks user interaction timing to distinguish initialization vs operation
- Smart detection of device power state and thermal status
- Debug logging for target temperature decisions

### Benefits
- 🌡️ No unexpected heating/cooling when accessory loads
- 🎯 Target temperature makes sense relative to current environment
- 🔄 Still responsive to user temperature changes
- 🏠 Better integration with room temperature changes

### Previous Fixes (Still Included)
- Temperature dial always responsive (AUTO mode)
- Device state initialization
- Firmware version debug logging
- Enhanced debug output

## 6.12.0-beta.13 (2025-01-07)

### BETA Release - Fix Temperature Dial Responsiveness 🌡️
⚠️ **This is a beta release for testing. Please test thoroughly before using in production.**

### Critical UX Fix
- **Fixed Temperature Dial Unresponsiveness**: Temperature dial is now always interactive
  - Root cause: Thermostat service was in `OFF` mode when device was powered off
  - When thermostat is in `OFF` mode, HomeKit disables the temperature dial
  - Solution: Always keep thermostat service in `AUTO` mode for dial responsiveness
  - Power state is separately shown via the power switch service

### Technical Changes
- Modified `getTargetHeatingCoolingState()` to always return `AUTO`
- Updated power state verification to maintain `AUTO` mode
- Enhanced heating/cooling state handler with better UX
- Users can still turn device OFF via thermostat, but it resets to AUTO after 1 second

### User Experience Improvements
- 🌡️ Temperature dial is now always responsive (no need to select Auto first)
- 🔄 Changing temperature will auto-power the device and switch to AUTO mode
- 🔌 Power switch service separately shows actual device power state
- 🎯 Clean separation of temperature control vs power control

### Testing Focus
- Verify temperature dial is immediately responsive on startup
- Test temperature changes auto-power the device
- Confirm power switch service shows correct device state
- Check that turning thermostat to OFF still works (but resets to AUTO)

## 6.12.0-beta.12 (2025-01-07)

### BETA Release - Enhanced Temperature Dial Debug Logging
⚠️ **This is a beta release for testing. Please test thoroughly before using in production.**

### Debug Enhancement
- **Enhanced Temperature Dial Debug Logging**: Added detailed logging to diagnose power switch sync
  - Shows when temperature dial is changed with current device state
  - Logs power switch sync checks with HomeKit vs internal state
  - Uses emojis for easy log identification
  - Will help identify exactly what happens during temperature changes

### Testing Instructions
When you change the temperature dial, look for these log messages:
- 🌡️ Temperature dial changed to [temp]°C
- 🟢 Auto-switching to AUTO mode and power ON for temperature change  
- 🔌 Power switch sync check: HomeKit=[state], Internal=[state]
- 🟢 Auto-switching power switch to ON for temperature change
- 🟡 Power switch already ON - no sync needed
- ⚠️ Warning messages if services are missing

### Previous Fixes (Still Included)
- Fixed device state initialization with immediate status fetch
- Firmware version debug logging (working correctly)
- Reduced polling delays for faster response

## 6.12.0-beta.11 (2025-01-07)

### BETA Release - Fix Device State Initialization
⚠️ **This is a beta release for testing. Please test thoroughly before using in production.**

### Critical Fixes
- **Fixed Device State Initialization**: Devices now get current status immediately
  - Added immediate status fetch after accessory initialization
  - Reduced polling manager initial delay from 8 minutes to 30 seconds
  - Eliminates "device already OFF" false messages
  - Ensures HomeKit interface shows correct current state on startup

### Improvements
- **Faster Startup Response**: Device status updates within 30 seconds instead of 8+ minutes
- **Better State Synchronization**: HomeKit interface immediately reflects actual device state
- **Enhanced Debug Logging**: Shows initial status fetch attempts and results

### Technical Details
- Polling manager was using extremely conservative 8-minute startup delay
- Added `fetchInitialStatus()` method called immediately after accessory setup
- This provides current device state while polling manager starts up
- Users will see correct power/temperature state right away

### Testing Focus
- Verify devices show correct current state (on/off, temperature) immediately on startup
- Check that initial status fetch logs appear in debug output
- Confirm no more "device already OFF" messages when device is actually on
- Temperature dial should work correctly with proper device state

## 6.12.0-beta.10 (2025-01-07)

### BETA Release - Enhanced Power Switch Sync + Firmware Debug
⚠️ **This is a beta release for testing. Please test thoroughly before using in production.**

### Temperature Dial UX Fixes
- **Enhanced Power Switch Sync Logic**: Improved reliability of temperature dial auto-power-on
  - Now checks both HomeKit characteristic value AND internal device state
  - Added detailed debug logging to diagnose sync issues
  - Should reliably turn on power switch when temperature is adjusted
  - Addresses issue where users still had to manually switch to Auto first

### Firmware Version Debug Enhancement
- **Added Comprehensive Firmware Debug Logging**: Enhanced API response parsing diagnostics
  - Logs both 'about.firmware_version' and 'firmware_version' extraction attempts
  - Shows available keys in 'about' object when present
  - Helps identify if firmware data is returned but in unexpected format
  - Debug logs will show exact API response structure for firmware investigation

### Technical Improvements
- Power switch sync now uses dual-checking approach for maximum reliability
- Enhanced logging provides visibility into both HomeKit and internal device states
- Firmware parsing debug will help identify API response format changes

### Testing Focus
- Verify temperature dial now works in single step (no manual Auto switch needed)
- Check debug logs for power switch sync behavior details
- Look for firmware extraction debug messages to identify API response structure
- Test that both thermostat Auto state and power switch On state update together

## 6.12.0-beta.8 (2025-01-07)

### BETA Release - Fixed Power Switch Sync Logic
⚠️ **This is a beta release for testing. Please test thoroughly before using in production.**

### Critical Fixes
- **Fixed Power Switch Sync Logic**: Temperature dial now properly detects and updates power switch state
  - Previous logic used internal device state which was unreliable
  - Now checks actual HomeKit power switch characteristic value
  - Should finally enable true one-step temperature setting (dial → both auto & power switch on)

- **Fixed HomeKit Temperature Validation Errors**: Eliminated invalid temperature value warnings
  - Added proper bounds checking to prevent values below HomeKit minimums
  - Current temperature readings now respect MIN_TEMPERATURE_C limits
  - Target temperature defaults now use valid ranges

### Debug Information
- Previous logs showed "Auto-switching to AUTO mode" working (thermostat side)
- But power switch sync wasn't triggering due to incorrect state checking
- Firmware version issue: API returning `undefined` instead of version string

### Technical Details
- Changed from checking `!this.isPowered` to checking actual HomeKit characteristic value
- This ensures power switch sync works regardless of internal state confusion
- Added Math.max() guards to prevent HomeKit validation errors on temperature values

### Testing Focus
- Verify temperature dial changes now update BOTH thermostat (Auto) AND power switch (On)
- Confirm no more HomeKit temperature validation errors in logs
- Check that one-step temperature setting workflow finally works end-to-end

## 6.12.0-beta.7 (2025-01-07)

### BETA Release - Temperature Dial & Firmware Debug Fixes
⚠️ **This is a beta release for testing. Please test thoroughly before using in production.**

### User Experience Fixes
- **Fixed Temperature Dial Power Sync**: Temperature changes now properly update both thermostat AND power switch
  - In hybrid mode, changing temperature on the dial now automatically turns on the power switch too
  - No longer need to manually switch Off→Auto then set temperature
  - Both the thermostat state (Auto) and power switch (On) update simultaneously
  - Provides true one-step temperature setting experience

### Debug Improvements  
- **Added Firmware Version Debug Logging**: Enhanced logging to diagnose firmware display issues
  - Will show API vs Current firmware versions in debug logs
  - Helps identify if firmware version is being received from API but not updating display
  - Added detailed logging for firmware update process

### Technical Details
- The issue was that hybrid mode has separate services (Power Switch + Thermostat)
- Temperature changes were only updating the thermostat service's heating/cooling state
- Power switch service wasn't being updated, so users had to manually switch it
- Now both services update in sync for seamless user experience

### Testing Focus
- Verify temperature dial changes automatically turn on power switch in hybrid mode
- Check debug logs for firmware version comparison (if issue persists)
- Confirm both thermostat Auto state and power switch On state update together

## 6.12.0-beta.6 (2025-01-07)

### BETA Release - Restore Empirical Rate Limits + Server Sync Fix
⚠️ **This is a beta release for testing. Please test thoroughly before using in production.**

### Major Fixes
- **Restored Empirically-Tested Rate Limits**: Reverted from overly conservative to proven working values
  - Token bucket: 2→7 tokens max (empirically tested burst capacity)
  - Refill rate: 60s→15s per token (4 requests/minute sustainable vs 1/minute)
  - Start with 3 tokens instead of 0 (conservative but not empty)
  - Based on actual testing rather than panic-induced over-conservation

- **Server Synchronization Fix**: Fixed client/server token bucket sync issues causing immediate 429s
  - Added `syncToServerEmpty()` method to align client bucket with server state
  - When 429 occurs, sync our bucket to match server's empty state
  - Should eliminate most "impossible" 429 errors on first requests

- **Reasonable Delays Restored**: 
  - Startup delay: 5 minutes→1 minute (reasonable vs excessive)
  - Polling interval: 15 minutes→5 minutes (conservative but usable)
  - Based on actual empirical testing limits rather than fear

### Technical Details
- The issue wasn't that we needed to be more conservative than documented limits
- Client-side token bucket was out of sync with server's actual state
- Server bucket was already empty when client thought it had tokens available
- Now properly syncs buckets on 429 errors to prevent future misalignment

### Benefits
- Much more responsive background updates (5 minute vs 15 minute polling)
- Faster startup (1 minute vs 5 minute delay)
- User commands should face much less waiting (4x more token capacity)
- Smarter rate limiting based on actual API behavior rather than guesswork

### Testing Focus
- Verify 429 errors are significantly reduced or eliminated
- Confirm faster polling and startup times work reliably
- Check that server sync prevents cascading 429 failures
- Ensure user commands are much more responsive

## 6.12.0-beta.5 (2025-01-07)

### BETA Release - Critical UX & Rate Limiting Fixes
⚠️ **This is a beta release for testing. Please test thoroughly before using in production.**

### Critical Fixes
- **Improved Thermostat UX**: Temperature changes now automatically switch device to AUTO mode
  - Users can now simply adjust temperature dial and device turns on automatically
  - No longer need to manually switch Off→Auto→Temperature
  - Still respects 10-second cooldown if device was recently turned off
  - Much more intuitive user experience

- **Extreme Rate Limiting**: Addressed severe API rate limiting that was causing immediate 429 errors
  - Reduced token bucket from 3→2 tokens maximum capacity
  - Increased token refill from 30s→60s per token (1 request per minute sustainable)
  - Start with 0 tokens instead of any initial burst to avoid startup 429s
  - Increased startup delay from 3→5 minutes after Homebridge launch
  - Increased default polling from 10→15 minutes for maximum safety

### Technical Details
- SleepMe API is rejecting even CRITICAL priority user commands with immediate 429 errors
- This extreme conservation approach should finally work around the severe API enforcement
- User commands still get priority but must wait for token availability
- Background polling heavily throttled to preserve capacity for user actions

### Breaking Changes  
- Much slower background updates (15 minute polling vs 10 minutes)
- 5 minute delay before first API calls after startup
- Some user commands may need to wait up to 60 seconds if token bucket is empty

### Testing Focus
- Verify temperature dial changes automatically turn device to AUTO mode
- Confirm no immediate 429 errors on any operations
- Test that user commands eventually succeed (may be delayed)
- Ensure extreme rate limiting doesn't break core functionality

## 6.12.0-beta.4 (2025-01-07)

### BETA Release - HomeKit Interface Simplification
⚠️ **This is a beta release for testing. Please test thoroughly before using in production.**

### User Experience Improvements
- **Simplified HomeKit Interface**: Fixed hybrid interface to show only Off/Auto states instead of Off/Cool/Heat/Auto
  - Matches SleepMe device capabilities (single thermal mode with heating/cooling combined)
  - Eliminates confusing Heat/Cool options that don't apply to SleepMe devices
  - More intuitive user experience in HomeKit apps
  - Automatic switch to AUTO mode when setting target temperature (already working)

### Technical Details
- Applied the same `validValues` restriction from legacy thermostat interface to hybrid interface
- Only affects the HomeKit UI presentation, all functionality remains identical
- Users will see cleaner Off/Auto toggle instead of four-option picker

### Breaking Changes
- None - purely cosmetic UI improvement

### Testing Focus
- Verify HomeKit interface now shows only Off/Auto options in thermostat control
- Confirm setting target temperature automatically switches to Auto mode when device is off
- Ensure power and temperature controls work identically to before

## 6.12.0-beta.3 (2025-01-07)

### BETA Release - Ultra-Conservative Rate Limiting Fix
⚠️ **This is a beta release for testing. Please test thoroughly before using in production.**

### Critical Fixes
- **Ultra-Conservative Rate Limiting**: Addressed immediate 429 errors on startup
  - Reduced token bucket from 7→3 tokens maximum capacity
  - Increased token refill interval from 15s→30s per token  
  - Start with only 1 token instead of full bucket to avoid burst issues
  - Increased cache validity from 8→30 minutes to reduce API dependency

- **Extended Startup Delays**: Added longer delays to prevent immediate API conflicts
  - Increased initial discovery delay from 1→3 minutes after Homebridge startup
  - Default polling interval increased from 5→10 minutes for safety
  - Much more conservative approach to handle stricter API enforcement

### Technical Details
- SleepMe API appears to have become more restrictive than previous empirical testing indicated
- Even with token bucket showing available capacity, API returns 429 errors immediately
- This release implements extreme conservation to work around the API issues
- User commands (power/temperature) still prioritized and can bypass some limits

### Breaking Changes
- Much slower background updates (10 minute polling vs 3 minutes)
- Longer cache periods may show stale data longer
- Slower multi-device initialization

### Testing Focus
- Verify no more immediate 429 errors on startup
- Check that polling eventually succeeds without rate limit errors
- Ensure user commands still work responsively despite conservative limits

## 6.12.0-beta.2 (2025-01-07)

### BETA Release - Startup Performance Improvements
⚠️ **This is a beta release for testing. Please test thoroughly before using in production.**

### Performance Improvements
- **Removed API Startup Delay**: Eliminated 5-second artificial delay for immediate plugin responsiveness
  - API requests now execute immediately upon plugin startup
  - User commands no longer wait for arbitrary delay period
  - Token bucket system provides sufficient rate limiting protection

- **Faster Multi-Device Initialization**: Reduced device setup delays from 45s to 10s between devices
  - 3 devices now initialize in ~30 seconds vs ~2 minutes previously
  - 4x faster multi-device setup while still respecting API rate limits
  - Improved token bucket handles rate limiting more intelligently

### Technical Details
- Startup delays were originally added during rapid development when rate limiting was less understood
- Current sophisticated rate limiting (token bucket, priority queues, request deduplication) makes crude delays unnecessary
- CRITICAL priority requests (user commands) already bypassed delays anyway
- Background operations remain properly throttled by token bucket system

### Breaking Changes
- None - all functionality preserved, just faster execution

### Testing Focus
- Plugin startup responsiveness (should be immediate)
- Multi-device setup time (should be much faster)
- Rate limiting behavior (should be unchanged)
- User command execution (should be immediate from startup)

## 6.12.0-beta.1 (2025-01-07)

### BETA Release - Code Refactoring & Simplification
⚠️ **This is a beta release for testing. Please test thoroughly before using in production.**

### Refactored & Simplified
- **Power Handling Unification**: Merged duplicate power handling logic into single `setPowerState()` method
  - Eliminated ~60 lines of duplicate code between thermostat and switch power handlers
  - Improved consistency and maintainability of power state management
  - Single source of truth for power operations across all interface modes

- **Service Updates Consolidation**: Streamlined HomeKit service updates 
  - Replaced 3 separate update methods (`updateSwitchServices`, `updateHybridServices`, `updateThermostatServices`) with unified approach
  - Added `updateServiceCharacteristic()` helper method for safer updates
  - Reduced redundant characteristic updates across interface modes

- **Simplified Debouncing**: Replaced complex `createSmartDebounce()` with simple timeout-based debouncing
  - Removed ~45 lines of over-engineered debouncing logic with leading/trailing edge handling  
  - Simpler, more maintainable debouncing that's easier to debug
  - Identical functionality with cleaner implementation

- **API Methods Streamlining**: Consolidated device control patterns into unified method
  - Created `controlDevice()` method to handle 'on', 'off', and 'temperature' actions
  - Eliminated duplicate error handling, cache updates, and logging patterns
  - Reduced API-related code by ~80 lines while preserving all functionality

### Code Quality Improvements
- **Reduced Lines of Code**: Overall reduction of ~200-250 lines across the codebase
- **Better Maintainability**: Single methods for common operations reduce future bugs
- **Preserved Functionality**: All existing features and behaviors maintained
- **Cleaner Architecture**: More focused, single-purpose methods

### Testing Notes
- All HomeKit interfaces (Switch, Thermostat, Hybrid) should work identically to before
- Power commands, temperature changes, and service updates should be unchanged from user perspective
- Rate limiting and API behavior should be identical
- Please test all interface modes and report any issues

## 6.11.9 (2025-01-07)

### Added
- **Changelog Support**: Added CHANGELOG.md file to display update notes in Homebridge UI
  - Users will now see detailed changelog when updating the plugin
  - Provides clear information about fixes and improvements in each release

## 6.11.8 (2025-01-07)

### Fixed
- **Responsiveness Issues**: Fixed race conditions causing unresponsive power commands
  - Resolved cache state inconsistencies that caused incorrect power state reporting
  - Fixed duplicate power commands that created API conflicts
  - Added prevention of redundant OFF commands to reduce unnecessary API calls
  
- **Rate Limiting**: Improved handling of server/client rate limit window misalignment
  - Enhanced rate limit window reset logic with proper minute alignment
  - Better detection and recovery from API rate limit windows
  - Reduced false rate limit triggers during normal operation

- **Power State Handling**: Enhanced command coordination and request management
  - Added proper epoch tracking to prevent stale commands from executing
  - Improved request cancellation to avoid race conditions
  - Enhanced power state setter with better request lifecycle management

### Technical Improvements
- Added helper method to infer power state from thermal status for better logging
- Improved cache update logging to show accurate state transitions
- Enhanced debugging output for troubleshooting responsiveness issues

## 6.11.7 (2024-12-XX)

### Previous Release
- See git history for details on version 6.11.7 changes

## 6.11.5 (2025-06-15)

### Fixed
- **Service Synchronization**: Fixed issue where switch and thermostat accessories didn't stay synchronized
  - Switch accessory now correctly reflects power state when changed via thermostat
  - Thermostat accessory now correctly reflects power state when changed via switch
  - Added comprehensive service synchronization after all power state changes
  - Ensured all HomeKit services update consistently regardless of control method

- **Active Device Monitoring**: Implemented aggressive polling for devices that are actively heating/cooling
  - Active devices now get 3x more frequent status updates for better progress monitoring
  - Polling manager automatically detects active vs inactive devices
  - Fresh API calls every 3rd cycle for active devices vs every 10th cycle for inactive devices
  - Auto-cleanup of stale active device tracking after 30 minutes

### Improved
- **Polling Intelligence**: Enhanced centralized polling with device activity awareness
  - Added device activity state tracking with automatic detection
  - Implemented rate limit preservation for inactive devices
  - Better monitoring of temperature progress when devices are heating/cooling
  - Optimized API usage based on actual device activity

### Technical
- **Active Device Tracking**: Added comprehensive device activity management
  - New `notifyDeviceActive()` and `notifyDeviceInactive()` methods
  - Activity timestamp tracking for automatic cleanup
  - Enhanced polling statistics with active device counts
  - Improved service synchronization across all interface modes

## 6.10.0 (2025-06-03)

### Critical Bug Fix
- **Device Turns Off During Daily Re-discovery**: Fixed critical bug causing devices to turn off every 24 hours
  - Daily device discovery was re-initializing accessories with OFF state
  - Accessory initialization was not preserving current device state
  - Added configuration option to disable automatic re-discovery
  - Device was being commanded OFF during 24-hour timer cycle

### Fixed
- **Rate Limiting During Re-initialization**: Fixed cascade of API calls during device re-discovery
  - Device discovery followed immediately by OFF command and polling caused rate limits
  - Re-initialization now preserves device state to prevent unnecessary commands
  - Improved request spacing during initialization sequences
  - Replaced minute-alignment with exponential backoff for rate limit handling

### Added
- **Configuration Option**: Added `disableAutoDiscovery` to prevent daily re-discovery
  - Allows users to disable the 24-hour discovery timer
  - Prevents unexpected device state changes
  - Recommended for stable installations

### Improved
- **State Change Logging**: Enhanced logging for unexpected device state changes
  - Added detection of non-user-initiated state changes
  - Improved debugging information with time since last user action
  - Better visibility into device behavior

### Technical
- **State Management**: Improved device state preservation during re-initialization
  - Removed default state assignment during accessory setup
  - Allows first status poll to set correct state instead of assuming OFF
  - Better separation between initialization and state management
- **Rate Limiting**: Implemented exponential backoff instead of minute boundary alignment
  - More robust handling of 429 responses
  - Prevents assumptions about server-side rate limit windows
  - Reduces failed requests during high load periods

## 6.9.7 (2025-05-29)

### Fixed
- **Rate Limiting**: Added missing minimum request interval enforcement
  - Enforces 6-second minimum gap between individual API requests
  - Reduces max requests per minute from 10 to 3 for conservative rate limiting
  - Prevents rapid-fire requests that trigger SleepMe's 429 rate limit errors
  - Fixes critical bug where MIN_REQUEST_INTERVAL was defined but never enforced

## 6.9.6 (2025-05-29)

### Fixed
- **Rate Limiting**: Removed verification API calls after device state changes
  - Eliminated unnecessary GET requests triggered 5 seconds after PATCH operations
  - Reduced API call volume to prevent rate limit errors for single-device installations
  - Trust PATCH response success instead of additional verification calls

## 5.5.6 (2025-03-31)

### Improved
- **UI Styling**: Completely redesigned Temperature Schedules UI
  - Redesigned schedule form with grid layout and better spacing
  - Enhanced schedule items with hover effects and better visual hierarchy
  - Added color-coded sleep phases for better temperature visualization
  - Improved temperature display and schedule grouping
  - Responsive layout fixes for mobile devices
  - Added visual temperature scale indicators
  - Applied consistent CSS variables for better theming

### Added
- **Developer Documentation**: Created CLAUDE.md with development guidelines
  - Added build commands and testing instructions
  - Documented code style guidelines and naming conventions
  - Specified TypeScript configuration details
  - Added error handling and logging best practices

## 5.5.5 (2025-04-01)

### Improved
- **API Rate Limit Handling**: Completely restructured device status polling to avoid rate limit errors
  - Removed redundant immediate status check during device initialization
  - Added configurable delayed initial polling (60-second default)
  - Implemented smarter priority handling for API requests
  - Enhanced logging for request priorities to assist with troubleshooting

### Changed
- **Initialization Sequence**: Made device startup more efficient and resilient
  - Removed the 15-second delay before first status check
  - Replaced with a more conservative 60-second delay
  - Improved startup sequence to reduce API calls during initialization
  - Added detailed logging for scheduled status checks

### Fixed
- **Rate Limiting**: Solved "429 Too Many Requests" errors during device discovery
  - Prioritized API calls more intelligently based on context
  - Ensured system-initiated refreshes use lower priority than user actions
  - Improved coordination between discovery and status polling
  - Added verbose logging for API call priority decisions
## 5.5.4 (2025-04-01)

### Fixed
- **Log Handler Error**: Resolved "[31/03/2025, 12:44:40] [Homebridge UI] [homebridge-sleepme-simple] No Registered Handler: /logs" error
  - Added explicit handler for /logs endpoint to prevent error messages
  - Enhanced server.js to properly handle and block log requests
  - Fixed ES module imports with proper syntax
  - Improved error logging system throughout the server component

### Improved 
- **Warm Hug Temperature Unit Support**: Made Warm Hug functionality fully unit-aware
  - Added automatic conversion between Celsius and Fahrenheit for increment values
  - Updated field labels to show correct units (°C/min or °F/min)
  - Dynamically adjusted validation ranges based on selected unit
  - Implemented proper conversion when switching temperature units
  - Added unit-specific default values for new installations

### Enhanced
- **Dropdown Section UX**: Completely revamped collapsible sections
  - Significantly increased size of dropdown caret indicators
  - Added proper color and animation for better visibility
  - Fixed section expansion/collapse functionality
  - Enhanced section headers with better styling and contrast
  - Improved click handling with proper event management
  - Added both class and style manipulation for reliable display state
  - Fixed rotation animation for dropdown indicators
  - Added detailed console logging for section state changes

### Technical
- **Improved Event Handling**: Enhanced UI event management
  - Properly cloned event handlers to prevent memory leaks
  - Added explicit display property manipulation for better browser compatibility
  - Fixed edge cases in section expansion logic
  - Added comprehensive error handling throughout event system
  - Implemented proper cleanup of event listeners
  - Enhanced console logging for better debugging visibility

## 5.5.3 (2025-04-02)

### Fixed
- **Collapsible Sections**: Made all sections consistently collapsible
  - Fixed Template Help sections to properly expand/collapse
  - Added collapsible behavior to Warm Hug Options sections
  - Ensured all sections start in closed state by default
  - Added proper dropdown indicators for all collapsible sections

### Fixed
- **Template Code Display**: Fixed issue where template code wasn't displaying properly
  - Ensured templates are initialized at the earliest possible moment in script execution
  - Added direct global initialization of window.templates
  - Improved template code preview function to properly display JSON
  - Fixed timing issues with template data availability

### Improved
- **Event Handling**: Enhanced collapsible section event handling
  - Properly cloned event handlers to prevent memory leaks
  - Added explicit style manipulation for better browser compatibility
  - Fixed dropdown indicator rotation animations
  - Improved error handling in initialization functions

### Changed
- **UI Structure**: Reorganized Template Help and Warm Hug sections
  - Converted flat sections to proper collapsible components
  - Made interface more consistent across all tabs
  - Enhanced visual indication of expandable content
  - Improved spacing and visual hierarchy
## 5.5.2 (2025-04-01)

### Fixed
- **Server Error Fix**: Resolved "fs is not defined" error in server.js
  - Added missing fs import for proper file system access
  - Enhanced testDeviceConnection function with better error handling
  - Fixed config file checking functionality
  - Added more comprehensive error reporting

### Changed
- **UI Reorganization**: Renamed "Advanced Options" tab to "Warm Hug Options" for clearer purpose
  - Refocused tab content specifically on Warm Hug configuration parameters
  - Enhanced Warm Hug description with detailed explanation of functionality
  - Added step-by-step explanation of how Warm Hug works
  - Improved parameter labels and descriptions

### Fixed
- **Template Code Preview**: Fixed issue where template definitions weren't loading properly
  - Added direct template initialization during page load
  - Enhanced template data access with global variable initialization
  - Improved template preview generation with better error handling
  - Added detailed console logging for template operations

### Moved
- **Log Level Setting**: Relocated from Advanced Options to main configuration section
  - Added Log Level below Temperature Unit and Polling Interval
  - Maintained consistent styling with other configuration elements
  - Improved descriptive text for log level options

### Improved
- **Warm Hug Documentation**: Added comprehensive explanation of the feature
  - Created clear, step-by-step overview of how Warm Hug works
  - Added visual explanation with ordered list for better understanding
  - Enhanced parameter descriptions with practical guidance
  - Improved visual presentation with info cards
## 5.5.1 (2025-03-31)
### Fixed
- **Collapsible Sections**: Fixed issue with Warm Hug Parameters section not expanding properly
  - Completely rewrote the collapsible section initialization with proper event handling
  - Added explicit style control for reliable opening and closing
  - Fixed event propagation to ensure toggles work consistently
  - Added error checks to prevent JavaScript errors if elements aren't found

### Removed
- **Device Settings Section**: Removed unused Device Settings UI elements
  - Removed HTML section for Device Settings
  - Removed related JavaScript functions and event handlers
  - Simplified UI by focusing only on necessary configuration options

### Improved
- **Toast Notification Blocking**: Enhanced suppression of unwanted toast notifications
  - Added comprehensive log-related request blocking
  - Implemented specific toast message filtering for log errors
  - Added network request interception for log-related API calls
  - Fixed race condition in toast suppression code

## 5.5.0 (2025-03-31)
### Fixed
- **Collapsible Sections**: Fixed issue with Warm Hug Parameters section not expanding properly
  - Completely rewrote the collapsible section initialization with proper event handling
  - Added explicit style control for reliable opening and closing
  - Fixed event propagation to ensure toggles work consistently
  - Added error checks to prevent JavaScript errors if elements aren't found

### Removed
- **Device Settings Section**: Removed unused Device Settings UI elements
  - Removed HTML section for Device Settings
  - Removed related JavaScript functions and event handlers
  - Simplified UI by focusing only on necessary configuration options

### Improved
- **Toast Notification Blocking**: Enhanced suppression of unwanted toast notifications
  - Added comprehensive log-related request blocking
  - Implemented specific toast message filtering for log errors
  - Added network request interception for log-related API calls
  - Fixed race condition in toast suppression code
## 5.4.1 (2025-03-30)
### Fixed
- **Critical Schedule Display Fix**: Resolved issue where schedules were read from config.json but not displayed in UI
  - Added missing `scheduleList` element to the HTML structure
  - Enhanced schedule initialization sequence with proper error handling
  - Improved data flow between config loading and schedule rendering
  - Fixed timing issues with DOM initialization and data loading
  - Added detailed debug logging to diagnose schedule loading/rendering process
  - Implemented multiple fallback mechanisms to ensure schedules display properly
  - Added verification steps after config loading to confirm schedule data integrity
  - Fixed unit handling in schedule display
  - Enhanced error reporting for schedule rendering failures
  - Added automatic re-render on config load to ensure schedule visibility

### Improved
- **Enhanced Debugging**: Added comprehensive logging system for troubleshooting
  - Implemented conditional debug logging with contextual prefixes
  - Added detailed state tracking throughout initialization process
  - Enhanced error handling with proper context information
  - Added verification steps at critical points in the data flow
  - Improved console output formatting for better readability
  - Added timing information for tracing initialization sequence issues

### Technical
- **Code Structure Improvements**:
  - Improved module encapsulation with proper function scoping
  - Enhanced error boundaries around critical operations
  - Added detailed type checking and validation for schedule properties
  - Implemented proper event sequencing for reliable initialization
  - Added DOM availability checks before manipulation
  - Enhanced data flow between modules with proper state management
  - Fixed potential race conditions in initialization sequence
  - Improved backward compatibility with legacy code
## 5.4.1
### Fixed
- **UI Layout Correction**: Fixed Celsius and Polling interval inputs to properly display side-by-side as intended
  - Replaced Bootstrap-style responsive grid with more robust flex layout
  - Added explicit width controls to prevent field overflow
  - Modified responsive breakpoints to maintain side-by-side layout on most screens
  - Only allows stacking on extremely small mobile screens (under 480px)

- **DOM Initialization Error**: Added robust DOM element initialization with recovery mechanism
  - Implemented verification of critical UI elements at startup
  - Added automatic retry with delay if elements are not immediately available
  - Enhanced error reporting with specific missing element identification
  - Added explicit width settings to ensure proper field rendering
## 5.4.0
### Fixed
- **Complete Solution for Toast Notifications**: Completely eliminated unwanted toast notifications at startup
  - Added immediate toast suppression that runs before any code execution
  - Implemented toast function override directly in HTML head
  - Blocked all log fetching requests that trigger unwanted notifications
  - Blocked network requests to log endpoints
  - Added multiple layers of protection against automatic events
  - Fixed DOM initialization error handling to prevent UI warnings
  - Implemented server-side event blocking to prevent notifications at source
  - Added console-only logging instead of toast notifications

### Improved
- **DOM Error Handling**: Enhanced DOM element initialization
  - Added multiple initialization attempts with increasing delays
  - Implemented graceful fallbacks for missing DOM elements
  - Added detailed console logging for initialization issues
  - Pre-declared all global variables to prevent "undefined" errors
  - Added safety function wrappers for early function calls
  - Improved element validation before attempting operations
  - Enhanced error recovery for missing UI components

### Technical
- **Server-Side Prevention**: Comprehensive server-side fixes 
  - Completely overrode `pushEvent` method to prevent automatic events
  - Blocked all automatic config checking operations
  - Blocked all log fetching operations
  - Added console-only server-side logging
  - Enhanced request handlers with better error handling
  - Fixed modal visibility handling with multiple safety checks
  - Improved request/response handling for API tests
  - Added defensive programming throughout codebase
## 5.3.4
### Fixed
- **Critical Schedule Persistence Fix**: Resolved issue with schedules not saving to config.json correctly
  - Fixed schedule data structure to properly match Homebridge config schema
  - Ensured consistent structure for each schedule entry with explicit type conversions
  - Added complete unit information to each schedule for better temperature handling
  - Enhanced verification after save to confirm schedules were properly saved
  - Improved handling of empty schedule arrays
  - Added better error handling and debug logging throughout save process
  - Fixed rendering of loaded schedules from configuration

### Improved
- **Enhanced Loading Process**: Better handling of configuration loading
  - Added detailed logging of configuration structure during load/save operations
  - Improved handling of default values when configuration is incomplete
  - Added explicit waiting for DOM elements to be available before population
  - Enhanced verification of saved configuration with detailed logging
  - Better console output formatting for debugging configuration structures
  - Added detailed error logging for configuration operations
  - Improved initialization of empty schedule lists when enabled but no schedules exist

### Technical
- **Code Structure Improvements**:
  - Added explicit type conversions for all schedule properties
  - Enhanced error handling with better context information
  - Improved schedule template information preservation during edits
  - Fixed schedule unit handling to maintain consistency
  - Added detailed verification steps after configuration save operations
  - Enhanced defensive coding practices throughout configuration handling
  - Fixed potential race conditions in configuration loading process
## 5.3.3

### Fixed
- **Schedule Loading Issue**: Fixed critical bug where schedules weren't being properly loaded from config.json
  - Enhanced schedule parsing with improved error handling
  - Added detailed logging for schedule loading process
  - Fixed unit conversion for loaded schedules
  - Added validation and sanity checks for schedule data
  - Improved error reporting for schedule loading failures

- **Warm Hug Parameters Visibility**: Resolved issue where Warm Hug parameters weren't visible in Advanced config
  - Fixed collapsible section initialization for Advanced options tab
  - Improved CSS/display handling for section visibility
  - Added explicit style and class manipulation for reliable display
  - Enhanced event handling for section toggles
  - Added comprehensive logging for UI element initialization

- **Advanced Options Tab**: General improvements to the Advanced Options user interface
  - Fixed event delegation for tab visibility
  - Improved initialization sequence for UI elements
  - Added proper display state management for collapsible sections
  - Fixed ARIA attributes for better accessibility
  - Enhanced logging to track element state changes

### Technical Improvements
- Added detailed console logging throughout the configuration loading process
- Enhanced error handling with proper fallbacks for missing configuration
- Improved type checking and validation for schedule properties
- Fixed DOM element references and error checking
- Added loading sequence verification
- Enhanced UI state management with proper CSS and display property handling
- Fixed event handler management to prevent memory leaks
##5.3.1
Major Changes

Eliminated Toast Notifications at Source: Completely reworked the server-side implementation to prevent unwanted toast notifications from being generated
Comprehensive Event Suppression: Implemented complete disabling of pushEvent functionality to block all automatic notifications
Server-Side Prevention: Added targeted method overrides to stop initialization checks that trigger toast messages
Improved Logging: Replaced UI notifications with console-only logging for better debugging without visual interruptions

Key Improvements

Root Cause Solution: Addressed the source of "Config Check" and "Config Found" notifications rather than just suppressing symptoms
Clean Architecture: Maintained all functionality while preventing automatic events
Console Logging: Enhanced server-side logging that doesn't trigger UI notifications
API Function Integrity: Preserved all API functionality while disabling automatic events
Method Override Protection: Implemented defensive coding to prevent parent class functionality from bypassing our settings
Explicit Request Model: Ensured server only responds to explicit UI requests, never initiating its own events

Technical Details

Added _preventAutomaticEvents() method to completely disable the pushEvent functionality
Overrode internal methods that might trigger automatic checks (_checkConfig, fetchLogs)
Modified the constructor to call prevention methods immediately after parent class initialization
Maintained all request handlers with clarification that they only run when explicitly requested by UI
Enhanced error handling with better console logging via modified log() method

Documentation

Added detailed comments explaining the prevention strategy
Enhanced method documentation to indicate when functions run
Added console logging for key lifecycle events for debugging
Clarified the purpose of method overrides with descriptive comments
## 5.3.0
### Improved
- **UI Layout Optimization**: Combined temperature unit and polling interval fields onto one line for better space efficiency
- **Advanced Options Restructuring**: Moved Log Level setting into the Advanced Options section
- **Visual Improvements**:
  - Enlarged dropdown carets for better visibility
  - Fixed collapsible section behavior in Advanced Options
  - Improved responsive design for various screen sizes
  - Enhanced form layout with better spacing and alignment
  
### Fixed
- **Template Code Display**: Fixed issue where template code preview showed "Loading..." instead of actual template definitions
- **Dropdown Behavior**: Corrected expansion/collapse functionality in Advanced Options sections
- **Accessibility**: Added proper ARIA attributes to collapsible sections
- **Console Errors**: Fixed JavaScript errors related to collapsible sections
- **Mobile Experience**: Improved layout responsiveness on smaller screens

### Technical
- **Code Structure**: Better organized code with clearer section separation
- **Event Handling**: Improved tab navigation with proper state management
- **CSS Architecture**: Enhanced stylesheet with more consistent class naming
- **Debug Logging**: Added detailed console logs for easier troubleshooting
- **Performance**: Optimized collapsible section initialization
## 5.2.0
### Added
- **Advanced Options Section**: New collapsible UI section for advanced configuration
  - Added dedicated tab with visual dropdown indicators
  - Implemented Warm Hug parameter configuration (temperature increment and duration)
  - Added device-specific settings for different SleepMe models
  - Created a more intuitive collapsible section design

### Improved
- **Template Help UI**: Enhanced with better visual indicators for dropdown functionality
  - Added arrow indicators that rotate to show open/closed state
  - Improved section header styling for better visibility
  - Added clear visual feedback for interactive elements
  - Made tab navigation more intuitive with consistent styling
- **Responsive Design**: Improved mobile experience with better padding and spacing
- **Accessibility**: Added aria attributes to collapsible sections
- **Configuration Management**: Better handling of advanced configuration options
- **User Experience**: More intuitive UI for navigating between sections

### Technical
- Added collapsible section component with proper event handling
- Implemented configuration persistence for advanced settings
- Created form validation for Warm Hug parameters
- Enhanced tab navigation with proper state indicators
- Improved error handling for configuration operations
- Added responsive styling for better mobile experience
## 5.1.0
### Added
- **Enhanced Template Management**: Major improvements to template editing capabilities
  - Added template identification in the UI with a badge for template-derived schedules
  - Created a new "Template Help" tab with detailed guidance on modifying templates
  - Added template preview functionality to see schedules before applying
  - Added template export feature to copy template definitions
  - Added ability to copy config.json examples for custom templates
  - Included detailed documentation for direct config.json editing
  - Added template source tracking to maintain relationships between templates and schedules

### Improved
- **Template Information**: Added clear identification of which schedules come from templates
- **Schedule Grouping**: Better visual organization of schedules by type and timing
- **Schedule Editing**: Preserved template information when editing schedules
- **Template Selection**: Added descriptions and previews to template selection
- **User Interface**: Added copy functionality for template definitions and config examples
- **Documentation**: Added detailed instructions for advanced template customization
- **Code Structure**: Better organization and error handling for template-related code

### Technical
- Added template source tracking in schedule objects
- Enhanced renderScheduleList to show template badges
- Added template preview functionality
- Added code snippet copying functionality
- Added dedicated tab for template editing guidance
- Enhanced CSS for better template visualization
- Added clear indication of template-based schedules in the UI
## 5.0.6

### Fixed
- **Critical Mobile Web View Bug**: Resolved "Can't find variable: isEditing" error that occurred specifically in mobile browsers
  
### Key Improvements:
- **Pre-Declaration of Global Variables**: Implemented direct global variable initialization at the earliest possible point in HTML head
- **Safety Function Stubs**: Added placeholder functions to prevent errors when methods are called before initialization
- **Simplified Initialization**: Replaced IIFE with direct window object assignments for more reliable execution order
- **Enhanced Mobile Compatibility**: Ensured variables are available regardless of script loading order
- **Improved Error Prevention**: Pre-declared all commonly accessed DOM element references with null values
- **Better Debug Visibility**: Added console logging to track initialization status

### Technical
- Moved variable initialization code to the very top of the HTML document in the head section
- Applied a flat initialization approach instead of an encapsulated function for guaranteed execution
- Pre-emptively declared common functions with safety fallbacks to prevent runtime errors
- Added null initialization for DOM element references to ensure safe property access
## 5.0.5
### Fixed
- **Major Schedule Functionality Fix**: Resolved critical timing issue where schedules weren't being applied to devices
  - Restructured initialization sequence to ensure schedules are applied after device discovery completes
  - Modified `platform.ts` to make device discovery properly asynchronous with awaitable Promise
  - Fixed schedule application to happen only after devices are fully discovered and registered
  - Added more detailed logging around schedule application for better troubleshooting
  - Improved schedule execution logic in `schedule.ts` to correctly validate day-of-week conditions
  - Enhanced debugging information in logs to show which schedules are being executed and when
  - Added verification of schedule application to each discovered device
  - Fixed race condition that caused "Schedules defined but no devices found to apply them to" error
  - Ensured proper event sequencing for device discovery and schedule initialization

### Improved
- **Enhanced Logging**: Added more detailed logging for schedule operations
  - Added timestamps to schedule execution logs
  - Included detailed device ID references in schedule application logs
  - Added day-of-week validation information to logs for better debugging
- **Configuration Handling**: Better handling of schedule configuration data
  - Ensured schedule data includes description field for better identification
  - Added proper schedule type verification during application
  - Improved error handling during schedule application

### Technical
- Made `discoverDevices()` method return a Promise to properly support asynchronous operations
- Added proper async/await pattern to device discovery and schedule application
- Improved data flow between device discovery and schedule manager
- Enhanced error handling throughout schedule application process
## 5.0.4
### Bug Fixes
- Suppressed unwanted loading indicators in the custom UI (showspinner was the culprit)
- Implemented minimal-impact solution to remove Homebridge UI's default loading spinners
- Preserved existing code structure while neutralizing loading functionality
- Added graceful handling of loading function calls to prevent UI interruptions

### Technical Improvement
- Replaced loading functions with no-op implementations
- Maintained function signatures to prevent potential runtime errors
- Simplified loading indicator management in custom UI configuration
## 5.0.3
- **Eliminated Unwanted Toast Notifications**: Completely removed "Fetching server logs" toasts and related error messages
- **Key Improvements:**
  - Added early suppression script to index.html that executes before any other code
  - Identified root cause in Homebridge UI framework's automatic log fetching
  - Implemented pre-emptive blocking of log-related network requests
  - Override pushEvent in server.js constructor to prevent automatic events
  - Fixed race condition where suppression code ran too late in the page load cycle
  - Implemented immediate toast function overrides before DOM parsing
  - Maintained existing suppression code as fallback defense
  - Added detailed console logging for debugging toast suppression
  - Used strategic constructor modification to stop unwanted events at the source
  - Preserved all intended functionality while removing unwanted notifications
## 5.0.2
- **Fixed Schedule Saving**: Corrected issues with schedule data not being properly saved to config.json
- **Key Improvements:**
  - Updated config.schema.json to properly define all schedule properties
  - Added "Warm Hug" to the schedule types enum in the schema
  - Improved schedule data formatting in saveConfig function
  - Added explicit type conversions for schedule properties
  - Enhanced verification after save to confirm schedules were saved
  - Added detailed logging throughout the save process
  - Ensured proper structure of schedules array even when empty
  - Fixed unit handling in schedules
## 5.0.1
Server.js Changes:

Removed All Event Pushing: Eliminated any pushEvent calls to prevent toast notifications
Console-Only Logging: Replaced all UI notifications with console-only logging
Removed Automatic Operations: Server now only responds to explicit UI requests
Simplified Response Format: Ensured responses only contain necessary data

saveConfig Function Changes:

Explicit Schedule Formatting: Added strict formatting to ensure schedule data matches schema
Type Enforcement: Added explicit type conversions for all values
Always Set Schedules Array: Ensures schedules property is always defined
Verification After Save: Added verification step to confirm save was successful
Improved Structure Handling: Better handling of config array structure
Detailed Logging: Added comprehensive logging for debugging
## 5.0.0 
- **Complete Architectural Overhaul**: Significant code restructuring and modernization
- **Key Improvements:**
  - Adopted module pattern for better encapsulation and state management
  - Eliminated all toast notification issues with a centralized status message system
  - Fixed modal confirmation dialog reliability across all operations
  - Properly implemented edit schedule functionality with clear state management
  - Enhanced error handling with consistent patterns across the codebase
  - Simplified initialization sequence with more robust fallbacks
  - Improved schedule management with cleaner event handling
  - Added extensive documentation and comments throughout the code
  - Fixed memory leaks with proper event listener cleanup
  - Enhanced code organization with logical function grouping
  - Improved reliability of schedule template application
  - Created reliable type conversion for temperature units
  - Implemented automatic status updates for all operations
  - Eliminated global namespace pollution where possible
  - Added backward compatibility layer for legacy code
## 4.1.4
- **Config Saving Fix**: Corrected configuration structure for proper schedule persistence
- **Key Improvements:**
  - Fixed configuration object structure to match Homebridge requirements
  - Ensured proper API call sequence (updatePluginConfig followed by savePluginConfig)
  - Removed any remaining toast notification references
  - Improved error handling during config operations
  - Enhanced schedule formatting for storage
  - Added better status element feedback throughout the UI
  - Implemented console-only logging to avoid unwanted notifications
  - Fixed configuration object handling to maintain proper structure
  - Added detailed debugging information via console logs
## 4.1.3
- **Complete Removal of Toast Notifications**: Removed all toast notification code and replaced with proper status UI elements
- **Key Improvements:**
  - Removed all references to toast notifications in all JavaScript files
  - Replaced toast notifications with dedicated status element updates in the UI
  - Removed toast suppression code and dependencies
  - Improved error handling with console logging
  - Enhanced server.js to avoid triggering UI notifications
  - Updated status display to show both error and success messages properly
  - Eliminated all toast-related debugging code
  - Simplified messaging system to use native UI elements
  - Improved API test results display using the status element
  - Fixed modal confirmation for schedule removal to use native UI
  - Enhanced code readability by simplifying notification logic
  - Centralized status messages in standard UI elements
  ## 4.1.2
- **Fixed Schedule Editing Functionality**: Repaired both edit button and template schedule editing
- **Key Improvements:**
  - Fixed logical error in handleScheduleAction that prevented editing schedules
  - Properly implemented update functionality for existing schedules
  - Fixed remove confirmation dialog to use modal instead of toast notifications
  - Enhanced template schedules to ensure they can be edited properly
  - Improved unit conversion handling for template schedules
  - Standardized schedule object structure between manual and template schedules
  - Fixed event handler issues in schedule item rendering
  - Ensured consistent property storage for all schedule types
  - Improved console logging for debugging schedule operations
  - Added proper day property handling for specific day schedules
  - Fixed data-index attribute handling for edit and remove buttons
## 4.1.1
- **Fixed Edit Button Functionality**: Repaired the schedule editing feature
- **Key Improvements:**
  - Fixed logical error in handleScheduleAction function that prevented editing schedules
  - Properly implemented update functionality for existing schedules
  - Improved edit mode handling with correct state transitions
  - Enhanced error handling for schedule operations
  - Fixed structural issues in schedule handler code
  - Ensured proper exit from edit mode after successful updates
## 4.0.13 
- **Fixed Toast Notification Leak**: Implemented immediate toast suppression before any code executes
- **Fixed Modal Not Appearing**: Complete rewrite of modal display code with multiple reliability techniques
- **Key Improvements:**
  - Added aggressive early toast function override at script initialization
  - Fixed modal visibility issues with both class and style manipulation
  - Replaced all direct homebridge.toast calls with console-only logging
  - Enhanced server-side event filtering with comprehensive blocklist
  - Implemented event listener cleanup to prevent handler duplication
  - Added fallback to native confirm dialog if modal elements not found
  - Added forced visibility check with timeout for modal reliability
  - Fixed remove button handler to properly use the confirmation modal
  - Improved console logging for better debugging visibility
  - Added button cloning to guarantee clean event handlers
## 4.0.12-dev.0
- **Complete Console-Only Logging System**: Eliminated all toast notifications
- **Key Improvements:**
  - Replaced all toast notifications with console-only logging
  - Implemented toast function overrides at the source
  - Fixed confirmation modal with direct DOM manipulation
  - Removed all log-fetching operations
  - Blocked server-side events that trigger unwanted notifications
  - Enhanced error handling with better console logging
  - Simplified codebase by standardizing on one logging approach
  - Improved developer experience with formatted console logs
  - Added reliability fixes to modal confirmation dialog
## 4.1.0 

- **Complete Block of Unwanted Toast Notifications**: Implemented ultra-strict filtering system
- **Fixed Confirmation Modal Issues**: Ensured modal appears properly when removing schedules
- **Key Improvements:**
  - Extended toast blocking system to catch all unwanted notifications
  - Added multiple techniques to guarantee modal visibility
  - Implemented exact title matching for toast display (only explicitly allowed toasts show)
  - Added comprehensive blocking for "Error fetching logs" and similar messages
  - Enhanced modal visibility with multiple CSS techniques
  - Added detailed console logging to track modal and toast activity
  - Fixed event handler duplication in confirmation modal
  - Improved modal initialization and visibility state management
## 4.0.11 (
- **Complete Solution for Toast Notification Issues**: Implemented comprehensive system to eliminate all unwanted toast notifications
- Added Homebridge toast function overrides that intercept all notifications at the source
- Removed server-side event pushing to prevent notifications
- Expanded blocklist patterns to catch system messages like "Ready", "Config Check", etc.
- Implemented strict allowlist approach with explicit title and type matching
- Modified server.js to avoid triggering UI events for routine operations
- Early toast function interception to filter notifications from any source
- Enhanced console logging for better debugging without UI noise
- Fixed confirmation modal styling and behavior
- Added strict content filtering for all notification types
- Improved error handling for more graceful recovery from failed operations
- Added check for modal element existence before attaching event listeners

## 4.0.12-dev.28 
- Fixed confirmation modal for removing schedule items not appearing
- Implemented strict toast notification filtering to completely eliminate unwanted toasts
- Added explicit handling for "Fetching Server logs" and other routine messages to prevent toast display
- Improved confirmation modal handling with proper display/hide logic using both CSS classes and inline styles
- Enhanced modal event handling to prevent duplicated event listeners
- Refactored showToast function with stricter allowlist approach to reduce UI noise
- Added comprehensive filtering system for toast notifications based on message content
- Fixed initialization of confirmation modal at application startup
- Added explicit error handling for modal-related operations
- Improved console logging with better error diagnostics
- Added schedule removal success notification
## 4.0.11-dev.27 
- Implemented strict allowlist approach for toast notifications
- Completely eliminated "Fetching Server logs" and "Error: Logs not found" toast messages
- Moved all non-critical messages to console-only logging
- Added comprehensive filtering for toast messages by exact title matching
- Prevented all informational and background task messages from showing as toasts
- Fixed server-side event handling to avoid unnecessary UI notifications
- Improved console logging with better categorization of message types
- Enhanced error handling to ensure toast notifications are only shown for critical issues
## 4.0.16-dev.23
- Completely removed toast notifications for routine operations
- Implemented allowlist-based approach for toast notifications
- Only display toast notifications for critical actions and errors
- Moved all informational messages to console-only logging
- Improved toast filtering with comprehensive criteria
- Removed all UI-related toast notifications
- Enhanced error handling with better console logging
- Improved toast filtering based on message title and content
- Added explicit toast suppression for routine operations
- Fixed confirmation modal UX issues
## 4.0.15-dev.22 
- Completely removed Server Logs section from the HTML interface
- Fixed persistent toast notifications for config-related messages
- Changed all config-related messages to console-only logging
- Implemented stricter filtering for toast notifications
- Modified config handlers to avoid sending toast notifications
- Added allowlist-based approach for toast notifications (only critical messages shown)
## 4.0.14-dev.22 
- Fixed confirmation modal appearing at startup by adding both class and inline style
- Added explicit style.display = 'none' to ensure modal is completely hidden
- Significantly reduced toast notification verbosity with expanded filtering
- Added more comprehensive filter list for common informational messages
- Moved many log messages from toast notifications to console-only logging
- Completely removed Server Logs section from UI
- Enhanced modal control logic with direct style manipulation
- Fixed cancel button handling in confirmation modal
- Added proper event cleanup for modal interactions
## 4.0.11-dev.21 
- Fixed confirmation modal appearing at startup by using both CSS class and style display property
- Added stronger modal event handling to ensure it can be dismissed
- Significantly reduced toast notification verbosity by filtering common informational messages
- Improved error handling with detailed console logging
- Added modal initialization status tracking
- Added multiple redundant methods for closing the modal
- Fixed event listener memory leak in modal dialog
- Updated CSS to ensure modal stays hidden when required

## 4.0.13-dev.20 
- Fixed confirmation modal appearing at startup - now properly hidden by default
- Added modal close functionality when clicking outside the modal content
- Reduced toast notification verbosity by filtering routine messages
- Improved modal event handling with proper event listener cleanup
- Enhanced error handling in modal to fall back to native confirmation dialogs
- Added proper content defaults for modal title and message

## 4.0.12-dev.19 
- Fixed confirmation modal appearing at startup and being unable to dismiss
- Added ability to close modal by clicking outside
- Simplified toast logging to reduce verbosity
- Improved modal message for schedule removal confirmation
- Added proper cleanup of event listeners to prevent duplicates

## 4.0.11-dev.18 
- Fixed confirmation modal appearing at startup and being unable to dismiss
- Removed Server Logs section from the UI
- Added safeguard to ensure confirmation modal is properly hidden by default
- Added ability to close modal by clicking outside

## 4.0.10-dev.17
- Fixed confirmation modal appearing on startup issue
- Improved modal event handling to prevent duplicate listeners
- Enhanced UI initialization sequence

## 4.0.10-dev.16 
- Added confirmation modal to remove button
- Removed redundant logging statements

## 4.0.10-dev.15 
- Fixed custom UI configuration loading and saving functionality
- Enhanced error handling in API client operations
- Improved schedule management interface
- Added comprehensive validation for user inputs
- Better handling of temperature unit conversions