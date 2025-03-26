// Entry point for SleepMe Simple custom UI integration
(function() {
  // Report that our script is loading
  console.log('SleepMe Simple Custom UI: Loading started...');
  
  // Create a status indicator to help with debugging
  const statusIndicator = document.createElement('div');
  statusIndicator.id = 'sleepme-status';
  statusIndicator.style.position = 'fixed';
  statusIndicator.style.right = '10px';
  statusIndicator.style.bottom = '10px';
  statusIndicator.style.backgroundColor = 'rgba(0,0,0,0.6)';
  statusIndicator.style.color = 'white';
  statusIndicator.style.padding = '5px 10px';
  statusIndicator.style.borderRadius = '4px';
  statusIndicator.style.fontSize = '12px';
  statusIndicator.style.zIndex = '9999';
  statusIndicator.style.display = 'none'; // Start hidden
  statusIndicator.textContent = 'SleepMe UI initializing...';
  document.body.appendChild(statusIndicator);
  
  // Function to update status with timestamp
  function updateStatus(message) {
    if (!statusIndicator) return;
    const time = new Date().toLocaleTimeString();
    statusIndicator.textContent = `${time}: ${message}`;
    // Show status briefly then fade
    statusIndicator.style.display = 'block';
    setTimeout(() => {
      statusIndicator.style.opacity = '0.5';
      setTimeout(() => {
        statusIndicator.style.display = 'none';
        statusIndicator.style.opacity = '1';
      }, 3000);
    }, 7000);
  }
  
  // Wait for document to be fully loaded
  document.addEventListener('DOMContentLoaded', function() {
    initializeDetection();
  });
  
  // Also try at window load as a fallback
  window.addEventListener('load', function() {
    initializeDetection();
  });
  
  // Initialize detection process
  function initializeDetection() {
    // Delay initial check to ensure Homebridge UI is loaded
    setTimeout(function() {
      checkAndInitialize();
    }, 1500);
  }
  
  // Check if we're on the right page and initialize if so
  function checkAndInitialize() {
    // Check if we're on the plugin config page
    if (isPluginConfigPage()) {
      updateStatus('Plugin config page detected');
      initializeCustomUI();
    } else {
      // Try again after a delay
      setTimeout(checkAndInitialize, 2000);
    }
  }
  
  // Check if this is the SleepMe plugin config page
  function isPluginConfigPage() {
    // Look for elements specific to our plugin
    const platform = document.querySelector('h2.card-title');
    if (platform && platform.textContent.includes('SleepMe')) {
      return true;
    }
    
    // Try finding the platform name in form inputs
    const inputs = document.querySelectorAll('input[type="text"]');
    for (const input of inputs) {
      if (input.value === 'SleepMe Simple') {
        return true;
      }
    }
    
    // Look for our Enable Schedules checkbox
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
      if (label.textContent && label.textContent.includes('Enable Schedules')) {
        return true;
      }
    }
    
    return false;
  }
  
  // Initialize our custom UI components
  function initializeCustomUI() {
    updateStatus('Initializing custom UI');
    
    // Check if schedules are enabled
    const schedulesEnabled = isSchedulesEnabled();
    if (!schedulesEnabled) {
      updateStatus('Schedules not enabled, UI not needed');
      return;
    }
    
    // Find the schedules section
    const scheduleSection = findScheduleSection();
    if (!scheduleSection) {
      updateStatus('Schedule section not found, retrying...');
      setTimeout(initializeCustomUI, 2000);
      return;
    }
    
    // Add template selector UI
    insertTemplateUI(scheduleSection);
  }
  
  // Check if schedules are enabled in the config
  function isSchedulesEnabled() {
    const enableCheckbox = findElementByLabel('Enable Schedules');
    return enableCheckbox && enableCheckbox.checked;
  }
  
  // Find element by label text
  function findElementByLabel(labelText) {
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
      if (label.textContent && label.textContent.trim() === labelText) {
        // Try to find the associated input
        if (label.htmlFor) {
          return document.getElementById(label.htmlFor);
        }
        // Look for input inside or near the label
        const input = label.querySelector('input') || 
                     label.nextElementSibling?.querySelector('input');
        if (input) return input;
      }
    }
    return null;
  }
  
  // Find the schedule section in the form
  function findScheduleSection() {
    // Look for schedules heading or array section
    const headings = document.querySelectorAll('h3, h4, legend');
    for (const heading of headings) {
      if (heading.textContent && heading.textContent.includes('Schedule')) {
        // Try to find the related form section
        let section = heading.closest('.form-group') || 
                     heading.closest('.form-array') ||
                     heading.closest('[class*="array"]');
        
        if (section) return section;
        
        // Look for an array section after this heading
        let next = heading.nextElementSibling;
        while (next) {
          if (next.classList.contains('form-array') || 
              next.classList.contains('array-field-list') ||
              next.innerHTML.includes('Schedule Type')) {
            return next;
          }
          next = next.nextElementSibling;
        }
      }
    }
    
    // Fallback: Look for sections with schedule-related content
    const formGroups = document.querySelectorAll('.form-group, .array-field-list');
    for (const group of formGroups) {
      if (group.innerHTML.includes('Schedule Type') || 
          group.innerHTML.includes('Target Temperature')) {
        return group;
      }
    }
    
    return null;
  }
  
  // Insert template UI before the schedule list
  function insertTemplateUI(scheduleSection) {
    // Create template card interface
    const container = document.createElement('div');
    container.className = 'sleepme-template-ui';
    container.style.marginBottom = '20px';
    container.style.padding = '15px';
    container.style.border = '1px solid #ddd';
    container.style.borderRadius = '5px';
    container.style.backgroundColor = '#f9f9f9';
    
    // Add heading
    const heading = document.createElement('h4');
    heading.textContent = 'Sleep Schedule Templates';
    heading.style.margin = '0 0 10px 0';
    heading.style.color = '#333';
    container.appendChild(heading);
    
    // Add description
    const description = document.createElement('p');
    description.textContent = 'Apply a sleep science-based temperature schedule to optimize your sleep.';
    description.style.marginBottom = '15px';
    container.appendChild(description);
    
    // Create template card container
    const cardContainer = document.createElement('div');
    cardContainer.style.display = 'flex';
    cardContainer.style.flexWrap = 'wrap';
    cardContainer.style.gap = '15px';
    
    // Add template cards
    cardContainer.appendChild(createTemplateCard(
      'Optimal Sleep Cycle',
      'Complete sleep cycles with REM enhancement',
      [
        { time: '22:00', temp: '21°C', name: 'Cool Down' },
        { time: '23:00', temp: '19°C', name: 'Deep Sleep' },
        { time: '02:00', temp: '23°C', name: 'REM Support' },
        { time: '06:00', temp: '24°C', name: 'Wake Up' }
      ],
      'optimal'
    ));
    
    cardContainer.appendChild(createTemplateCard(
      'Night Owl',
      'Later bedtime with extended morning warmth',
      [
        { time: '23:30', temp: '21°C', name: 'Cool Down' },
        { time: '00:30', temp: '19°C', name: 'Deep Sleep' },
        { time: '03:30', temp: '23°C', name: 'REM Support' },
        { time: '07:30', temp: '24°C', name: 'Wake Up' }
      ],
      'nightowl'
    ));
    
    container.appendChild(cardContainer);
    
    // Insert the template UI before the schedule section
    if (scheduleSection.parentNode) {
      scheduleSection.parentNode.insertBefore(container, scheduleSection);
      updateStatus('Template UI added successfully');
    } else {
      updateStatus('Failed to add template UI - no parent found');
    }
  }
  
  // Create a template card element
  function createTemplateCard(title, description, schedules, templateId) {
    const card = document.createElement('div');
    card.className = 'sleepme-template-card';
    card.setAttribute('data-template', templateId);
    card.style.width = '220px';
    card.style.padding = '15px';
    card.style.border = '1px solid #ddd';
    card.style.borderRadius = '5px';
    card.style.backgroundColor = 'white';
    card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    card.style.cursor = 'pointer';
    card.style.transition = 'all 0.2s';
    
    // Add hover effect
    card.addEventListener('mouseenter', () => {
      card.style.borderColor = '#007bff';
      card.style.boxShadow = '0 3px 8px rgba(0,123,255,0.2)';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.borderColor = '#ddd';
      card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    });
    
    // Add click handler
    card.addEventListener('click', () => {
      applyTemplate(templateId);
      updateStatus(`Applied ${title} template`);
    });
    
    // Add title
    const titleElem = document.createElement('h5');
    titleElem.textContent = title;
    titleElem.style.margin = '0 0 8px 0';
    titleElem.style.color = '#333';
    card.appendChild(titleElem);
    
    // Add description
    const descElem = document.createElement('p');
    descElem.textContent = description;
    descElem.style.fontSize = '13px';
    descElem.style.color = '#666';
    descElem.style.margin = '0 0 12px 0';
    card.appendChild(descElem);
    
    // Add schedule preview
    const previewDiv = document.createElement('div');
    previewDiv.style.borderTop = '1px solid #eee';
    previewDiv.style.paddingTop = '10px';
    
    schedules.forEach(schedule => {
      const scheduleRow = document.createElement('div');
      scheduleRow.style.display = 'flex';
      scheduleRow.style.justifyContent = 'space-between';
      scheduleRow.style.marginBottom = '6px';
      scheduleRow.style.fontSize = '12px';
      
      const timeElem = document.createElement('span');
      timeElem.textContent = schedule.time;
      timeElem.style.color = '#007bff';
      
      const tempElem = document.createElement('span');
      tempElem.textContent = schedule.temp;
      tempElem.style.fontWeight = '500';
      
      scheduleRow.appendChild(timeElem);
      scheduleRow.appendChild(tempElem);
      previewDiv.appendChild(scheduleRow);
    });
    
    card.appendChild(previewDiv);
    return card;
  }
  
  // Apply template schedules
  function applyTemplate(templateId) {
    // Define templates
    const templates = {
      'optimal': [
        { type: 'Weekdays', time: '22:00', temperature: 21 },
        { type: 'Weekdays', time: '23:00', temperature: 19 },
        { type: 'Weekdays', time: '02:00', temperature: 23 },
        { type: 'Weekdays', time: '06:00', temperature: 24 },
        { type: 'Weekend', time: '23:00', temperature: 21 },
        { type: 'Weekend', time: '00:00', temperature: 19 },
        { type: 'Weekend', time: '03:00', temperature: 23 },
        { type: 'Weekend', time: '08:00', temperature: 24 }
      ],
      'nightowl': [
        { type: 'Weekdays', time: '23:30', temperature: 21 },
        { type: 'Weekdays', time: '00:30', temperature: 19 },
        { type: 'Weekdays', time: '03:30', temperature: 23 },
        { type: 'Weekdays', time: '07:30', temperature: 24 },
        { type: 'Weekend', time: '00:30', temperature: 21 },
        { type: 'Weekend', time: '01:30', temperature: 19 },
        { type: 'Weekend', time: '04:30', temperature: 23 },
        { type: 'Weekend', time: '09:00', temperature: 24 }
      ]
    };
    
    const schedules = templates[templateId];
    if (!schedules) {
      updateStatus('Template not found: ' + templateId);
      return;
    }
    
    // Apply schedules to form
    applySchedulesToForm(schedules);
  }
  
  // Apply schedules to the form
  function applySchedulesToForm(schedules) {
    // Find schedule section again
    const scheduleSection = findScheduleSection();
    if (!scheduleSection) {
      updateStatus('Schedule section not found');
      return;
    }
    
    // Clear existing schedules
    clearExistingSchedules(scheduleSection);
    
    // Add each schedule with delay between them
    schedules.forEach((schedule, index) => {
      setTimeout(() => {
        addSchedule(scheduleSection, schedule);
      }, 500 * index); // 500ms between each addition
    });
  }
  // Clear existing schedules
  function clearExistingSchedules(container) {
    // Find all delete buttons
    const deleteButtons = Array.from(container.querySelectorAll('button'))
      .filter(btn => {
        const text = btn.textContent.toLowerCase().trim();
        const hasDeleteText = text === 'delete' || text.includes('delete') || 
                             text === 'remove' || text.includes('remove') ||
                             text === '×' || text === 'x';
        const hasDeleteClass = btn.classList.contains('btn-danger') || 
                              btn.classList.contains('delete') ||
                              btn.classList.contains('remove');
        return hasDeleteText || hasDeleteClass;
      });
    
    // Click each delete button with delay between
    deleteButtons.forEach((btn, index) => {
      setTimeout(() => {
        btn.click();
      }, 200 * index);
    });
    
    updateStatus(`Cleared ${deleteButtons.length} existing schedules`);
  }
  
  // Add a new schedule
  function addSchedule(container, schedule) {
    // Find the add button
    const addButton = findAddButton(container);
    if (!addButton) {
      updateStatus('Add button not found');
      return;
    }
    
    // Click add button
    addButton.click();
    
    // Wait for DOM update then set values
    setTimeout(() => {
      // Find newly added schedule item
      const items = container.querySelectorAll('.form-group');
      const newItem = items[items.length - 1];
      
      if (!newItem) {
        updateStatus('New schedule item not found');
        return;
      }
      
      // Set type first
      setFieldValue(newItem, 'type', schedule.type, 'select');
      
      // Wait for conditional fields to appear
      setTimeout(() => {
        // Set day if specific day
        if (schedule.type === 'Specific Day' && schedule.day) {
          setFieldValue(newItem, 'day', schedule.day, 'select');
        }
        
        // Set time and temperature
        setFieldValue(newItem, 'time', schedule.time, 'input');
        setFieldValue(newItem, 'temperature', schedule.temperature, 'input');
        
        updateStatus(`Added schedule: ${schedule.type} ${schedule.time}`);
      }, 300);
    }, 300);
  }
  
  // Find add button
  function findAddButton(container) {
    // Look for add button with various methods
    const buttons = container.querySelectorAll('button');
    
    // By text content
    for (const btn of buttons) {
      const text = btn.textContent.trim().toLowerCase();
      if (text === 'add' || text === '+' || text.includes('add')) {
        return btn;
      }
    }
    
    // By class
    for (const btn of buttons) {
      if (btn.classList.contains('btn-primary') || 
          btn.classList.contains('add-btn') ||
          btn.classList.contains('add-button')) {
        return btn;
      }
    }
    
    // By icon
    const buttonsWithIcons = container.querySelectorAll('button i[class*="plus"], button svg');
    if (buttonsWithIcons.length > 0) {
      return buttonsWithIcons[0].closest('button');
    }
    
    // Last resort: any non-danger button
    for (const btn of buttons) {
      if (!btn.classList.contains('btn-danger') && 
          !btn.classList.contains('delete') && 
          !btn.classList.contains('remove')) {
        return btn;
      }
    }
    
    return null;
  }
  
  // Set value for a form field
  function setFieldValue(container, fieldName, value, type) {
    // Try multiple methods to find the field
    let field = null;
    
    // Try by attribute
    field = container.querySelector(`${type}[formcontrolname="${fieldName}"]`) || 
            container.querySelector(`${type}[ng-reflect-name="${fieldName}"]`) ||
            container.querySelector(`${type}[name="${fieldName}"]`);
    
    // Try by label
    if (!field) {
      const label = Array.from(container.querySelectorAll('label'))
        .find(label => {
          const text = label.textContent.trim();
          return text.toLowerCase().includes(fieldName.toLowerCase());
        });
      
      if (label) {
        // Try by label's for attribute
        if (label.htmlFor) {
          field = document.getElementById(label.htmlFor);
        }
        
        // Try sibling or parent
        if (!field) {
          field = label.nextElementSibling?.querySelector(type) || 
                 label.closest('.form-group')?.querySelector(type);
        }
      }
    }
    
    if (!field) {
      // Try general field in container
      field = container.querySelector(`${type}`);
    }
    
    if (!field) {
      updateStatus(`Could not find ${fieldName} field`);
      return false;
    }
    
    // Set value based on field type
    if (type === 'select') {
      setSelectValue(field, value);
    } else {
      setInputValue(field, value);
    }
    
    return true;
  }
  
  // Set value for an input field
  function setInputValue(input, value) {
    // Set the value
    input.value = value;
    
    // Trigger events for framework change detection
    // Using both direct property assignment and event dispatching
    // to maximize compatibility across frameworks
    
    // Trigger built-in events
    const inputEvent = new Event('input', { bubbles: true });
    const changeEvent = new Event('change', { bubbles: true });
    
    input.dispatchEvent(inputEvent);
    input.dispatchEvent(changeEvent);
    
    // For Angular reactive forms
    if (typeof Event === 'function') {
      try {
        // Create a more specific Angular-compatible event
        const ngModelChange = new CustomEvent('ngModelChange', { 
          detail: value,
          bubbles: true 
        });
        input.dispatchEvent(ngModelChange);
      } catch (e) {
        // Ignore errors in custom event creation
      }
    }
  }
  
  // Set value for a select field
  function setSelectValue(select, value) {
    // Find and select the matching option
    let matched = false;
    
    // Try exact match
    for (const option of select.options) {
      if (option.value === value || option.text === value) {
        option.selected = true;
        matched = true;
        break;
      }
    }
    
    // Try case-insensitive match
    if (!matched) {
      const lcValue = String(value).toLowerCase();
      for (const option of select.options) {
        if (option.value.toLowerCase() === lcValue || 
            option.text.toLowerCase() === lcValue) {
          option.selected = true;
          matched = true;
          break;
        }
      }
    }
    
    // Default to first option if no match
    if (!matched && select.options.length > 0) {
      select.options[0].selected = true;
    }
    
    // Trigger change events
    const changeEvent = new Event('change', { bubbles: true });
    select.dispatchEvent(changeEvent);
    
    // For Angular
    try {
      // Create a more specific Angular-compatible event
      const ngModelChange = new CustomEvent('ngModelChange', { 
        detail: select.value,
        bubbles: true 
      });
      select.dispatchEvent(ngModelChange);
    } catch (e) {
      // Ignore errors in custom event creation
    }
  }
})();
