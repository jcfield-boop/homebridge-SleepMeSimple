# Changelog

## 4.0.11-dev.18 (Current Development Version)
- Fixed confirmation modal appearing at startup and being unable to dismiss
- Removed Server Logs section from the UI
- Added safeguard to ensure confirmation modal is properly hidden by default
- Added ability to close modal by clicking outside

## 4.0.10-dev.17 (Previous Version)
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

## 4.0.10-dev.14
- Implemented robust error handling and recovery mechanisms
- Enhanced API request queue with priority management
- Added support for device-specific schedules
- Improved water level monitoring and reporting
- Updated UI with tab-based navigation

## 4.0.9
- Added "Warm Hug" temperature ramping feature for gentle wake-up
- Implemented schedule templates based on sleep science
- Enhanced status reporting in HomeKit
- Improved device type detection logic

## 4.0.8
- Added support for ChiliPad Pro devices
- Implemented trust-based caching to reduce API calls
- Enhanced stability with adaptive backoff for rate limiting
- Updated configuration UI with improved validation

## 4.0.7
- Fixed stability issues with SleepMe API
- Implemented rate limiting protection
- Added support for firmware version detection
- Enhanced error recovery on network failures

## 4.0.6
- Added automatic device discovery
- Improved temperature control responsiveness
- Enhanced logging with configurable detail levels
- Better handling of device status updates

## 4.0.5
- Initial release with custom UI
- Support for Dock Pro, OOLER, and ChiliPad devices
- Basic temperature and power control
- Homebridge configuration schema