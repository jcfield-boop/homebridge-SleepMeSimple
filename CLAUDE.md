# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Development
- `npm run build` - Build the TypeScript code and copy UI files to dist/
- `npm run watch` - Watch for TypeScript changes and rebuild automatically
- `npm run clean` - Clean the dist/ directory
- `npm run lint` - Run ESLint on the source code

### Testing and Quality
- `npm run lint` - Lint TypeScript code with ESLint
- No test suite is currently configured

### Publishing
- `npm run prepublishOnly` - Automatically runs build before publishing
- `npm run check-publish` - Validate package before publishing
- `npm run version` - Runs build when version is bumped
- `npm publish` - Publish to npm registry (requires authentication)
- `npm version patch|minor|major` - Bump version and create git tag

## Architecture Overview

### Core Components

This is a Homebridge plugin for SleepMe temperature control devices. The architecture follows a platform-accessory pattern:

1. **Platform** (`src/platform.ts`) - Main plugin entry point that discovers devices and manages accessories
2. **Accessory** (`src/accessory.ts`) - Individual device handlers that implement HomeKit services
3. **API Client** (`src/api/sleepme-api.ts`) - Sophisticated API client with rate limiting and request prioritization
4. **Schedule Manager** (`src/schedule.ts`) - Handles temperature scheduling features

### Key Architectural Patterns

**Trust-Based Caching**: The API client uses a sophisticated caching strategy that trusts command responses rather than immediately verifying with GET requests, improving responsiveness while managing rate limits.

**Prioritized Request Queue**: API requests are queued with different priorities:
- CRITICAL: User-initiated power/temperature changes
- HIGH: Device discovery and forced status updates
- NORMAL: Regular status polling
- LOW: Background operations

**Simplified HomeKit Interface**: Unlike other SleepMe plugins, this uses a simplified thermostat interface with only AUTO (on) and OFF states, avoiding the complexity of traditional thermostat modes.

### File Structure

- `src/index.ts` - Plugin entry point and registration
- `src/platform.ts` - Main platform class that manages devices
- `src/accessory.ts` - Individual device accessory implementation
- `src/api/sleepme-api.ts` - API client with advanced rate limiting
- `src/api/types.ts` - TypeScript type definitions
- `src/schedule.ts` - Temperature scheduling system
- `src/settings.ts` - Configuration constants and defaults
- `homebridge-ui/` - Custom configuration UI for Homebridge
- `config.schema.json` - Homebridge UI configuration schema

### API Client Design

The SleepMe API client is particularly sophisticated:

- **Rate Limiting**: Implements discrete minute-based rate limiting aligned with API server windows
- **Request Prioritization**: Critical user actions bypass rate limits
- **Trust-Based Updates**: Updates cache with command results instead of always verifying
- **Exponential Backoff**: Handles failures with intelligent retry logic
- **Queue Management**: Separate queues for different priority levels

### HomeKit Integration

The plugin supports three interface modes:

**Hybrid Mode (Default)**:
- Power Switch service for simple on/off control
- Temperature Sensor service for current temperature monitoring
- Thermostat service for advanced temperature control and HomeKit automation
- Water level indicator (using Battery service)
- All services stay synchronized to eliminate confusion

**Switch Mode**:
- Power Switch service for simple on/off control
- Temperature Sensor service for current temperature monitoring
- Water level indicator (using Battery service)

**Thermostat Mode**:
- Thermostat service with simplified OFF/AUTO states (legacy mode)
- Water level indicator (using Battery service)

The hybrid mode solves common HomeKit automation issues by providing both simple and advanced controls that stay perfectly synchronized.

### Configuration and Scheduling

- Supports temperature scheduling with predefined templates
- "Warm Hug" feature for gentle wake-up temperature increases
- Configurable polling intervals and logging levels
- Custom UI for easy configuration in Homebridge

## Development Notes

### TypeScript Configuration
- Uses NodeNext module resolution for ES modules
- Targets ES2022 with strict type checking
- Outputs to `dist/` with source maps

### Code Style
- ESLint with TypeScript support
- Warns on unused variables and explicit any types
- Follows modern JavaScript/TypeScript practices

### Homebridge Integration
- Plugin type: Platform
- Supports custom UI configuration
- Uses ES modules (type: "module" in package.json)
- Compatible with Homebridge 1.6.0+ and 2.0.0-beta

### Rate Limiting Considerations
- SleepMe API has strict rate limits
- Plugin uses 60-second discrete windows for rate limiting
- Critical operations (power/temperature changes) can bypass limits
- Background polling is carefully throttled

### Testing Strategy
- Currently no automated tests
- Manual testing through Homebridge UI
- Rate limiting behavior tested with actual API