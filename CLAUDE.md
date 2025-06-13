# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development
```bash
npm run build          # Compile TypeScript to dist/
npm run watch          # Watch mode compilation
npm run clean          # Remove dist/ folder
```

### Code Quality
```bash
npm run lint           # ESLint TypeScript files in src/
```

### Testing
No automated tests are configured. Manual testing requires:
1. Install plugin in Homebridge instance
2. Configure with valid SleepMe API token
3. Test device discovery and HomeKit controls

## Core Architecture

### Plugin Structure
```
src/
├── index.ts           # Homebridge plugin registration
├── platform.ts       # Main plugin orchestrator, device management
├── accessory.ts       # Individual device HomeKit interface
├── api/
│   ├── sleepme-api.ts # Priority-based API client with rate limiting
│   └── types.ts       # API response type definitions
├── polling-manager.ts # Centralized device status polling
├── schedule.ts        # Temperature schedule management
└── settings.ts        # Constants, enums, and configuration
```

### Key Architectural Patterns

#### **Priority-Based API Queue System**
The API client (`sleepme-api.ts`) implements sophisticated request queuing:
- **CRITICAL**: User power changes (immediate processing)
- **HIGH**: User temperature changes
- **NORMAL**: Regular status updates  
- **LOW**: Background operations

#### **Rate Limiting Strategy**
- Capacity reservation: Background requests throttle at 80% to reserve 20% for user actions
- Priority bypass: CRITICAL/HIGH requests can bypass rate limits
- Intelligent backoff: Different backoff periods based on request priority
- Window alignment: Handles server/client rate limit window misalignment

#### **Trust-Based Caching**
- Confidence levels (low/medium/high) based on data source
- Source tracking ('get'/'patch'/'inferred') for reliability
- Optimistic updates: UI responds immediately while API processes in background
- Dynamic cache validity based on device activity state

#### **Homebridge Integration**
- Uses Thermostat service with simplified controls (only OFF/AUTO modes)
- Implements `DynamicPlatformPlugin` for device discovery
- Centralized polling manager reduces API calls across all devices
- Staggered device initialization (45s delays) prevents rate limiting

## Configuration Schema

Plugin uses `config.schema.json` for Homebridge Config UI integration. Core settings:
- `apiToken`: Required SleepMe API token
- `unit`: Temperature unit (C/F)
- `pollingInterval`: Status check frequency (min 60s)
- `enableSchedules`: Temperature scheduling feature
- `disableAutoDiscovery`: Prevents daily device re-discovery

## Rate Limiting Implementation

### Current Priority System
The plugin implements priority-based rate limiting to ensure user interactions are immediate while background operations respect API limits:

1. **Request Priorities**: CRITICAL > HIGH > NORMAL > LOW
2. **Capacity Reservation**: Background requests throttle at 80% of rate limit
3. **Smart Backoff**: Different backoff periods based on request priority
4. **Queue Bypass**: User requests can jump ahead of background requests

### Key Constants (in settings.ts)
- `MAX_REQUESTS_PER_MINUTE`: API rate limit (default: 10)
- `MIN_REQUEST_INTERVAL`: Minimum time between LOW priority requests
- `BACKGROUND_REQUEST_THRESHOLD`: When to throttle background requests (0.8)
- `COMMAND_DEBOUNCE_DELAY_MS`: Prevents rapid-fire user commands

### Implementation Notes
- User interactions (power/temperature changes) should use CRITICAL/HIGH priority
- Background polling should use NORMAL priority
- Only LOW priority requests are subject to MIN_REQUEST_INTERVAL
- CRITICAL requests get shorter backoff periods during rate limiting

## Development Patterns

### TypeScript Conventions
- Strong typing throughout with interfaces and enums
- Generic type parameters for API responses
- Comprehensive error typing with Axios integration

### Async/Promise Management
- Promise-based API with proper error propagation
- Careful timeout and cancellation handling
- Resource cleanup in finally blocks

### Error Handling
- Exponential backoff with jitter for API errors
- Priority-aware retry logic (CRITICAL gets more retries)
- Graceful degradation during rate limiting
- Comprehensive error logging with context

### User Experience Focus
- Optimistic UI updates before API confirmation
- Debounced commands to prevent rapid-fire requests
- Trust-based approach eliminates verification GET requests
- Command epoch tracking for cancellation of stale operations

## Custom UI

The plugin includes a custom Homebridge Config UI in `homebridge-ui/`:
- Device discovery and API token validation
- Schedule creation and management interface
- Template-based schedule setup
- Real-time configuration testing

UI uses vanilla JavaScript with modular handlers in separate files:
- `ui-main-script.js`: Core functionality
- `ui-config-handlers.js`: Configuration management
- `ui-schedule-handlers.js`: Schedule interface
- `ui-validation-functions.js`: Input validation

## API Integration

### SleepMe API Patterns
- REST API with rate limiting (10 requests/minute)
- Device discovery via `/users/me` endpoint
- Device control via PATCH `/devices/{id}`
- Status retrieval via GET `/devices/{id}`

### Request Management
- Request deduplication prevents concurrent identical requests
- Stale request cleanup with configurable timeouts
- Comprehensive retry logic with exponential backoff
- Smart caching reduces unnecessary API calls

## Debugging

### Log Levels
- `normal`: Basic operation logs
- `debug`: Detailed operation flow
- `verbose`: All API requests and responses

### Common Debug Points
- Priority levels in log messages: `[CRITICAL PRIORITY]`, `[HIGH PRIORITY]`
- Queue lengths: Critical/High queues should stay small
- Rate limit utilization: Background throttling before hitting limits
- Cache confidence levels and source tracking