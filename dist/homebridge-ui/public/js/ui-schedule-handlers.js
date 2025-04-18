/**
 * Schedule handling functions for SleepMe Simple UI
 */
(function() {
    // Initialize module state
    window.schedules = window.schedules || [];
    window.isEditing = false;
    window.editingScheduleIndex = -1;
    
    /**
     * Add or update a schedule
     */
    // Modified handleScheduleAction function
window.handleScheduleAction = function() {
  // First check if schedules are enabled
  if (!areSchedulesEnabled()) {
    console.log('Schedules are disabled, ignoring schedule action');
    return;
  }
      // Get form elements
      const scheduleType = document.getElementById('scheduleType');
      const scheduleDay = document.getElementById('scheduleDay');
      const scheduleTime = document.getElementById('scheduleTime');
      const scheduleTemperature = document.getElementById('scheduleTemperature');
      const unit = document.getElementById('unit');
      
      // Validate all elements exist
      if (!scheduleType || !scheduleTime || !scheduleTemperature || !unit) {
        NotificationManager.error('UI elements not initialized', 'Error');
        return;
      }
      
      // Validate form inputs
      const isTimeValid = typeof validateScheduleTime === 'function' ? 
        validateScheduleTime() : true;
      const isTempValid = typeof validateTemperature === 'function' ? 
        validateTemperature() : true;
      
      if (!isTimeValid || !isTempValid) {
        NotificationManager.error('Please correct the errors in the form', 'Validation Error');
        return;
      }
      
      // Get values from form
      const type = scheduleType.value;
      const time = scheduleTime.value;
      const temperature = parseFloat(scheduleTemperature.value);
      const currentUnit = unit.value;
      
      // Validate required fields
      if (!type || !time || isNaN(temperature)) {
        NotificationManager.error('All schedule fields are required', 'Validation Error');
        return;
      }
      
      try {
        // Create schedule object
        const schedule = {
          type,
          time,
          temperature,
          unit: currentUnit
        };
        
        // Add day for specific day schedules
        if (type === 'Specific Day' && scheduleDay) {
          schedule.day = parseInt(scheduleDay.value, 10);
        }
        
       // Add warm hug flag if enabled
const warmHugCheckbox = document.getElementById('warmHugEnabled');
if (warmHugCheckbox && warmHugCheckbox.checked) {
  schedule.isWarmHug = true;
  schedule.description = 'Warm Hug Wake Up';
}
        
        // Handle edit mode
        if (window.isEditing && window.editingScheduleIndex >= 0 && 
            window.editingScheduleIndex < window.schedules.length) {
          // Preserve template information if it exists
          if (window.schedules[window.editingScheduleIndex].isFromTemplate) {
            schedule.isFromTemplate = window.schedules[window.editingScheduleIndex].isFromTemplate;
            schedule.templateSource = window.schedules[window.editingScheduleIndex].templateSource;
          }
          
          // Update existing schedule
          window.schedules[window.editingScheduleIndex] = schedule;
          NotificationManager.success('Schedule updated successfully', 'Success', { autoHide: true });
          exitEditMode();
        } else {
          // Add new schedule
          window.schedules.push(schedule);
          NotificationManager.success('Schedule added successfully', 'Success', { autoHide: true });
        }
        
        // Update UI
        if (typeof window.renderScheduleList === 'function') {
          window.renderScheduleList();
        }
        if (typeof window.saveConfig === 'function') {
          window.saveConfig(false);
        }
      } catch (error) {
        NotificationManager.error(`Error: ${error.message}`, 'Schedule Error');
      }
    };
    
    /**
     * Exit edit mode and reset form
     */
    window.exitEditMode = function() {
      window.isEditing = false;
      window.editingScheduleIndex = -1;
      
      // Reset UI
      const addScheduleBtn = document.getElementById('addSchedule');
      const cancelEditBtn = document.getElementById('cancelEdit');
      
      if (addScheduleBtn) {
        addScheduleBtn.textContent = 'Add Schedule';
      }
      
      if (cancelEditBtn) {
        cancelEditBtn.classList.add('hidden');
      }
      
      // Reset form fields
      resetScheduleForm();
    };
    
    /**
     * Reset the schedule form to default values
     */
    function resetScheduleForm() {
      const scheduleType = document.getElementById('scheduleType');
      const daySelectContainer = document.getElementById('daySelectContainer');
      const scheduleTime = document.getElementById('scheduleTime');
      const scheduleTemperature = document.getElementById('scheduleTemperature');
      const unit = document.getElementById('unit');
      const warmHugInfo = document.getElementById('warmHugInfo');
      
      if (scheduleType) {
        scheduleType.value = 'Everyday';
      }
      
      if (daySelectContainer) {
        daySelectContainer.classList.add('hidden');
      }
      
      if (scheduleTime) {
        scheduleTime.value = '21:30';
      }
      
      if (scheduleTemperature && unit) {
        const currentUnit = unit.value;
        scheduleTemperature.value = currentUnit === 'C' ? '23' : '73';
      }
      
      if (warmHugInfo) {
        warmHugInfo.classList.add('hidden');
      }
    }
    
    /**
     * Edit an existing schedule
     * @param {number} index - Index of the schedule to edit
     */
    window.editSchedule = function(index) {
      if (index < 0 || index >= window.schedules.length) {
        NotificationManager.error('Invalid schedule index', 'Edit Error');
        return;
      }
      
      const schedule = window.schedules[index];
      if (!schedule) {
        NotificationManager.error('Schedule not found', 'Edit Error');
        return;
      }
      
      // Get UI elements
      const scheduleType = document.getElementById('scheduleType');
      const daySelectContainer = document.getElementById('daySelectContainer');
      const scheduleDay = document.getElementById('scheduleDay');
      const scheduleTime = document.getElementById('scheduleTime');
      const scheduleTemperature = document.getElementById('scheduleTemperature');
      const unit = document.getElementById('unit');
      const addScheduleBtn = document.getElementById('addSchedule');
      const cancelEditBtn = document.getElementById('cancelEdit');
      const warmHugInfo = document.getElementById('warmHugInfo');
      
      // Validate UI elements
      if (!scheduleType || !scheduleTime || !scheduleTemperature || !unit || 
          !addScheduleBtn || !cancelEditBtn) {
        NotificationManager.error('UI elements not initialized', 'Edit Error');
        return;
      }
      
      // Set edit mode
      window.isEditing = true;
      window.editingScheduleIndex = index;
      
      // Set form values
      scheduleType.value = schedule.type || 'Everyday';
      
      // Show/hide day select for specific day schedules
      if (daySelectContainer && scheduleDay) {
        if (schedule.type === 'Specific Day') {
          daySelectContainer.classList.remove('hidden');
          scheduleDay.value = String(schedule.day || 0);
        } else {
          daySelectContainer.classList.add('hidden');
        }
      }
      
      // Set time
      scheduleTime.value = schedule.time || '00:00';
      
  // Set warm hug checkbox
  const warmHugCheckbox = document.getElementById('warmHugEnabled');
  if (warmHugCheckbox) {
    warmHugCheckbox.checked = schedule.isWarmHug === true;
  }
        // Show warm hug info if it's a warm hug schedule
  if (warmHugInfo) {
    warmHugInfo.classList.toggle('hidden', !schedule.isWarmHug);
  }
      // Convert temperature if needed
      let displayTemp = schedule.temperature;
      const currentUnit = unit.value;
      
      if (schedule.unit && schedule.unit !== currentUnit) {
        if (schedule.unit === 'C' && currentUnit === 'F' && typeof convertCtoF === 'function') {
          displayTemp = convertCtoF(displayTemp);
        } else if (schedule.unit === 'F' && currentUnit === 'C' && typeof convertFtoC === 'function') {
          displayTemp = convertFtoC(displayTemp);
        }
      }
      
      // Set temperature
      scheduleTemperature.value = String(displayTemp);
      
      // Update UI to show edit mode
      addScheduleBtn.textContent = 'Update Schedule';
      cancelEditBtn.classList.remove('hidden');
      
      // Scroll to edit form
      addScheduleBtn.scrollIntoView({ behavior: 'smooth' });
      
      // Show notification
      if (schedule.isFromTemplate) {
        NotificationManager.info(
          `Editing template schedule: ${schedule.templateSource || 'unknown template'}`,
          'Edit Mode'
        );
      } else {
        NotificationManager.info('Editing schedule', 'Edit Mode');
      }
    };
    
    /**
     * Remove a schedule with confirmation
     * @param {number} index - Index of the schedule to remove
     */
    window.removeSchedule = function(index) {
      if (index < 0 || index >= window.schedules.length) {
        NotificationManager.error('Invalid schedule index', 'Remove Error');
        return;
      }
      
      // Show confirmation modal
      showConfirmModal(
        'Remove Schedule',
        'Are you sure you want to remove this schedule?',
        function() {
          // Remove the schedule
          window.schedules.splice(index, 1);
          
          // Update UI
          if (typeof window.renderScheduleList === 'function') {
            window.renderScheduleList();
          }
          if (typeof window.saveConfig === 'function') {
            window.saveConfig(false);
          }
          NotificationManager.success('Schedule removed successfully', 'Success', { autoHide: true });
        }
      );
    };
    
    /**
     * Show confirmation modal
     * @param {string} title - Modal title
     * @param {string} message - Modal message
     * @param {Function} callback - Function to call if confirmed
     */
    function showConfirmModal(title, message, callback) {
      const modal = document.getElementById('confirmModal');
      const modalTitle = document.getElementById('confirmTitle');
      const modalMessage = document.getElementById('confirmMessage');
      const confirmOk = document.getElementById('confirmOk');
      const confirmCancel = document.getElementById('confirmCancel');
      
      if (!modal || !modalTitle || !modalMessage || !confirmOk || !confirmCancel) {
        // Use native confirm as fallback
        if (window.confirm(message)) {
          if (typeof callback === 'function') callback();
        }
        return;
      }
      
      // Set modal content
      modalTitle.textContent = title;
      modalMessage.textContent = message;
      
      // Create new buttons to avoid listener buildup
      const newOkButton = confirmOk.cloneNode(true);
      const newCancelButton = confirmCancel.cloneNode(true);
      
      confirmOk.parentNode.replaceChild(newOkButton, confirmOk);
      confirmCancel.parentNode.replaceChild(newCancelButton, confirmCancel);
      
      // Add event listeners
      newOkButton.addEventListener('click', function() {
        // Hide modal
        modal.classList.add('hidden');
        modal.style.display = 'none';
        
        // Execute callback
        if (typeof callback === 'function') callback();
      });
      
      newCancelButton.addEventListener('click', function() {
        // Hide modal
        modal.classList.add('hidden');
        modal.style.display = 'none';
      });
      
      // Show modal - use both class and style for cross-browser compatibility
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
    
   /**
 * Get sleep phase category for a time
 * Organizes times into sleep cycle phases rather than strict chronology
 * @param {string} time - Time in 24-hour format (HH:MM)
 * @returns {number} Phase category value for sorting (lower = earlier in sleep cycle)
 */
function getSleepPhaseOrder(time) {
  const hourMinutes = time.split(':');
  const hour = parseInt(hourMinutes[0], 10);
  
  // Define sleep cycle phases with associated sort values
  if (hour >= 20 && hour <= 23) {
    // Evening/Bedtime phase (8 PM - 11:59 PM): Sort first
    return 0;
  } else if (hour >= 0 && hour < 6) {
    // Overnight phase (12 AM - 5:59 AM): Sort second
    return 1;
  } else if (hour >= 6 && hour < 10) {
    // Morning/Wake-up phase (6 AM - 9:59 AM): Sort third
    return 2;
  } else {
    // Other times: Sort last
    return 3;
  }
}

/**
 * Render the schedule list in the UI
 * Groups schedules by type and displays them in a user-friendly format
 * Uses sleep cycle ordering instead of strict chronological ordering
 */
window.renderScheduleList = function() {
  // Check if schedules are enabled first
  if (!areSchedulesEnabled()) {
    console.log('Schedules are disabled, skipping render');
    return;
  }
  
  const scheduleList = document.getElementById('scheduleList');
  const unit = document.getElementById('unit');
  
  if (!scheduleList || !unit) {
    console.warn('Schedule list element or unit select not found');
    return;
  }
  
  // Clear the list
  scheduleList.innerHTML = '';
  
  // Check if there are any schedules
  if (!window.schedules || window.schedules.length === 0) {
    scheduleList.innerHTML = '<p>No schedules configured.</p>';
    return;
  }
  
  // Group schedules by type
  const groupedSchedules = {};
  window.schedules.forEach((schedule, index) => {
    if (!groupedSchedules[schedule.type]) {
      groupedSchedules[schedule.type] = [];
    }
    groupedSchedules[schedule.type].push({...schedule, originalIndex: index});
  });
  
  // Define schedule phases for color coding
  const phases = {
    COOL_DOWN: { name: 'Cool Down', class: 'phase-cooldown' },
    DEEP_SLEEP: { name: 'Deep Sleep', class: 'phase-deep' },
    REM: { name: 'REM Support', class: 'phase-rem' },
    WAKE_UP: { name: 'Wake-up', class: 'phase-wakeup' }
  };
  
  // Helper function to determine schedule phase
  function getSchedulePhase(schedule) {
    const desc = (schedule.description || '').toLowerCase();
    const temp = schedule.temperature;
    const scheduleUnit = schedule.unit || unit.value;
    const isWarmHug = schedule.isWarmHug === true;
    
    // Convert to Celsius for comparison if needed
    let tempC = temp;
    if (scheduleUnit === 'F' && typeof convertFtoC === 'function') {
      tempC = convertFtoC(temp);
    }
      // If it's marked as warm hug, return wake-up phase regardless of temperature
  if (isWarmHug) {
    return phases.WAKE_UP;
  }
    // Determine phase based on description and temperature
    if (desc.includes('wake') || desc.includes('hug') || tempC > 25) {
      return phases.WAKE_UP;
    } else if (desc.includes('rem') || (tempC >= 22 && tempC <= 25)) {
      return phases.REM;
    } else if (desc.includes('deep') || tempC < 20) {
      return phases.DEEP_SLEEP;
    } else {
      return phases.COOL_DOWN;
    }
  }
  
  // Process each group of schedules
  Object.keys(groupedSchedules).forEach(type => {
    // Create group container
    const groupContainer = document.createElement('div');
    groupContainer.className = 'schedule-group';
    
    // Add group title
    const groupTitle = document.createElement('div');
    groupTitle.className = 'schedule-group-title';
    groupTitle.textContent = type;
    groupContainer.appendChild(groupTitle);
    
    // Sort schedules by sleep phase rather than strict time
    const sortedSchedules = [...groupedSchedules[type]].sort((a, b) => {
      // First sort by sleep phase category
      const phaseA = getSleepPhaseOrder(a.time || '00:00');
      const phaseB = getSleepPhaseOrder(b.time || '00:00');
      
      if (phaseA !== phaseB) {
        return phaseA - phaseB;
      }
      
      // Within the same phase, sort by time
      return (a.time || '').localeCompare(b.time || '');
    });
    
    // Create elements for each schedule
    sortedSchedules.forEach(schedule => {
      const scheduleItem = document.createElement('div');
      scheduleItem.className = 'schedule-item';
      
      // Add template class if from a template
      if (schedule.isFromTemplate) {
        scheduleItem.classList.add('template-schedule');
      }
      
      if (schedule.isWarmHug) {
        const phaseLabel = document.createElement('span');
        phaseLabel.className = `schedule-phase ${phases.WAKE_UP.class}`;
        phaseLabel.textContent = "Warm Hug Wake Up";
        infoDiv.appendChild(phaseLabel);
      }

      // Get schedule phase
      const phase = getSchedulePhase(schedule);
      
      // Build display info
      let displayInfo = '';
      
      // Add day for specific day schedules
      if (schedule.type === 'Specific Day' && schedule.day !== undefined) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        if (schedule.day >= 0 && schedule.day < days.length) {
          displayInfo += `${days[schedule.day]} `;
        }
      }
      
      // Handle temperature display with proper unit conversion
      let displayTemp = schedule.temperature;
      const currentUnit = unit.value;
      
      if (schedule.unit && schedule.unit !== currentUnit) {
        if (schedule.unit === 'C' && currentUnit === 'F' && typeof convertCtoF === 'function') {
          displayTemp = Math.round(convertCtoF(displayTemp) * 10) / 10;
        } else if (schedule.unit === 'F' && currentUnit === 'C' && typeof convertFtoC === 'function') {
          displayTemp = Math.round(convertFtoC(displayTemp) * 10) / 10;
        }
      }
      
      // Add time and temperature
      displayInfo += `${schedule.time || '00:00'}: ${displayTemp}°${currentUnit}`;
      
      // Create schedule item elements
      const infoDiv = document.createElement('div');
      infoDiv.className = 'schedule-item-info';
      
      // Time and temperature
      const timeTemp = document.createElement('div');
      timeTemp.className = 'schedule-time';
      timeTemp.textContent = displayInfo;
      infoDiv.appendChild(timeTemp);
      
      // Phase label
      const phaseLabel = document.createElement('span');
      phaseLabel.className = `schedule-phase ${phase.class}`;
      phaseLabel.textContent = schedule.description || phase.name;
      
      // Add template badge if applicable
      if (schedule.isFromTemplate) {
        const templateBadge = document.createElement('span');
        templateBadge.className = 'template-badge';
        templateBadge.title = `From template: ${schedule.templateSource || 'unknown'}`;
        templateBadge.textContent = 'T';
        phaseLabel.appendChild(templateBadge);
      }
      
      infoDiv.appendChild(phaseLabel);
      
      // Action buttons
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'schedule-item-actions';
      
      // Edit button
      const editBtn = document.createElement('button');
      editBtn.className = 'edit';
      editBtn.textContent = 'Edit';
      editBtn.dataset.index = schedule.originalIndex;
      editBtn.addEventListener('click', function() {
        const index = parseInt(this.dataset.index, 10);
        if (!isNaN(index) && typeof window.editSchedule === 'function') {
          window.editSchedule(index);
        }
      });
      
      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.className = 'danger';
      removeBtn.textContent = 'Remove';
      removeBtn.dataset.index = schedule.originalIndex;
      removeBtn.addEventListener('click', function() {
        const index = parseInt(this.dataset.index, 10);
        if (!isNaN(index) && typeof window.removeSchedule === 'function') {
          window.removeSchedule(index);
        }
      });
      
      // Add buttons to actions
      actionsDiv.appendChild(editBtn);
      actionsDiv.appendChild(removeBtn);
      
      // Add elements to schedule item
      scheduleItem.appendChild(infoDiv);
      scheduleItem.appendChild(actionsDiv);
      
      // Add to group container
      groupContainer.appendChild(scheduleItem);
    });
    
    // Add group to schedule list
    scheduleList.appendChild(groupContainer);
  });
};
    
    /**
     * Apply selected schedule templates
     */
    window.applyScheduleTemplates = function() {
      const weekdayTemplate = document.getElementById('weekdayTemplate');
      const weekendTemplate = document.getElementById('weekendTemplate');
      const unit = document.getElementById('unit');
      
      if (!weekdayTemplate || !weekendTemplate || !unit) {
        NotificationManager.error('Template UI elements not initialized', 'Template Error');
        return;
      }
      
      const weekdayKey = weekdayTemplate.value;
      const weekendKey = weekendTemplate.value;
      const currentUnit = unit.value;
      
      // Validate templates variable
      if (!window.templates) {
        NotificationManager.error('Template definitions not available', 'Template Error');
        return;
      }
      
      let count = 0;
      
      // Apply weekday template if selected
      if (weekdayKey && window.templates[weekdayKey]) {
        // Remove existing weekday schedules
        window.schedules = window.schedules.filter(s => s.type !== 'Weekdays');
        
        // Apply new schedules
        window.templates[weekdayKey].schedules.forEach(templateSchedule => {
          // Convert temperature if needed
          let temperature = templateSchedule.temperature;
          if (currentUnit === 'F' && typeof convertCtoF === 'function') {
            temperature = Math.round(convertCtoF(temperature) * 10) / 10;
          }
          
          // Create schedule object
          const schedule = {
            type: templateSchedule.type,
            time: templateSchedule.time,
            temperature,
            unit: currentUnit,
            description: templateSchedule.description || null,
            isFromTemplate: true,
            templateSource: window.templates[weekdayKey].name,
            templateKey: weekdayKey
          };
          
          // Add day if applicable
          if (templateSchedule.day !== undefined) {
            schedule.day = templateSchedule.day;
          }
          
          window.schedules.push(schedule);
          count++;
        });
      }
      
      // Apply weekend template if selected
      if (weekendKey && window.templates[weekendKey]) {
        // Remove existing weekend schedules
        window.schedules = window.schedules.filter(s => s.type !== 'Weekend');
        
        // Apply new schedules
        window.templates[weekendKey].schedules.forEach(templateSchedule => {
          // Convert temperature if needed
          let temperature = templateSchedule.temperature;
          if (currentUnit === 'F' && typeof convertCtoF === 'function') {
            temperature = Math.round(convertCtoF(temperature) * 10) / 10;
          }
          
          // Create schedule object
          const schedule = {
            type: templateSchedule.type,
            time: templateSchedule.time,
            temperature,
            unit: currentUnit,
            description: templateSchedule.description || null,
            isFromTemplate: true,
            templateSource: window.templates[weekendKey].name,
            templateKey: weekendKey
          };
          
          // Add day if applicable
          if (templateSchedule.day !== undefined) {
            schedule.day = templateSchedule.day;
          }
          
          window.schedules.push(schedule);
          count++;
        });
      }
      
      // Update UI
      if (typeof window.renderScheduleList === 'function') {
        window.renderScheduleList();
      }
      if (typeof window.saveConfig === 'function') {
        window.saveConfig(false);
      }
      
      // Show notification
      if (count > 0) {
        NotificationManager.success(
          `Applied ${count} schedules from templates`,
          'Template Application',
          { autoHide: true }
        );
      } else {
        NotificationManager.warning('No templates selected', 'Template Application');
      }
    };
    
/**
 * Show a preview of template schedules
 * @param {string} templateKey - Key of the template to preview
 */
function showTemplatePreview(templateKey) {
  console.log('Showing template preview for:', templateKey);
  
  // Ensure templates are available
  if (!window.templates) {
    console.error('Templates not available');
    NotificationManager.error('Template data not available', 'Preview Error');
    return;
  }
  
  const template = window.templates[templateKey];
  if (!template) {
    console.error(`Template "${templateKey}" not found`);
    NotificationManager.error(`Template "${templateKey}" not found`, 'Preview Error');
    return;
  }
  
  // Get current temperature unit
  const unitSelect = document.getElementById('unit');
  const unit = unitSelect ? unitSelect.value : 'C';
  
  // Determine target container
  const isWeekday = ['optimal', 'nightOwl', 'earlyBird'].includes(templateKey);
  const containerId = isWeekday ? 'weekdayTemplateDesc' : 'weekendTemplateDesc';
  const container = document.getElementById(containerId);
  
  if (!container) {
    console.error('Preview container not found:', containerId);
    NotificationManager.error('Preview container not found', 'Preview Error');
    return;
  }
  
  // Create or get preview container
  let previewContainer = document.getElementById(`${templateKey}Preview`);
  if (!previewContainer) {
    previewContainer = document.createElement('div');
    previewContainer.id = `${templateKey}Preview`;
    previewContainer.className = 'template-preview';
    
    // Add header
    const header = document.createElement('div');
    header.className = 'template-preview-header';
    
    const title = document.createElement('h4');
    title.textContent = `${template.name} Preview`;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'secondary';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', function() {
      previewContainer.remove();
    });
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    previewContainer.appendChild(header);
    
    // Add to parent
    container.appendChild(previewContainer);
  } else {
    // Clear existing items except header
    const header = previewContainer.querySelector('.template-preview-header');
    previewContainer.innerHTML = '';
    if (header) {
      previewContainer.appendChild(header);
    }
  }
  
  // Add schedules to preview
  if (Array.isArray(template.schedules)) {
    template.schedules.forEach(schedule => {
      const previewItem = document.createElement('div');
      previewItem.className = 'preview-item';
      
      // Format temperature with proper unit conversion
      let temp = schedule.temperature;
      if (unit === 'F' && typeof window.convertCtoF === 'function') {
        temp = Math.round(window.convertCtoF(temp) * 10) / 10;
      }
      
      // Create time and temperature span
      const timeTemp = document.createElement('span');
      timeTemp.textContent = `${schedule.time}: ${temp}°${unit}`;
      
      // Create description span
      const description = document.createElement('span');
      description.className = 'preview-description';
      description.textContent = schedule.description || '';
      
      // Add to preview item
      previewItem.appendChild(timeTemp);
      previewItem.appendChild(description);
      
      // Add to preview container
      previewContainer.appendChild(previewItem);
    });
  } else {
    console.warn('No schedules found in template:', templateKey);
    const noSchedulesMsg = document.createElement('p');
    noSchedulesMsg.textContent = 'No schedules defined in this template.';
    previewContainer.appendChild(noSchedulesMsg);
  }
  
  console.log('Template preview rendered successfully');
}
    /**
 * Create and attach template preview buttons
 * @param {string} templateType - 'weekday' or 'weekend'
 * @param {string} templateKey - Selected template key
 */
