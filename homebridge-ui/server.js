import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';

class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();

    // Comprehensive route handling
    this.onRequest('/device/test', this.testDeviceConnection.bind(this));
    this.onRequest('/config', this.getConfig.bind(this));
    this.onRequest('/save-config', this.saveConfig.bind(this));

    // Log initialization for debugging
    console.log('SleepMe UI Server initialized');

    this.ready();
  }

  async testDeviceConnection(payload) {
    try {
      // Validate payload
      if (!payload || !payload.body || !payload.body.apiToken) {
        return {
          success: false,
          error: 'API token is required'
        };
      }

      const { apiToken } = payload.body;

      // Mock implementation - replace with actual validation
      return {
        success: true,
        message: `Token ${apiToken.substring(0, 4)}... appears valid`
      };
    } catch (error) {
      console.error('Device connection test failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  async getConfig() {
    try {
      const config = await this.getPluginConfig();
      return {
        success: true,
        config: config[0] || {}
      };
    } catch (error) {
      console.error('Get config failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async saveConfig(payload) {
    try {
      const { config } = payload.body;
      await this.updatePluginConfig([config]);
      return { success: true };
    } catch (error) {
      console.error('Save config failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new SleepMeUiServer();