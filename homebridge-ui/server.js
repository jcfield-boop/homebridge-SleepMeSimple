const { HomebridgePluginUiServer } = require('@homebridge/plugin-ui-utils');

class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    // Call the parent constructor
    super();

    // Define UI routes and handlers
    this.onRequest('/schedules/templates', this.getScheduleTemplates.bind(this));
    this.onRequest('/schedules/save', this.saveSchedules.bind(this));
    this.onRequest('/device/test', this.testDeviceConnection.bind(this));

    // Initialization completed
    this.ready();
  }

  /**
   * Get available sleep schedule templates
   * @returns {Promise<Object>} Available schedule templates
   */
  async getScheduleTemplates() {
    try {
      // Predefined schedule templates matching README description
      const templates = {
        weekday: [
          {
            name: 'Optimal Sleep Cycle',
            schedules: [
              { type: 'Everyday', time: '22:00', temperature: 21, description: 'Cool Down' },
              { type: 'Everyday', time: '23:00', temperature: 19, description: 'Deep Sleep' },
              { type: 'Everyday', time: '02:00', temperature: 23, description: 'REM Support' }
            ]
          },
          {
            name: 'Night Owl',
            schedules: [
              { type: 'Everyday', time: '23:30', temperature: 21, description: 'Cool Down' },
              { type: 'Everyday', time: '00:30', temperature: 19, description: 'Deep Sleep' },
              { type: 'Everyday', time: '03:30', temperature: 23, description: 'REM Support' }
            ]
          }
        ],
        weekend: [
          {
            name: 'Weekend Recovery',
            schedules: [
              { type: 'Weekend', time: '23:00', temperature: 21, description: 'Cool Down' },
              { type: 'Weekend', time: '00:00', temperature: 19, description: 'Deep Sleep' },
              { type: 'Weekend', time: '03:00', temperature: 23, description: 'REM Support' }
            ]
          }
        ]
      };

      return {
        success: true,
        templates: templates
      };
    } catch (error) {
      this.log.error('Error fetching schedule templates:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save schedules to plugin configuration
   * @param {Object} payload Schedule configuration
   * @returns {Promise<Object>} Save result
   */
  async saveSchedules(payload) {
    try {
      // Validate payload
      if (!payload || !payload.schedules) {
        throw new Error('Invalid schedule configuration');
      }

      // Get current configuration
      const config = await this.getPluginConfig();

      // Update schedules in configuration
      config.schedules = payload.schedules;
      config.enableSchedules = true;

      // Save updated configuration
      await this.updatePluginConfig(config);

      return {
        success: true,
        message: 'Schedules saved successfully'
      };
    } catch (error) {
      this.log.error('Error saving schedules:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test device connection using API token
   * @param {Object} payload Connection test payload
   * @returns {Promise<Object>} Connection test result
   */
  async testDeviceConnection(payload) {
    try {
      // Validate API token
      if (!payload.apiToken) {
        throw new Error('API token is required');
      }

      // Temporary mock connection test (replace with actual API call)
      const result = await this.testSleepMeApiConnection(payload.apiToken);

      return {
        success: result.success,
        message: result.message
      };
    } catch (error) {
      this.log.error('Device connection test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Mock method to test SleepMe API connection
   * @param {string} apiToken API authentication token
   * @returns {Promise<Object>} Connection test result
   */
  async testSleepMeApiConnection(apiToken) {
    // TODO: Implement actual API connection test
    // This would typically involve making a real API call to validate the token
    return {
      success: true,
      message: 'API token appears valid'
    };
  }
}

// Instantiate the server
module.exports = new SleepMeUiServer();