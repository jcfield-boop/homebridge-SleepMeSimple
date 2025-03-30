/**
 * Schedule handling functions for SleepMe Simple UI
 * Manages adding, editing, and rendering schedules
 * Improved code organization and error handling
 */

// Schedule management module
(function() {
  // Private module variables
  let _isEditMode = false;
  
  /**
   * Initialize schedules with the provided data
   * @param {Array} scheduleData - Array of schedule objects to initialize with
   */
  function initializeSchedules(scheduleData) {
      if (Array.isArray(scheduleData)) {
          window.schedules = scheduleData;
          console.log(`Initialized ${scheduleData.length} schedules`);
          renderScheduleList();
      } else {
          window.schedules = [];
          console.warn('Invalid schedule data provided - initializing empty schedule array');
      }
  }
  
  /**
   * Handle removing a schedule with proper modal confirmation
   * @param {number} index - Index of schedule to remove
   */
  window.removeSchedule = function(index) {
      if (index < 0 || index >= window.schedules.length) {
          console.error('Invalid schedule index:', index);
          return;
      }
      
      // Use the modal confirmation with proper callback handling
      if (typeof window.showConfirmModal === 'function') {
          window.showConfirmModal(
              'Confirm Removal',
              'Are you sure you want to remove this schedule?',
              function() {
                  // Only execute this when confirmed
                  window.schedules.splice(index, 1);
                  renderScheduleList();
                  
                  // Log to console only
                  console.log('Schedule removed successfully');
                  
                  // Update status element
                  const statusElement = document.getElementById('status');
                  if (statusElement) {
                      statusElement.textContent = "Schedule removed successfully";
                      statusElement.className = "status success";
                      statusElement.classList.remove('hidden');
                  }
              }
          );
      } else {
          // Fallback to native confirm if modal function not available
          if (window.confirm('Are you sure you want to remove this schedule?')) {
              window.schedules.splice(index, 1);
              renderScheduleList();
              console.log('Schedule removed successfully');
          }
      }
  };
  
  /**
   * Exit edit mode and reset form fields
   * Cleans up state when canceling an edit operation
   */
  window.exitEditMode = function() {
      window.isEditing = false;
      window.editingScheduleIndex = -1;
      _isEditMode = false;
      
      // Get UI elements
      const addScheduleBtn = document.getElementById('addSchedule');
      const cancelEditBtn = document.getElementById('cancelEdit');
      const scheduleTypeSelect = document.getElementById('scheduleType');
      const daySelectContainer = document.getElementById('daySelectContainer');
      const scheduleTimeInput = document.getElementById('scheduleTime');
      const scheduleTemperatureInput = document.getElementById('scheduleTemperature');
      const unitSelect = document.getElementById('unit');
      const warmHugInfo = document.getElementById('warmHugInfo');
      
      // Reset UI
      if (addScheduleBtn) {
          addScheduleBtn.textContent = 'Add Schedule';
      }
      
      if (cancelEditBtn) {
          cancelEditBtn.classList.add('hidden');
      }
      
      // Reset form fields to default values
      if (scheduleTypeSelect && unitSelect && scheduleTimeInput && scheduleTemperatureInput) {
          const unit = unitSelect.value;
          scheduleTypeSelect.value = 'Everyday';
          if (daySelectContainer) {
              daySelectContainer.classList.add('hidden');
          }
          scheduleTimeInput.value = '21:30';
          scheduleTemperatureInput.value = (unit === 'C') ? '23' : '73';
          
          // Hide warm hug info
          if (warmHugInfo) {
              warmHugInfo.classList.add('hidden');
          }
      }
      
      console.log('Exited edit mode');
  };
  
  /**
   * Handle adding/updating a schedule
   * This function manages both creating new schedules and updating existing ones
   */
  window.handleScheduleAction = function() {
      const scheduleTypeSelect = document.getElementById('scheduleTypeSelect');
      const scheduleTimeInput = document.getElementById('scheduleTimeInput');
      const scheduleTemperatureInput = document.getElementById('scheduleTemperatureInput');
      const unitSelect = document.getElementById('unitSelect');
      
      if (!scheduleTypeSelect || !scheduleTimeInput || !scheduleTemperatureInput || !unitSelect) {
          console.error('UI elements not initialized');
          return;
      }
      
      // Validate inputs first
      const isTimeValid = typeof window.validateScheduleTime === 'function' ? 
          window.validateScheduleTime() : true;
      const isTempValid = typeof window.validateTemperature === 'function' ? 
          window.validateTemperature() : true;
      
      if (!isTimeValid || !isTempValid) {
          console.error('Please correct the errors in the schedule form');
          return;
      }
      // Get values from form
      const type = scheduleTypeSelect.value;
      const time = scheduleTimeInput.value;
      const temperature = parseFloat(scheduleTemperatureInput.value);
      const unit = unitSelect.value;
      
      // Validate required fields have values
      if (!type || !time || isNaN(temperature)) {
          console.error('All schedule fields are required');
          
          // Update status element
          const statusElement = document.getElementById('status');
          if (statusElement) {
              statusElement.textContent = 'All schedule fields are required';
              statusElement.className = 'status error';
              statusElement.classList.remove('hidden');
          }
          return;
      }
      
      try {
          // Create a new schedule object with the form values
          const schedule = {
              type,
              time,
              temperature,
              unit
          };
          
          // Add day for specific day schedules
          if (type === 'Specific Day') {
              const daySelect = document.getElementById('scheduleDay');
              if (daySelect) {
                  schedule.day = parseInt(daySelect.value, 10);
              }
          }
          
          // Add description for warm hug
          if (type === 'Warm Hug') {
              schedule.description = 'Warm Hug Wake-up';
          }
          
          // Check if we're in edit mode and should update an existing schedule
          if (window.isEditing && 
              window.editingScheduleIndex >= 0 && 
              window.editingScheduleIndex < window.schedules.length) {
              // Update existing schedule
              console.log(`Updating schedule at index ${window.editingScheduleIndex}`);
              window.schedules[window.editingScheduleIndex] = schedule;
              
              // Update status element
              const statusElement = document.getElementById('status');
              if (statusElement) {
                  statusElement.textContent = 'Schedule updated successfully';
                  statusElement.className = 'status success';
                  statusElement.classList.remove('hidden');
              }
              
              // Exit edit mode
              window.exitEditMode();
          } else {
              // Add new schedule
              window.schedules.push(schedule);
              
              // Reset form fields to default values
              scheduleTimeInput.value = '21:30';
              scheduleTemperatureInput.value = (unit === 'C') ? '23' : '73';
              
              // Update status element
              const statusElement = document.getElementById('status');
              if (statusElement) {
                  statusElement.textContent = 'Schedule added successfully';
                  statusElement.className = 'status success';
                  statusElement.classList.remove('hidden');
              }
              
              console.log('Schedule added successfully');
          }
          
          // Update UI
          renderScheduleList();
      } catch (error) {
          console.error('Schedule action error:', error);
          
          // Update status element
          const statusElement = document.getElementById('status');
          if (statusElement) {
              statusElement.textContent = `Error: ${error.message}`;
              statusElement.className = 'status error';
              statusElement.classList.remove('hidden');
          }
      }
  };
  
  /**
   * Edit a schedule
   * Loads schedule data into the form and switches UI to edit mode
   * @param {number} index - Index of schedule to edit
   */
  window.editSchedule = function(index) {
      const scheduleTypeSelect = document.getElementById('scheduleType');
      const daySelectContainer = document.getElementById('daySelectContainer');
      const scheduleTimeInput = document.getElementById('scheduleTime');
      const scheduleTemperatureInput = document.getElementById('scheduleTemperature');
      const unitSelect = document.getElementById('unit');
      const addScheduleBtn = document.getElementById('addSchedule');
      const cancelEditBtn = document.getElementById('cancelEdit');
      const warmHugInfo = document.getElementById('warmHugInfo');
      
      if (!scheduleTypeSelect || !daySelectContainer || !scheduleTimeInput || 
          !scheduleTemperatureInput || !addScheduleBtn || !cancelEditBtn || !warmHugInfo) {
          console.error('UI elements not initialized');
          return;
      }

      if (index < 0 || index >= window.schedules.length) {
          console.error('Invalid schedule index');
          return;
      }

      const schedule = window.schedules[index];

      if (!schedule) {
          console.error('Schedule not found');
          return;
      }

      window.isEditing = true;
      window.editingScheduleIndex = index;
      _isEditMode = true;

      // Set form values from schedule
      scheduleTypeSelect.value = schedule.type || 'Everyday';

      // Show/hide day select for specific day schedules
      if (schedule.type === 'Specific Day') {
          daySelectContainer.classList.remove('hidden');
          const daySelect = document.getElementById('scheduleDay');
          if (daySelect) {
              daySelect.value = schedule.day !== undefined ? schedule.day.toString() : '0';
          }
      } else {
          daySelectContainer.classList.add('hidden');
      }

      // Show/hide warm hug info
      warmHugInfo.classList.toggle('hidden', schedule.type !== 'Warm Hug');

      // Set time
      scheduleTimeInput.value = schedule.time || '21:30';
      if (typeof window.validateScheduleTime === 'function') {
          window.validateScheduleTime();
      }

      // Convert temperature if needed
      const currentUnit = unitSelect.value;
      let displayTemp = schedule.temperature;

      // Handle unit conversion if stored unit differs from current unit
      if (schedule.unit && schedule.unit !== currentUnit) {
          if (schedule.unit === 'C' && currentUnit === 'F') {
              if (typeof window.convertCtoF === 'function') {
                  displayTemp = Math.round(window.convertCtoF(displayTemp) * 10) / 10;
              }
          } else if (schedule.unit === 'F' && currentUnit === 'C') {
              if (typeof window.convertFtoC === 'function') {
                  displayTemp = Math.round(window.convertFtoC(displayTemp) * 10) / 10;
              }
          }
      }

      // Set temperature
      scheduleTemperatureInput.value = displayTemp.toString();
      if (typeof window.validateTemperature === 'function') {
          window.validateTemperature();
      }

      // Update UI to show we're in edit mode
      addScheduleBtn.textContent = 'Update Schedule';
      cancelEditBtn.classList.remove('hidden');

      // Scroll to edit form
      addScheduleBtn.scrollIntoView({ behavior: 'smooth' });

      console.log('Editing schedule');
      
      // Update status element
      const statusElement = document.getElementById('status');
      if (statusElement) {
          statusElement.textContent = 'Editing schedule';
          statusElement.className = 'status info';
          statusElement.classList.remove('hidden');
      }
  };
  /**
     * Apply schedule templates
     * Creates schedules based on pre-defined templates
     */
  window.applyScheduleTemplates = function() {
    const weekdayTemplateSelect = document.getElementById('weekdayTemplate');
    const weekendTemplateSelect = document.getElementById('weekendTemplate');
    const unitSelect = document.getElementById('unit');

    if (!weekdayTemplateSelect || !weekendTemplateSelect || !unitSelect) {
        console.error('UI elements not initialized');
        return;
    }

    const weekdayKey = weekdayTemplateSelect.value;
    const weekendKey = weekendTemplateSelect.value;
    const currentUnit = unitSelect.value;
    const templates = window.templates || {};

    let count = 0;

    if (weekdayKey && templates[weekdayKey]) {
        // Remove existing weekday schedules
        window.schedules = window.schedules.filter(s => s.type !== 'Weekdays');
        
        // Add new weekday schedules
        templates[weekdayKey].schedules.forEach(templateSchedule => {
            // Convert temperature if needed (templates are stored in Celsius)
            let adjustedTemp = templateSchedule.temperature;
            if (currentUnit === 'F' && typeof window.convertCtoF === 'function') {
                adjustedTemp = Math.round(window.convertCtoF(adjustedTemp) * 10) / 10;
            }
            
            // Create a proper schedule object with all necessary properties
            const schedule = {
                type: templateSchedule.type,
                time: templateSchedule.time,
                temperature: adjustedTemp,
                unit: currentUnit, // Always store current unit to enable proper editing
                description: templateSchedule.description || null
            };
            
            // Add any day information if present
            if (templateSchedule.day !== undefined) {
                schedule.day = templateSchedule.day;
            }
            
            window.schedules.push(schedule);
            count++;
        });
    }

    if (weekendKey && templates[weekendKey]) {
        // Remove existing weekend schedules
        window.schedules = window.schedules.filter(s => s.type !== 'Weekend');
        
        // Add new weekend schedules
        templates[weekendKey].schedules.forEach(templateSchedule => {
            // Convert temperature if needed (templates are stored in Celsius)
            let adjustedTemp = templateSchedule.temperature;
            if (currentUnit === 'F' && typeof window.convertCtoF === 'function') {
                adjustedTemp = Math.round(window.convertCtoF(adjustedTemp) * 10) / 10;
            }
            
            // Create a proper schedule object with all necessary properties
            const schedule = {
                type: templateSchedule.type,
                time: templateSchedule.time,
                temperature: adjustedTemp,
                unit: currentUnit, // Always store current unit to enable proper editing
                description: templateSchedule.description || null
            };
            
            // Add any day information if present
            if (templateSchedule.day !== undefined) {
                schedule.day = templateSchedule.day;
            }
            
            window.schedules.push(schedule);
            count++;
        });
    }

    // Update the UI
    renderScheduleList();

    if (count > 0) {
        console.log(`Applied ${count} schedules from templates`);
        
        // Update status element
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = `Applied ${count} schedules from templates`;
            statusElement.className = 'status success';
            statusElement.classList.remove('hidden');
        }
    } else {
        console.warn('No templates selected');
        
        // Update status element
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = 'No templates selected';
            statusElement.className = 'status warning';
            statusElement.classList.remove('hidden');
        }
    }
};

