# Changelog
## 6.1.33 (2025-04-06)

### Fixed
- **Custom UI Configuration Fix**: Completely rebuilt server.js following the exact Homebridge Plugin UI documentation
  - Fixed configuration loading and saving by properly inheriting the HomebridgePluginUiServer methods
  - Implemented recommended handler patterns from the documentation
  - Added proper error handling with detailed messages
  - Enhanced console logging for better troubleshooting
  - Simplified implementation to focus on core functionality
  - Followed constructor best practices (super first, ready last)
  - Used correct method naming conventions for better readability
  
### Technical
- **Method Naming**: Used clear, self-documenting handler method names
- **Error Handling**: Improved error reporting with consistent structure
- **Logging**: Added detailed console logging throughout
- **Implementation Pattern**: Followed documentation examples precisely
- **Initialization Sequence**: Properly ordered constructor operations
- **Instance Creation**: Used recommended IIFE pattern for instantiation

## 6.1.32 (2025-04-06)

### Fixed
- **Custom UI Inheritance Fix**: Completely rebuilt server.js to correctly implement HomebridgePluginUiServer
  - Fixed "getPluginConfig not available on parent prototype" error by using direct prototype access
  - Implemented multiple fallback mechanisms for configuration access
  - Added direct prototype method calls with proper binding
  - Improved error handling with graceful degradation
  - Enhanced logging with detailed operation status
  - Simplified server implementation with cleaner class structure
  - Ensured consistent IIFE pattern for proper server instantiation
  
### Technical
- **Inheritance Pattern**: Changed to direct prototype access with proper binding
- **Error Propagation**: Improved error object structure for better debugging
- **Logging**: Added operation context and timestamps to server logs
- **Configuration Management**: Ensured proper JSON handling and serialization
- **Module Pattern**: Refined ES module implementation for better compatibility
- **UI Integration**: Fixed server response handling to properly update UI components
- **Instance Creation**: Maintained correct instantiation pattern required by Homebridge

### Details
The root cause was related to how the HomebridgePluginUiServer methods were being accessed. When using ES modules, explicit parent method access via the prototype chain is required to ensure proper method resolution. This approach guarantees that built-in Homebridge configuration management methods work correctly regardless of execution environment.

## 6.1.31 (2025-04-06)

### Fixed
- **Custom UI Inheritance Fix**: Completely rebuilt server.js to correctly implement HomebridgePluginUiServer
  - Fixed "(intermediate value).getPluginConfig is not a function" error by using super.getPluginConfig() calls
  - Simplified request handler implementation with direct parent method access
  - Replaced class method approach with inline handler functions
  - Improved ES module compatibility with explicit super method calls
  - Enhanced debugging with more verbose console logging
  - Added proper error propagation from server to UI
  - Maintained full configuration handling functionality
  - Ensured consistent IIFE pattern for proper server instantiation
  
### Technical
- **Inheritance Pattern**: Changed from relying on inherited methods via `this` to explicit `super` calls
- **Error Propagation**: Improved error object structure for better debugging
- **Logging**: Added operation context and timestamps to server logs
- **Configuration Management**: Ensured proper JSON handling and serialization
- **Module Pattern**: Refined ES module implementation for better compatibility
- **UI Integration**: Fixed server response handling to properly update UI components
- **Instance Creation**: Maintained correct instantiation pattern required by Homebridge

### Details
The root cause was related to how the HomebridgePluginUiServer methods were being accessed. When using ES modules, explicit parent method access via `super` is required to ensure proper method resolution. This approach guarantees that built-in Homebridge configuration management methods work correctly regardless of execution environment.
## 6.1.29 (2025-04-06)

### Fixed
- **Custom UI Inheritance Fix**: Completely rebuilt server.js to correctly implement HomebridgePluginUiServer
  - Fixed "this.getPluginConfig is not a function" error by using super.getPluginConfig() calls
  - Simplified request handler implementation with direct parent method access
  - Replaced class method approach with inline handler functions
  - Improved ES module compatibility with explicit super method calls
  - Enhanced debugging with more verbose console logging
  - Added proper error propagation from server to UI
  - Maintained full configuration handling functionality
  - Ensured consistent IIFE pattern for proper server instantiation
  
