/**
 * SleepMe Simple Notification Manager
 * Centralizes all user notifications with intelligent filtering
 */
const NotificationManager = (function() {
    // Private state
    const state = {
      statusElement: null,
      activeTimeout: null,
      // Messages that should never show as toast
      toastBlacklist: [
        'Fetching server logs',
        'Error: Logs not found',
        'Config check',
        'Initializing',
        'Ready',
        'Server logs'
      ],
      // Critical messages that should always show as toast
      toastWhitelist: [
        'Configuration saved successfully',
        'API token is required',
        'Connection successful'
      ]
    };
    
    /**
     * Initialize the notification manager
     * @returns {void}
     */
    function init() {
      state.statusElement = document.getElementById('status');
      
      // Override homebridge toast methods if available
      if (typeof homebridge !== 'undefined' && homebridge.toast) {
        const toastTypes = ['success', 'error', 'warning', 'info'];
        toastTypes.forEach(type => {
          if (typeof homebridge.toast[type] === 'function') {
            const originalToast = homebridge.toast[type];
            homebridge.toast[type] = function(message, title) {
              // Process through our notification manager
              show(type, message, title);
            };
          }
        });
      }
      
      console.log('NotificationManager initialized');
    }
    
    /**
     * Show a notification
     * @param {string} type - Notification type: 'success', 'error', 'warning', 'info'
     * @param {string} message - Notification message
     * @param {string} title - Optional title
     * @param {Object} options - Additional options
     * @returns {void}
     */
    function show(type, message, title = '', options = {}) {
      // Always log to console
      const logPrefix = title ? `${title}: ` : '';
      if (type === 'error') {
        console.error(`${logPrefix}${message}`);
      } else if (type === 'warning') {
        console.warn(`${logPrefix}${message}`);
      } else {
        console.log(`${logPrefix}${message}`);
      }
      
      // Update status element if available
      if (state.statusElement) {
        // Clear any existing timeout
        if (state.activeTimeout) {
          clearTimeout(state.activeTimeout);
        }
        
        // Update status message
        state.statusElement.textContent = `${title ? title + ': ' : ''}${message}`;
        state.statusElement.className = `status ${type}`;
        state.statusElement.classList.remove('hidden');
        
        // Auto-hide for success messages
        if (type === 'success' || options.autoHide) {
          state.activeTimeout = setTimeout(() => {
            state.statusElement.classList.add('hidden');
          }, options.hideDelay || 3000);
        }
      }
      
      // Determine if this should show as a toast notification
      let shouldShowToast = false;
      
      // Allowlist takes precedence
      if (state.toastWhitelist.some(pattern => 
        message.includes(pattern) || (title && title.includes(pattern))
      )) {
        shouldShowToast = true;
      }
      // Then check blocklist
      else if (state.toastBlacklist.some(pattern => 
        message.includes(pattern) || (title && title.includes(pattern))
      )) {
        shouldShowToast = false;
      }
      // Default behavior - only show errors as toast
      else {
        shouldShowToast = (type === 'error' && !options.statusOnly);
      }
      
      // Show toast if determined and available
      if (shouldShowToast && homebridge.toast && typeof homebridge.toast[type] === 'function') {
        // Use a direct method to avoid recursion
        try {
          // Get the original method to avoid our override
          const originalMethod = Object.getPrototypeOf(homebridge.toast)[type] || 
                                 homebridge.toast.__proto__[type];
          if (typeof originalMethod === 'function') {
            originalMethod.call(homebridge.toast, message, title);
          }
        } catch (error) {
          console.error('Error showing toast:', error);
        }
      }
    }
    
    // Public API
    return {
      init,
      show,
      // Convenience methods
      success: (message, title, options) => show('success', message, title, options),
      error: (message, title, options) => show('error', message, title, options),
      warning: (message, title, options) => show('warning', message, title, options),
      info: (message, title, options) => show('info', message, title, options)
    };
  })();
  
  // Export for use in other modules
  window.NotificationManager = NotificationManager;