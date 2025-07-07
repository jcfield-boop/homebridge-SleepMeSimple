// Fix for homebridge methods not being available
(function() {
    // Create a safety wrapper around homebridge methods
    window.safeGetPluginConfig = async function() {
      console.log('Safe getPluginConfig called');
      
      // Wait for up to 5 seconds for homebridge to be ready
      for (let i = 0; i < 50; i++) {
        if (typeof homebridge !== 'undefined' && 
            typeof homebridge.getPluginConfig === 'function') {
          console.log('Homebridge API ready, calling getPluginConfig');
          return await homebridge.getPluginConfig();
        }
        console.log('Waiting for homebridge API... attempt ' + (i+1));
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.error('Homebridge API not available after timeout');
      return [];
    };
    
    window.safeSavePluginConfig = async function() {
      if (typeof homebridge !== 'undefined' && 
          typeof homebridge.savePluginConfig === 'function') {
        return await homebridge.savePluginConfig();
      }
      console.error('savePluginConfig not available');
      return false;
    };
    
    window.safeUpdatePluginConfig = async function(config) {
      if (typeof homebridge !== 'undefined' && 
          typeof homebridge.updatePluginConfig === 'function') {
        return await homebridge.updatePluginConfig(config);
      }
      console.error('updatePluginConfig not available');
      return false;
    };
    
    // Fix for notification-manager.js
    window.safeToast = function(type, message, title) {
      console.log(`[Toast] ${type}: ${title || ''} - ${message}`);
      if (typeof homebridge !== 'undefined' && 
          homebridge.toast && 
          typeof homebridge.toast[type] === 'function') {
        homebridge.toast[type](message, title);
      }
      
      // Also update status element if available
      const status = document.getElementById('status');
      if (status) {
        status.textContent = `${title ? title + ': ' : ''}${message}`;
        status.className = `status ${type}`;
        status.classList.remove('hidden');
      }
    };
  })();