### Technical
- **Inheritance Pattern**: Changed from relying on inherited methods via `this` to explicit `super` calls
- **Error Propagation**: Improved error object structure for better debugging
- **Logging**: Added operation context and timestamps to server logs
- **Configuration Management**: Ensured proper JSON handling and serialization
- **Module Pattern**: Refined ES module implementation for better compatibility
- **UI Integration**: Fixed server response handling to properly update UI components
- **Instance Creation**: Maintained correct instantiation pattern required by Homebridge

### Details
The root cause was related to how the HomebridgePluginUiServer methods were being accessed. When using ES modules, explicit parent method access via `super` is required to ensure proper method resolution. This approach guarantees that built-in Homebridge configuration management methods work correctly regardless of execution environment.



## 6.1.28 (2025-04-05)
### Fixed
- **Custom UI Configuration Handling**: Completely rebuilt server.js implementation to fix reading/writing config via plugin UI
  - Fixed ES module import/export pattern to match package.json "type": "module"
  - Implemented proper inheritance chain with HomebridgePluginUiServer
  - Corrected initialization sequence (super() first, this.ready() last)
  - Added robust configuration processing with proper validation
  - Enhanced error handling with RequestError for better client feedback
  - Implemented detailed logging throughout configuration operations
  - Added explicit verification after save operations
  - Fixed IIFE pattern for ES module server instantiation
  - Ensured proper schedule formatting for configuration storage
## 6.1.22 (2025-04-04)

### Fixed
- **Configuration Methods Fix**: Resolved critical issue with customUI methods for reading/writing config.json
  - Fixed server.js implementation to properly extend HomebridgePluginUiServer
  - Correctly implemented getPluginConfig, updatePluginConfig, and savePluginConfig methods
  - Ensured proper initialization sequence with super() first and this.ready() at the end
  - Added robust error handling for configuration operations
  - Fixed server instantiation to match the pattern of server-minimal.js

### Improved
- **Server Reliability**: Enhanced server-side implementation for better stability
  - Simplified request handlers with focused functionality
  - Added detailed logging throughout configuration process
  - Implemented proper error reporting for all operations
  - Enhanced configuration data validation
  - Added configuration verification after save operations

## 6.1.22 (2025-04-04)

### Fixed
- **Complete UI Launch Solution**: Fixed both server and client-side issues causing the spinning cog
  - Created ultra-minimal server.js implementation focused on maximum reliability
  - Used ES module syntax consistently throughout the server code
  - Implemented defensive client-side JavaScript with automatic retries
  - Added safety wrappers around all Homebridge API methods
  - Enhanced error handling throughout the codebase
  - Fixed timing issues with Homebridge API availability
  - Added detailed logging to help diagnose initialization problems

### Improved
- **API Communication**: Enhanced reliability of client-server communication
  - Simplified request handling with focused error management
  - Added explicit error reporting for configuration operations
  - Enhanced console logging for better troubleshooting
  - Improved status reporting throughout the configuration process
  - Implemented fallback mechanisms for UI notifications
## 6.1.22 (2025-04-04)

### Fixed
- **Critical UI Launch Issue**: Completely rewrote server.js with a minimalist approach 
  - Fixed "getPluginConfig is not a function" error by simplifying class structure
  - Used ES module syntax (import/export) to match package.json "type": "module"
  - Implemented inline request handlers with simplified logic
  - Added extensive console logging for better debugging
  - Ensured proper inheritance from HomebridgePluginUiServer
  - Fixed server instantiation to work with ES modules
## 6.1.22 (2025-04-04)

### Fixed
- **Critical UI Launch Fix**: Completely rewrote server.js implementation to fix custom UI initialization failures
  - Fixed server module type error by using ES module syntax instead of CommonJS
  - Changed require() to import statements for proper compatibility with package.json "type": "module"
  - Fixed initialization sequence to correctly call super() first and this.ready() afterward
  - Corrected API method usage for configuration management
  - Added proper error handling with RequestError for detailed user feedback
  - Updated server instantiation pattern for ES modules

### Improved
- **Configuration Handling**: Enhanced configuration processing with better validation
  - Added comprehensive type conversion for all configuration values
  - Improved schedule structure handling with explicit formatting
  - Enhanced verification after saving configuration
  - Added detailed logging throughout configuration operations
  - Fixed handling of temperature units in schedules

## 6.1.22 (2025-04-04)

