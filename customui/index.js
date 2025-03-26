// Entry point for SleepMe Simple custom UI integration
(function() {
    // Report that our script is loading
    console.log('SleepMe Simple Custom UI: Loading started...');
    
    // Create a function to load the handler script
    function loadTemplateHandler() {
        try {
            // Try multiple possible paths for the script
            const possiblePaths = [
                '/assets/custom-plugins/homebridge-sleepme-simple/template-selector-handler.js',
                './template-selector-handler.js',
                '../template-selector-handler.js',
                'template-selector-handler.js'
            ];
            
            // Function to attempt loading the script
            function attemptScriptLoad(index) {
                if (index >= possiblePaths.length) {
                    console.error('SleepMe Simple Custom UI: Failed to load handler script from any path');
                    return;
                }
                
                const path = possiblePaths[index];
                console.log(`SleepMe Simple Custom UI: Attempting to load handler from ${path}`);
                
                const script = document.createElement('script');
                script.src = path;
                script.onerror = function() {
                    console.warn(`SleepMe Simple Custom UI: Failed to load from ${path}, trying next path...`);
                    // Try the next path
                    attemptScriptLoad(index + 1);
                };
                script.onload = function() {
                    console.log(`SleepMe Simple Custom UI: Successfully loaded handler from ${path}`);
                };
                document.head.appendChild(script);
            }
            
            // Start with the first path
            attemptScriptLoad(0);
        } catch (error) {
            console.error('SleepMe Simple Custom UI: Error loading handler script', error);
        }
    }
    
    // Function to check if we're on the Homebridge UI
    function isHomebridgeUI() {
        return window.location.href.includes('/homebridge') || 
               document.title.includes('Homebridge') ||
               !!document.querySelector('[class*="homebridge"]');
    }
    
    // Only execute our script if we're on the Homebridge UI
    if (isHomebridgeUI()) {
        // Give the page time to fully load
        setTimeout(loadTemplateHandler, 2000);
        
        // Add a simple indicator to show our script is active
        const indicator = document.createElement('div');
        indicator.id = 'sleepme-ui-indicator';
        indicator.style.display = 'none';
        document.body.appendChild(indicator);
        
        console.log('SleepMe Simple Custom UI: Init complete, handler will load shortly');
    } else {
        console.log('SleepMe Simple Custom UI: Not on Homebridge UI, script not loaded');
    }
})();
