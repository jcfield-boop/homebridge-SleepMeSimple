# SleepMe Simple - Homebridge Plugin

<p align="center">
  <img src="https://raw.githubusercontent.com/jcfield-boop/homebridge-SleepMeSimple/main/homebridge-ui/public/icons/sleepmebasic.png" width="100" height="100">
</p>

<p align="center">
  <img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">
</p>

## 🎬 See It In Action

<p align="center">
  <a href="https://github.com/jcfield-boop/homebridge-SleepMeSimple/raw/main/sleepme-simple-promo.mp4">
    <img src="https://img.shields.io/badge/▶️_Watch_Demo-30s_Video-blue?style=for-the-badge&logo=video" alt="Watch Demo Video" width="200">
  </a>
</p>

*Click above to watch our 30-second overview showcasing native HomeKit integration, simplified controls, and reliable device management.*

> **📱 Features shown in video:**
> - Native HomeKit device control and temperature adjustment
> - Three interface modes (Switch, Thermostat, Hybrid)
> - Real-time status synchronization and smart rate limiting
> - Easy installation with `npm install homebridge-sleepme-simple`

A sophisticated Homebridge plugin for SleepMe devices (Dock Pro, OOLER, ChiliPad) that provides reliable and responsive HomeKit integration with advanced API management.

## Key Features

- **Intelligent Temperature Control**: Clean and responsive interface for temperature adjustments and power control
- **Adaptive Polling System**: Context-aware status updates that accelerate during schedules and user activity
- **Trust-based Caching**: Optimized API usage with smart cache lifetimes based on operation type
- **Advanced Queue Management**: Prioritizes critical commands like power changes while managing background updates
- **Rate Limit Protection**: Empirical token bucket rate limiting stays well within 3 requests/minute API limit
- **Water Level Monitoring**: Check your device's water level through HomeKit
- **Automatic Device Detection**: Auto-discovers your SleepMe devices
- **Comprehensive Model Support**: Compatible with Dock Pro, OOLER, and ChiliPad devices
- **Sleep Schedule Templates**: Pre-defined temperature profiles based on sleep science
- **Schedule Editing**: Create, edit, and manage temperature schedules directly from the UI

## Why Use This Plugin?

The official SleepMe integration and other third-party plugins use HomeKit's thermostat service, which creates several issues:

1. Requiring mode switching to "Auto" before temperature adjustments can be made
2. Excessive API calls during state transitions that trigger rate limiting
3. Confusing or inconsistent behavior with HomeKit automations

SleepMe Simple addresses these problems through:

- Simplified, intuitive controls that match the mental model of how SleepMe devices actually work
- Request prioritization that ensures user-initiated commands always take precedence
- Smart caching with context-aware validity periods (user vs schedule vs system operations)
- Adaptive polling that accelerates during active periods while maintaining API compliance
- Real-time HomeKit updates during schedule execution (like warm awake sequences)

## HomeKit Integration

The plugin supports three interface modes to fit different use cases:

### Interface Modes

**Hybrid Mode (Default & Recommended)**
- **Power Switch**: Simple on/off control that stays synchronized
- **Temperature Sensor**: Shows the current bed temperature
- **Thermostat**: Advanced temperature control with HomeKit automation support
- **Water Level Indicator**: Uses the Battery service to show water level status

**Switch Mode**
- **Power Switch**: Simple on/off control
- **Temperature Sensor**: Shows the current bed temperature
- **Water Level Indicator**: Uses the Battery service to show water level status

**Thermostat Mode**
- **Thermostat**: Traditional thermostat interface with OFF/AUTO states
- **Water Level Indicator**: Uses the Battery service to show water level status

The **Hybrid Mode** solves the common synchronization issues between power controls and temperature settings by providing both a simple switch and advanced thermostat control that stay perfectly synchronized.

## Advanced Technical Features

