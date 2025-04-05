const { HomebridgePluginUiServer } = require('@homebridge/plugin-ui-utils');

class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();
    
    console.log('[SleepMeUI] Starting server initialization');
    
    // Register request handlers using anonymous functions
    this.onRequest('/config/load', async () => {
      try {
        console.log('[SleepMeUI] /config/load handler called');
        
        // Directly use the UI's preferred approach instead
        // Just return a minimal success response so client-side can handle it
        return { 
          success: true,
          useClientSide: true
        };
      } catch (error) {
        console.error('[SleepMeUI] Error in /config/load:', error);
        return { success: false, error: error.message };
      }
    });
    
    this.onRequest('/config/save', async (payload) => {
      try {
        console.log('[SleepMeUI] /config/save handler called');
        // Again, just return success so client handles it
        return { success: true, useClientSide: true };
      } catch (error) {
        console.error('[SleepMeUI] Error in /config/save:', error);
        return { success: false, error: error.message };
      }
    });
    
    this.onRequest('/device/test', async (payload) => {
      console.log('[SleepMeUI] /device/test handler called with token:', payload?.apiToken ? 'Present' : 'Missing');
      
      const apiToken = payload?.apiToken;
      if (!apiToken) {
        return { success: false, error: 'API token is required' };
      }
      
    });
    
    // Signal readiness
    this.ready();
    console.log('[SleepMeUI] Server initialization complete');
  }
}

// Create an instance
(() => {
  return new SleepMeUiServer();
})();