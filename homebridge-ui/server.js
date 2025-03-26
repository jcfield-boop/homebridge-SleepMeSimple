// homebridge-ui/server.js
import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';

class SleepMeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();

    // Basic routes
    this.onRequest('/config', this.getConfig.bind(this));
    this.onRequest('/save-config', this.saveConfig.bind(this));
    
    // Schedule template routes
    this.onRequest('/templates/weekday', this.getWeekdayTemplates.bind(this));
    this.onRequest('/templates/weekend', this.getWeekendTemplates.bind(this));
    this.onRequest('/templates/apply', this.applyTemplate.bind(this));
    
    // Schedule management routes
    this.onRequest('/schedules/add', this.addSchedule.bind(this));
    this.onRequest('/schedules/delete', this.deleteSchedule.bind(this));
    this.onRequest('/schedules/update', this.updateSchedule.bind(this));

    // Log initialization for debugging
    this.log('SleepMe UI Server initialized');

    this.ready();
  }

  // Config management methods
  async getConfig() {
    try {
      const configArray = await this.getPluginConfig();
      const config = configArray[0] || {};
      
      // Initialize schedules array if it doesn't exist
      if (!config.schedules) {
        config.schedules = [];
      }
      
      return {
        success: true,
        config
      };
    } catch (error) {
      this.log(`Error getting config: ${error.message}`);
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
      this.log(`Error saving config: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Schedule template methods
  async getWeekdayTemplates() {
    // Return predefined weekday schedule templates
    return {
      success: true,
      templates: [
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
      ]
    };
  }

  async getWeekendTemplates() {
    // Return predefined weekend schedule templates
    return {
      success: true,
      templates: [
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
    };
  }

  async applyTemplate(payload) {
    try {
      const { templateId, type } = payload.body;
      
      // Get current config
      const configArray = await this.getPluginConfig();
      const config = configArray[0] || {};
      
      // Initialize schedules array if it doesn't exist
      if (!config.schedules) {
        config.schedules = [];
      }
      
      // Get templates based on type (weekday/weekend)
      let templates;
      if (type === 'weekday') {
        templates = (await this.getWeekdayTemplates()).templates;
      } else if (type === 'weekend') {
        templates = (await this.getWeekendTemplates()).templates;
      } else {
        return { success: false, error: 'Invalid template type' };
      }
      
      // Find the selected template
      const selectedTemplate = templates.find(t => t.id === templateId);
      if (!selectedTemplate) {
        return { success: false, error: 'Template not found' };
      }
      
      // Remove existing schedules of the same type
      config.schedules = config.schedules.filter(schedule => 
        schedule.type !== selectedTemplate.schedules[0].type
      );
      
      // Add schedules from the template
      config.schedules = [...config.schedules, ...selectedTemplate.schedules];
      
      // Save the updated config
      await this.updatePluginConfig([config]);
      
      return {
        success: true,
        message: `Applied ${selectedTemplate.name} template`,
        schedules: config.schedules
      };
    } catch (error) {
      this.log(`Error applying template: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Schedule management methods
  async addSchedule(payload) {
    try {
      const { schedule } = payload.body;
      
      // Validate schedule
      if (!schedule.type || !schedule.time || schedule.temperature === undefined) {
        return { success: false, error: 'Invalid schedule format' };
      }
      
      // Get current config
      const configArray = await this.getPluginConfig();
      const config = configArray[0] || {};
      
      // Initialize schedules array if it doesn't exist
      if (!config.schedules) {
        config.schedules = [];
      }
      
      // Add the new schedule
      config.schedules.push(schedule);
      
      // Save the updated config
      await this.updatePluginConfig([config]);
      
      return {
        success: true,
        message: 'Schedule added successfully',
        schedules: config.schedules
      };
    } catch (error) {
      this.log(`Error adding schedule: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteSchedule(payload) {
    try {
      const { index } = payload.body;
      
      // Get current config
      const configArray = await this.getPluginConfig();
      const config = configArray[0] || {};
      
      // Check if schedules array exists
      if (!config.schedules || !Array.isArray(config.schedules)) {
        return { success: false, error: 'No schedules found' };
      }
      
      // Check if index is valid
      if (index < 0 || index >= config.schedules.length) {
        return { success: false, error: 'Invalid schedule index' };
      }
      
      // Remove the schedule at the specified index
      config.schedules.splice(index, 1);
      
      // Save the updated config
      await this.updatePluginConfig([config]);
      
      return {
        success: true,
        message: 'Schedule deleted successfully',
        schedules: config.schedules
      };
    } catch (error) {
      this.log(`Error deleting schedule: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateSchedule(payload) {
    try {
      const { index, schedule } = payload.body;
      
      // Validate schedule
      if (!schedule.type || !schedule.time || schedule.temperature === undefined) {
        return { success: false, error: 'Invalid schedule format' };
      }
      
      // Get current config
      const configArray = await this.getPluginConfig();
      const config = configArray[0] || {};
      
      // Check if schedules array exists
      if (!config.schedules || !Array.isArray(config.schedules)) {
        return { success: false, error: 'No schedules found' };
      }
      
      // Check if index is valid
      if (index < 0 || index >= config.schedules.length) {
        return { success: false, error: 'Invalid schedule index' };
      }
      
      // Update the schedule at the specified index
      config.schedules[index] = schedule;
      
      // Save the updated config
      await this.updatePluginConfig([config]);
      
      return {
        success: true,
        message: 'Schedule updated successfully',
        schedules: config.schedules
      };
    } catch (error) {
      this.log(`Error updating schedule: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new SleepMeUiServer();