function updateTemplatePreviewButton(templateType, templateKey) {
  if (!templateKey) return;

  const descContainerId = `${templateType}TemplateDesc`;
  const descContainer = document.getElementById(descContainerId);
  if (!descContainer) {
    console.warn(`Template description container #${descContainerId} not found`);
    return;
  }

  // Remove any existing preview button
  const existingBtn = document.getElementById(`${templateType}PreviewBtn`);
  if (existingBtn) {
    existingBtn.remove();
  }

  // Create new preview button
  const previewBtn = document.createElement('button');
  previewBtn.id = `${templateType}PreviewBtn`;
  previewBtn.className = 'secondary';
  previewBtn.textContent = 'Preview Schedules';
  previewBtn.style.marginTop = '10px';
  
  // Add event handler directly with explicit context
  previewBtn.addEventListener('click', function() {
    console.log(`Preview button clicked for ${templateType} template: ${templateKey}`);
    // Make sure window.showTemplatePreview is available
    if (typeof window.showTemplatePreview === 'function') {
      window.showTemplatePreview(templateKey);
    } else {
      console.error('showTemplatePreview function not available');
    }
  });
  
  // Add to container
  descContainer.appendChild(previewBtn);
  console.log(`Preview button added for ${templateType} template: ${templateKey}`);
}
/**
 * Update template description based on selection
 * @param {string} type - 'weekday' or 'weekend'
 * @param {string} templateKey - Selected template key
 */
