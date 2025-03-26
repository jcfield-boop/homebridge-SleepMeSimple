// homebridge-ui/server.js
// Purpose: Handles server-side logic for the Homebridge custom UI
// Implements communication between the UI and Homebridge plugin

const { HomebridgePluginUiServer } = require('@homebridge/plugin-ui-utils');

class MinimalUiServer extends HomebridgePluginUiServer {
  constructor() {
    // Initialize the parent HomebridgePluginUiServer
    super();

    // Log that the server is starting (helps with debugging)
    console.log('SleepMe Simple Custom UI Server Starting...');

    // Define a simple request handler that can be called from the UI
    // This helps verify that the UI can communicate with the server
    this.onRequest('/hello', async () => {
      console.log('Hello request received');
      return { 
        success: true, 
        message: 'Custom UI is working!' 
      };
    });

    // Signal that the server is ready to handle requests
    this.ready();
    console.log('SleepMe Simple Custom UI Server Ready');
  }
}

// Export an instance of the server
module.exports = new MinimalUiServer();