### Fixed
- **Critical UI Launch Fix**: Completely rewrote server.js implementation to fix custom UI initialization failures
  - Switched from ES modules (import/export) to CommonJS (require) for proper compatibility
  - Fixed initialization sequence to correctly call super() first and this.ready() afterward
  - Corrected API method usage for configuration management
  - Added proper error handling with RequestError for detailed user feedback
  - Implemented the correct IIFE pattern for server instantiation

### Improved
- **Configuration Handling**: Enhanced configuration processing with better validation
  - Added comprehensive type conversion for all configuration values
  - Improved schedule structure handling with explicit formatting
  - Enhanced verification after saving configuration
  - Added detailed logging throughout configuration operations
  - Fixed handling of temperature units in schedules

### Technical
- **Robust Error Handling**: Implemented more comprehensive error management
  - Added custom logging that avoids triggering toast notifications
  - Enhanced error context with detailed information
  - Improved error recovery with appropriate status codes
  - Added verification steps after configuration operations
  - Better handling of edge cases like missing configuration

##6.1.21
Key improvements in this version:

Using CommonJS syntax with require() instead of ES modules
Simplified error handling with proper checks
Added more robust handling for configuration loading
Made sure to call super() first in the constructor
Added explicit check for Array.isArray() before using array methods
Included proper IIFE pattern at the end
Added fallback handling for configuration not found
Simplified the API testing implementation
Added more detailed logging

This version should resolve the "this.getPluginConfig is not a function" error by ensuring that the server properly extends HomebridgePluginUiServer and follows the expected patterns for Homebridge plugin UI servers.

## 6.1.20 (2025-04-12)

### Fixed
- **Schedule Persistence**: Targeted fix for schedule data not saving to config.json
  - Improved schedule object processing before saving to configuration
  - Added proper type conversion for all schedule properties
  - Fixed handling of optional properties like 'day' and 'description'
  - Added deep copying of schedule objects to prevent reference issues
  - Enhanced schedule verification after saving
  - Improved console logging for schedule processing operations
  - Maintained compatibility with existing code structure
  
### Technical
- **Data Processing**: Added targeted schedule object cleaning logic
- **Type Safety**: Implemented proper type conversion for schedule values
- **Validation**: Added proper verification of saved configuration
- **Logging**: Enhanced debugging information for schedule processing

## 6.1.16 (2025-04-12)

### Fixed
- **UI Server Initialization**: Completely rewrote server.js with minimal implementation
  - Created stripped-down server implementation following exact Homebridge documentation
  - Fixed module loading issues causing UI spinner to hang indefinitely
  - Simplified error handling to prevent initialization failures
  - Implemented bare minimum handlers for configuration and device testing
  - Followed canonical pattern from Homebridge Plugin UI Utils examples

### Technical
- **Server Implementation**: Created minimal working implementation following official examples
- **Module Format**: Used CommonJS module format for maximum compatibility
- **Error Handling**: Simplified to prevent initialization failures
- **Code Structure**: Followed canonical class pattern from documentation
- **Initialization**: Used proper IIFE pattern for server instantiation
## 6.1.16 (2025-04-11)

### Fixed
- **Custom UI Server**: Fixed server.js implementation causing spinning cog UI issue
  - Changed from ES modules (import/export) to CommonJS (require) for better compatibility
  - Maintained complete functionality of configuration loading and saving
  - Fixed module loading issues that caused UI to hang during initialization
  - Preserved extensive error handling and verification processes
  - Kept detailed logging for troubleshooting configuration issues

### Technical
- **Module Format**: Changed server.js module format from ES Modules to CommonJS
- **Import Style**: Replaced import statements with require() calls
- **Function Signature**: Maintained all function signatures and implementation details
- **Initialization**: Preserved IIFE pattern for proper server instantiation

## 6.1.16 (2025-04-11)

### Fixed
- **Custom UI Server**: Fixed broken server.js implementation
  - Switched from ES modules to CommonJS for better compatibility
  - Corrected the instantiation and export pattern to match documentation
  - Fixed module loading issues that prevented the UI from working
  - Maintained all functionality while correcting implementation approach
  - Followed exact patterns from Homebridge Plugin UI Utils documentation

### Technical
- **Module System**: Changed from ES Modules (import/export) to CommonJS (require/module.exports)
- **Initialization**: Corrected IIFE pattern for proper server instantiation
- **Error Handling**: Fixed error reporting format to match Homebridge expectations
- **API Usage**: Maintained correct HomebridgePluginUiServer method implementation
## 6.1.16 (2025-04-10)

