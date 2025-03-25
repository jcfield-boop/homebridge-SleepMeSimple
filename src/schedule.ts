/**
 * Schedule Manager for SleepMe Simple Plugin
 * Handles scheduled temperature changes and warm hug features
 */
import { Logger } from './api/types.js';
import { SleepMeApi } from './api/sleepme-api.js';

/**
 * Schedule types supported by the plugin
 */
export enum ScheduleType {
  EVERYDAY = 'Everyday',
  WEEKDAYS = 'Weekdays',
  WEEKEND = 'Weekend',
  SPECIFIC_DAY = 'Specific Day',
  WARM_HUG = 'Warm Hug'
}

/**
 * Days of the week (0 = Sunday, 6 = Saturday)
 */
export enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6
}

/**
 * Interface for a temperature schedule
 */
export interface TemperatureSchedule {
  type: ScheduleType;           // Type of schedule
  day?: DayOfWeek;              // Day of week for specific day schedules
  time: string;                 // Time in 24-hour format (HH:MM)
  temperature: number;          // Target temperature
  nextExecutionTime?: number;   // Next execution timestamp (ms)
  lastExecutionTime?: number;   // Last execution timestamp (ms)
}

/**
 * Warm Hug configuration
 */
export interface WarmHugConfig {
  increment: number;            // Temperature increase per minute (°C)
  duration: number;             // Duration of warm hug (minutes)
}

/**
 * Schedule Manager class
 * Handles the scheduling of temperature changes
 */
export class ScheduleManager {
  private schedules: Map<string, TemperatureSchedule[]> = new Map();
  private schedulerTimer?: NodeJS.Timeout;
  private lastTemperatureByDevice: Map<string, number> = new Map();
  private warmHugActiveDevices: Set<string> = new Set();
  private warmHugStartTimeByDevice: Map<string, number> = new Map();
  private warmHugTimersByDevice: Map<string, NodeJS.Timeout> = new Map();
  
  /**
   * Create a new Schedule Manager
   * @param logger Logger for output
   * @param api SleepMe API client
   * @param warmHugConfig Warm Hug configuration
   */
  constructor(
    private readonly logger: Logger,
    private readonly api: SleepMeApi,
    private readonly warmHugConfig: WarmHugConfig
  ) {
    this.logger.info('Schedule Manager initialized');
    this.logger.info(`Warm Hug config: ${warmHugConfig.increment}°C/min for ${warmHugConfig.duration} minutes`);
  }
  
  /**
   * Set schedules for a specific device
   * @param deviceId Device identifier
   * @param schedules Array of temperature schedules
   */
  public setSchedules(deviceId: string, schedules: TemperatureSchedule[]): void {
    if (!deviceId) {
      this.logger.error('Cannot set schedules for undefined device ID');
      return;
    }
    
    // Calculate next execution times
    const processedSchedules = schedules.map(schedule => ({
      ...schedule,
      nextExecutionTime: this.calculateNextExecutionTime(schedule)
    }));
    
    this.schedules.set(deviceId, processedSchedules);
    this.logger.info(`Set ${processedSchedules.length} schedules for device ${deviceId}`);
    
    // Start the scheduler if not already running
    this.startScheduler();
  }
  
  /**
   * Update the last known temperature for a device
   * Used to determine starting temperature for Warm Hugs
   * @param deviceId Device identifier
   * @param temperature Current temperature
   */
  public updateDeviceTemperature(deviceId: string, temperature: number): void {
    if (!deviceId || isNaN(temperature)) return;
    
    this.lastTemperatureByDevice.set(deviceId, temperature);
  }
  
  /**
   * Stop and clean up all schedulers
   */
  public cleanup(): void {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = undefined;
    }
    
    // Clear any active warm hug timers
    this.warmHugTimersByDevice.forEach((timer) => {
      clearInterval(timer);
    });
    this.warmHugTimersByDevice.clear();
    
