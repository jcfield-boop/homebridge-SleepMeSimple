# SleepMe API Analysis Tools

This directory contains tools for empirically analyzing the SleepMe API's rate limiting behavior to ensure accurate implementation in the plugin.

## Quick Start

1. **Setup Configuration**:
   ```bash
   cp api-test-config.example.json api-test-config.json
   # Edit api-test-config.json with your API token
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Validate Setup**:
   ```bash
   npm run validate
   ```

4. **Run Complete Analysis** (15-30 minutes):
   ```bash
   npm run full
   ```
   
   Or run steps individually:
   ```bash
   npm run analyze  # Run data collection
   npm run report   # Generate recommendations
   ```

## Tools

### `api-rate-limit-analyzer.js`

Comprehensive rate limiting analysis tool that performs systematic testing to determine:

- **Burst Capacity**: How many rapid requests can be made before hitting rate limits
- **Refill Rate**: How quickly the rate limit "bucket" refills after being depleted  
- **Sustained Rate**: Maximum sustainable request frequency for long-term operation
- **Window Behavior**: Whether rate limits use discrete time windows or continuous limiting

#### Output

Results are saved to `rate-limit-analysis-results.json` with:
- Raw request/response data with timestamps
- Analysis of each test phase
- Summary with derived rate limiting parameters
- Recommendations for plugin configuration

#### Safety

- Only makes read-only GET requests
- Will not modify device settings
- Respects rate limits and includes delays
- Saves partial results if interrupted

## Using Results

The analysis results should be used to:

1. **Update Token Bucket Parameters**: 
   - Set correct bucket capacity based on burst capacity test
   - Set correct refill rate based on timing analysis
   - Adjust safety margins based on observed behavior

2. **Optimize Polling Intervals**:
   - Use sustained rate results to set base polling frequency
   - Ensure adaptive polling stays within safe limits

3. **Improve Rate Limit Handling**:
   - Use recovery timing data for backoff strategies
   - Implement appropriate retry delays

## Example Analysis Output

```json
{
  "summary": {
    "burstCapacity": 8,
    "sustainableInterval": 25,
    "estimatedRefillRate": "~1 token per 20s",
    "successRate": 89.5
  }
}
```

This would indicate:
- 8 requests can be made rapidly
- Safe interval is 25+ seconds between requests  
- Tokens refill approximately every 20 seconds
- 89.5% overall success rate during testing

## Tips

- Run analysis during different times of day for comprehensive data
- Multiple runs help identify API behavior variations
- Consider running monthly to detect API changes
- Share results with other developers using SleepMe API

## Configuration

Create `api-test-config.json`:

```json
{
  "apiToken": "your-api-token",
  "deviceId": "optional-will-auto-discover"
}
```

Get your API token from:
- SleepMe mobile app developer settings
- SleepMe web portal API section  
- Homebridge plugin configuration (if already set up)