- **Adaptive Polling System**: Context-aware status updates with 60s base rate that accelerates to 20-30s during activity
- **Empirical Token Bucket Rate Limiting**: Based on 45+ minutes of comprehensive API testing for optimal performance
- **Context-Aware Caching**: Different cache lifetimes for user commands (3min), schedule operations (1.5min), and system updates
- **Prioritized Command Queue**: Ensures critical operations complete first with intelligent retry logic
- **Optimistic Updates**: Updates UI immediately while command executes for responsive feedback
- **Real-time Schedule Visibility**: HomeKit shows temperature changes during warm awake sequences within 30-90 seconds

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
      "pollingInterval": 60,
      "logLevel": "normal",
      "interfaceMode": "hybrid",
      "enableSchedules": true
    }
  ]
}
```

### Configuration Options

- **apiToken**: Your SleepMe API token (required, obtain from your account at sleep.me)
- **unit**: Temperature unit, "C" for Celsius or "F" for Fahrenheit (default: "C")
- **pollingInterval**: Base polling frequency in seconds (default: 60, adaptive acceleration during activity)
- **logLevel**: Log detail level - "normal", "debug", or "verbose"
- **interfaceMode**: HomeKit interface mode - "hybrid", "switch", or "thermostat" (default: "hybrid")
- **enableSchedules**: Enable temperature scheduling features (default: false)

#### Advanced Configuration Options

For developers or users experiencing rate limiting issues during rapid plugin updates, additional configuration options are available:

- **startupDelay**: Delay before device discovery starts in seconds (default: 45, range: 5-300)
  - Useful for avoiding rate limits during rapid development cycles
  - Located in the "Advanced" section of the configuration UI
  - Higher values reduce startup rate limiting but delay initial device discovery

#### Interface Mode Details

- **"hybrid"** (Recommended): Provides both a power switch and thermostat control that stay synchronized, solving common automation issues
- **"switch"**: Simple switch and temperature sensor for basic control
- **"thermostat"**: Traditional thermostat interface with OFF/AUTO states only

## Using the UI Configuration

The plugin comes with a comprehensive configuration UI that allows you to:

1. **Enter API credentials**: Test and validate your SleepMe API token
2. **Configure basic settings**: Set temperature units, polling interval, and log level
3. **Manage schedules**: Enable, create, edit, and remove temperature schedules

### Managing Temperature Schedules

When the schedules feature is enabled, you can:

1. **Create schedules**: Set up temperature changes at specific times and days
2. **Edit schedules**: Modify existing schedules by clicking the "Edit" button
3. **Remove schedules**: Delete unwanted schedules with the "Remove" button
4. **Apply templates**: Use pre-defined schedule templates based on sleep science

### Schedule Types

- **Everyday**: Applies the same schedule every day
- **Weekdays**: Applies only on Monday through Friday
- **Weekend**: Applies only on Saturday and Sunday
- **Specific Day**: Applies on a specific day of the week
- **Warm Hug**: Gradually increases temperature for a gentle wake-up experience

## Sleep Schedule Templates

The SleepMe Simple plugin includes pre-defined sleep schedule templates designed to optimize your sleep experience. These templates are based on sleep science principles and provide temperature adjustments that work with your body's natural sleep cycles.

### Using Schedule Templates

1. Enable the "Enable Schedules" option in the plugin settings
2. The Schedule Templates interface will appear above the schedule list
3. Select a template for weekdays and weekends (you can choose different patterns for each)
4. Click "Apply Templates" to apply the templates to your configuration

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
- The adaptive polling system should automatically handle rate limits with 1 req/min base rate
- Check for any API connectivity issues or invalid tokens
- The empirical token bucket limiter should prevent rate limit errors under normal operation

### Unresponsive Controls

If controls appear unresponsive:
- Check your logs for API errors
- Verify your API token is valid
- Restart Homebridge to re-establish connection

### Schedule Issues

If schedules aren't working properly:
- Ensure that "Enable Schedules" is turned on in your configuration
- Check that your schedules are properly being saved in config.json
- Try creating a new schedule to verify the functionality
- Make sure your device has the latest firmware

## Support & Contributions

This is a community-developed plugin with ongoing improvements. For support:
- Open issues on GitHub
- Contribute improvements via pull requests
- Check the log files for detailed diagnostics with `logLevel: "verbose"`