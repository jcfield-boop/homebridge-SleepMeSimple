const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');

/**
 * SleepMe UI Server
 * Handles backend functionality for the custom UI
 *
 * NOTE: Configuration load/save is handled CLIENT-SIDE using the homebridge
 * object's getPluginConfig(), updatePluginConfig(), and savePluginConfig() methods.
 * This server is only for operations that require server-side execution (e.g., API testing).
 */
class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();

    console.log('[SleepMeUI] Starting custom UI server...');

    // Register request handlers for server-side operations only
    // Config load/save is now handled client-side via homebridge.getPluginConfig() etc.
    this.onRequest('/device/test', this.testDeviceConnection.bind(this));

    console.log('[SleepMeUI] Custom UI server ready');
    this.ready();
  }

  /**
   * Test device connection with the SleepMe API
   * This requires server-side execution to make external API calls
   */
  async testDeviceConnection(payload) {
    console.log('[SleepMeUI] Testing device connection...');

    if (!payload || !payload.apiToken) {
      throw new RequestError('API token is required', { status: 400 });
    }

    try {
      // Set up request timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('https://api.developer.sleep.me/v1/devices', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${payload.apiToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SleepMeUI] API error:', response.status, errorText);
        return {
          success: false,
          error: `API returned ${response.status}: ${response.statusText}`,
          details: errorText
        };
      }

      const data = await response.json();
      const devices = Array.isArray(data) ? data : (data.devices || []);

      console.log('[SleepMeUI] Found', devices.length, 'device(s)');

      return {
        success: true,
        devices: devices.length,
        deviceInfo: devices.map(d => ({
          id: d.id,
          name: d.name || d.attachments?.find(a => a.type === 'mattressPad')?.name || 'Unknown Device'
        }))
      };

    } catch (error) {
      console.error('[SleepMeUI] Connection test error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export the server instance
(() => {
  console.log('[SleepMeUI] Initializing SleepMe Custom UI Server...');
  try {
    return new SleepMeUiServer();
  } catch (error) {
    console.error('[SleepMeUI] Failed to initialize server:', error.message);
    throw error;
  }
})();