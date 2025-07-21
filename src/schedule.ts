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
  SPECIFIC_DAY = 'Specific Day'
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
  description?: string;         // Description of the schedule (e.g., "cool down")
  isWarmHug?: boolean;          // Whether this is a warm hug wake-up schedule
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
  // Map of device IDs to their schedules
  private schedules: Map<string, TemperatureSchedule[]> = new Map();
  
  // Callback to mark schedule actions on accessories
  private markScheduleActionCallback?: (deviceId: string) => void;
  
  // Timer for the scheduler
  private schedulerTimer?: NodeJS.Timeout;
  
  // Keep track of last known temperature for each device
  private lastTemperatureByDevice: Map<string, number> = new Map();
  
  // Track devices with active warm hugs
  private warmHugActiveDevices: Set<string> = new Set();
  
  // Track warm hug start times by device
  private warmHugStartTimeByDevice: Map<string, number> = new Map();
  
  // Track warm hug timers by device
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
    private readonly warmHugConfig: WarmHugConfig,
    markScheduleActionCallback?: (deviceId: string) => void
  ) {
    this.markScheduleActionCallback = markScheduleActionCallback;
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
  // In schedule.ts, modify the checkSchedules method to better handle schedule execution

private checkSchedules(): void {
  const now = Date.now();
  this.logger.verbose(`Checking schedules at ${new Date(now).toLocaleString()}`);
  
  // Get current day to properly handle weekend/weekday schedules
  const currentDay = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = (currentDay === 0 || currentDay === 6);
  const isWeekday = !isWeekend;
  
  this.schedules.forEach((deviceSchedules, deviceId) => {
    this.logger.verbose(`Checking ${deviceSchedules.length} schedules for device ${deviceId}`);
    
    deviceSchedules.forEach((schedule, index) => {
      // Skip schedules without nextExecutionTime
      if (!schedule.nextExecutionTime) {
        this.logger.debug(`Schedule ${index} has no next execution time, recalculating`);
        deviceSchedules[index].nextExecutionTime = this.calculateNextExecutionTime(schedule);
        return;
      }
      
      // Check if schedule should apply today based on type
      let shouldRunToday = false;
      if (schedule.type === ScheduleType.EVERYDAY) {
        shouldRunToday = true;
      } else if (schedule.type === ScheduleType.WEEKDAYS && isWeekday) {
        shouldRunToday = true;
      } else if (schedule.type === ScheduleType.WEEKEND && isWeekend) {
        shouldRunToday = true;
      } else if (schedule.type === ScheduleType.SPECIFIC_DAY && schedule.day === currentDay) {
        shouldRunToday = true;
      } else if (schedule.isWarmHug=== true) {
        // Warm hug follows same logic as other schedule types
        if (schedule.isWarmHug) {
          this.startWarmHug(deviceId, schedule);
        } else {
          this.executeSchedule(deviceId, schedule);
        }
      }
      
      // Add debug logging
      this.logger.verbose(`Schedule ${index}: type=${schedule.type}, time=${schedule.time}, ` +
        `nextExecution=${new Date(schedule.nextExecutionTime).toLocaleString()}, ` +
        `shouldRunToday=${shouldRunToday}, now=${new Date(now).toLocaleString()}`);
      
// Check if it's time to execute and schedule applies today
if (shouldRunToday && now >= schedule.nextExecutionTime) {
  this.logger.info(`Executing schedule ${index} (${schedule.type}) at ${schedule.time} ` +
    `for device ${deviceId}: ${schedule.temperature}°C`);
  
  if (schedule.isWarmHug === true) {
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
    
    // Mark schedule action on accessory for adaptive polling
    if (this.markScheduleActionCallback) {
      this.markScheduleActionCallback(deviceId);
    }
    
    // Set the temperature using schedule context
    this.api.turnDeviceOnForSchedule(deviceId, schedule.temperature)
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
    
    // Mark schedule action on accessory for adaptive polling
    if (this.markScheduleActionCallback) {
      this.markScheduleActionCallback(deviceId);
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
    
    // Set initial temperature using schedule context
    this.api.setTemperatureForSchedule(deviceId, startTemperature)
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
          
          // Set new temperature using schedule context
          this.api.setTemperatureForSchedule(deviceId, roundedTemperature)
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
 * @param schedule Schedule to calculate next execution for
 * @returns Timestamp when schedule should next execute
 */
private calculateNextExecutionTime(schedule: TemperatureSchedule): number {
  const now = new Date();
  
  // Parse the schedule time (HH:MM)
  const [hours, minutes] = schedule.time.split(':').map(Number);
  
  // Create a date for today with the specified time
  const scheduleDate = new Date();
  scheduleDate.setHours(hours, minutes, 0, 0);
  
  // For Warm Hug schedules, subtract the duration to start earlier
  if (schedule.isWarmHug === true) {
    scheduleDate.setMinutes(scheduleDate.getMinutes() - this.warmHugConfig.duration);
  }
  
  // If the time has already passed today, move to the next applicable day
  if (scheduleDate <= now) {
    scheduleDate.setDate(scheduleDate.getDate() + 1);
  }
  
  // Adjust the date based on schedule type
  switch (schedule.type) {
    case ScheduleType.EVERYDAY:
      // Already set for the next day
      break;
      
    case ScheduleType.WEEKDAYS:
      // Skip to Monday if it's Friday and already passed today's time
      if (scheduleDate.getDay() === 6) { // Saturday
        scheduleDate.setDate(scheduleDate.getDate() + 2);
      } else if (scheduleDate.getDay() === 0) { // Sunday
        scheduleDate.setDate(scheduleDate.getDate() + 1);
      }
      break;
      
    case ScheduleType.WEEKEND:
      // Skip to Saturday if it's Sunday and already passed today's time
      if (scheduleDate.getDay() >= 1 && scheduleDate.getDay() <= 5) {
        // Current day is Mon-Fri, move to Saturday
        scheduleDate.setDate(scheduleDate.getDate() + (6 - scheduleDate.getDay()));
      }
      break;
      
    case ScheduleType.SPECIFIC_DAY:
      if (schedule.day === undefined) {
        this.logger.error('Specific day schedule missing day property');
        return 0;
      }
      
      // Wrap the declaration in a block to satisfy ESLint
      {
        const daysUntilTargetDay = (schedule.day - scheduleDate.getDay() + 7) % 7;
        
        // If today is the target day but time has passed, add 7 days
        if (daysUntilTargetDay === 0) {
          scheduleDate.setDate(scheduleDate.getDate() + 7);
        } else {
          scheduleDate.setDate(scheduleDate.getDate() + daysUntilTargetDay);
        }
      }
      break;
      
    default:
      this.logger.error(`Unknown schedule type: ${schedule.type}`);
      return 0;
  }
  
  return scheduleDate.getTime();
}

/**
 * Get the next scheduled temperature for a device
 * Useful for optimizing operations
 * @param deviceId Device identifier
 * @returns Next scheduled temperature or undefined if none
 */
public getNextScheduledTemperature(deviceId: string): { time: number; temperature: number } | undefined {
  const deviceSchedules = this.schedules.get(deviceId);
  if (!deviceSchedules || deviceSchedules.length === 0) {
    return undefined;
  }
  
  // Find the schedule with the earliest next execution time
  let earliestSchedule: TemperatureSchedule | undefined = undefined;
  let earliestTime = Number.MAX_SAFE_INTEGER;
  
  for (const schedule of deviceSchedules) {
    if (schedule.nextExecutionTime && schedule.nextExecutionTime < earliestTime) {
      earliestSchedule = schedule;
      earliestTime = schedule.nextExecutionTime;
    }
  }
  
  if (earliestSchedule) {
    return {
      time: earliestSchedule.nextExecutionTime!,
      temperature: earliestSchedule.temperature
    };
  }
  
  return undefined;
}

/**
 * Convert day name to day of week enum
 * @param dayName Name of the day
 * @returns DayOfWeek enum value
 */
public static dayNameToDayOfWeek(dayName: string): DayOfWeek {
  switch (dayName.toLowerCase()) {
    case 'monday': return DayOfWeek.MONDAY;
    case 'tuesday': return DayOfWeek.TUESDAY;
    case 'wednesday': return DayOfWeek.WEDNESDAY;
    case 'thursday': return DayOfWeek.THURSDAY;
    case 'friday': return DayOfWeek.FRIDAY;
    case 'saturday': return DayOfWeek.SATURDAY;
    case 'sunday': return DayOfWeek.SUNDAY;
    default: return DayOfWeek.MONDAY; // Default to Monday if unknown
  }
}

/**
 * Convert schedule type string to enum
 * @param typeStr Schedule type string
 * @returns ScheduleType enum value
 */
public static scheduleTypeFromString(typeStr: string): ScheduleType {
  switch (typeStr) {
    case 'Everyday': return ScheduleType.EVERYDAY;
    case 'Weekdays': return ScheduleType.WEEKDAYS;
    case 'Weekend': return ScheduleType.WEEKEND;
    case 'Specific Day': return ScheduleType.SPECIFIC_DAY;
    default: return ScheduleType.EVERYDAY; // Default to everyday if unknown
  }
}
} 