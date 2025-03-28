/**
 * Schedule handling functions for SleepMe Simple UI
 * Handles adding, editing, and rendering schedules
 */

/**
 * Exit edit mode and reset form fields
 */
function exitEditMode() {
  isEditing = false;
  editingScheduleIndex = -1;
  
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
}

/**
 * Handle adding/updating a schedule
 */
function handleScheduleAction() {
  if (!scheduleTypeSelect || !scheduleTimeInput || !scheduleTemperatureInput || !unitSelect) {
    showToast('error', 'UI elements not initialized', 'Configuration Error');
    return;
  }
  
  // Validate inputs first
  const isTimeValid = validateScheduleTime();
  const isTempValid = validateTemperature();
  
  if (!isTimeValid || !isTempValid) {
    showToast('error', 'Please correct the errors in the schedule form', 'Validation Error');
    return;
  }
  
  // Get values from form
  const type = scheduleTypeSelect.value;
  const time = scheduleTimeInput.value;
  const temperature = parseFloat(scheduleTemperatureInput.value);
  const unit = unitSelect.value;
  
  // Validate required fields have values
  if (!type || !time || isNaN(temperature)) {
    showToast('error', 'All schedule fields are required', 'Validation Error');
    return;
  }
  
  try {
    if (isEditing && editingScheduleIndex >= 0 && editingScheduleIndex < schedules.length) {
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
      } else if (schedules[editingScheduleIndex].description) {
        // Preserve original description if it exists
        updatedSchedule.description = schedules[editingScheduleIndex].description;
      }
      
      // Update existing schedule
      schedules[editingScheduleIndex] = updatedSchedule;
      showToast('success', 'Schedule updated successfully', 'Schedule Updated');
      
      // Exit edit mode
      exitEditMode();
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
      schedules.push(schedule);
      
      // Reset form fields to default values
      scheduleTimeInput.value = '21:30';
      scheduleTemperatureInput.value = (unit === 'C') ? '23' : '73';
      
      showToast('success', 'Schedule added successfully', 'Schedule Added');
    }
    
    // Update UI
    renderScheduleList();
  } catch (error) {
    console.error('Schedule action error:', error);
    showToast('error', 'Error saving schedule: ' + error.message, 'Schedule Error');
  }
}

/**
 * Edit a schedule
 * @param {number} index - Index of schedule to edit
 */
function editSchedule(index) {
  if (!scheduleTypeSelect || !daySelectContainer || !scheduleTimeInput || 
      !scheduleTemperatureInput || !addScheduleBtn || !cancelEditBtn || !warmHugInfo) {
    showToast('error', 'UI elements not initialized', 'Edit Error');
    return;
  }
  
  if (index < 0 || index >= schedules.length) {
    showToast('error', 'Invalid schedule index', 'Edit Error');
    return;
  }

  const schedule = schedules[index];
  
  if (!schedule) {
    showToast('error', 'Schedule not found', 'Edit Error');
    return;
  }

  isEditing = true;
  editingScheduleIndex = index;
  
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
  validateScheduleTime();
  
  // Convert temperature if needed
  const currentUnit = unitSelect.value;
  let displayTemp = schedule.temperature;
  
  // Handle unit conversion if stored unit differs from current unit
  if (schedule.unit && schedule.unit !== currentUnit) {
    if (schedule.unit === 'C' && currentUnit === 'F') {
      displayTemp = Math.round(convertCtoF(displayTemp) * 10) / 10;
    } else if (schedule.unit === 'F' && currentUnit === 'C') {
      displayTemp = Math.round(convertFtoC(displayTemp) * 10) / 10;
    }
  }
  
  // Set temperature
  scheduleTemperatureInput.value = displayTemp.toString();
  validateTemperature();
  
  // Update UI to show we're in edit mode
  addScheduleBtn.textContent = 'Update Schedule';
  cancelEditBtn.classList.remove('hidden');
  
  // Scroll to edit form
  addScheduleBtn.scrollIntoView({ behavior: 'smooth' });
  
  showToast('info', 'Editing schedule', 'Edit Schedule');
}