### Fixed
- **Configuration Management**: Complete overhaul of config.json read/write functionality
  - Fixed inconsistent API usage for Homebridge Plugin UI Utils methods
  - Implemented proper processing of schedules with explicit type conversions
  - Enhanced validation of configuration data during both load and save operations
  - Added comprehensive error handling with detailed status updates
  - Fixed schedule persistence issues with proper data structure management
  - Improved temperature unit conversion for schedules
  - Added detailed verification steps after saving configuration
  - Enhanced console logging throughout configuration operations
  - Implemented proper handling of advanced configuration settings

### Technical
- **Schedule Processing**: Added robust data validation for schedules
  - Implemented deep copy of schedule objects to prevent reference issues
  - Added proper type conversion for all schedule properties
  - Corrected handling of optional properties (day, description)
  - Fixed unit conversion between Celsius and Fahrenheit
  - Added validation of temperature ranges based on selected unit
  - Enhanced template schedule information preservation
  - Added comprehensive logging for schedule processing operations

### Improved
- **Error Handling**: Enhanced user feedback for configuration operations
  - Added proper status element updates throughout all operations
  - Implemented NotificationManager integration for user notifications
  - Added console logging with context for better debugging
  - Improved validation error messages with specific details
  - Added proper timeout handling for long-running operations
  - Improved API test functionality with better error reporting

## 6.1.15 (2025-04-08)

### Fixed
- **Server Configuration Handling**: Complete rewrite of `server.js` to correctly implement Homebridge Plugin UI Utils methods
  - Fixed `getPluginConfig()` method implementation
  - Ensured proper initialization of UI server with `this.ready()`
  - Added comprehensive error handling for configuration load/save operations
  - Improved logging with console-only output to prevent unwanted notifications
  - Added explicit type checking and data validation for configuration handling

### Technical
- Updated server-side implementation to follow Plugin UI Utils best practices
- Improved error handling with `RequestError` for API-level issues
- Enhanced configuration management with more robust method implementations
- Added explicit type conversions and validation for configuration data

### Improved
- Better error reporting during configuration operations
- More reliable configuration loading and saving
- Simplified server-side code with clearer separation of concerns
- Added placeholder device connection test method

## 6.1.13 (2025-04-07)

### Fixed
- **Configuration Persistence**: Resolved issue where logLevel and schedules settings weren't being saved to config.json
  - Updated server.js with comprehensive logging and validation for each configuration field
  - Fixed logLevel property definition in config.schema.json to use proper string enum format
  - Implemented explicit type conversion to ensure correct data types in saved configuration
  - Added verification step to confirm configuration values are properly saved
  - Enhanced schedules array handling with proper structure validation
  - Improved error handling with detailed error responses
  - Added extensive debug logging throughout the configuration process

### Technical
- **Schema Definition**: Updated config.schema.json with proper type definitions and validation rules
- **API Usage**: Ensured proper use of HomebridgePluginUiServer methods for configuration management
- **Type Handling**: Added explicit type conversion for all configuration values
- **Verification**: Added post-save verification step with detailed logging
- **Schedule Handling**: Implemented robust processing for schedule array items
## 6.1.12 (2025-04-06)

### Fixed
- **Configuration Persistence**: Resolved issue where logLevel, temperature unit, and polling interval settings weren't being saved to config.json
  - Updated server.js to correctly use Homebridge Plugin UI Utils methods for configuration management
  - Fixed incorrect API usage that was preventing configuration values from being properly stored
  - Implemented proper error handling using RequestError for more specific error responses
  - Added detailed logging of configuration values during save operations for better debugging
  - Ensured complete platform configuration structure is maintained during updates

### Technical
- **API Usage**: Updated to use the correct HomebridgePluginUiServer methods (getPluginConfig, updatePluginConfig, savePluginConfig)
- **Verification**: Added saved configuration details to response for verification
- **Error Handling**: Enhanced with proper RequestError implementation for better client feedback
- **Debugging**: Improved logging around configuration operations for easier troubleshooting

## 6.1.11 (2025-04-04)

### Fixed
- **Configuration Loading**: Fixed critical issue with server.js not properly reading configuration parameters at startup
  - Replaced direct filesystem access with proper Homebridge Plugin UI Utils API methods
  - Fixed platform identification to consistently use exact platform name
  - Enhanced error handling with more specific error codes and detailed messages
  - Improved configuration loading process with better logging
  - Reorganized server-side code for better maintainability

