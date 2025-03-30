# Changelog
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