const { HomebridgePluginUiServer } = require('@homebridge/plugin-ui-utils');
const axios = require('axios'); // Add axios for API calls

class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();

    // Add more comprehensive route handling
    this.onRequest('/api/config', this.getConfig.bind(this));
    this.onRequest('/api/saveConfig', this.saveConfig.bind(this));
    this.onRequest('/api/templates', this.getTemplates.bind(this));
    this.onRequest('/api/saveTemplates', this.saveTemplates.bind(this));
    this.onRequest('/device/test', this.testDeviceConnection.bind(this));

    this.ready(); // Signal that the server is ready
  }

  // Implement actual methods for config and template management
  async getConfig() {
    try {
      const config = await this.getPluginConfig();
      return { 
        success: true, 
        config: config[0] || {} 
      };
    } catch (error) {
      this.log.error('Error getting config:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async saveConfig(payload) {
    try {
      const config = payload.body;
      await this.updatePluginConfig([config]);
      return { success: true };
    } catch (error) {
      this.log.error('Error saving config:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async getTemplates() {
    // Similar to your existing getScheduleTemplates method
    const templates = {
      weekday: {
        "optimal": {
          name: "Optimal Sleep Cycle",
          description: "Scientifically optimized sleep temperature cycle",
          schedules: [
            { time: "22:00", temperature: 21, name: "Cool Down" },
            { time: "23:00", temperature: 19, name: "Deep Sleep" },
            { time: "02:00", temperature: 23, name: "REM Support" }
          ]
        }
      },
      weekend: {
        "weekend-recovery": {
          name: "Weekend Recovery",
          description: "Relaxed weekend sleep cycle",
          schedules: [
            { time: "23:00", temperature: 21, name: "Cool Down" },
            { time: "00:00", temperature: 19, name: "Deep Sleep" },
            { time: "03:00", temperature: 23, name: "REM Support" }
          ]
        }
      }
    };

    return { 
      success: true, 
      templates: templates 
    };
  }

  async saveTemplates(payload) {
    try {
      const selectedTemplates = payload.body;
      const config = await this.getPluginConfig();
      const updatedConfig = config[0] || {};

      // Update schedules based on selected templates
      updatedConfig.enableSchedules = true;
      updatedConfig.schedules = this.generateSchedulesFromTemplates(selectedTemplates);

      await this.updatePluginConfig([updatedConfig]);
      return { success: true };
    } catch (error) {
      this.log.error('Error saving templates:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  generateSchedulesFromTemplates(selectedTemplates) {
    // Implement template to schedule conversion logic
    return [];
  }

  async testDeviceConnection(payload) {
    const { apiToken } = payload.body;
    
    try {
      // Implement actual API token validation
      // This is a mock implementation - replace with actual SleepMe API validation
      const response = await axios.get('https://api.developer.sleep.me/v1/devices', {
        headers: { 'Authorization': `Bearer ${apiToken}` }
      });

      return { 
        success: true, 
        message: 'API token is valid' 
      };
    } catch (error) {
      return { 
        success: false, 
        error: 'Invalid API token or connection error' 
      };
    }
  }
}

module.exports = new SleepMeUiServer();