### Improved
- **API Usage**: Better adherence to Homebridge Plugin UI Utils best practices
  - Used `getPluginConfig()` instead of direct file access
  - Improved error handling and recovery mechanisms
  - Enhanced logging with more detailed context information
  - Added better validation of configuration data

## 6.1.9 (2025-04-03)

### Fixed
- **Configuration Loading**: Added missing /config/load endpoint to server.js
  - Fixed issue where plugin configuration wasn't being fully loaded
  - Implemented proper config.json file access with robust error handling
  - Added platform detection with flexible name matching
  - Ensured complete configuration is returned to UI
  - Fixed API token caching issues by properly loading full configuration


6.1.8 (2025-04-05)
Changed

Config File Access: Refactored checkConfigFile function to align with Homebridge Plugin UI Utils guidelines

Now uses homebridge.getPluginConfig(), homebridge.updatePluginConfig(), and homebridge.savePluginConfig() to manage configuration
Improved error handling with more specific error codes
Separated config file access logic from platform-specific parsing for better modularity



Removed

Direct Config File Access: Removed direct access to config.json using Node.js fs module functions
Case-Insensitive Platform Matching: Removed case-insensitive platform name matching

Fixed

Platform Naming Convention: Ensured consistent naming convention for platform by using the exact name from config.schema.json
Config Management Synchronization: Improved synchronization and conflict avoidance by using Homebridge-provided methods for config management

## 6.1.6 (2025-05-20)

### Added
- Robust server-side configuration handling using Plugin UI Utils
- Comprehensive configuration loading, saving, and validation endpoints
- Enhanced error handling with structured error responses
- Flexible platform configuration detection

### Improved
- Thorough validation for configuration fields
- Comprehensive checks for API token, temperature units, polling intervals
- Improved schedule structure validation
- Detailed error reporting for configuration issues

### Technical
- Refactored configuration management to follow Homebridge Plugin UI Utils best practices
- Improved error handling and response structure
- Added more flexible configuration parsing
- Enhanced logging and diagnostics for configuration operations
## 6.1.4 (2025-05-15)

### Fixed
- **UI Initialization Issue**: Resolved "spinning cog" problem that prevented the config UI from loading
  - Implemented immediate UI readiness signaling before any initialization
  - Restructured server initialization sequence with proper async pattern
  - Added fallback server creation mechanism for resilience
  - Enhanced platform detection with flexible name matching
  - Added comprehensive error handling throughout server component

### Architecture Improvements
- **Server Component**: Refactored server.js with better design patterns
  - Separated initialization logic from constructor for improved reliability
  - Created modular code organization with dedicated methods for each responsibility
  - Implemented proper error boundaries around all operations
  - Enhanced diagnostics with detailed logging throughout the initialization process
  - Added graceful degradation with fallback mechanisms
  
## 6.1.2 (2025-05-10)

### Critical Fixes
- **Configuration Loading System**: Complete overhaul of configuration load/save mechanism
 - Added comprehensive error handling for each step of the loading process
 - Implemented timeout protection to prevent UI freezing on API failures
 - Enhanced form field population with field-by-field error handling
 - Added configuration verification after save operations
 - Fixed platform detection with flexible name matching
 - Improved schedule data structure handling and validation

### Added
- **Enhanced User Feedback**: Fully integrated with centralized notification system
 - Added contextual error messages with specific error details
 - Implemented progressive success/failure messaging
 - Added configuration verification reporting with detailed diagnostics
 - Improved console logging for better troubleshooting visibility
 - Added notification options support including auto-hide functionality

### Technical Improvements
- **Robust Error Boundaries**: Added multi-layer error protection
 - Implemented try/catch blocks for each major operation
 - Added specific error handling for API availability issues
 - Enhanced data validation before configuration updates
 - Added graceful degradation for partial configuration loading
 - Improved diagnostics with detailed console logging throughout
 - Fixed race conditions in configuration processing

### Under the Hood
- **API Integration**: Better handling of Homebridge Plugin UI Utils
 - Added Homebridge API availability checking with fallbacks
 - Improved configuration object structure management
 - Enhanced schedule data processing with proper unit handling
 - Fixed potential memory issues with deep object cloning
 - Added detailed verification steps for configuration changes
