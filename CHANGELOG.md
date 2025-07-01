# Changelog
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