    this.logger.info('Schedule Manager cleaned up');
  }
  
  /**
   * Start the scheduler
   */
  private startScheduler(): void {
    // Don't start multiple schedulers
    if (this.schedulerTimer) {
      return;
    }
    
    this.logger.info('Starting schedule manager');
    
    // Check schedules every minute
    this.schedulerTimer = setInterval(() => {
      this.checkSchedules();
    }, 60000); // Check every minute
    
    // Initial check
    this.checkSchedules();
  }
  
  /**
   * Check all schedules and execute any that are due
   */
  private checkSchedules(): void {
    const now = Date.now();
    
    this.logger.verbose('Checking schedules');
    
    this.schedules.forEach((deviceSchedules, deviceId) => {
      deviceSchedules.forEach((schedule, index) => {
        // Skip schedules without nextExecutionTime
        if (!schedule.nextExecutionTime) {
          this.logger.debug(`Schedule ${index} has no next execution time, recalculating`);
          deviceSchedules[index].nextExecutionTime = this.calculateNextExecutionTime(schedule);
          return;
        }
        
        // Check if it's time to execute
        if (now >= schedule.nextExecutionTime) {
          this.logger.debug(`Time to execute schedule ${index} for device ${deviceId}`);
          
          if (schedule.type === ScheduleType.WARM_HUG) {
            this.startWarmHug(deviceId, schedule);
          } else {
            this.executeSchedule(deviceId, schedule);
          }
          
          // Update last execution time and calculate next execution
          deviceSchedules[index].lastExecutionTime = now;
          deviceSchedules[index].nextExecutionTime = this.calculateNextExecutionTime(schedule);
          
          this.logger.debug(`Next execution for schedule ${index}: ${new Date(deviceSchedules[index].nextExecutionTime!).toLocaleString()}`);
        }
      });
    });
  }
  
  /**
   * Execute a regular temperature schedule
   * @param deviceId Device identifier
   * @param schedule Schedule to execute
   */
  private executeSchedule(deviceId: string, schedule: TemperatureSchedule): void {
    this.logger.info(`Executing schedule for device ${deviceId}: Set to ${schedule.temperature}°C`);
    
    // Set the temperature
    this.api.turnDeviceOn(deviceId, schedule.temperature)
      .then(success => {
        if (success) {
          this.logger.info(`Successfully executed schedule: Device ${deviceId} temperature set to ${schedule.temperature}°C`);
          
          // Update last known temperature
          this.lastTemperatureByDevice.set(deviceId, schedule.temperature);
        } else {
          this.logger.error(`Failed to execute schedule for device ${deviceId}`);
        }
      })
      .catch(error => {
        this.logger.error(`Error executing schedule: ${error}`);
      });
  }
  
  /**
   * Start a Warm Hug temperature ramp
   * @param deviceId Device identifier
   * @param schedule Schedule with target temperature
   */
  private startWarmHug(deviceId: string, schedule: TemperatureSchedule): void {
    // Skip if warm hug already active for this device
    if (this.warmHugActiveDevices.has(deviceId)) {
      this.logger.debug(`Warm Hug already active for device ${deviceId}, skipping`);
      return;
    }
    
    // Get last known temperature or use a sensible default
    const startTemperature = this.lastTemperatureByDevice.get(deviceId) || (schedule.temperature - 4);
    
    // Calculate target time (when warm hug should complete)
    const targetTime = schedule.nextExecutionTime || Date.now();
    
    // Record warm hug start
    this.warmHugActiveDevices.add(deviceId);
    this.warmHugStartTimeByDevice.set(deviceId, Date.now());
    
    this.logger.info(
      `Starting Warm Hug for device ${deviceId}: ` +
      `${startTemperature}°C → ${schedule.temperature}°C over ${this.warmHugConfig.duration} minutes`
    );
    
    // Set initial temperature
    this.api.setTemperature(deviceId, startTemperature)
      .then(success => {
        if (!success) {
          this.logger.error(`Failed to set initial Warm Hug temperature for device ${deviceId}`);
          this.warmHugActiveDevices.delete(deviceId);
          return;
        }
        
        // Calculate temperature steps
        const temperatureDiff = schedule.temperature - startTemperature;
        const totalSteps = this.warmHugConfig.duration;
        const stepSize = temperatureDiff / totalSteps;
        
        let currentStep = 0;
        
        // Clear any existing timers for this device
        if (this.warmHugTimersByDevice.has(deviceId)) {
          clearInterval(this.warmHugTimersByDevice.get(deviceId));
        }
        
        // Create timer for temperature ramp
        const warmHugTimer = setInterval(() => {
          currentStep++;
          
          // Calculate next temperature
          const nextTemperature = startTemperature + (stepSize * currentStep);
          const roundedTemperature = Math.round(nextTemperature * 10) / 10; // Round to 1 decimal place
          
          this.logger.debug(`Warm Hug step ${currentStep}/${totalSteps} for device ${deviceId}: ${roundedTemperature}°C`);
          
          // Set new temperature
          this.api.setTemperature(deviceId, roundedTemperature)
            .catch(error => {
              this.logger.error(`Error during Warm Hug temperature adjustment: ${error}`);
            });
          
          // Clean up when done
          if (currentStep >= totalSteps) {
            clearInterval(warmHugTimer);
            this.warmHugTimersByDevice.delete(deviceId);
            this.warmHugActiveDevices.delete(deviceId);
            this.logger.info(`Warm Hug completed for device ${deviceId}`);
          }
        }, 60000); // One step per minute
        
        // Store the timer reference
        this.warmHugTimersByDevice.set(deviceId, warmHugTimer);
      })
      .catch(error => {
        this.logger.error(`Error starting Warm Hug: ${error}`);
        this.warmHugActiveDevices.delete(deviceId);
      });
  }
  
  /**
   * Calculate the next execution time for a schedule