## 6.1.1 (2025-05-05)
### Fixed
- **Script Caching Issues**: Implemented automatic cache-busting mechanism for UI scripts
  - Added version parameter to all script URLs to force fresh loading
  - Created build-time version injection from package.json
  - Ensured all UI JavaScript files are reloaded when version changes
  - Eliminated persistent caching problems affecting user experience
  - Fixed "Logs Error" messages caused by stale cached scripts

### Added
- **Build Process Improvements**: Enhanced script processing during build
  - Added version-scripts.js utility for automatic version stamping
  - Implemented template-based version injection in HTML files
  - Created more reliable UI asset processing pipeline
  - Improved script reference handling for better browser compatibility
  - Added comprehensive build verification for UI components

### Technical
- **Script Version Management**: Created a more robust approach to script versioning
  - Leveraged package.json version for automatic cache invalidation
  - Enhanced build scripts to process version placeholders
  - Maintained backward compatibility with existing code
  - Improved user experience by eliminating stale code execution
  - Added version tracking for easier debugging
## 6.1.0 (2025-05-05)

### Build System Improvements
- **Enhanced Build Process**: Completely overhauled file copying mechanism for UI assets
  - Implemented proper recursive directory copying for all UI files
  - Added comprehensive build verification steps to prevent incomplete builds
  - Fixed JavaScript file copying to ensure all UI scripts are properly included
  - Improved GitHub Actions workflow with explicit build stages
  - Added detailed build logging for easier troubleshooting

### Added
- **Pre-publish Verification**: New script that validates build completeness before publishing
  - Added critical path checking for required files
  - Implemented JS file count verification
  - Added detailed reporting of build artifacts
  - Enhanced error detection with descriptive messages
  - Prevents publishing if any critical files are missing

### Technical
- **Improved Reliability**: Enhanced overall build reliability
  - Separated TypeScript compilation from UI asset copying
  - Added explicit directory creation with proper permissions
  - Enhanced workflow steps with independent verification
  - Improved error handling during build process
  - Added detailed logging of copied files for better traceability
## 6.0.1 (2025-04-30)

### Fixed
- **Collapsible Sections Functionality**: Completely rewrote the section initialization mechanism
  - Added robust DOM element verification before manipulation
  - Implemented both class toggling and explicit style properties
  - Added proper event propagation control for click handlers
  - Used element cloning to eliminate event listener conflicts
  - Added detailed logging for troubleshooting section state

### Enhanced
- **Initialization Process**: Improved section loading reliability
  - Implemented delayed re-initialization for DOM readiness
  - Added per-section error handling with specific error messages
  - Enhanced section state management with explicit style control
  - Fixed dropdown indicator rotation animations

### Technical
- **Code Improvements**: Enhanced codebase stability
  - Added comprehensive element existence checks
  - Implemented defensive coding practices throughout
  - Added runtime logging for initialization sequence
  - Improved error boundaries around critical functionality
## 6.0.0 (2025-04-25)

### Complete UI Redesign
- **Reorganized Tab Structure**: Intuitive tab organization with Manual Schedules, Templates, Warm Hug Options, and Help
- **Improved Schedule Management**: Enhanced schedule creation, editing, and display with better grouping and visual cues
- **Consolidated Warm Hug Options**: All Warm Hug parameters moved to dedicated tab with improved explanations
- **Responsive Design Enhancements**: Better mobile support with improved layouts for smaller screens

### UI Components
- **Enhanced Form Validation**: More robust validation for time and temperature with unit-aware feedback
- **Improved Template System**: Better template previews and application with clearer success indicators
- **Collapsible Sections**: More reliable section expansion/collapse with proper indicator rotation
- **Confirmation Modal**: Enhanced reliability for schedule removal confirmation

### Technical Improvements
- **Modular Code Architecture**: Better separation of concerns with focused modules for notifications, scheduling, and UI
- **Consistent Unit Handling**: Seamless conversion between Celsius and Fahrenheit throughout the interface
- **Memory Leak Prevention**: Proper event listener cleanup and element management
- **Defensive Programming**: Better error handling with appropriate user feedback
- **Enhanced Accessibility**: Improved keyboard navigation and ARIA attributes

