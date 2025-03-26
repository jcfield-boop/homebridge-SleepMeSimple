const { HomebridgePluginUiServer } = require('@homebridge/plugin-ui-utils');

class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();

    // Basic routes from your original implementation
    this.onRequest('/config', this.getConfig.bind(this));
    this.onRequest('/save-config', this.saveConfig.bind(this));
    
    // New routes for schedule management
    this.onRequest('/schedules/get', this.getSchedules.bind(this));
    this.onRequest('/schedules/save', this.saveSchedules.bind(this));
    
    // New routes for templates
    this.onRequest('/templates/get', this.getTemplates.bind(this));
    this.onRequest('/templates/apply', this.applyTemplate.bind(this));

    this.ready();
  }

  /**
   * Get the current configuration
   */
  async getConfig() {
    try {
      const config = await this.getPluginConfig();
      return {
        success: true,
        config: config[0] || {}
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save the configuration
   */
  async saveConfig(payload) {
    try {
      const { config } = payload.body;
      await this.updatePluginConfig([config]);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all schedules from the configuration
   */
  async getSchedules() {
    try {
      const config = await this.getPluginConfig();
      const schedules = (config[0] && config[0].schedules) || [];
      
      return {
        success: true,
        schedules
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save schedules to the configuration
   */
  async saveSchedules(payload) {
    try {
      const { schedules } = payload.body;
      
      const config = await this.getPluginConfig();
      const pluginConfig = config[0] || {};
      
      // Update schedules
      pluginConfig.schedules = schedules;
      
      // Make sure enableSchedules is set to true
      if (schedules && schedules.length > 0) {
        pluginConfig.enableSchedules = true;
      }
      
      await this.updatePluginConfig([pluginConfig]);
      
      return {
        success: true,
        message: 'Schedules saved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get predefined schedule templates
   */
  async getTemplates() {
    // Return the predefined templates
    return {
      success: true,
      templates: {
        weekday: [
          {
            id: 'optimal-sleep',
            name: 'Optimal Sleep Cycle',
            description: 'Designed for complete sleep cycles with REM enhancement',
            schedules: [
              { type: 'Weekdays', time: '22:00', temperature: 21, description: 'Cool Down' },
              { type: 'Weekdays', time: '23:00', temperature: 19, description: 'Deep Sleep' },
              { type: 'Weekdays', time: '02:00', temperature: 23, description: 'REM Support' },
              { type: 'Weekdays', time: '06:00', temperature: 27, description: 'Warm Hug Wake-up' }
            ]
          },
          {
            id: 'night-owl',
            name: 'Night Owl',
            description: 'Later bedtime with extended morning warm-up',
            schedules: [
              { type: 'Weekdays', time: '23:30', temperature: 21, description: 'Cool Down' },
              { type: 'Weekdays', time: '00:30', temperature: 19, description: 'Deep Sleep' },
              { type: 'Weekdays', time: '03:30', temperature: 23, description: 'REM Support' },
              { type: 'Weekdays', time: '07:30', temperature: 27, description: 'Warm Hug Wake-up' }
            ]
          },
          {
            id: 'early-bird',
            name: 'Early Bird',
            description: 'Earlier bedtime and wake-up schedule',
            schedules: [
              { type: 'Weekdays', time: '21:00', temperature: 21, description: 'Cool Down' },
              { type: 'Weekdays', time: '22:00', temperature: 19, description: 'Deep Sleep' },
              { type: 'Weekdays', time: '01:00', temperature: 23, description: 'REM Support' },
              { type: 'Weekdays', time: '05:00', temperature: 27, description: 'Warm Hug Wake-up' }
            ]
          }
        ],
        weekend: [
          {
            id: 'weekend-recovery',
            name: 'Weekend Recovery',
            description: 'Extra sleep with later wake-up time',
            schedules: [
              { type: 'Weekend', time: '23:00', temperature: 21, description: 'Cool Down' },
              { type: 'Weekend', time: '00:00', temperature: 19, description: 'Deep Sleep' },
              { type: 'Weekend', time: '03:00', temperature: 23, description: 'REM Support' },
              { type: 'Weekend', time: '08:00', temperature: 27, description: 'Warm Hug Wake-up' }
            ]
          },
          {
            id: 'relaxed-weekend',
            name: 'Relaxed Weekend',
            description: 'Gradual transitions for weekend leisure',
            schedules: [
              { type: 'Weekend', time: '23:30', temperature: 22, description: 'Cool Down' },
              { type: 'Weekend', time: '01:00', temperature: 20, description: 'Deep Sleep' },
              { type: 'Weekend', time: '04:00', temperature: 24, description: 'REM Support' },
              { type: 'Weekend', time: '09:00', temperature: 27, description: 'Warm Hug Wake-up' }
            ]
          }
        ]
      }
    };
  }

  /**
   * Apply a template to the configuration
   */
  async applyTemplate(payload) {
    try {
      const { templateId, type } = payload.body;
      
      // Get current config
      const config = await this.getPluginConfig();
      const pluginConfig = config[0] || {};
      
      // Make sure schedules array exists
      if (!pluginConfig.schedules) {
        pluginConfig.schedules = [];
      }
      
      // Get templates
      const templatesResponse = await this.getTemplates();
      const templates = templatesResponse.templates;
      
      // Find the template
      let selectedTemplate;
      if (type === 'weekday') {
        selectedTemplate = templates.weekday.find(t => t.id === templateId);
      } else if (type === 'weekend') {
        selectedTemplate = templates.weekend.find(t => t.id === templateId);
      }
      
      if (!selectedTemplate) {
        return {
          success: false,
          error: 'Template not found'
        };
      }
      
      // Remove existing schedules of the same type
      const existingSchedules = pluginConfig.schedules.filter(schedule => 
        !selectedTemplate.schedules.some(s => s.type === schedule.type)
      );
      
      // Add schedules from the template
      pluginConfig.schedules = [
        ...existingSchedules,
        ...selectedTemplate.schedules
      ];
      
      // Enable schedules
      pluginConfig.enableSchedules = true;
      
      // Save the updated config
      await this.updatePluginConfig([pluginConfig]);
      
      return {
        success: true,
        message: `Applied ${selectedTemplate.name} template`,
        schedules: pluginConfig.schedules
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Start the server
(() => {
  return new SleepMeUiServer();
})();