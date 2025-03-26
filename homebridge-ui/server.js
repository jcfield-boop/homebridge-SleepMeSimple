// customui/server.js
const { HomebridgePluginUiServer } = require('@homebridge/plugin-ui-utils');

// Create a new instance of the server
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    // The name of your plugin
    super();

    // Log that the server is starting
    this.log('SleepMe Custom UI Server starting...');

    // Handle hello request from the UI
    this.onRequest('/hello', async (payload) => {
      this.log(`Received hello request with payload: ${JSON.stringify(payload)}`);
      
      return {
        success: true,
        message: `Server received: ${payload.message || 'No message'}`,
        timestamp: new Date().toISOString()
      };
    });
    
    // Handle request for schedules
    this.onRequest('/schedules/get', async () => {
      this.log('Received request for schedules');
      
      // Get the current plugin configuration
      const config = await this.getPluginConfig();
      
      return {
        success: true,
        schedules: config.schedules || []
      };
    });
    
    // Handle saving schedules
    this.onRequest('/schedules/save', async (payload) => {
      this.log(`Received schedules save request: ${JSON.stringify(payload)}`);
      
      if (!payload || !payload.schedules) {
        return {
          success: false,
          message: 'No schedules provided'
        };
      }
      
      try {
        // Get the current plugin configuration
        const config = await this.getPluginConfig();
        
        // Update the schedules
        config.schedules = payload.schedules;
        
        // Save the updated configuration
        await this.updatePluginConfig(config);
        
        return {
          success: true,
          message: 'Schedules saved successfully'
        };
      } catch (error) {
        this.log(`Error saving schedules: ${error.message}`);
        return {
          success: false,
          message: `Error saving schedules: ${error.message}`
        };
      }
    });

    // Log that the server is ready
    this.log('SleepMe Custom UI Server started');
    this.ready();
  }
  
  // Helper method for logging
  log(message) {
    console.log(`[SleepMe UI Server] ${message}`);
  }
}

// Start the server
(() => {
  return new SleepMeUiServer();
})();