### Code Quality
- **Better Documentation**: Comprehensive JSDoc comments for all functions
- **Type Safety**: Improved validation for all input/output data
- **Code Organization**: Logical function grouping and naming conventions
- **Performance Optimization**: Reduced DOM operations and better state management

## 5.8.0 (2025-04-20)

### Added
- **Enhanced NotificationManager**: Complete overhaul of the notification system
  - Added centralized notification management with intelligent filtering
  - Implemented blocklist/allowlist approach for toast notifications
  - Added direct status element updates with proper console logging
  - Created lazy initialization for better startup reliability
  - Added dynamic management of allowed/blocked notification patterns

### Improved
- **Notification Consistency**: Standardized all user feedback mechanisms
  - Replaced direct DOM manipulation with centralized NotificationManager calls
  - Enhanced status element handling with automatic timeout management
  - Improved console logging with appropriate severity levels
  - Added explicit auto-hide functionality for transient notifications
  - Streamlined notification appearance/disappearance for better UX

### Fixed
- **Toast Notification Issues**: Comprehensive solution for unwanted toast messages
  - Expanded blocklist to catch all system-generated notifications
  - Added status-only mode to prevent toast displays when not needed
  - Fixed notification race conditions with proper initialization checks
  - Enhanced error handling in notification system
  - Implemented message context preservation in status updates

### Technical
- **Architecture Enhancement**: More robust notification infrastructure
  - Added module pattern encapsulation for better state management
  - Created public API with convenience methods for different notification types
  - Implemented explicit timeout management to prevent memory leaks
  - Added dynamic notification filtering based on message content
  - Enhanced error recovery with fallback notification methods
  - Improved performance by reducing redundant DOM operations
## 5.7.0 (2025-04-15)

### Fixed
- **Notification Functionality**: Completely rewrote the notification handling system
  - Fixed persistent toast notifications across the application
  - Ensured comprehensive error logging with intelligent filtering
  - Improved user feedback mechanisms with granular control
  - Added sophisticated error handling and context preservation
  - Implemented robust fallback mechanisms for notification display

### Improved
- **Event Handling**: Enhanced messaging system with advanced features
  - Used dependency injection for flexible notification configuration
  - Implemented whitelist and blacklist for toast notifications
  - Added detailed console logging with context preservation
  - Improved error tracing and debugging capabilities
  - Enhanced cross-component communication for status updates

### Technical
- **Initialization Process**: Restructured UI messaging approach
  - Added timeout and auto-hide capabilities for different notification types
  - Implemented cross-browser compatible notification display
  - Enhanced modularity of notification handling system
  - Added comprehensive error tracking and reporting
  - Improved performance by reducing redundant notification calls

## 5.6.0 (2025-04-05)

### Fixed
- **Collapsible Section Functionality**: Completely rewrote the collapsible section handler
  - Fixed dropdown indicators not rotating when sections are clicked
  - Ensured consistent visibility state using both class and style properties
  - Improved event handling to prevent issues with event propagation
  - Fixed initialization of section state to ensure all sections start closed
  - Added comprehensive error handling and logging throughout the process

### Improved
- **Event Delegation**: Enhanced event handler attachment with proper cleanup
  - Used element cloning to remove any pre-existing event listeners
  - Implemented explicit parent-child relationship traversal
  - Added more detailed debug logging for state changes
  - Fixed transform animations for dropdown indicators

### Technical
- **Initialization Process**: Enhanced UI component initialization sequence
  - Added timeout to ensure DOM is fully processed before attaching handlers
  - Improved section state tracking with console logs for better debugging
  - Added verification of DOM element existence before manipulation
  - Enhanced compatibility with tab navigation system
  - Implemented both class and inline style manipulation for cross-browser compatibility
## 5.5.6 (2025-04-02)
### Fixed
- **Collapsible Sections**: Complete overhaul of dropdown section initialization
  - Resolved issues with section expansion and collapse mechanisms
  - Enhanced event handling to prevent multiple listener bindings
  - Improved cross-browser compatibility for section toggles
  - Added comprehensive console logging for better debugging

### Improved
- **User Interface Interaction**: 
  - More robust dropdown section behavior
  - Explicit error checking for section initialization
  - Added global function exposure for manual section management
  - Enhanced transition animations for dropdown indicators

### Technical
- Implemented multi-method visibility toggling
- Added detailed console diagnostics for section initialization
- Improved event listener management to prevent memory leaks
- Created fallback mechanisms for section interaction
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