function updateTemplateDescription(type, templateKey) {
  console.log(`Updating ${type} template description for: ${templateKey}`);
  
  // Make sure templates are available
  if (!window.templates) {
    console.error('Templates not available');
    return;
  }
  
  const descElement = document.getElementById(`${type}TemplateDesc`);
  if (!descElement) {
    console.warn(`Template description element #${type}TemplateDesc not found`);
    return;
  }
  
  // Clear existing content
  descElement.innerHTML = '';
  
  // If no template selected, just leave it empty
  if (!templateKey) {
    return;
  }
  
  const template = window.templates[templateKey];
  if (!template) {
    console.warn(`Template not found: ${templateKey}`);
    return;
  }
  
  // Set description text
  const descText = document.createElement('p');
  descText.textContent = template.description || '';
  descElement.appendChild(descText);
  
  console.log(`Template description updated for ${type}: ${template.description}`);
}
    /**
     * Load Warm Hug settings from config
     */
    window.loadWarmHugSettings = function() {
      // Get UI elements
      const incrementInput = document.getElementById('warmHugIncrement');
      const durationInput = document.getElementById('warmHugDuration');
      const unitSelect = document.getElementById('unit');
      
      if (!incrementInput || !durationInput || !unitSelect) {
        console.warn('Warm Hug settings elements not found');
        return;
      }
      
      // Get current unit
      const currentUnit = unitSelect.value;
      
      // Update labels with correct units
      updateWarmHugUnitLabels(currentUnit);
      
      // Load config (for production)
      if (typeof homebridge !== 'undefined' && typeof homebridge.getPluginConfig === 'function') {
        homebridge.getPluginConfig().then(pluginConfig => {
          // Find platform config
          const config = Array.isArray(pluginConfig) ? 
            pluginConfig.find(cfg => cfg && cfg.platform === 'SleepMeSimple') : null;
          
          if (config && config.advanced) {
            // Set increment value with unit conversion if needed
            if (config.advanced.warmHugIncrement !== undefined) {
              let incrementValue = config.advanced.warmHugIncrement;
              
              // Convert if units don't match
              if (config.unit === 'C' && currentUnit === 'F') {
                // F increments are 9/5 larger than C increments
                incrementValue = incrementValue * (9/5);
              } else if (config.unit === 'F' && currentUnit === 'C') {
                // C increments are 5/9 smaller than F increments
                incrementValue = incrementValue * (5/9);
              }
              
              // Round to one decimal place
              incrementValue = Math.round(incrementValue * 10) / 10;
              incrementInput.value = incrementValue;
            }
            
            // Set duration
            if (config.advanced.warmHugDuration !== undefined) {
              durationInput.value = config.advanced.warmHugDuration;
            }
          } else {
            // Set defaults if not configured
            incrementInput.value = currentUnit === 'C' ? '2' : '3.6';
            durationInput.value = '15';
          }
        }).catch(error => {
          console.error('Error loading Warm Hug settings:', error);
          
          // Set defaults on error
          incrementInput.value = currentUnit === 'C' ? '2' : '3.6';
          durationInput.value = '15';
        });
      } else {
        // Set defaults for development/testing
        incrementInput.value = currentUnit === 'C' ? '2' : '3.6';
        durationInput.value = '15';
      }
    };
    
    /**
     * Save Warm Hug parameters to config
     */
    window.saveWarmHugParameters = function() {
      // Get UI elements
      const incrementInput = document.getElementById('warmHugIncrement');
      const durationInput = document.getElementById('warmHugDuration');
      const unitSelect = document.getElementById('unit');
      
      if (!incrementInput || !durationInput || !unitSelect) {
        NotificationManager.error('Form elements not found', 'Warm Hug Settings');
        return;
      }
      
      // Get and validate values
      const increment = parseFloat(incrementInput.value);
      const duration = parseInt(durationInput.value, 10);
      const currentUnit = unitSelect.value;
      
      // Validate increment (unit-dependent ranges)
      const minIncrement = currentUnit === 'C' ? 0.5 : 1.0;
      const maxIncrement = currentUnit === 'C' ? 5.0 : 9.0;
      
      if (isNaN(increment) || increment < minIncrement || increment > maxIncrement) {
        NotificationManager.error(
          `Increment must be between ${minIncrement} and ${maxIncrement}°${currentUnit}/min`,
          'Validation Error'
        );
        return;
      }
      
      // Validate duration
      if (isNaN(duration) || duration < 5 || duration > 60) {
        NotificationManager.error(
          'Duration must be between 5 and 60 minutes',
          'Validation Error'
        );
        return;
      }
      
      // Save to Homebridge config
      if (typeof homebridge !== 'undefined' && 
          typeof homebridge.getPluginConfig === 'function' && 
          typeof homebridge.updatePluginConfig === 'function' && 
          typeof homebridge.savePluginConfig === 'function') {
        
        // Get current config
        homebridge.getPluginConfig().then(pluginConfig => {
          // Find or create platform config
          let config = null;
          let configIndex = -1;
          
          if (Array.isArray(pluginConfig)) {
            configIndex = pluginConfig.findIndex(cfg => cfg && cfg.platform === 'SleepMeSimple');
            if (configIndex >= 0) {
              config = pluginConfig[configIndex];
            }
          }
          
          if (!config) {
            NotificationManager.error('Platform configuration not found', 'Warm Hug Settings');
            return;
          }
          
          // Create advanced section if it doesn't exist
          if (!config.advanced) {
            config.advanced = {};
          }
          
          // Convert increment to Celsius for storage if needed
          let storageIncrement = increment;
          if (currentUnit === 'F') {
            // Convert Fahrenheit increment to Celsius increment
            storageIncrement = increment * (5/9);
            console.log(`Converting increment from ${increment}°F/min to ${storageIncrement}°C/min for storage`);
          }
          
          // Update config
          config.advanced.warmHugIncrement = Math.round(storageIncrement * 10) / 10;
          config.advanced.warmHugDuration = duration;
          
          // Update pluginConfig array
          pluginConfig[configIndex] = config;

          // Update in memory and save to disk
        homebridge.updatePluginConfig(pluginConfig)
        .then(() => homebridge.savePluginConfig())
        .then(() => {
          NotificationManager.success(
            'Warm Hug parameters saved successfully',
            'Settings Saved', 
            { autoHide: true }
          );
        })
        .catch(error => {
          NotificationManager.error(
            `Error saving parameters: ${error.message}`,
            'Save Error'
          );
        });
    }).catch(error => {
      NotificationManager.error(
        `Error getting config: ${error.message}`,
        'Configuration Error'
      );
    });
  } else {
    // For development/testing without Homebridge
    NotificationManager.success(
      'Warm Hug parameters saved (development mode)',
      'Settings Saved',
      { autoHide: true }
    );
  }
};

