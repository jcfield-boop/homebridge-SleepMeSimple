import { SleepMeSimplePlatform } from './platform.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
/**
 * This function is called by Homebridge to register the platform with Homebridge
 */
export default (api) => {
    // Register the platform
    api.registerPlatform(PLATFORM_NAME, SleepMeSimplePlatform);
    // Log plugin initialization
    // Using console.log since api.log is not available
    console.log(`${PLUGIN_NAME} plugin initialized`);
};
//# sourceMappingURL=index.js.map