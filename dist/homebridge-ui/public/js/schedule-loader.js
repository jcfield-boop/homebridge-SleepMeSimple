/**
 * SleepMe Schedule Loader
 * Dedicated module to fix schedule persistence issues
 */
(function() {
    // Private storage for schedule data that won't be affected by other code
    let _scheduleData = [];
    
    // Flag to track if schedules have been loaded
    let _schedulesLoaded = false;
    
    /**
     * Store schedules in our protected scope
     * @param {Array} schedules - Array of schedule objects
     */
    function storeSchedules(schedules) {
      if (!Array.isArray(schedules)) {
        console.error('Invalid schedules data provided to storeSchedules');
        return;
      }
      
      // Make a deep copy to prevent reference issues
      _scheduleData = JSON.parse(JSON.stringify(schedules));
      _schedulesLoaded = true;
      
      console.log(`[ScheduleLoader] Securely stored ${_scheduleData.length} schedules`);
      
      // Also update window.schedules for backward compatibility
      window.schedules = _scheduleData;
    }
    
    /**
     * Get stored schedules
     * @returns {Array} Deep copy of stored schedules
     */
    function getSchedules() {
      // Always return a fresh copy to prevent modification of our internal data
      return _scheduleData.length > 0 ? JSON.parse(JSON.stringify(_scheduleData)) : [];
    }
    
    /**
     * Check if schedules have been loaded
     * @returns {boolean} True if schedules have been loaded
     */
    function hasLoadedSchedules() {
      return _schedulesLoaded;
    }
    
    /**
     * Ensure schedules are available in window.schedules
     * To be called before any render operation
     */
    function ensureWindowSchedules() {
      if (_schedulesLoaded && (!window.schedules || window.schedules.length === 0)) {
        console.log('[ScheduleLoader] Restoring schedules to window.schedules');
        window.schedules = getSchedules();
      }
    }
    
    // Expose the public API
    window.ScheduleLoader = {
      store: storeSchedules,
      get: getSchedules,
      hasLoaded: hasLoadedSchedules,
      ensureWindowSchedules: ensureWindowSchedules
    };
    
    // Setup a MutationObserver to watch for schedule rendering
    const observer = new MutationObserver(function(mutations) {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && 
            mutation.target.id === 'scheduleList' && 
            _schedulesLoaded) {
          
          // If schedule list is being modified and contains only "No schedules" text
          // but we have schedules, force a re-render
          const scheduleList = document.getElementById('scheduleList');
          if (scheduleList && 
              scheduleList.textContent.includes('No schedules') && 
              _scheduleData.length > 0) {
            
            console.log('[ScheduleLoader] Detected empty schedule list, forcing re-render');
            ensureWindowSchedules();
            
            // Call renderScheduleList if available
            if (typeof window.renderScheduleList === 'function') {
              setTimeout(() => {
                window.renderScheduleList();
              }, 100);
            }
          }
        }
      }
    });
    
    // Start observing when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
      const scheduleList = document.getElementById('scheduleList');
      if (scheduleList) {
        observer.observe(scheduleList, { childList: true, subtree: true });
        console.log('[ScheduleLoader] Schedule list observer activated');
      }
    });
    
    // Add integration with loadConfig
    const originalLoadConfig = window.loadConfig;
    if (typeof originalLoadConfig === 'function') {
      window.loadConfig = async function() {
        try {
          const result = await originalLoadConfig.apply(this, arguments);
          
          // After config loads, check if schedules were loaded
          if (window.schedules && window.schedules.length > 0) {
            storeSchedules(window.schedules);
          }
          
          return result;
        } catch (error) {
          console.error('[ScheduleLoader] Error in loadConfig:', error);
          throw error;
        }
      };
      console.log('[ScheduleLoader] Integrated with loadConfig function');
    }
    
    // Patch renderScheduleList to ensure schedules are available
    const originalRenderScheduleList = window.renderScheduleList;
    if (typeof originalRenderScheduleList === 'function') {
      window.renderScheduleList = function() {
        // Ensure window.schedules is populated before rendering
        ensureWindowSchedules();
        
        // Call original function
        return originalRenderScheduleList.apply(this, arguments);
      };
      console.log('[ScheduleLoader] Patched renderScheduleList function');
    }
    
    console.log('[ScheduleLoader] Initialized');
  })();