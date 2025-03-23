# SleepMe Simple - Homebridge Plugin

A simplified Homebridge plugin for SleepMe devices (ChiliPad, OOLER, Dock Pro), designed for reliable HomeKit control.
This is an evolution of me plaing with AI to create a plugin with (almost) no coding experience - building off two other plugins homebridge-SleepMePro and homebridge-SleepMeBasic that I had fun trying to re-create the functionality of the native app. (your mileage may vary...) 

## Key Features

- **Simple Controls**: Basic temperature adjustment and power switching
- **Stable API Communication**: Designed to minimize API errors and rate limiting issues
- **Automatic Device Discovery**: Finds all your SleepMe devices
- **Water Level Monitoring**: Shows you when to refill your device
- **Intuitive Interface**: Uses separate controls for better HomeKit integration

## The Problem This Solves

The official SleepMe integration and other third-party plugins use HomeKit's standard thermostat service, which often creates usability issues:

1. Having to switch to "Auto" mode before changing temperature
2. API overload from rapid state transitions
3. Inconsistent behavior with HomeKit automations

This plugin solves these issues by providing a simpler, more direct interface using separate controls that map more intuitively to how SleepMe devices actually work.

## How It Works

The plugin creates three controls for each SleepMe device:

1. **Temperature Sensor**: Shows the current bed temperature
2. **Power Switch**: Simply turns the device on/off
3. **Temperature Control**: Slider to set the target temperature

This approach avoids the state management complexities of HomeKit's thermostat service while providing a more reliable experience.

## Installation

You can install this plugin through the Homebridge UI or manually:

```bash
npm install -g homebridge-sleepme-simple
