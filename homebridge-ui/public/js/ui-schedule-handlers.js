/**
 * Schedule handling functions for SleepMe Simple UI
 * Handles adding, editing, and rendering schedules
 */

/**
 * Show a confirmation modal dialog with improved error handling and cleanup
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {Function} callback - Function to call if confirmed
 */
window.showConfirmModal = function(title, message, callback) {
  // Get modal elements
  const modal = document.getElementById('confirmModal');
  const titleElement = document.getElementById('confirmTitle');
  const messageElement = document.getElementById('confirmMessage');
  const okButton = document.getElementById('confirmOk');
  const cancelButton = document.getElementById('confirmCancel');
  
  if (!modal || !titleElement || !messageElement || !okButton || !cancelButton) {
    console.error('Modal elements not found in DOM');
    // Fall back to native confirm if modal elements are missing
    if (window.confirm(message)) {
      if (typeof callback === 'function') {
        callback();
      }
    }
    return;
  }
  
  // Set modal content
  titleElement.textContent = title || 'Confirm Action';
  messageElement.textContent = message || 'Are you sure you want to perform this action?';
  
  // Show modal - use both style and class to ensure visibility
  modal.style.display = 'flex';
  modal.classList.remove('hidden');
  
  // Remove previous event listeners to prevent duplicates
  const newOkButton = okButton.cloneNode(true);
  const newCancelButton = cancelButton.cloneNode(true);
  
  okButton.parentNode.replaceChild(newOkButton, okButton);
  cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);
  
  // Add new event listeners
  newOkButton.addEventListener('click', () => {
    modal.style.display = 'none';
    modal.classList.add('hidden');
    if (typeof callback === 'function') {
      callback();
    }
  });
  
  newCancelButton.addEventListener('click', () => {
    modal.style.display = 'none';
    modal.classList.add('hidden');
  });
}
/**
 * Exit edit mode and reset form fields
 */
window.exitEditMode = function() {
  window.isEditing = false;
  window.editingScheduleIndex = -1;
  
  // Reset UI
  if (window.addScheduleBtn) {
    window.addScheduleBtn.textContent = 'Add Schedule';
  }
  
  if (window.cancelEditBtn) {
    window.cancelEditBtn.classList.add('hidden');
  }
  
  // Reset form fields to default values
  if (window.scheduleTypeSelect && window.unitSelect && window.scheduleTimeInput && window.scheduleTemperatureInput) {
    const unit = window.unitSelect.value;
    window.scheduleTypeSelect.value = 'Everyday';
    if (window.daySelectContainer) {
      window.daySelectContainer.classList.add('hidden');
    }
    window.scheduleTimeInput.value = '21:30';
    window.scheduleTemperatureInput.value = (unit === 'C') ? '23' : '73';
    
    // Hide warm hug info
    if (window.warmHugInfo) {
      window.warmHugInfo.classList.add('hidden');
    }
  }
};

/**
 * Handle adding/updating a schedule
 */
