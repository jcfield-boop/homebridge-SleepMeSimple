# SleepMe API Rate Limiting Probe

A comprehensive test application to empirically determine the SleepMe API rate limiting behavior and derive optimal rate limiting strategies.

## Purpose

This tool probes the SleepMe API to understand:
- Actual rate limit thresholds
- Window type (fixed vs sliding)
- Recovery times after rate limits
- Endpoint-specific rate limits
- Optimal request patterns

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your API token and device ID
   ```

3. Build the application:
   ```bash
   npm run build
   ```

## Usage

Run the complete test suite:
```bash
npm run test
```

Run in development mode:
```bash
npm run dev
```

## Test Types

### 1. Burst Test
- Sends requests as fast as possible
- Identifies immediate rate limit threshold
- Determines maximum burst size

### 2. Sustained Test
- Tests various request intervals (1s to 60s)
- Finds sustainable request rates
- Identifies optimal polling intervals

### 3. Window Test
- Tests rate limit window behavior
- Determines if limits are fixed or sliding window
- Tests alignment with minute boundaries

### 4. Recovery Test
- Triggers rate limits intentionally
- Measures recovery time
- Determines optimal backoff strategies

### 5. Endpoint Comparison Test
- Tests different API endpoints
- Identifies endpoint-specific rate limits
- Compares GET vs PATCH request limits

## Output

The tool generates:
- Real-time console output with test progress
- Detailed JSON results in `results/` directory
- Comprehensive recommendations for rate limiting
- Analysis of optimal request patterns

## Configuration

Environment variables:
- `SLEEPME_API_TOKEN`: Your SleepMe API token (required)
- `SLEEPME_DEVICE_ID`: Device ID for testing (optional)
- `TEST_DURATION_MINUTES`: Maximum test duration (default: 10)
- `MAX_REQUESTS_PER_TEST`: Maximum requests per test (default: 100)
- `VERBOSE_LOGGING`: Enable verbose logging (default: true)
- `EXPORT_RESULTS`: Export results to JSON (default: true)

## Safety Features

- Respects API terms of service
- Conservative approach to prevent API abuse
- Automatic stopping after consecutive failures
- Configurable test limits
- Graceful shutdown on user interruption

## Results Analysis

The tool provides:
- Rate limit error patterns
- Response time analysis
- Optimal request intervals
- Window type identification
- Recovery time measurements
- Endpoint-specific recommendations

## Integration

Results from this tool are used to:
- Refactor the main API client rate limiting
- Implement empirically-derived rate limits
- Optimize request scheduling
- Improve error handling and recovery