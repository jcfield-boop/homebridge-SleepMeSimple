/**
 * Entry point for the SleepMe Simple Homebridge plugin
 * This file exports the platform constructor to Homebridge
 */
import { API } from 'homebridge';
import { SleepMeSimplePlatform } from './platform.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';

/**
 * This function is called by Homebridge to register the platform with Homebridge
 */
export default (api: API): void => {
  // Register the platform
  api.registerPlatform(PLATFORM_NAME, SleepMeSimplePlatform);
  
  // Log plugin initialization
  // Using console.log since api.log is not available
  console.log(`${PLUGIN_NAME} plugin initialized`);
};
