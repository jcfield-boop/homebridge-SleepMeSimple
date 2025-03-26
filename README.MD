# SleepMe Simple - Homebridge Plugin

<img src="icons/sleepme.jpg" width="100" alt="SleepMe Simple Plugin Icon">

A sophisticated Homebridge plugin for SleepMe devices (Dock Pro, OOLER, ChiliPad) that provides reliable and responsive HomeKit integration with advanced API management.

## Key Features

- **Intelligent Temperature Control**: Clean and responsive interface for temperature adjustments and power control
- **Trust-based Caching**: Optimized API usage that prioritizes responsiveness while respecting rate limits
- **Advanced Queue Management**: Prioritizes critical commands like power changes while managing background updates
- **Rate Limit Protection**: Smart handling of API rate limits with clock-synchronized request timing
- **Water Level Monitoring**: Check your device's water level through HomeKit
- **Automatic Device Detection**: Auto-discovers your SleepMe devices
- **Comprehensive Model Support**: Compatible with Dock Pro, OOLER, and ChiliPad devices
- **Sleep Schedule Templates**: Pre-defined temperature profiles based on sleep science

## Why Use This Plugin?

The official SleepMe integration and other third-party plugins use HomeKit's thermostat service, which creates several issues:

1. Requiring mode switching to "Auto" before temperature adjustments can be made
2. Excessive API calls during state transitions that trigger rate limiting
3. Confusing or inconsistent behavior with HomeKit automations

SleepMe Simple addresses these problems through:

- Simplified, intuitive controls that match the mental model of how SleepMe devices actually work
- Request prioritization that ensures user-initiated commands always take precedence
- Smart caching that reduces API calls while maintaining responsive feedback
- Adaptive request scheduling that works with API rate limits instead of fighting against them

## HomeKit Integration

The plugin presents each SleepMe device in HomeKit with:

1. **Temperature Control**: Simple slider for direct temperature adjustment
2. **Power Control**: Easy on/off switching with quick feedback
3. **Temperature Sensor**: Shows the current bed temperature
4. **Water Level Indicator**: Uses the Battery service to show water level status

## Advanced Technical Features

- **Discrete Minute Synchronization**: Aligns with API server-side rate limiting windows
- **Prioritized Command Queue**: Ensures critical operations complete first
- **Optimistic Updates**: Updates UI immediately while command executes for responsive feedback
- **Exponential Backoff**: Intelligently handles API limitations or connectivity issues
- **Smart Polling**: Adjusts status check frequency based on device activity and user interaction

## Installation

You can install this plugin through the Homebridge UI or manually:

```bash
npm install -g homebridge-sleepme-simple
```

## Configuration

Configure through the Homebridge UI or manually in your `config.json`:

```json
{
  "platforms": [
    {
      "platform": "SleepMeSimple",
      "name": "SleepMe Simple",
      "apiToken": "YOUR_SLEEPME_API_TOKEN",
      "unit": "C",
      "pollingInterval": 90,
      "logLevel": "normal"
    }
  ]
}
```

### Configuration Options

- **apiToken**: Your SleepMe API token (required, obtain from your account at sleep.me)
- **unit**: Temperature unit, "C" for Celsius or "F" for Fahrenheit (default: "C")
- **pollingInterval**: How frequently to check device status in seconds (default: 90, minimum: 60)
- **logLevel**: Log detail level - "normal", "debug", or "verbose"
- **enableSchedules**: Enable temperature scheduling features (default: false)

## Sleep Schedule Templates

The SleepMe Simple plugin includes pre-defined sleep schedule templates designed to optimize your sleep experience. These templates are based on sleep science principles and provide temperature adjustments that work with your body's natural sleep cycles.

### Using Schedule Templates

1. Enable the "Enable Schedules" option in the plugin settings
2. The Schedule Templates interface will appear above the schedule list
3. Select a template for weekdays and weekends (you can choose different patterns for each)
4. Click "Save" to apply the templates to your configuration

### Available Templates

#### Weekday Templates

- **Optimal Sleep Cycle**
  - Designed for complete sleep cycles with REM enhancement
  - 10:00 PM: 21°C (Cool Down) - Helps you fall asleep faster
  - 11:00 PM: 19°C (Deep Sleep) - Supports deeper sleep stages
  - 2:00 AM: 23°C (REM Support) - Enhances REM sleep phases
  - 6:00 AM: Warm Hug Wake-up - Gently wakes you with warmth

- **Night Owl**
  - Later bedtime with extended morning warm-up
  - 11:30 PM: 21°C (Cool Down)
  - 12:30 AM: 19°C (Deep Sleep)
  - 3:30 AM: 23°C (REM Support)
  - 7:30 AM: Warm Hug Wake-up

- **Early Bird**
  - Earlier bedtime and wake-up schedule
  - 9:00 PM: 21°C (Cool Down)
  - 10:00 PM: 19°C (Deep Sleep)
  - 1:00 AM: 23°C (REM Support)
  - 5:00 AM: Warm Hug Wake-up

#### Weekend Templates

- **Weekend Recovery**
  - Extra sleep with later wake-up time
  - 11:00 PM: 21°C (Cool Down)
  - 12:00 AM: 19°C (Deep Sleep)
  - 3:00 AM: 23°C (REM Support)
  - 8:00 AM: Warm Hug Wake-up

- **Relaxed Weekend**
  - Gradual transitions for weekend leisure
  - 11:30 PM: 22°C (Cool Down)
  - 1:00 AM: 20°C (Deep Sleep)
  - 4:00 AM: 24°C (REM Support)
  - 9:00 AM: Warm Hug Wake-up

### The Science Behind Temperature and Sleep

Temperature plays a crucial role in sleep quality:

1. **Cool Down Phase**: A slight drop in body temperature helps trigger sleep onset
2. **Deep Sleep Phase**: Cooler temperatures promote deeper, more restorative sleep
3. **REM Support Phase**: A slight warming helps support REM sleep cycles which are critical for cognitive function
4. **Wake-Up Phase**: The "Warm Hug" feature gradually increases temperature to wake you gently and naturally

These templates are designed to work with your body's natural temperature regulation system to optimize sleep quality.

## Troubleshooting

### Rate Limiting

If you see rate limit warnings in your logs:
- Increase the `pollingInterval` value (90-120 seconds recommended)
- For logs with "Rate limit exceeded" errors, the plugin will automatically back off and retry

### Unresponsive Controls

If controls appear unresponsive:
- Check your logs for API errors
- Verify your API token is valid
- Restart Homebridge to re-establish connection

## Support & Contributions

This is a community-developed plugin with ongoing improvements. For support:
- Open issues on GitHub
- Contribute improvements via pull requests
- Check the log files for detailed diagnostics with `logLevel: "verbose"`
