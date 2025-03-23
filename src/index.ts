/**
 * Entry point for the SleepMe Simple Homebridge plugin
 * This file exports the platform constructor to Homebridge
 */
import { API } from 'homebridge';
import { SleepMeSimplePlatform } from './platform.js';
import { PLATFORM_NAME } from './settings.js';

/**
 * This function is called by Homebridge to register the platform with Homebridge
 */
export default (api: API): void => {
  // Register the platform
  api.registerPlatform(PLATFORM_NAME, SleepMeSimplePlatform);
  
  // Log plugin initialization
  const log = api.logger;
  log.info(`SleepMe Simple platform registered`);
};
