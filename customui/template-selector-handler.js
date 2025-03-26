// Template selector handler script for Homebridge UI
(function() {
    // Wait for DOM content to be loaded and Homebridge UI to initialize
    window.addEventListener('load', function() {
        console.log("SleepMe template handler starting...");
        // Use a longer initial delay to ensure the UI is fully loaded
        setTimeout(detectAndInitialize, 2000);
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
    
    // Check if we're on the plugin config page with more robust detection
    function isOnPluginConfigPage() {
        // Look for elements that would exist on our plugin's config page
        const form = document.querySelector('form[name="form"]');
        if (!form) return false;
        
        // Look for our plugin identifier in various ways
        const pluginId = document.querySelector('[id*="SleepMeSimple"]');
        if (pluginId) return true;
        
        // Check for heading containing our plugin name
        const headings = document.querySelectorAll('h2, h3, h4');
        for (const heading of headings) {
            if (heading.textContent && heading.textContent.includes('SleepMe Simple')) {
                return true;
            }
        }
        
        // Check for inputs with our plugin name
        const inputs = document.querySelectorAll('input[type="text"]');
        for (const input of inputs) {
            if (input.value === 'SleepMe Simple') {
                return true;
            }
        }
        
        return false;
    }
    
    // Initialize our custom UI
    function initializeCustomUI() {
        console.log("Initializing SleepMe custom UI");
        // Find the schedules container in the Homebridge UI
        const scheduleSection = findScheduleSection();
        if (!scheduleSection) {
            console.log('Schedule section not found in Homebridge UI, retrying...');
            // Retry with a longer delay
            setTimeout(initializeCustomUI, 3000);
            return;
        }
        
        // Create our template selector UI
        insertTemplateSelectorUI(scheduleSection);
        
        // Set up message listener for the iframe
        window.addEventListener('message', handleIframeMessage);
    }
    
    // Find the schedule section in the Homebridge UI with more robust detection
    function findScheduleSection() {
        // Look for enable schedules checkbox first
        const enableSchedulesCheckbox = findElementByLabelText('Enable Schedules');
        if (enableSchedulesCheckbox) {
            console.log("Found Enable Schedules checkbox");
            // The schedule section would be near this checkbox
            let section = enableSchedulesCheckbox.closest('.form-group');
            if (section) {
                // Move up to find the container
                while (section && !section.querySelector('[formarrayname="schedules"]') && 
                       !section.querySelector('[ng-reflect-name="schedules"]')) {
                    section = section.parentElement;
                }
                
                if (section) {
                    // Find the schedules array
                    const scheduleArray = section.querySelector('[formarrayname="schedules"]') || 
                                         section.querySelector('[ng-reflect-name="schedules"]');
                    if (scheduleArray) return scheduleArray;
                    return section;
                }
            }
        }
        
        // Fallback approach - try direct selectors
        const schedulePaths = [
            'div[formgroupname="schedulesSection"]',
            'div[ng-reflect-name="schedulesSection"]',
            'div[ng-reflect-name*="schedule"]',
            // Look for any array with schedule-like items
            'div[formarrayname]',
            'div[ng-reflect-name]'
        ];
        
        // Try each selector path
        for (const path of schedulePaths) {
            const elements = document.querySelectorAll(path);
            for (const element of elements) {
                // Check if this looks like our schedule section
                if (element.innerHTML.includes('Schedule Type') || 
                    element.innerHTML.includes('Time') ||
                    element.innerHTML.includes('Target Temperature')) {
                    console.log("Found schedule section using selector:", path);
                    return element;
                }
            }
        }
        
        return null;
    }
    
    // Helper to find element by its label text
    function findElementByLabelText(text) {
        const labels = document.querySelectorAll('label');
        for (const label of labels) {
            if (label.textContent && label.textContent.trim() === text) {
                // If label has a for attribute, get the referenced element
                if (label.htmlFor) {
                    return document.getElementById(label.htmlFor);
                }
                // Otherwise look for input inside label
                return label.querySelector('input');
            }
        }
        return null;
    }
    
    // Insert the template selector UI before the schedule list
    function insertTemplateSelectorUI(scheduleSection) {
        // Create container
        const container = document.createElement('div');
        container.className = 'template-selector-container';
        container.style.marginBottom = '20px';
        container.style.border = '1px solid #ddd';
        container.style.padding = '10px';
        container.style.borderRadius = '4px';
        
        // Debug information to help troubleshoot
        console.log("Creating template UI container");
        console.log("Current URL:", window.location.href);
        
        // Create heading to verify container is inserted
        const heading = document.createElement('h4');
        heading.textContent = 'Sleep Schedule Templates';
        heading.style.marginTop = '0';
        container.appendChild(heading);
        
        // Create iframe with multiple path attempts
        const iframe = document.createElement('iframe');
        iframe.id = 'template-selector-frame';
        
        // Try different potential paths
        // The exact path can vary based on Homebridge's static asset serving
        const possiblePaths = [
            '/assets/custom-plugins/homebridge-sleepme-simple/template-selector.html',
            'template-selector.html',
            './template-selector.html',
            '../template-selector.html',
            '/homebridge-sleepme-simple/template-selector.html'
        ];
        
        iframe.src = possiblePaths[0]; // Start with first path
        iframe.style.width = '100%';
        iframe.style.height = '450px';
        iframe.style.border = 'none';
        iframe.style.overflow = 'hidden';
        
        // Handle iframe load errors by trying alternative paths
        let pathIndex = 0;
        iframe.onerror = function() {
            pathIndex++;
            if (pathIndex < possiblePaths.length) {
                console.log("Trying alternative path:", possiblePaths[pathIndex]);
                iframe.src = possiblePaths[pathIndex];
            } else {
                console.error("All paths failed to load template selector");
                // Display error message in container
                const errorMsg = document.createElement('p');
                errorMsg.textContent = 'Failed to load template selector. Please check console for errors.';
                errorMsg.style.color = 'red';
                container.appendChild(errorMsg);
            }
        };
        
        // Add iframe to container
        container.appendChild(iframe);
        
        // Insert container before the schedule list
        try {
            scheduleSection.parentNode.insertBefore(container, scheduleSection);
            console.log("Successfully inserted template container into DOM");
        } catch (error) {
            console.error("Error inserting template container:", error);
        }
        
        // Send existing schedules to iframe once it's loaded
        iframe.onload = function() {
            console.log("Template selector iframe loaded successfully from:", iframe.src);
            const existingSchedules = getExistingSchedules();
            try {
                iframe.contentWindow.postMessage({
                    action: 'init-template',
                    schedules: existingSchedules
                }, '*');
                console.log("Sent schedules to iframe:", existingSchedules.length);
            } catch (error) {
                console.error("Error sending data to iframe:", error);
            }
        };
    }
    
    // Handle messages from the iframe
    function handleIframeMessage(event) {
        // Verify message source and structure
        if (!event.data || typeof event.data !== 'object') return;
        
        console.log("Received message from iframe:", event.data.action);
        
        if (event.data.action === 'save-template') {
            // Extract schedules from message
            const schedules = event.data.schedules;
            if (!schedules || !Array.isArray(schedules)) {
                console.error("Invalid schedules data received");
                return;
            }
            
            // Apply the schedules to the Homebridge UI
            applySchedulesToUI(schedules);
        } else if (event.data.action === 'request-init-data') {
            // Respond with existing schedules
            const iframe = document.getElementById('template-selector-frame');
            if (iframe) {
                const existingSchedules = getExistingSchedules();
                iframe.contentWindow.postMessage({
                    action: 'init-template',
                    schedules: existingSchedules
                }, '*');
            }
        }
    }
    
    // Apply template schedules to the Homebridge UI form
    function applySchedulesToUI(schedules) {
        // Find the schedules container
        const scheduleSection = findScheduleSection();
        if (!scheduleSection) {
            console.error("Could not find schedule section to apply templates");
            return;
        }
        
        console.log("Applying schedules to UI:", schedules.length);
        
        // Clear existing schedules
        clearExistingSchedules(scheduleSection);
        
        // Add schedules from template
        schedules.forEach((schedule, index) => {
            // Click the add button to create a new schedule item
            const addButton = findAddButton(scheduleSection);
            if (addButton) {
                addButton.click();
                
                // Wait for DOM to update with progressive delay for each item
                setTimeout(() => {
                    // Fill in the new schedule
                    fillScheduleItem(scheduleSection, schedule);
                }, 100 * (index + 1));
            } else {
                console.error("Could not find Add button for schedules");
            }
        });
    }
    
    // Find the add button with more robust detection
    function findAddButton(scheduleSection) {
        // Check for a button with text like "Add" or "+" inside the section
        const buttons = scheduleSection.querySelectorAll('button');
        for (const button of buttons) {
            const buttonText = button.textContent.trim().toLowerCase();
            if (buttonText === 'add' || buttonText === '+' || buttonText === 'add item') {
                return button;
            }
        }
        
        // Look for button with add icon
        const iconButtons = scheduleSection.querySelectorAll('button[class*="add"], button[class*="plus"]');
        if (iconButtons.length > 0) return iconButtons[0];
        
        // Last resort - any button that's not a delete button
        const allButtons = scheduleSection.querySelectorAll('button');
        for (const button of allButtons) {
            if (!button.classList.contains('btn-danger') && 
                !button.classList.contains('delete') &&
                !button.innerHTML.includes('Delete') &&
                !button.innerHTML.includes('Remove')) {
                return button;
            }
        }
        
        return null;
    }
    
    // Clear all existing schedules
    function clearExistingSchedules(scheduleSection) {
        // Find all delete buttons
        const deleteButtons = scheduleSection.querySelectorAll('button.btn-danger, button[class*="delete"], button[class*="remove"]');
        
        console.log("Clearing existing schedules, found buttons:", deleteButtons.length);
        
        // Click each delete button with a small delay between
        deleteButtons.forEach((button, index) => {
            setTimeout(() => button.click(), 50 * index);
        });
    }
    
    // Fill in a schedule item with data
    function fillScheduleItem(scheduleSection, schedule) {
        // Get the last schedule item (the one we just added)
        const scheduleItems = scheduleSection.querySelectorAll('div[ng-reflect-form], div.form-group');
        if (!scheduleItems.length) {
            console.error("No schedule items found to fill");
            return;
        }
        
        // Use the last item
        const lastItem = scheduleItems[scheduleItems.length - 1];
        
        console.log("Filling schedule item:", schedule.type, schedule.time);
        
        // Try different selector strategies for inputs
        // Set schedule type
        const typeSelect = lastItem.querySelector('select[formcontrolname="type"]') || 
                          lastItem.querySelector('select[ng-reflect-name="type"]') ||
                          findSelectByLabel(lastItem, 'Schedule Type');
        if (typeSelect) {
            setSelectValue(typeSelect, schedule.type);
        } else {
            console.error("Could not find type select");
        }
        
        // Set time
        const timeInput = lastItem.querySelector('input[formcontrolname="time"]') ||
                         lastItem.querySelector('input[ng-reflect-name="time"]') ||
                         findInputByLabel(lastItem, 'Time');
        if (timeInput) {
            setInputValue(timeInput, schedule.time);
        } else {
            console.error("Could not find time input");
        }
        
        // Set temperature
        const tempInput = lastItem.querySelector('input[formcontrolname="temperature"]') ||
                         lastItem.querySelector('input[ng-reflect-name="temperature"]') ||
                         findInputByLabel(lastItem, 'Target Temperature');
        if (tempInput) {
            setInputValue(tempInput, schedule.temperature);
        } else {
            console.error("Could not find temperature input");
        }
        
        // Set day for Specific Day schedules
        if (schedule.type === 'Specific Day' && schedule.day) {
            setTimeout(() => {
                const daySelect = lastItem.querySelector('select[formcontrolname="day"]') ||
                                lastItem.querySelector('select[ng-reflect-name="day"]') ||
                                findSelectByLabel(lastItem, 'Day');
                if (daySelect) {
                    setSelectValue(daySelect, schedule.day);
                }
            }, 200); // Day field might appear after type change, so use longer delay
        }
    }
    // Helper to find select by label text
    function findSelectByLabel(container, labelText) {
        const labels = container.querySelectorAll('label');
        for (const label of labels) {
            if (label.textContent && label.textContent.includes(labelText)) {
                // If label has a for attribute, get the referenced element
                if (label.htmlFor) {
                    const element = document.getElementById(label.htmlFor);
                    if (element && element.tagName === 'SELECT') {
                        return element;
                    }
                }
                // Otherwise look for select inside or after label
                const select = label.querySelector('select') || 
                              label.nextElementSibling?.querySelector('select');
                if (select) return select;
            }
        }
        return null;
    }
    
    // Helper to find input by label text
    function findInputByLabel(container, labelText) {
        const labels = container.querySelectorAll('label');
        for (const label of labels) {
            if (label.textContent && label.textContent.includes(labelText)) {
                // If label has a for attribute, get the referenced element
                if (label.htmlFor) {
                    const element = document.getElementById(label.htmlFor);
                    if (element && element.tagName === 'INPUT') {
                        return element;
                    }
                }
                // Otherwise look for input inside or after label
                const input = label.querySelector('input') || 
                             label.nextElementSibling?.querySelector('input');
                if (input) return input;
            }
        }
        return null;
    }
    
    // Helper to set input value with proper event triggering
    function setInputValue(input, value) {
        input.value = value;
        // Trigger both input and change events to ensure Angular detects the change
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        // For Angular reactive forms
        if (typeof input.dispatchEvent === 'function') {
            try {
                const event = new CustomEvent('input', { detail: value, bubbles: true });
                input.dispatchEvent(event);
            } catch (error) {
                console.error("Error dispatching custom event:", error);
            }
        }
    }
    
    // Helper to set select value with proper event triggering
    function setSelectValue(select, value) {
        select.value = value;
        // Trigger change event to ensure Angular detects the change
        select.dispatchEvent(new Event('change', { bubbles: true }));
        
        // For Angular reactive forms, need to update options too
        for (const option of select.options) {
            if (option.value === value) {
                option.selected = true;
            } else {
                option.selected = false;
            }
        }
        
        // Additional Angular-specific event
        if (typeof select.dispatchEvent === 'function') {
            try {
                const event = new CustomEvent('select', { detail: value, bubbles: true });
                select.dispatchEvent(event);
            } catch (error) {
                console.error("Error dispatching custom event:", error);
            }
        }
    }
    
    // Get existing schedules from the UI
    function getExistingSchedules() {
        // Find the schedules container
        const scheduleSection = findScheduleSection();
        if (!scheduleSection) return [];
        
        // Find all schedule items using more robust selectors
        const scheduleItems = scheduleSection.querySelectorAll('div[ng-reflect-form], div.form-group');
        const schedules = [];
        
        // Process each item that looks like a schedule
        for (const item of scheduleItems) {
            // Skip if this doesn't look like a schedule item (needs type or time fields)
            if (!item.innerHTML.includes('Schedule Type') && 
                !item.innerHTML.includes('Time') &&
                !item.innerHTML.includes('Target Temperature')) {
                continue;
            }
            
            // Get values using multiple methods
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
        }
        
        console.log("Found existing schedules:", schedules.length);
        return schedules;
    }
    
    // Helper to get select value with multiple selector methods
    function getSelectValue(container, controlName) {
        // Try direct selectors
        const select = container.querySelector(`select[formcontrolname="${controlName}"]`) ||
                      container.querySelector(`select[ng-reflect-name="${controlName}"]`);
        
        if (select) return select.value;
        
        // Try finding by label
        const labelText = controlName.charAt(0).toUpperCase() + controlName.slice(1);
        const selectByLabel = findSelectByLabel(container, labelText);
        
        return selectByLabel ? selectByLabel.value : null;
    }
    
    // Helper to get input value with multiple selector methods
    function getInputValue(container, controlName) {
        // Try direct selectors
        const input = container.querySelector(`input[formcontrolname="${controlName}"]`) ||
                     container.querySelector(`input[ng-reflect-name="${controlName}"]`);
        
        if (input) return input.value;
        
        // Try finding by label
        const labelText = controlName.charAt(0).toUpperCase() + controlName.slice(1);
        const inputByLabel = findInputByLabel(container, labelText);
        
        return inputByLabel ? inputByLabel.value : null;
    }
})();
