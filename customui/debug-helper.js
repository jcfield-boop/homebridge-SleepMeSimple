/**
 * Debug Helper for SleepMe Simple Custom UI
 * This script adds diagnostic tools to help troubleshoot UI loading issues
 */
(function() {
    // Add debug indicator to page
    function addDebugIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'sleepme-debug-indicator';
        indicator.style.position = 'fixed';
        indicator.style.bottom = '10px';
        indicator.style.right = '10px';
        indicator.style.backgroundColor = '#f8f9fa';
        indicator.style.border = '1px solid #dee2e6';
        indicator.style.borderRadius = '3px';
        indicator.style.padding = '5px 10px';
        indicator.style.fontSize = '12px';
        indicator.style.color = '#212529';
        indicator.style.zIndex = '9999';
        indicator.style.maxWidth = '400px';
        indicator.style.overflow = 'hidden';
        indicator.textContent = 'SleepMe Debug: Initializing...';
        
        document.body.appendChild(indicator);
        return indicator;
    }
    
    // Check if window is loaded in iframe
    function checkFrameContext() {
        try {
            return window !== window.parent;
        } catch (e) {
            // If we can't access parent, we're likely in a cross-origin iframe
            return true;
        }
    }
    
    // Check if Homebridge API is available
    function checkHomebridgeAPI() {
        return typeof window.homebridge !== 'undefined';
    }
    
    // Main diagnostic function
    function runDiagnostics() {
        const debugInfo = [];
        
        // Basic environment checks
        debugInfo.push(`Load time: ${new Date().toLocaleTimeString()}`);
        debugInfo.push(`In iframe: ${checkFrameContext()}`);
        debugInfo.push(`Homebridge API: ${checkHomebridgeAPI()}`);
        
        // Check script loading
        const allScripts = document.getElementsByTagName('script');
        debugInfo.push(`Scripts loaded: ${allScripts.length}`);
        
        // Check for possible CORS issues
        try {
            window.parent.postMessage({ type: 'test' }, '*');
            debugInfo.push('Parent communication: OK');
        } catch (e) {
            debugInfo.push(`Parent communication: ERROR - ${e.message}`);
        }
        
        return debugInfo.join(' | ');
    }
    
    // Initialize when DOM is ready
    function initialize() {
        console.log('SleepMe Debug Helper initialized');
        
        const debugIndicator = addDebugIndicator();
        
        // Update with initial diagnostics
        debugIndicator.textContent = runDiagnostics();
        
        // Update diagnostics periodically
        setInterval(() => {
            debugIndicator.textContent = runDiagnostics();
        }, 5000);
      // Listen for custom events for problem reporting
        window.addEventListener('sleepme-debug-report', (event) => {
            if (event.detail && event.detail.message) {
                debugIndicator.textContent = `REPORTED: ${event.detail.message}`;
                console.warn('SleepMe Debug Report:', event.detail);
            }
        });
        
        // Add click handler to show more detailed info
        debugIndicator.addEventListener('click', () => {
            // Toggle between short and detailed view
            if (debugIndicator.dataset.expanded === 'true') {
                debugIndicator.textContent = runDiagnostics();
                debugIndicator.dataset.expanded = 'false';
            } else {
                const detailedInfo = [
                    runDiagnostics(),
                    `User Agent: ${navigator.userAgent}`,
                    `Window Size: ${window.innerWidth}x${window.innerHeight}`,
                    `URL: ${window.location.href}`,
                    `Protocol: ${window.location.protocol}`,
                ];
                
                // Check for specific Homebridge info if available
                if (window.homebridge) {
                    try {
                        detailedInfo.push(`HB API Methods: ${Object.keys(window.homebridge).join(', ')}`);
                    } catch (e) {
                        detailedInfo.push(`HB API Error: ${e.message}`);
                    }
                }
                
                debugIndicator.textContent = detailedInfo.join('\n');
                debugIndicator.style.whiteSpace = 'pre-line';
                debugIndicator.dataset.expanded = 'true';
            }
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // Make diagnosis function available globally
    window.reportSleepMeDebugIssue = function(message) {
        window.dispatchEvent(new CustomEvent('sleepme-debug-report', { 
            detail: { message, timestamp: new Date().toISOString() } 
        }));
    };
})();
