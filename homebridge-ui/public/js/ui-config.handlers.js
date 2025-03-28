/**
 * Load configuration from server
 * Uses the server /config endpoint to retrieve the current configuration
 */
async function loadConfig() {
    try {
      // Show loading indicator
      showLoading('Loading configuration...');
      
      // Get configuration from server
      let config = {};
      
      try {
        // Make request to server with timeout protection
        const response = await Promise.race([
          homebridge.request('/config'),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 10000)
          )
        ]);
        
        if (response && response.success && response.config) {
          config = response.config;
          showToast('success', 'Configuration loaded successfully', 'Configuration');
        } else {
          showToast('warning', 'Using default configuration (could not load saved values)', 'Configuration');
        }
      } catch (loadError) {
        showToast('error', 'Error loading configuration, using defaults', 'Configuration Error');
      }
      
      // Fill form with current values or defaults
      document.getElementById('apiToken').value = config.apiToken || '';
      document.getElementById('unit').value = config.unit || 'C';
      document.getElementById('pollingInterval').value = config.pollingInterval || 90;
      document.getElementById('logLevel').value = config.logLevel || 'normal';
      
      // Handle schedules
      const enableSchedules = !!config.enableSchedules;
      document.getElementById('enableSchedules').checked = enableSchedules;
      
      // Toggle visibility of schedules container
      const schedulesContainer = document.getElementById('schedulesContainer');
      if (schedulesContainer) {
        schedulesContainer.classList.toggle('hidden', !enableSchedules);
      }
      
      // Load schedules only if enabled
      if (enableSchedules && Array.isArray(config.schedules)) {
        // Create a fresh copy of schedules from the config to avoid reference issues
        schedules = JSON.parse(JSON.stringify(config.schedules));
      } else {
        // Clear schedules array if disabled or not present
        schedules = [];
      }
      
      // Render schedules in UI
      renderScheduleList();
      
      // Update temperature validation based on current unit
      updateTemperatureValidation();
      
    } catch (error) {
      showToast('error', 'Error loading configuration: ' + error.message, 'Configuration Error');
    } finally {
      // Always hide loading indicator
      hideLoading();
    }
  }
  
  /**
   * Save configuration to server
   * Uses the server /saveConfig endpoint to save the current configuration
   */
  async function saveConfig() {
    // Validate required fields
    const apiToken = document.getElementById('apiToken').value.trim();
    if (!apiToken) {
      showToast('error', 'API token is required', 'Validation Error');
      document.getElementById('apiToken').focus();
      return;
    }
    
    // Validate polling interval is within range
    const pollingInterval = parseInt(document.getElementById('pollingInterval').value, 10);
    if (isNaN(pollingInterval) || pollingInterval < 60 || pollingInterval > 300) {
      showToast('error', 'Polling interval must be between 60 and 300 seconds', 'Validation Error');
      document.getElementById('pollingInterval').focus();
      return;
    }
    
    // Disable form elements during save
    const formElements = document.getElementById('configForm').elements;
    for (let i = 0; i < formElements.length; i++) {
      formElements[i].disabled = true;
    }
    
    try {
      // Show saving indicator with spinner
      showLoading('Saving configuration...');
      
      // Build configuration object
      const config = {
        platform: "SleepMeSimple",
        name: 'SleepMe Simple',
        apiToken: apiToken,
        unit: document.getElementById('unit').value,
        pollingInterval: pollingInterval,
        logLevel: document.getElementById('logLevel').value,
        enableSchedules: document.getElementById('enableSchedules').checked
      };
      
      // Add schedules if enabled
      if (config.enableSchedules && schedules.length > 0) {
        // Create a deep copy of the schedules array to avoid reference issues
        config.schedules = JSON.parse(JSON.stringify(schedules));
      } else if (config.enableSchedules) {
        // If enabled but no schedules, include empty array
        config.schedules = [];
      }
      
      // Send to server with timeout protection
      const response = await Promise.race([
        homebridge.request('/saveConfig', { 
          method: 'POST',
          body: { config: config }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 15000)
        )
      ]);
      
      if (response && response.success) {
        showToast('success', 'Configuration saved successfully!', 'Save Complete');
      } else {
        showToast('error', 'Failed to save configuration: ' + (response?.error || 'Unknown error'), 'Save Failed');
      }
    } catch (error) {
      showToast('error', 'Error during save: ' + error.message, 'Save Error');
    } finally {
      // Re-enable form elements
      for (let i = 0; i < formElements.length; i++) {
        formElements[i].disabled = false;
      }
      // Ensure spinner is hidden
      hideLoading();
    }
  }
  
  /**
   * Test connection to the SleepMe API
   * Uses the server /device/test endpoint to test the API connection
   */
  async function testConnection() {
    const apiToken = document.getElementById('apiToken').value.trim();
    
    if (!apiToken) {
      showToast('error', 'API token is required', 'Validation Error');
      document.getElementById('apiToken').focus();
      return;
    }
    
    // Update button state and show status
    const testConnectionBtn = document.getElementById('testConnection');
    testConnectionBtn.disabled = true;
    testConnectionBtn.textContent = 'Testing...';
    showLoading('Testing connection to SleepMe API...');
    
    try {
      const response = await Promise.race([
        homebridge.request('/device/test', {
          method: 'POST',
          body: { apiToken }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 15000)
        )
      ]);
      
      if (response && response.success) {
        const deviceCount = response.devices || 0;
        let successMessage = `Connection successful! Found ${deviceCount} device${deviceCount !== 1 ? 's' : ''}.`;
        
        // Add device information if available
        if (response.deviceInfo && response.deviceInfo.length > 0) {
          successMessage += ' Devices found:';
          const deviceList = document.createElement('ul');
          deviceList.style.marginTop = '10px';
          
          response.deviceInfo.forEach(device => {
            const deviceItem = document.createElement('li');
            deviceItem.textContent = `${device.name} (${device.type})`;
            deviceList.appendChild(deviceItem);
          });
          
          // Create a custom toast with the device list
          const customToast = document.createElement('div');
          customToast.innerHTML = `<p>${successMessage}</p>`;
          customToast.appendChild(deviceList);
          
          showToast('success', customToast.innerHTML, 'Connection Test');
        } else {
          showToast('success', successMessage, 'Connection Test');
        }
      } else {
        showToast('error',
          response?.error || 'Connection failed for unknown reason', 
          'Connection Failed'
        );
      }
    } catch (error) {
      showToast('error', `Connection test failed: ${error.message}`, 'Connection Error');
    } finally {
      // Restore button state
      testConnectionBtn.disabled = false;
      testConnectionBtn.textContent = 'Test Connection';
      // Ensure spinner is hidden
      hideLoading();
    }
  }
  
  /**
   * Fetch logs from the server
   * Uses the server /logs endpoint to retrieve logs
   */
  async function fetchServerLogs() {
    try {
      const logsContent = document.getElementById('logsContent');
      if (!logsContent) return;
      
      // Show loading state
      logsContent.innerHTML = '<p>Loading logs...</p>';
      document.getElementById('logsContainer').classList.remove('hidden');
      
      const response = await homebridge.request('/logs');
      if (response && response.success && Array.isArray(response.logs)) {
        displayLogs(response.logs);
      } else {
        logsContent.innerHTML = `<p>Failed to retrieve logs: ${response?.error || 'Unknown error'}</p>`;
        showToast('error', 'Failed to retrieve logs', 'Logs Error');
      }
    } catch (error) {
      const logsContent = document.getElementById('logsContent');
      if (logsContent) {
        logsContent.innerHTML = `<p>Error fetching logs: ${error.message}</p>`;
      }
      showToast('error', `Error fetching logs: ${error.message}`, 'Logs Error');
    }
  }
  
  /**
   * Display logs in the UI
   * @param {Array} logs - Array of log objects
   */
  function displayLogs(logs) {
    const logsContent = document.getElementById('logsContent');
    if (!logsContent) return;
    
    // Clear previous logs
    logsContent.innerHTML = '';
    
    if (!logs || logs.length === 0) {
      logsContent.innerHTML = '<p>No logs available.</p>';
      return;
    }
    
    // Create log entries with enhanced styling based on level
    logs.forEach(log => {
      const logEntry = document.createElement('div');
      logEntry.className = `log-entry log-${log.level || 'info'}`;
      
      // Format timestamp
      let displayTimestamp;
      try {
        // Convert ISO timestamp to local date/time format
        const date = new Date(log.timestamp);
        displayTimestamp = isNaN(date.getTime()) ? 
          log.timestamp : 
          date.toLocaleString();
      } catch(e) {
        displayTimestamp = log.timestamp || 'Unknown time';
      }
      
      const timestamp = document.createElement('div');
      timestamp.className = 'log-timestamp';
      timestamp.textContent = displayTimestamp;
      logEntry.appendChild(timestamp);
      
      // Create context badge with color coding
      const context = document.createElement('span');
      context.className = 'log-context';
      
      // Color code by context
      if (log.context.includes('SleepMe')) {
        context.style.backgroundColor = '#0070c9';
        context.style.color = 'white';
      } else {
        context.style.backgroundColor = '#f8f9fa';
        context.style.color = '#333';
      }
      
      context.textContent = log.context;
      
      // Add level indicator if relevant
      if (log.level === 'error') {
        const level = document.createElement('span');
        level.style.backgroundColor = '#dc3545';
        level.style.color = 'white';
        level.style.padding = '1px 5px';
        level.style.borderRadius = '3px';
        level.style.fontSize = '11px';
        level.style.marginRight = '5px';
        level.textContent = 'ERROR';
        logEntry.appendChild(level);
      } else if (log.level === 'warn') {
        const level = document.createElement('span');
        level.style.backgroundColor = '#ffc107';
        level.style.color = 'black';
        level.style.padding = '1px 5px';
        level.style.borderRadius = '3px';
        level.style.fontSize = '11px';
        level.style.marginRight = '5px';
        level.textContent = 'WARN';
        logEntry.appendChild(level);
      }
      
      logEntry.appendChild(context);
      
      // Message content
      const message = document.createElement('div');
      message.className = 'log-message';
      message.textContent = log.message;
      logEntry.appendChild(message);
      
      // Add stack trace for errors if available
      if (log.stack) {
        const stack = document.createElement('pre');
        stack.className = 'log-stack';
        stack.textContent = log.stack;
        logEntry.appendChild(stack);
      }
      
      logsContent.appendChild(logEntry);
    });
    
    // Make logs container visible
    document.getElementById('logsContainer').classList.remove('hidden');
  }
  
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
    const scheduleTypeSelect = document.getElementById('scheduleType');
    const daySelectContainer = document.getElementById('daySelectContainer');
    const warmHugInfo = document.getElementById('warmHugInfo');
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
    const addScheduleBtn = document.getElementById('addSchedule');
    if (addScheduleBtn) {
      addScheduleBtn.addEventListener('click', handleScheduleAction);
    }
    
    // Cancel edit button
    const cancelEditBtn = document.getElementById('cancelEdit');
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', exitEditMode);
    }
    
    // Validate time format
    const scheduleTimeInput = document.getElementById('scheduleTime');
    if (scheduleTimeInput) {
      scheduleTimeInput.addEventListener('input', validateScheduleTime);
      scheduleTimeInput.addEventListener('blur', validateScheduleTime);
    }
    
    // Validate temperature
    const scheduleTemperatureInput = document.getElementById('scheduleTemperature');
    if (scheduleTemperatureInput) {
      scheduleTemperatureInput.addEventListener('input', validateTemperature);
      scheduleTemperatureInput.addEventListener('blur', validateTemperature);
    }
    
    // Update temperature validation when unit changes
    const unitSelect = document.getElementById('unit');
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
        showToast('error', 'Error processing server event: ' + error.message, 'Event Error');
      }
    });
  }