window.handleScheduleAction = function() {
  if (!window.scheduleTypeSelect || !window.scheduleTimeInput || !window.scheduleTemperatureInput || !window.unitSelect) {
    window.showToast('error', 'UI elements not initialized', 'Configuration Error');
    return;
  }
  
  // Validate inputs first
  const isTimeValid = window.validateScheduleTime();
  const isTempValid = window.validateTemperature();
  
  if (!isTimeValid || !isTempValid) {
    window.showToast('error', 'Please correct the errors in the schedule form', 'Validation Error');
    return;
  }
  
  // Get values from form
  const type = window.scheduleTypeSelect.value;
  const time = window.scheduleTimeInput.value;
  const temperature = parseFloat(window.scheduleTemperatureInput.value);
  const unit = window.unitSelect.value;
  
  // Validate required fields have values
  if (!type || !time || isNaN(temperature)) {
    window.showToast('error', 'All schedule fields are required', 'Validation Error');
    return;
  }
  
  try {
    if (window.isEditing && window.editingScheduleIndex >= 0 && window.editingScheduleIndex < window.schedules.length) {
      // Create updated schedule object
      const updatedSchedule = {
        type,
        time,
        temperature,
        unit
      };
      
      // Add day for specific day schedules
      if (type === 'Specific Day') {
        const daySelect = document.getElementById('scheduleDay');
        if (daySelect) {
          updatedSchedule.day = parseInt(daySelect.value, 10);
        }
      }
      
      // Add description for warm hug
      if (type === 'Warm Hug') {
        updatedSchedule.description = 'Warm Hug Wake-up';
      } else if (window.schedules[window.editingScheduleIndex].description) {
        // Preserve original description if it exists
        updatedSchedule.description = window.schedules[window.editingScheduleIndex].description;
      }
      
      // Update existing schedule
      window.schedules[window.editingScheduleIndex] = updatedSchedule;
      window.showToast('success', 'Schedule updated successfully', 'Schedule Updated');
      
      // Exit edit mode
      window.exitEditMode();
    } else {
      // Create new schedule object
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
      
      // Add new schedule
      window.schedules.push(schedule);
      
      // Reset form fields to default values
      window.scheduleTimeInput.value = '21:30';
      window.scheduleTemperatureInput.value = (unit === 'C') ? '23' : '73';
      
      window.showToast('success', 'Schedule added successfully', 'Schedule Added');
    }
    
    // Update UI
    window.renderScheduleList();
  } catch (error) {
    console.error('Schedule action error:', error);
    window.showToast('error', 'Error saving schedule: ' + error.message, 'Schedule Error');
  }
};

/**
 * Edit a schedule
 * @param {number} index - Index of schedule to edit
 */
window.editSchedule = function(index) {
  if (!window.scheduleTypeSelect || !window.daySelectContainer || !window.scheduleTimeInput || 
      !window.scheduleTemperatureInput || !window.addScheduleBtn || !window.cancelEditBtn || !window.warmHugInfo) {
    window.showToast('error', 'UI elements not initialized', 'Edit Error');
    return;
  }
  
  if (index < 0 || index >= window.schedules.length) {
    window.showToast('error', 'Invalid schedule index', 'Edit Error');
    return;
  }

  const schedule = window.schedules[index];
  
  if (!schedule) {
    window.showToast('error', 'Schedule not found', 'Edit Error');
    return;
  }

  window.isEditing = true;
  window.editingScheduleIndex = index;
  
  // Set form values from schedule
  window.scheduleTypeSelect.value = schedule.type || 'Everyday';
  
  // Show/hide day select for specific day schedules
  if (schedule.type === 'Specific Day') {
    window.daySelectContainer.classList.remove('hidden');
    const daySelect = document.getElementById('scheduleDay');
    if (daySelect) {
      daySelect.value = schedule.day !== undefined ? schedule.day.toString() : '0';
    }
  } else {
    window.daySelectContainer.classList.add('hidden');
  }
  
  // Show/hide warm hug info
  window.warmHugInfo.classList.toggle('hidden', schedule.type !== 'Warm Hug');
  
  // Set time
  window.scheduleTimeInput.value = schedule.time || '21:30';
  window.validateScheduleTime();
  
  // Convert temperature if needed
  const currentUnit = window.unitSelect.value;
  let displayTemp = schedule.temperature;
  
  // Handle unit conversion if stored unit differs from current unit
  if (schedule.unit && schedule.unit !== currentUnit) {
    if (schedule.unit === 'C' && currentUnit === 'F') {
      displayTemp = Math.round(window.convertCtoF(displayTemp) * 10) / 10;
    } else if (schedule.unit === 'F' && currentUnit === 'C') {
      displayTemp = Math.round(window.convertFtoC(displayTemp) * 10) / 10;
    }
  }
  
  // Set temperature
  window.scheduleTemperatureInput.value = displayTemp.toString();
  window.validateTemperature();
  
  // Update UI to show we're in edit mode
  window.addScheduleBtn.textContent = 'Update Schedule';
  window.cancelEditBtn.classList.remove('hidden');
  
  // Scroll to edit form
  window.addScheduleBtn.scrollIntoView({ behavior: 'smooth' });
  
  window.showToast('info', 'Editing schedule', 'Edit Schedule');
};

/**
 * Apply schedule templates
 */