/**
 * Temperature conversion utilities
 */
window.convertCtoF = function(celsius) {
  return (celsius * 9/5) + 32;
};

window.convertFtoC = function(fahrenheit) {
  return (fahrenheit - 32) * 5/9;
};

/**
 * Validate time input in 24-hour format
 * @returns {boolean} True if valid, false otherwise
 */
window.validateScheduleTime = function() {
  const scheduleTimeInput = document.getElementById('scheduleTime');
  const timeError = document.getElementById('timeError');
  
  if (!scheduleTimeInput || !timeError) {
    return false;
  }
  
  const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  const value = scheduleTimeInput.value.trim();
  
  if (!value) {
    timeError.textContent = "Time is required";
    timeError.classList.add('visible');
    scheduleTimeInput.classList.add('invalid');
    return false;
  }
  
  const isValid = timePattern.test(value);
  
  timeError.textContent = isValid ? "" : "Please enter a valid 24-hour time (HH:MM)";
  timeError.classList.toggle('visible', !isValid);
  scheduleTimeInput.classList.toggle('invalid', !isValid);
  
  return isValid;
};

/**
 * Validate temperature input based on selected unit
 * @returns {boolean} True if valid, false otherwise
 */
window.validateTemperature = function() {
  const scheduleTemperatureInput = document.getElementById('scheduleTemperature');
  const unitSelect = document.getElementById('unit');
  const tempError = document.getElementById('tempError');
  
  if (!scheduleTemperatureInput || !unitSelect || !tempError) {
    return false;
  }
  
  const value = scheduleTemperatureInput.value.trim();
  const temp = parseFloat(value);
  const unit = unitSelect.value;
  
  if (!value) {
    tempError.textContent = "Temperature is required";
    tempError.classList.add('visible');
    scheduleTemperatureInput.classList.add('invalid');
    return false;
  }
  
  let isValid = true;
  let errorMsg = '';
  
  if (isNaN(temp)) {
    isValid = false;
    errorMsg = 'Please enter a valid number';
  } else if (unit === 'C' && (temp < 13 || temp > 46)) {
    isValid = false;
    errorMsg = 'Temperature must be between 13-46°C';
  } else if (unit === 'F' && (temp < 55 || temp > 115)) {
    isValid = false;
    errorMsg = 'Temperature must be between 55-115°F';
  }
  
  tempError.textContent = errorMsg;
  tempError.classList.toggle('visible', !isValid);
  scheduleTemperatureInput.classList.toggle('invalid', !isValid);
  
  return isValid;
};

