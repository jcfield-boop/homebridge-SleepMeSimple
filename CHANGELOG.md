# Changelog
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