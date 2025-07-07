/**
 * SleepMe Schedule Loader
 * Dedicated module to fix schedule persistence issues
 * Respects user intention when schedules are intentionally removed
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
      console.error('[ScheduleLoader] Invalid schedules data provided to storeSchedules');
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
   * Respects the current state of window.schedules if it exists
   */
  function ensureWindowSchedules() {
    // Skip restoration if window.schedules is intentionally set (even if empty)
    if (Array.isArray(window.schedules)) {
      // window.schedules exists - respect its current state
      return;
    }
    
    // Only restore if schedules have been loaded and window.schedules is undefined
    if (_schedulesLoaded && (!window.schedules || window.schedules.length === 0)) {
      console.log('[ScheduleLoader] Restoring schedules to window.schedules');
      window.schedules = getSchedules();
    }
  }
  
  // Setup a MutationObserver to watch for schedule rendering
  const observer = new MutationObserver(function(mutations) {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && 
          mutation.target.id === 'scheduleList' && 
          _schedulesLoaded) {
        
        // If schedule list is being modified and contains only "No schedules" text
        // but we have schedules, check window.schedules state first
        const scheduleList = document.getElementById('scheduleList');
        
        // Only attempt restoration if window.schedules isn't explicitly set
        if (scheduleList && 
            scheduleList.textContent.includes('No schedules') && 
            _scheduleData.length > 0 && 
            !Array.isArray(window.schedules)) {
          
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
  
  // Add integration with loadConfig - with fix for respecting current schedules state
  const originalLoadConfig = window.loadConfig;
  if (typeof originalLoadConfig === 'function') {
    window.loadConfig = async function() {
      try {
        // Store the current state of window.schedules before loading config
        const hadExistingSchedules = Array.isArray(window.schedules);
        
        const result = await originalLoadConfig.apply(this, arguments);
        
        // After config loads, check if schedules were loaded
        if (window.schedules && window.schedules.length > 0 && !hadExistingSchedules) {
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
  
  // Patch renderScheduleList to respect the current state of window.schedules
  const originalRenderScheduleList = window.renderScheduleList;
  if (typeof originalRenderScheduleList === 'function') {
    window.renderScheduleList = function() {
      // Call original function without modification - we'll respect the current
      // state of window.schedules without trying to restore it
      return originalRenderScheduleList.apply(this, arguments);
    };
    console.log('[ScheduleLoader] Patched renderScheduleList function');
  }
  
  // Expose the public API
  window.ScheduleLoader = {
    store: storeSchedules,
    get: getSchedules,
    hasLoaded: hasLoadedSchedules,
    ensureWindowSchedules: ensureWindowSchedules
  };
  
  console.log('[ScheduleLoader] Initialized with improved empty state handling');
})();