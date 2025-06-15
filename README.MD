# SleepMe Simple - Homebridge Plugin

<p align="center">
  <img src="https://raw.githubusercontent.com/jcfield-boop/homebridge-sleepmebasic/icons/sleepmebasic.png" width="100" height="100">
</p>

<p align="center">
  <img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">
</p>

A sophisticated Homebridge plugin for SleepMe devices (Dock Pro, OOLER, ChiliPad) that provides reliable and responsive HomeKit integration with advanced API management.

## Key Features

- **Intelligent Temperature Control**: Clean and responsive interface for temperature adjustments and power control
- **Ultra-Conservative Rate Limiting**: Empirically-tuned API usage based on real SleepMe rate limits (not just documentation)
- **Advanced Queue Management**: Prioritizes critical commands like power changes while managing background updates
- **Aggressive Caching**: Extended cache periods (8 minutes) to minimize API calls and prevent 429 errors
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
- Smart caching that reduces API calls while maintaining responsive feedback
- Adaptive request scheduling that works with API rate limits instead of fighting against them

## HomeKit Integration

The plugin offers three interface modes to suit different user needs:

### **Hybrid Mode (Recommended)**
Perfect for both automations and manual control:
- **Power Switch**: Simple ON/OFF control (ideal for automations)
- **Temperature Sensor**: Current bed temperature monitoring
- **Target Temperature**: Manual temperature adjustment when needed
- **Schedule Controls**: Master schedule toggle + individual schedule switches
- **Warm Hug**: Manual trigger for wake-up sequences
- **Water Level**: Battery service showing water level status

### **Switch Mode** 
Automation-friendly interface:
- **Power Switch**: Simple ON/OFF control
- **Temperature Sensor**: Current bed temperature monitoring
- **Water Level**: Water level monitoring

### **Thermostat Mode (Legacy)**
Traditional thermostat interface:
- **Thermostat Service**: Combined temperature and power control
- **Water Level**: Water level monitoring

**Note**: Thermostat mode may cause rate limiting issues with HomeKit automations due to forced temperature settings.

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
      "logLevel": "normal",
      "interfaceMode": "hybrid",
      "enableSchedules": true,
      "showIndividualSchedules": true,
      "enableWarmHug": true
    }
  ]
}
```

### Configuration Options

- **apiToken**: Your SleepMe API token (required, obtain from your account at sleep.me)
- **unit**: Temperature unit, "C" for Celsius or "F" for Fahrenheit (default: "C")
- **pollingInterval**: How frequently to check device status in seconds (default: 90, minimum: 60)
- **logLevel**: Log detail level - "normal", "debug", or "verbose"
- **interfaceMode**: HomeKit interface mode (default: "hybrid")
  - **"hybrid"** (Recommended): Power switch + temperature control + schedules
  - **"switch"**: Simple power switch + temperature sensor (automation-friendly)
  - **"thermostat"**: Traditional thermostat interface (may cause rate limits)
- **enableSchedules**: Enable temperature scheduling features (default: false)
- **showIndividualSchedules**: Create individual HomeKit switches for each schedule (default: true)
- **enableWarmHug**: Add HomeKit switch for manual warm hug triggers (default: true)
- **disableAutoDiscovery**: Disable automatic device re-discovery (default: false)
  - Set to `true` to prevent the plugin from re-discovering devices every 24 hours
  - Recommended if you experience devices turning off unexpectedly
  - Prevents the "device turns off at the same time every day" bug

## Automation Best Practices

### **For HomeKit Automations** 
**Use Hybrid or Switch mode** to avoid rate limiting issues:

```
✅ GOOD - Use the Power Switch:
Automation: Turn OFF "SleepMe Device Power"
Result: Single API call, instant response

❌ AVOID - Using Thermostat controls:
Automation: Set thermostat to OFF mode
Result: May require temperature + power settings = multiple API calls
```

### **Recommended Automation Setup**
1. Set `interfaceMode` to `"hybrid"` or `"switch"`
2. Use the **Power Switch** for all automation ON/OFF control
3. Use the **Target Temperature** service only for manual adjustments
4. Enable individual schedule switches for automation control of schedules

## Using the UI Configuration

The plugin comes with a comprehensive configuration UI that allows you to:

1. **Choose interface mode**: Select the best HomeKit interface for your needs
2. **Enter API credentials**: Test and validate your SleepMe API token
3. **Configure basic settings**: Set temperature units, polling interval, and log level
4. **Manage schedules**: Enable, create, edit, and remove temperature schedules

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

**Version 6.11.2+ includes major improvements to rate limiting based on empirical testing:**

The SleepMe API's actual rate limits are much stricter than documented. Through systematic testing, we discovered:
- **Real limit**: ~7 requests max, then 1 request per 15 seconds (not "10 per minute" as documented)
- **Token bucket algorithm**: Similar to nginx rate limiting, not sliding window

**Current defaults are now ultra-conservative:**
- Polling interval: 5 minutes (was 3 minutes)
- Cache validity: 8 minutes (was 2 minutes)
- Startup delays: 8+ minutes total

If you still see rate limit warnings:
- These settings should eliminate most 429 errors
- User commands (power/temperature) still work immediately via priority system
- Consider reporting persistent issues as the API may have changed

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

## Changelog

### 6.11.2 - Rate Limiting Overhaul
- **MAJOR**: Empirically determined real SleepMe API rate limits through systematic testing
- **FIXED**: Ultra-conservative polling intervals (5min vs 3min) to prevent 429 errors
- **IMPROVED**: Aggressive caching (8min vs 2min validity) to reduce API calls
- **DOCUMENTED**: Real API behavior (7-token bucket, 15s refill) vs incorrect documentation
- **ENHANCED**: Startup delays extended to 8+ minutes total for safer initialization
- **OPTIMIZED**: Fresh data requests reduced from every 5th to every 10th polling cycle

### 6.11.1 - Previous Release
- Rate limiting improvements and user action prioritization
- Trust-based caching and command debouncing
- Hybrid interface mode enhancements

## Support & Contributions

This is a community-developed plugin with ongoing improvements. For support:
- Open issues on GitHub
- Contribute improvements via pull requests
- Check the log files for detailed diagnostics with `logLevel: "verbose"`
- Report rate limiting issues - API behavior may change over time