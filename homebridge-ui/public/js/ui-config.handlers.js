/**
 * Event handler initialization for SleepMe Simple UI
 * Sets up all event listeners for the UI components
 */

/**
 * Initialize UI event listeners
 * Sets up all the event handlers for the UI
 */
function initializeEventListeners() {
  // Form submission
  const configForm = document.getElementById('configForm');
  if (configForm) {
    configForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await saveConfig();
    });
  }
  
  // Test connection button
  const testConnectionBtn = document.getElementById('testConnection');
  if (testConnectionBtn) {
    testConnectionBtn.addEventListener('click', testConnection);
  }
  
  // Schedule type change
  if (scheduleTypeSelect && daySelectContainer && warmHugInfo) {
    scheduleTypeSelect.addEventListener('change', () => {
      const scheduleType = scheduleTypeSelect.value;
      
      // Show/hide day select for specific day schedules
      daySelectContainer.classList.toggle('hidden', scheduleType !== 'Specific Day');
      
      // Show/hide warm hug info
      warmHugInfo.classList.toggle('hidden', scheduleType !== 'Warm Hug');
    });
  }
  
  // Enable schedules checkbox
  const enableSchedulesCheckbox = document.getElementById('enableSchedules');
  const schedulesContainer = document.getElementById('schedulesContainer');
  if (enableSchedulesCheckbox && schedulesContainer) {
    enableSchedulesCheckbox.addEventListener('change', () => {
      // Toggle visibility of schedules container
      schedulesContainer.classList.toggle('hidden', !enableSchedulesCheckbox.checked);
      
      // If schedules are being disabled, clear the schedules array
      if (!enableSchedulesCheckbox.checked) {
        // Clear schedules when disabled to ensure clean state
        schedules = [];
        renderScheduleList(); // Update UI to reflect empty schedules
        showToast('info', 'Schedules have been disabled and cleared', 'Schedules');
      } else {
        showToast('info', 'Schedules have been enabled', 'Schedules');
      }
    });
  }
  
  // Tab functionality
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  if (tabs.length > 0 && tabContents.length > 0) {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs
        tabs.forEach(t => t.classList.remove('active'));
        
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Show corresponding tab content
        const tabId = tab.getAttribute('data-tab');
        tabContents.forEach(content => {
          content.classList.remove('active');
        });
        document.getElementById(tabId + 'Tab').classList.add('active');
      });
    });
  }
  
  // Template selects
  const weekdayTemplateSelect = document.getElementById('weekdayTemplate');
  const weekendTemplateSelect = document.getElementById('weekendTemplate');
  const weekdayTemplateDesc = document.getElementById('weekdayTemplateDesc');
  const weekendTemplateDesc = document.getElementById('weekendTemplateDesc');
  
  if (weekdayTemplateSelect && weekdayTemplateDesc) {
    weekdayTemplateSelect.addEventListener('change', () => {
      const templateKey = weekdayTemplateSelect.value;
      if (templateKey && templates[templateKey]) {
        const template = templates[templateKey];
        weekdayTemplateDesc.textContent = `${template.name}: ${template.description}`;
      } else {
        weekdayTemplateDesc.textContent = '';
      }
    });
  }
  
  if (weekendTemplateSelect && weekendTemplateDesc) {
    weekendTemplateSelect.addEventListener('change', () => {
      const templateKey = weekendTemplateSelect.value;
      if (templateKey && templates[templateKey]) {
        const template = templates[templateKey];
        weekendTemplateDesc.textContent = `${template.name}: ${template.description}`;
      } else {
        weekendTemplateDesc.textContent = '';
      }
    });
  }
  
  // Apply templates button
  const applyTemplatesBtn = document.getElementById('applyTemplates');
  if (applyTemplatesBtn) {
    applyTemplatesBtn.addEventListener('click', applyScheduleTemplates);
  }
  
  // Add/Update schedule button
  if (addScheduleBtn) {
    addScheduleBtn.addEventListener('click', handleScheduleAction);
  }
  
  // Cancel edit button
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', exitEditMode);
  }
  
  // Validate time format
  if (scheduleTimeInput) {
    scheduleTimeInput.addEventListener('input', validateScheduleTime);
    scheduleTimeInput.addEventListener('blur', validateScheduleTime);
  }
  
  // Validate temperature
  if (scheduleTemperatureInput) {
    scheduleTemperatureInput.addEventListener('input', validateTemperature);
    scheduleTemperatureInput.addEventListener('blur', validateTemperature);
  }
  
  // Update temperature validation when unit changes
  if (unitSelect) {
    unitSelect.addEventListener('change', updateTemperatureValidation);
  }
  
  // Refresh logs button
  const refreshLogsBtn = document.getElementById('refreshLogs');
  if (refreshLogsBtn) {
    refreshLogsBtn.addEventListener('click', fetchServerLogs);
  }
  
  // View logs button - create it dynamically if it doesn't exist
  addDebugButton();
  
  // Listen for plugin events from server
  homebridge.addEventListener('event', async (event) => {
    try {
      if (!event || !event.data) return;
      
      const data = event.data;
      
      if (data.event === 'config-updated') {
        // Reload config on update event
        await loadConfig();
      } else if (data.event === 'server-error') {
        // Auto-fetch logs when an error occurs
        fetchServerLogs();
        
        // Show a toast notification with more details
        const errorTime = data.time ? new Date(data.time).toLocaleString() : 'recent';
        
        showToast(
          'error', 
          `Server error at ${errorTime}: ${data.message || 'Unknown error'}. Check the logs section for details.`, 
          'Server Error'
        );
      }
    } catch (error) {
      console.error('Event handler error:', error);
      showToast('error', 'Error processing server event: ' + error.message, 'Event Error');
    }
  });
}
/**
 * Add a debug button to view logs
 * Creates and adds a button to view server logs
 */
function addDebugButton() {
  const configForm = document.getElementById('configForm');
  if (!configForm || document.getElementById('viewLogs')) return;
  
  const buttonGroup = configForm.querySelector('.button-group');
  if (buttonGroup) {
    const viewLogsBtn = document.createElement('button');
    viewLogsBtn.id = 'viewLogs';
    viewLogsBtn.type = 'button';
    viewLogsBtn.className = 'secondary';
    viewLogsBtn.textContent = 'View Logs';
    viewLogsBtn.style.marginRight = '5px';
    
    // Add event listener
    viewLogsBtn.addEventListener('click', () => {
      // Show loading indicator while fetching logs
      showToast('info', 'Fetching logs...', 'Logs');
      
      // Call fetchServerLogs with proper error handling
      fetchServerLogs().catch(error => {
        console.error('Logs fetch error:', error);
        showToast('error', `Error fetching logs: ${error.message}`, 'Logs Error');
      });
      
      // Scroll to logs container
      setTimeout(() => {
        const logsContainer = document.getElementById('logsContainer');
        if (logsContainer) {
          logsContainer.classList.remove('hidden');
          logsContainer.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    });
    
    // Insert at beginning of button group
    buttonGroup.insertBefore(viewLogsBtn, buttonGroup.firstChild);
  }
}