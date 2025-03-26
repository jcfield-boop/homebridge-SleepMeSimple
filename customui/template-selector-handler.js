// Template selector handler script for Homebridge UI
(function() {
    // Wait for DOM content to be loaded and Homebridge UI to initialize
    window.addEventListener('load', function() {
        console.log("SleepMe template handler starting...");
        setTimeout(detectAndInitialize, 1000);
    });
    
    // Try to detect and initialize at regular intervals until successful
    function detectAndInitialize() {
        // Check if we're on the plugin config page
        if (isOnPluginConfigPage()) {
            console.log("Found SleepMe plugin config page");
            initializeCustomUI();
        } else {
            // Try again after a delay
            console.log("SleepMe plugin config page not found, waiting...");
            setTimeout(detectAndInitialize, 2000);
        }
    }
    
    // Check if we're on the plugin config page
    function isOnPluginConfigPage() {
        // Look for elements that would exist on our plugin's config page
        // More robust detection by checking for multiple indicators
        return document.querySelector('form[name="form"]') !== null && 
               (document.querySelector('div[id="SleepMeSimple"]') !== null ||
                document.querySelector('h2:contains("SleepMe Simple")') !== null ||
                document.querySelector('input[ng-reflect-name="name"][ng-reflect-model="SleepMe Simple"]') !== null);
    }
    
    // Initialize our custom UI
    function initializeCustomUI() {
        console.log("Initializing SleepMe custom UI");
        // Find the schedules container in the Homebridge UI
        const scheduleSection = findScheduleSection();
        if (!scheduleSection) {
            console.log('Schedule section not found in Homebridge UI, retrying...');
            setTimeout(initializeCustomUI, 2000);
            return;
        }
        
        // Create our template selector UI
        insertTemplateSelectorUI(scheduleSection);
        
        // Set up message listener for the iframe
        window.addEventListener('message', handleIframeMessage);
    }
    
    // Find the schedule section in the Homebridge UI
    function findScheduleSection() {
        // More robust selector strategy
        // Try multiple possible selectors
        let schedulesSection = document.querySelector('div[formgroupname="schedulesSection"]');
        
        if (!schedulesSection) {
            // Try alternative selectors
            schedulesSection = document.querySelector('div[ng-reflect-name="schedulesSection"]');
        }
        
        if (!schedulesSection) {
            // Try more generic approach - look for elements with 'schedules' in the name
            const possibleSections = document.querySelectorAll('div[ng-reflect-name*="schedule"]');
            if (possibleSections.length > 0) {
                schedulesSection = possibleSections[0];
            }
        }
        
        if (!schedulesSection) return null;
        
        // Find the schedules array form field
        let scheduleArray = schedulesSection.querySelector('div[formarrayname="schedules"]');
        
        if (!scheduleArray) {
            // Try alternative selector
            scheduleArray = schedulesSection.querySelector('div[ng-reflect-name="schedules"]');
        }
        
        return scheduleArray || schedulesSection;
    }
    
    // Insert the template selector UI before the schedule list
    function insertTemplateSelectorUI(scheduleSection) {
        // Create container
        const container = document.createElement('div');
        container.className = 'template-selector-container';
        container.style.marginBottom = '20px';
        
        // Debug message to verify path
        console.log("Creating iframe with template selector");
        
        // Create iframe for template selector
        // Use absolute path to ensure correct loading
        const iframe = document.createElement('iframe');
        iframe.src = '/assets/custom-plugins/homebridge-sleepme-simple/template-selector.html';
        iframe.style.width = '100%';
        iframe.style.height = '450px';
        iframe.style.border = 'none';
        iframe.style.overflow = 'hidden';
        iframe.id = 'template-selector-frame';
        
        // Add iframe to container
        container.appendChild(iframe);
        
        // Insert container before the schedule list
        scheduleSection.parentNode.insertBefore(container, scheduleSection);
        
        // Send existing schedules to iframe once it's loaded
        iframe.onload = function() {
            console.log("Template selector iframe loaded");
            const existingSchedules = getExistingSchedules();
            iframe.contentWindow.postMessage({
                action: 'init-template',
                schedules: existingSchedules
            }, '*');
        };
    }
    
    // Rest of the code remains the same...
    // (Handle messages, apply schedules, etc.)
    
    // Handle messages from the iframe
    function handleIframeMessage(event) {
        // Verify message source and structure
        if (!event.data || event.data.action !== 'save-template') return;
        
        console.log("Received message from template iframe:", event.data.action);
        
        // Extract schedules from message
        const schedules = event.data.schedules;
        if (!schedules || !Array.isArray(schedules)) return;
        
        // Apply the schedules to the Homebridge UI
        applySchedulesToUI(schedules);
    }
    
    // Apply template schedules to the Homebridge UI form
    function applySchedulesToUI(schedules) {
        // Find the schedules container
        const scheduleSection = findScheduleSection();
        if (!scheduleSection) return;
        
        console.log("Applying schedules to UI:", schedules.length);
        
        // Clear existing schedules
        clearExistingSchedules(scheduleSection);
        
        // Add schedules from template
        schedules.forEach((schedule, index) => {
            // Click the add button to create a new schedule item
            const addButton = scheduleSection.querySelector('button[type="button"]');
            if (addButton) {
                addButton.click();
                
                // Wait for DOM to update with progressive delay for each item
                setTimeout(() => {
                    // Fill in the new schedule
                    fillScheduleItem(scheduleSection, schedule);
                }, 100 * (index + 1));
            }
        });
    }
    
    // Clear all existing schedules
    function clearExistingSchedules(scheduleSection) {
        // Find all delete buttons
        const deleteButtons = scheduleSection.querySelectorAll('button.btn-danger');
        
        console.log("Clearing existing schedules, found buttons:", deleteButtons.length);
        
        // Click each delete button with a small delay between
        deleteButtons.forEach((button, index) => {
            setTimeout(() => button.click(), 50 * index);
        });
    }
    
    // Fill in a schedule item with data
    function fillScheduleItem(scheduleSection, schedule) {
        // Get the last schedule item (the one we just added)
        const scheduleItems = scheduleSection.querySelectorAll('div[ng-reflect-form]');
        if (!scheduleItems.length) return;
        
        const lastItem = scheduleItems[scheduleItems.length - 1];
        
        console.log("Filling schedule item:", schedule.type, schedule.time);
        
        // Set schedule type
        const typeSelect = lastItem.querySelector('select[formcontrolname="type"]');
        if (typeSelect) {
            typeSelect.value = schedule.type;
            typeSelect.dispatchEvent(new Event('change'));
        }
        
        // Set time
        const timeInput = lastItem.querySelector('input[formcontrolname="time"]');
        if (timeInput) {
            timeInput.value = schedule.time;
            timeInput.dispatchEvent(new Event('input'));
            timeInput.dispatchEvent(new Event('change'));
        }
        
        // Set temperature
        const tempInput = lastItem.querySelector('input[formcontrolname="temperature"]');
        if (tempInput) {
            tempInput.value = schedule.temperature;
            tempInput.dispatchEvent(new Event('input'));
            tempInput.dispatchEvent(new Event('change'));
        }
        
        // Set day for Specific Day schedules
        if (schedule.type === 'Specific Day' && schedule.day) {
            setTimeout(() => {
                const daySelect = lastItem.querySelector('select[formcontrolname="day"]');
                if (daySelect) {
                    daySelect.value = schedule.day;
                    daySelect.dispatchEvent(new Event('change'));
                }
            }, 100); // Day field might appear after type change, so delay
        }
    }
   // Get existing schedules from the UI
    function getExistingSchedules() {
        // Find the schedules container
        const scheduleSection = findScheduleSection();
        if (!scheduleSection) return [];
        
        // Find all schedule items
        const scheduleItems = scheduleSection.querySelectorAll('div[ng-reflect-form]');
        if (!scheduleItems.length) return [];
        
        console.log("Reading existing schedules, found items:", scheduleItems.length);
        
        // Extract data from each schedule item
        const schedules = [];
        scheduleItems.forEach(item => {
            const type = getSelectValue(item, 'type');
            const time = getInputValue(item, 'time');
            const temperature = getInputValue(item, 'temperature');
            
            if (type && time && temperature) {
                const schedule = {
                    type,
                    time,
                    temperature: parseFloat(temperature)
                };
                
                // Add day if specific day
                if (type === 'Specific Day') {
                    const day = getSelectValue(item, 'day');
                    if (day) schedule.day = day;
                }
                
                schedules.push(schedule);
            }
        });
        
        console.log("Found existing schedules:", schedules.length);
        return schedules;
    }
    
    // Helper to get select value
    function getSelectValue(container, controlName) {
        const select = container.querySelector(`select[formcontrolname="${controlName}"]`);
        if (!select) {
            // Try alternative selector
            const altSelect = container.querySelector(`select[ng-reflect-name="${controlName}"]`);
            return altSelect ? altSelect.value : null;
        }
        return select ? select.value : null;
    }
    
    // Helper to get input value
    function getInputValue(container, controlName) {
        const input = container.querySelector(`input[formcontrolname="${controlName}"]`);
        if (!input) {
            // Try alternative selector
            const altInput = container.querySelector(`input[ng-reflect-name="${controlName}"]`);
            return altInput ? altInput.value : null;
        }
        return input ? input.value : null;
    }
})();