/**
 * Update temperature validation based on unit
 */
window.updateTemperatureValidation = function() {
  const scheduleTemperatureInput = document.getElementById('scheduleTemperature');
  const unitSelect = document.getElementById('unit');
  
  if (!scheduleTemperatureInput || !unitSelect) {
    return;
  }
  
  const unit = unitSelect.value;
  const isEditing = window.isEditing;
  
  // Update min/max attributes
  if (unit === 'C') {
    scheduleTemperatureInput.setAttribute('min', '13');
    scheduleTemperatureInput.setAttribute('max', '46');
    // Set default only if not editing
    if (!isEditing) {
      scheduleTemperatureInput.value = '23';
    }
  } else {
    scheduleTemperatureInput.setAttribute('min', '55');
    scheduleTemperatureInput.setAttribute('max', '115');
    // Set default only if not editing
    if (!isEditing) {
      scheduleTemperatureInput.value = '73';
    }
  }
  
  // Validate with new settings
  validateTemperature();
};

// Initialize window.templates with predefined templates
window.templates = {
  optimal: {
    name: "Optimal Sleep Cycle",
    description: "Designed for complete sleep cycles with REM enhancement",
    schedules: [
      { type: "Weekdays", time: "21:30", temperature: 24, description: "Cool Down" },
      { type: "Weekdays", time: "23:00", temperature: 19, description: "Deep Sleep" },
      { type: "Weekdays", time: "02:00", temperature: 24, description: "REM Support" },
      { type: "Weekdays", time: "06:00", temperature: 42, description: "Warm Hug Wake-up", isWarmHug: true }
    ]
  },
  nightOwl: {
    name: "Night Owl",
    description: "Later bedtime with extended morning warm-up",
    schedules: [
      { type: "Weekdays", time: "23:30", temperature: 21, description: "Cool Down" },
      { type: "Weekdays", time: "00:30", temperature: 19, description: "Deep Sleep" },
      { type: "Weekdays", time: "03:30", temperature: 23, description: "REM Support" },
      { type: "Weekdays", time: "07:30", temperature: 26, description: "Warm Hug Wake-up", isWarmHug: true }  
    ]
  },
  earlyBird: {
    name: "Early Bird",
    description: "Earlier bedtime and wake-up schedule",
    schedules: [
      { type: "Weekdays", time: "21:00", temperature: 21, description: "Cool Down" },
      { type: "Weekdays", time: "22:00", temperature: 19, description: "Deep Sleep" },
      { type: "Weekdays", time: "01:00", temperature: 23, description: "REM Support" },
      { type: "Weekdays", time: "05:00", temperature: 26, description: "Warm Hug Wake-up", isWarmHug: true }
    ]
  },
  recovery: {
    name: "Weekend Recovery",
    description: "Extra sleep with later wake-up time",
    schedules: [
      { type: "Weekend", time: "23:00", temperature: 21, description: "Cool Down" },
      { type: "Weekend", time: "00:00", temperature: 19, description: "Deep Sleep" },
      { type: "Weekend", time: "03:00", temperature: 23, description: "REM Support" },
      { type: "Weekend", time: "08:00", temperature: 26, description: "Warm Hug Wake-up", isWarmHug: true } 
    ]
  },
  relaxed: {
    name: "Relaxed Weekend",
    description: "Gradual transitions for weekend leisure",
    schedules: [
      { type: "Weekend", time: "23:30", temperature: 22, description: "Cool Down" },
      { type: "Weekend", time: "01:00", temperature: 20, description: "Deep Sleep" },
      { type: "Weekend", time: "04:00", temperature: 24, description: "REM Support" },
      { type: "Weekend", time: "09:00", temperature: 26, description: "Warm Hug Wake-up", isWarmHug: true }
    ]
  }
};

// Expose utility functions to window
window.showConfirmModal = showConfirmModal;
})();