window.applyScheduleTemplates = function() {
  const weekdayTemplateSelect = document.getElementById('weekdayTemplate');
  const weekendTemplateSelect = document.getElementById('weekendTemplate');
  
  if (!weekdayTemplateSelect || !weekendTemplateSelect || !window.unitSelect) {
    window.showToast('error', 'UI elements not initialized', 'Template Error');
    return;
  }
  
  const weekdayKey = weekdayTemplateSelect.value;
  const weekendKey = weekendTemplateSelect.value;
  const currentUnit = window.unitSelect.value;
  
  let count = 0;
  
  if (weekdayKey && window.templates[weekdayKey]) {
    // Remove existing weekday schedules
    window.schedules = window.schedules.filter(s => s.type !== 'Weekdays');
    
    // Add new weekday schedules
    window.templates[weekdayKey].schedules.forEach(templateSchedule => {
      // Convert temperature if needed (templates are stored in Celsius)
      let adjustedTemp = templateSchedule.temperature;
      if (currentUnit === 'F') {
        adjustedTemp = Math.round(window.convertCtoF(adjustedTemp) * 10) / 10;
      }
      
      const schedule = {
        type: templateSchedule.type,
        time: templateSchedule.time,
        temperature: adjustedTemp,
        unit: currentUnit,
        description: templateSchedule.description
      };
      window.schedules.push(schedule);
      count++;
    });
  }
  
  if (weekendKey && window.templates[weekendKey]) {
    // Remove existing weekend schedules
    window.schedules = window.schedules.filter(s => s.type !== 'Weekend');
    
    // Add new weekend schedules
    window.templates[weekendKey].schedules.forEach(templateSchedule => {
      // Convert temperature if needed (templates are stored in Celsius)
      let adjustedTemp = templateSchedule.temperature;
      if (currentUnit === 'F') {
        adjustedTemp = Math.round(window.convertCtoF(adjustedTemp) * 10) / 10;
      }
      
      const schedule = {
        type: templateSchedule.type,
        time: templateSchedule.time,
        temperature: adjustedTemp,
        unit: currentUnit,
        description: templateSchedule.description
      };
      window.schedules.push(schedule);
      count++;
    });
  }
  
  // Update the UI
  window.renderScheduleList();
  
  if (count > 0) {
    window.showToast('success', `Applied ${count} schedules from templates`, 'Templates Applied');
  } else {
    window.showToast('warning', 'No templates selected', 'Template Error');
  }
};

/**
 * Render the schedule list in the UI
 */
window.renderScheduleList = function() {
  if (!window.scheduleList || !window.unitSelect) {
    console.warn('Schedule list or unit select not initialized');
    return;
  }
  
  try {
    // Clear the current list
    window.scheduleList.innerHTML = '';
    
    // If no schedules, show message
    if (!window.schedules || window.schedules.length === 0) {
      window.scheduleList.innerHTML = '<p>No schedules configured.</p>';
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
      const unit = schedule.unit || window.unitSelect.value;
      
      // Normalize temperature to Celsius for consistent comparison
      const tempC = unit === 'C' ? temp : window.convertFtoC(temp);
      
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
        const currentUnit = window.unitSelect.value;
        
        try {
          // Handle unit conversion if needed
          if (schedule.unit === 'C' && currentUnit === 'F') {
            displayTemp = Math.round(window.convertCtoF(displayTemp) * 10) / 10;
          } else if (schedule.unit === 'F' && currentUnit === 'C') {
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
        
        // Add event listeners
        editBtn.addEventListener('click', () => {
          const index = parseInt(editBtn.getAttribute('data-index'), 10);
          if (!isNaN(index) && index >= 0 && index < window.schedules.length) {
            window.editSchedule(index);
          }
        });
        
        removeBtn.addEventListener('click', () => {
          const index = parseInt(removeBtn.getAttribute('data-index'), 10);
          if (!isNaN(index) && index >= 0 && index < window.schedules.length) {
            // Use the modal confirmation
            window.showConfirmModal(
              'Confirm Removal',
              'Are you sure you want to remove this schedule?',
              () => {
                window.schedules.splice(index, 1);
                window.renderScheduleList();
                window.showToast('success', 'Schedule removed successfully', 'Schedule Removed');
              }
            );
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
      window.scheduleList.appendChild(groupContainer);
    });
  } catch (error) {
    console.error('Render schedule error:', error);
    window.showToast('error', `Error rendering schedule list: ${error.message}`, 'Render Error');
  }
};