/**
 * Render the schedule list in the UI
 * Groups schedules by type and displays them in a formatted list
 * Major improvements to structure and reliability
 */
function renderScheduleList() {
    const scheduleList = document.getElementById('scheduleList');
    const unitSelect = document.getElementById('unit');

    if (!scheduleList || !unitSelect) {
        console.warn('Schedule list or unit select not initialized');
        return;
    }

    try {
        // Clear the current list
        scheduleList.innerHTML = '';
        
        // If no schedules, show message
        if (!window.schedules || window.schedules.length === 0) {
            scheduleList.innerHTML = '<p>No schedules configured.</p>';
            return;
        }
        
        // Group schedules by type for better organization
        const groupedSchedules = {};
        
        // Define schedule phases for display formatting
        const phases = {
            COOL_DOWN: { name: 'Cool Down', class: 'phase-cooldown' },
            DEEP_SLEEP: { name: 'Deep Sleep', class: 'phase-deep' },
            REM: { name: 'REM Support', class: 'phase-rem' },
            WAKE_UP: { name: 'Wake-up', class: 'phase-wakeup' }
        };
        
        // Group schedules by type
        window.schedules.forEach((schedule, index) => {
            if (!groupedSchedules[schedule.type]) {
                groupedSchedules[schedule.type] = [];
            }
            
            // Store original index for later reference
            groupedSchedules[schedule.type].push({...schedule, originalIndex: index});
        });
        
        // Helper function to determine schedule phase by description and temperature
        function getSchedulePhase(schedule) {
            // Default to Cool Down if no description or temperature
            if (!schedule) return phases.COOL_DOWN;
            
            const desc = (schedule.description || '').toLowerCase();
            const temp = schedule.temperature;
            const unit = schedule.unit || unitSelect.value;
            
            // Normalize temperature to Celsius for consistent comparison
            let tempC = temp;
            if (unit === 'F' && typeof window.convertFtoC === 'function') {
                tempC = window.convertFtoC(temp);
            }
            
            // Determine phase based on description keywords and temperature
            if (desc.includes('wake') || desc.includes('hug') || tempC > 30) {
                return phases.WAKE_UP;
            } else if (desc.includes('rem') || (tempC > 22 && tempC < 30)) {
                return phases.REM;
            } else if (desc.includes('deep') || tempC < 20) {
                return phases.DEEP_SLEEP;
            } else {
                return phases.COOL_DOWN;
            }
        }
        
        // Extract hour from time string for sorting
        function getTimeHour(timeStr) {
            if (!timeStr || typeof timeStr !== 'string') return 0;
            const parts = timeStr.split(':');
            return parseInt(parts[0], 10) || 0; // Return 0 if parsing fails
        }
        
        // Time period classification functions
        function isEveningTime(timeStr) {
            const hour = getTimeHour(timeStr);
            return hour >= 18 && hour <= 23;
        }
        
        function isEarlyMorningTime(timeStr) {
            const hour = getTimeHour(timeStr);
            return hour >= 0 && hour < 6;
        }
        
        function isMorningTime(timeStr) {
            const hour = getTimeHour(timeStr);
            return hour >= 6 && hour < 12;
        }
        // Process each group of schedules
        Object.keys(groupedSchedules).forEach(type => {
          // Create a group container
          const groupContainer = document.createElement('div');
          groupContainer.className = 'schedule-group';
          
          // Add group title
          const groupTitle = document.createElement('div');
          groupTitle.className = 'schedule-group-title';
          groupTitle.textContent = type;
          groupContainer.appendChild(groupTitle);
          
          // Group schedules by logical time periods
          const eveningSchedules = groupedSchedules[type].filter(s => isEveningTime(s.time));
          const earlyMorningSchedules = groupedSchedules[type].filter(s => isEarlyMorningTime(s.time));
          const morningSchedules = groupedSchedules[type].filter(s => isMorningTime(s.time));
          const otherSchedules = groupedSchedules[type].filter(s => 
              !isEveningTime(s.time) && !isEarlyMorningTime(s.time) && !isMorningTime(s.time));
          
          // Sort by time within each period
          const sortByTime = (a, b) => (a.time || '').localeCompare(b.time || '');
          eveningSchedules.sort(sortByTime);
          earlyMorningSchedules.sort(sortByTime);
          morningSchedules.sort(sortByTime);
          otherSchedules.sort(sortByTime);
          
          // Combine in natural sleep cycle order: evening (bedtime), early morning (deep sleep/REM), morning (wake up)
          const sortedSchedules = [
              ...eveningSchedules,
              ...earlyMorningSchedules,
              ...morningSchedules,
              ...otherSchedules
          ];
          
          // Create elements for each schedule
          sortedSchedules.forEach(schedule => {
              const scheduleItem = document.createElement('div');
              scheduleItem.className = 'schedule-item';
              
              // Determine the schedule phase for display formatting
              const phase = getSchedulePhase(schedule);
              
              // Format display info
              let displayInfo = '';
              
              // Add day name for specific day schedules
              if (schedule.type === 'Specific Day') {
                  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                  const dayIndex = parseInt(schedule.day, 10);
                  if (dayIndex >= 0 && dayIndex < days.length) {
                      displayInfo += `${days[dayIndex]} `;
                  }
              }
              
              // Format temperature based on current selected unit
              let displayTemp = schedule.temperature;
              const currentUnit = unitSelect.value;
              
              try {
                  // Handle unit conversion if needed
                  if (schedule.unit === 'C' && currentUnit === 'F' && typeof window.convertCtoF === 'function') {
                      displayTemp = Math.round(window.convertCtoF(displayTemp) * 10) / 10;
                  } else if (schedule.unit === 'F' && currentUnit === 'C' && typeof window.convertFtoC === 'function') {
                      displayTemp = Math.round(window.convertFtoC(displayTemp) * 10) / 10;
                  }
                  
                  // Ensure displayTemp is a valid number
                  if (isNaN(displayTemp)) {
                      displayTemp = schedule.temperature || 0;
                  }
              } catch (error) {
                  console.error('Temperature conversion error:', error);
                  displayTemp = schedule.temperature || 0;
              }
              
              // Format the time and temperature display
              displayInfo += `${schedule.time || '00:00'}: ${displayTemp}°${currentUnit}`;
              
              // Add phase label if not explicitly in description
              const hasPhaseInDesc = schedule.description && 
                  (schedule.description.toLowerCase().includes(phase.name.toLowerCase()) || 
                  (phase.name === 'Wake-up' && schedule.description.toLowerCase().includes('hug')));
              
              // Create phase label
              const phaseLabel = document.createElement('span');
              phaseLabel.className = `schedule-phase ${phase.class}`;
              phaseLabel.textContent = hasPhaseInDesc ? 
                  schedule.description : 
                  (schedule.description || phase.name);
              
              // Create schedule item elements
              const infoDiv = document.createElement('div');
              infoDiv.className = 'schedule-item-info';
              infoDiv.textContent = displayInfo + ' ';
              infoDiv.appendChild(phaseLabel);
              
              const actionsDiv = document.createElement('div');
              actionsDiv.className = 'schedule-item-actions';
              
              // Create edit button
              const editBtn = document.createElement('button');
              editBtn.className = 'edit';
              editBtn.textContent = 'Edit';
              editBtn.setAttribute('data-index', schedule.originalIndex);
              
              // Create remove button
              const removeBtn = document.createElement('button');
              removeBtn.className = 'danger';
              removeBtn.textContent = 'Remove';
              removeBtn.setAttribute('data-index', schedule.originalIndex);
              
              // Add event listeners securely with index capture
              const originalIndex = schedule.originalIndex;
              editBtn.addEventListener('click', () => {
                  if (typeof window.editSchedule === 'function' && 
                      originalIndex >= 0 && originalIndex < window.schedules.length) {
                      window.editSchedule(originalIndex);
                  }
              });
              
              removeBtn.addEventListener('click', () => {
                  if (typeof window.removeSchedule === 'function' && 
                      originalIndex >= 0 && originalIndex < window.schedules.length) {
                      window.removeSchedule(originalIndex);
                  }
              });
              
              // Add buttons to actions div
              actionsDiv.appendChild(editBtn);
              actionsDiv.appendChild(removeBtn);
              
              // Add elements to schedule item
              scheduleItem.appendChild(infoDiv);
              scheduleItem.appendChild(actionsDiv);
              
              // Add schedule item to group container
              groupContainer.appendChild(scheduleItem);
          });
          
          // Add group container to schedule list
          scheduleList.appendChild(groupContainer);
      });
  } catch (error) {
      console.error('Render schedule error:', error);
      
      // Update status element
      const statusElement = document.getElementById('status');
      if (statusElement) {
          statusElement.textContent = `Error rendering schedule list: ${error.message}`;
          statusElement.className = 'status error';
          statusElement.classList.remove('hidden');
      }
  }
}

// Expose functions to global scope for legacy code compatibility
window.renderScheduleList = renderScheduleList;
window.initializeSchedules = initializeSchedules;
})();