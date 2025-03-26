// This file serves as an entry point for our custom UI components
// Homebridge will automatically load this file when the plugin is loaded

// Load our template-selector handler
// Changed from import to require for compatibility
(function() {
    // Load handler script directly
    const script = document.createElement('script');
    script.src = '/assets/custom-plugins/homebridge-sleepme-simple/template-selector-handler.js';
    document.head.appendChild(script);
    
    console.log('SleepMe Simple Custom UI loaded');
})();