/**
 * Apply schedule templates
 */
function applyScheduleTemplates() {
  const weekdayTemplateSelect = document.getElementById('weekdayTemplate');
  const weekendTemplateSelect = document.getElementById('weekendTemplate');
  
  if (!weekdayTemplateSelect || !weekendTemplateSelect || !unitSelect) {
    showToast('error', 'UI elements not initialized', 'Template Error');
    return;
  }
  
  const weekdayKey = weekdayTemplateSelect.value;
  const weekendKey = weekendTemplateSelect.value;
  const currentUnit = unitSelect.value;
  
  let count = 0;
  
  if (weekdayKey && templates[weekdayKey]) {
    // Remove existing weekday schedules
    schedules = schedules.filter(s => s.type !== 'Weekdays');
    
    // Add new weekday schedules
    templates[weekdayKey].schedules.forEach(templateSchedule => {
      // Convert temperature if needed (templates are stored in Celsius)
      let adjustedTemp = templateSchedule.temperature;
      if (currentUnit === 'F') {
        adjustedTemp = Math.round(convertCtoF(adjustedTemp) * 10) / 10;
      }
      
      const schedule = {
        type: templateSchedule.type,
        time: templateSchedule.time,
        temperature: adjustedTemp,
        unit: currentUnit,
        description: templateSchedule.description
      };
      schedules.push(schedule);
      count++;
    });
  }
  
  if (weekendKey && templates[weekendKey]) {
    // Remove existing weekend schedules
    schedules = schedules.filter(s => s.type !== 'Weekend');
    
    // Add new weekend schedules
    templates[weekendKey].schedules.forEach(templateSchedule => {
      // Convert temperature if needed (templates are stored in Celsius)
      let adjustedTemp = templateSchedule.temperature;
      if (currentUnit === 'F') {
        adjustedTemp = Math.round(convertCtoF(adjustedTemp) * 10) / 10;
      }
      
      const schedule = {
        type: templateSchedule.type,
        time: templateSchedule.time,
        temperature: adjustedTemp,
        unit: currentUnit,
        description: templateSchedule.description
      };
      schedules.push(schedule);
      count++;
    });
  }
  
  // Update the UI
  renderScheduleList();
  
  if (count > 0) {
    showToast('success', `Applied ${count} schedules from templates`, 'Templates Applied');
  } else {
    showToast('warning', 'No templates selected', 'Template Error');
  }
}

/**
 * Render the schedule list in the UI
 */
function renderScheduleList() {
  if (!scheduleList || !unitSelect) {
    console.warn('Schedule list or unit select not initialized');
    return;
  }
  
  try {
    // Clear the current list
    scheduleList.innerHTML = '';
    
    // If no schedules, show message
    if (!schedules || schedules.length === 0) {
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
    schedules.forEach((schedule, index) => {
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
      const tempC = unit === 'C' ? temp : convertFtoC(temp);
      
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
          if (schedule.unit === 'C' && currentUnit === 'F') {
            displayTemp = Math.round(convertCtoF(displayTemp) * 10) / 10;
          } else if (schedule.unit === 'F' && currentUnit === 'C') {
            displayTemp = Math.round(convertFtoC(displayTemp) * 10) / 10;
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
          if (!isNaN(index) && index >= 0 && index < schedules.length) {
            editSchedule(index);
          }
        });
        
        removeBtn.addEventListener('click', () => {
          const index = parseInt(removeBtn.getAttribute('data-index'), 10);
          if (!isNaN(index) && index >= 0 && index < schedules.length) {
            showToast('warning', 'Are you sure you want to remove this schedule?', 'Confirm Removal', () => {
              schedules.splice(index, 1);
              renderScheduleList();
              showToast('success', 'Schedule removed successfully', 'Schedule Removed');
            });
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
    showToast('error', `Error rendering schedule list: ${error.message}`, 'Render Error');
  }
}