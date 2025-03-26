// Entry point for SleepMe Simple custom UI integration
(function() {
    // Report that our script is loading
    console.log('SleepMe Simple Custom UI: Loading started...');
    
    // Add a debug element to verify script loading
    const debugElement = document.createElement('div');
    debugElement.id = 'sleepme-ui-debug';
    debugElement.style.position = 'fixed';
    debugElement.style.bottom = '10px';
    debugElement.style.right = '10px';
    debugElement.style.padding = '5px';
    debugElement.style.background = 'rgba(0,0,0,0.1)';
    debugElement.style.borderRadius = '5px';
    debugElement.style.fontSize = '12px';
    debugElement.style.zIndex = 10000;
    debugElement.style.display = 'none'; // Initially hidden
    debugElement.textContent = 'SleepMe UI Ready: ' + new Date().toISOString();
    document.body.appendChild(debugElement);
    
    // Function to check if we're on the Homebridge UI
    function isHomebridgeUI() {
        return window.location.href.includes('/homebridge') || 
               document.title.includes('Homebridge') ||
               !!document.querySelector('[class*="homebridge"]');
    }
    
    // Function to load template handler directly
    function loadTemplateHandler() {
        console.log('SleepMe Simple Custom UI: Loading template handler directly');
        
        // Include the handler code directly rather than trying to load from external file
        // This is the simplest way to ensure it loads correctly
        const script = document.createElement('script');
        script.textContent = `
            // Template selector handler script for Homebridge UI
            (function() {
                console.log("SleepMe inline handler starting...");
                
                // Wait for DOM content to be loaded
                document.addEventListener('DOMContentLoaded', function() {
                    console.log("SleepMe DOM loaded, starting initialization...");
                    setTimeout(detectAndInitialize, 2000);
                });
                
                // Also try at window load as a fallback
                window.addEventListener('load', function() {
                    console.log("SleepMe window loaded, starting initialization...");
                    setTimeout(detectAndInitialize, 2000);
                });
                
                // Try to detect and initialize at regular intervals until successful
                function detectAndInitialize() {
                    console.log("SleepMe attempting to detect and initialize...");
                    
                    // Toggle debug visibility for troubleshooting
                    const debug = document.getElementById('sleepme-ui-debug');
                    if (debug) {
                        debug.style.display = 'block';
                        debug.textContent = 'Detecting plugin page: ' + new Date().toISOString();
                    }
                    
                    // Check if we're on the plugin config page
                    if (isOnPluginConfigPage()) {
                        console.log("Found SleepMe plugin config page");
                        if (debug) debug.textContent = 'Found plugin page! ' + new Date().toISOString();
                        initializeCustomUI();
                    } else {
                        // Try again after a delay
                        console.log("SleepMe plugin config page not found, waiting...");
                        if (debug) debug.textContent = 'Not found, retrying: ' + new Date().toISOString();
                        setTimeout(detectAndInitialize, 2000);
                    }
                }
                
                // Check if we're on the plugin config page with more robust detection
                function isOnPluginConfigPage() {
                    // Update the debug element
                    const debug = document.getElementById('sleepme-ui-debug');
                    
                    // Look for elements that would exist on our plugin's config page
                    const form = document.querySelector('form');
                    if (!form) {
                        if (debug) debug.textContent += '\\nNo form found';
                        return false;
                    }
                    
                    // Check for heading containing our plugin name
                    const headings = document.querySelectorAll('h2, h3, h4');
                    for (const heading of headings) {
                        if (heading.textContent && heading.textContent.includes('SleepMe')) {
                            if (debug) debug.textContent += '\\nFound heading: ' + heading.textContent;
                            return true;
                        }
                    }
                    
                    // Check for our platform name in form fields
                    const inputs = document.querySelectorAll('input');
                    for (const input of inputs) {
                        if (input.value === 'SleepMe Simple') {
                            if (debug) debug.textContent += '\\nFound input with SleepMe value';
                            return true;
                        }
                    }
                    
                    // Check for enableSchedules checkbox which is unique to our plugin
                    const enableSchedulesCheckbox = findElementByLabelText('Enable Schedules');
                    if (enableSchedulesCheckbox) {
                        if (debug) debug.textContent += '\\nFound Enable Schedules checkbox';
                        return true;
                    }
                    
                    return false;
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
                
                // Initialize our custom UI
                function initializeCustomUI() {
                    console.log("Initializing SleepMe custom UI");
                    // Update debug
                    const debug = document.getElementById('sleepme-ui-debug');
                    if (debug) debug.textContent = 'Initializing UI: ' + new Date().toISOString();
                    
                    // Check if the Enable Schedules checkbox is checked
                    const enableSchedulesCheckbox = findElementByLabelText('Enable Schedules');
                    if (!enableSchedulesCheckbox || !enableSchedulesCheckbox.checked) {
                        console.log('Schedules not enabled, skipping template UI');
                        if (debug) debug.textContent += '\\nSchedules not enabled';
                        return;
                    }
                    
                    // Find the schedules section
                    const scheduleSection = findScheduleSection();
                    if (!scheduleSection) {
                        console.log('Schedule section not found, retrying...');
                        if (debug) debug.textContent += '\\nSchedule section not found';
                        setTimeout(initializeCustomUI, 2000);
                        return;
                    }
                    
                    if (debug) debug.textContent += '\\nFound schedule section';
                    
                    // Create template UI
                    insertTemplateSelectorUI(scheduleSection);
                }
                
                // Find the schedule section
                function findScheduleSection() {
                    // First try with schedules heading
                    const scheduleHeadings = Array.from(document.querySelectorAll('h3, h4'))
                        .filter(h => h.textContent && h.textContent.includes('Schedule'));
                    
                    if (scheduleHeadings.length > 0) {
                        // Find the closest array-like container
                        let section = scheduleHeadings[0].closest('div[class*="array"]');
                        if (section) return section;
                        
                        // Try parent container if array not found
                        section = scheduleHeadings[0].closest('div[class*="form"]');
                        if (section) return section;
                    }
                    
                    // Next look for array sections that have schedule fields
                    const formSections = document.querySelectorAll('div[class*="array"], div[class*="form-array"]');
                    for (const section of formSections) {
                        if (section.innerHTML.includes('Schedule Type') || 
                            section.innerHTML.includes('Time')) {
                            return section;
                        }
                    }
                    
                    return null;
                }
                
                // Insert template selector UI
                function insertTemplateSelectorUI(scheduleSection) {
                    console.log("Creating template UI");
                    
                    // Create container
                    const container = document.createElement('div');
                    container.className = 'sleepme-template-container';
                    container.style.marginBottom = '20px';
                    container.style.border = '1px solid #ddd';
                    container.style.padding = '15px';
                    container.style.borderRadius = '4px';
                    
                    // Create heading
                    const heading = document.createElement('h4');
                    heading.textContent = 'Sleep Schedule Templates';
                    heading.style.marginTop = '0';
                    container.appendChild(heading);
                    
                    // Create description
                    const description = document.createElement('p');
                    description.textContent = 'Choose from our pre-defined sleep templates designed for optimal sleep. Click a template to apply it.';
                    container.appendChild(description);
                  // Create template cards
                    const templateContainer = document.createElement('div');
                    templateContainer.style.display = 'flex';
                    templateContainer.style.flexWrap = 'wrap';
                    templateContainer.style.gap = '15px';
                    templateContainer.style.marginTop = '15px';
                    
                    // Create optimal template card
                    const template1 = createTemplateCard(
                        'Optimal Sleep',
                        'For complete sleep cycles with enhanced REM patterns',
                        [
                            { time: '22:00', temp: '21°C' },
                            { time: '23:00', temp: '19°C' },
                            { time: '02:00', temp: '23°C' },
                            { time: '06:00', temp: '24°C' }
                        ]
                    );
                    
                    // Create night owl template card
                    const template2 = createTemplateCard(
                        'Night Owl',
                        'Later bedtime with extended morning warming',
                        [
                            { time: '23:30', temp: '21°C' },
                            { time: '00:30', temp: '19°C' },
                            { time: '03:30', temp: '23°C' },
                            { time: '07:30', temp: '24°C' }
                        ]
                    );
                    
                    // Add event listeners to template cards
                    template1.addEventListener('click', () => applyTemplate('optimal'));
                    template2.addEventListener('click', () => applyTemplate('nightowl'));
                    
                    // Add cards to container
                    templateContainer.appendChild(template1);
                    templateContainer.appendChild(template2);
                    container.appendChild(templateContainer);
                    
                    // Insert container before schedule section
                    if (scheduleSection.parentNode) {
                        scheduleSection.parentNode.insertBefore(container, scheduleSection);
                        console.log("Template UI added successfully");
                        
                        // Update debug
                        const debug = document.getElementById('sleepme-ui-debug');
                        if (debug) debug.textContent += '\\nTemplate UI added!';
                    }
                }
                
                // Helper to create a template card
                function createTemplateCard(title, description, schedules) {
                    const card = document.createElement('div');
                    card.style.border = '1px solid #ddd';
                    card.style.borderRadius = '8px';
                    card.style.padding = '15px';
                    card.style.width = '220px';
                    card.style.cursor = 'pointer';
                    card.style.transition = 'all 0.2s ease';
                    
                    // Hover effect
                    card.addEventListener('mouseover', () => {
                        card.style.borderColor = '#007bff';
                        card.style.boxShadow = '0 0 10px rgba(0,123,255,0.2)';
                    });
                    
                    card.addEventListener('mouseout', () => {
                        card.style.borderColor = '#ddd';
                        card.style.boxShadow = 'none';
                    });
                    
                    // Title
                    const titleElem = document.createElement('h5');
                    titleElem.textContent = title;
                    titleElem.style.margin = '0 0 10px 0';
                    card.appendChild(titleElem);
                    
                    // Description
                    const descElem = document.createElement('p');
                    descElem.textContent = description;
                    descElem.style.fontSize = '14px';
                    descElem.style.color = '#666';
                    descElem.style.margin = '0 0 10px 0';
                    card.appendChild(descElem);
                    
                    // Schedule preview
                    const previewDiv = document.createElement('div');
                    previewDiv.style.borderTop = '1px solid #eee';
                    previewDiv.style.paddingTop = '10px';
                    
                    schedules.forEach(schedule => {
                        const item = document.createElement('div');
                        item.style.display = 'flex';
                        item.style.justifyContent = 'space-between';
                        item.style.marginBottom = '5px';
                        item.style.fontSize = '13px';
                        
                        const timeSpan = document.createElement('span');
                        timeSpan.textContent = schedule.time;
                        timeSpan.style.color = '#007bff';
                        
                        const tempSpan = document.createElement('span');
                        tempSpan.textContent = schedule.temp;
                        tempSpan.style.fontWeight = 'bold';
                        
                        item.appendChild(timeSpan);
                        item.appendChild(tempSpan);
                        previewDiv.appendChild(item);
                    });
                    
                    card.appendChild(previewDiv);
                    return card;
                }
                
                // Apply a template
                function applyTemplate(templateId) {
                    console.log(`Applying template: ${templateId}`);
                    
                    // Template definitions
                    const templates = {
                        'optimal': [
                            { type: 'Weekdays', time: '22:00', temperature: 21 },
                            { type: 'Weekdays', time: '23:00', temperature: 19 },
                            { type: 'Weekdays', time: '02:00', temperature: 23 },
                            { type: 'Weekdays', time: '06:00', temperature: 24 },
                            { type: 'Weekend', time: '23:00', temperature: 21 },
                            { type: 'Weekend', time: '00:00', temperature: 19 },
                            { type: 'Weekend', time: '03:00', temperature: 23 },
                            { type: 'Weekend', time: '08:00', temperature: 24 }
                        ],
                        'nightowl': [
                            { type: 'Weekdays', time: '23:30', temperature: 21 },
                            { type: 'Weekdays', time: '00:30', temperature: 19 },
                            { type: 'Weekdays', time: '03:30', temperature: 23 },
                            { type: 'Weekdays', time: '07:30', temperature: 24 },
                            { type: 'Weekend', time: '00:30', temperature: 21 },
                            { type: 'Weekend', time: '01:30', temperature: 19 },
                            { type: 'Weekend', time: '04:30', temperature: 23 },
                            { type: 'Weekend', time: '09:00', temperature: 24 }
                        ]
                    };
                    
                    // Get template schedule
                    const schedules = templates[templateId];
                    if (!schedules) {
                        console.error(`Template not found: ${templateId}`);
                        return;
                    }
                    
                    // Apply to UI
                    applySchedulesToUI(schedules);
                }
                
                // Apply schedules to UI
                function applySchedulesToUI(schedules) {
                    // Find schedule section again to ensure it's current
                    const scheduleSection = findScheduleSection();
                    if (!scheduleSection) {
                        console.error("Could not find schedule section");
                        return;
                    }
                    
                    // Clear existing schedules
                    clearExistingSchedules(scheduleSection);
                    
                    // Add new schedules
                    console.log(`Adding ${schedules.length} schedules`);
                    
                    // Find add button
                    const addButton = findAddButton(scheduleSection);
                    if (!addButton) {
                        console.error("Could not find add button");
                        return;
                    }
                    
                    // Click add button for each schedule
                    schedules.forEach((schedule, index) => {
                        setTimeout(() => {
                            // Click add button
                            addButton.click();
                            
                            // Wait for DOM update
                            setTimeout(() => {
                                fillNewSchedule(scheduleSection, schedule, index);
                            }, 200);
                        }, 300 * index); // Stagger additions
                    });
                }
                
                // Find add button
                function findAddButton(container) {
                    // Try common button patterns
                    const addButtons = Array.from(container.querySelectorAll('button'))
                        .filter(button => {
                            const text = button.textContent.toLowerCase().trim();
                            return text === 'add' || text.includes('add') || 
                                   text === '+' || button.innerHTML.includes('plus') ||
                                   button.classList.contains('add');
                        });
                    
                    if (addButtons.length > 0) return addButtons[0];
                    
                    // Try to find button with plus icon
                    const iconButtons = container.querySelectorAll('button i[class*="plus"], button svg');
                    if (iconButtons.length > 0) return iconButtons[0].closest('button');
                    
                    return null;
                }
                
                // Clear existing schedules
                function clearExistingSchedules(container) {
                    // Find all delete/remove buttons
                    const deleteButtons = Array.from(container.querySelectorAll('button'))
                        .filter(button => {
                            const text = button.textContent.toLowerCase().trim();
                            return text === 'delete' || text.includes('delete') ||
                                   text === 'remove' || text.includes('remove') ||
                                   text === '×' || text === 'x' ||
                                   button.classList.contains('delete') ||
                                   button.classList.contains('remove');
                        });
                    
                    console.log(`Found ${deleteButtons.length} delete buttons`);
                    
                    // Click each delete button
                    deleteButtons.forEach((button, index) => {
                        setTimeout(() => {
                            button.click();
                        }, 100 * index);
                    });
                }
                
                // Fill a new schedule
                function fillNewSchedule(container, schedule, index) {
                    // Get the newly added schedule item (should be the last one)
                    const scheduleItems = container.querySelectorAll('div[class*="form-group"]');
                    const newItem = scheduleItems[scheduleItems.length - 1];
                    
                    if (!newItem) {
                        console.error("Could not find new schedule item");
                        return;
                    }
                    
                    console.log(`Filling schedule ${index}: ${schedule.type} at ${schedule.time}`);
                    
                    // Find and set type select
                    setSelectByLabel(newItem, 'Type', schedule.type);
                    
                    // Wait for any conditional fields
                    setTimeout(() => {
                        // Set time
                        setInputByLabel(newItem, 'Time', schedule.time);
                        
                        // Set temperature
                        setInputByLabel(newItem, 'Temperature', schedule.temperature);
                    }, 200);
                }
                
                // Set input by label
                function setInputByLabel(container, labelText, value) {
                    // Try to find the input with a label containing the text
                    const labels = Array.from(container.querySelectorAll('label'));
                    
                    for (const label of labels) {
                        if (label.textContent.includes(labelText)) {
                            // Check for an input with an id matching the for attribute
                            if (label.htmlFor) {
                                const input = document.getElementById(label.htmlFor);
                                if (input) {
                                    setInputValue(input, value);
                                    return true;
                                }
                            }
                            
                            // Check for input near the label
                            const inputNear = label.nextElementSibling?.querySelector('input');
                            if (inputNear) {
                                setInputValue(inputNear, value);
                                return true;
                            }
                            
                            // Check in parent
                            const formGroup = label.closest('div[class*="form-group"]');
                            if (formGroup) {
                                const input = formGroup.querySelector('input');
                                if (input) {
                                    setInputValue(input, value);
                                    return true;
                                }
                            }
                        }
                    }
                    
                    return false;
                }
                
                // Set select by label
                function setSelectByLabel(container, labelText, value) {
                    // Try to find the select with a label containing the text
                    const labels = Array.from(container.querySelectorAll('label'));
                    
                    for (const label of labels) {
                        if (label.textContent.includes(labelText)) {
                            // Check for a select with an id matching the for attribute
                            if (label.htmlFor) {
                                const select = document.getElementById(label.htmlFor);
                                if (select && select.tagName === 'SELECT') {
                                    setSelectValue(select, value);
                                    return true;
                                }
                            }
                            
                            // Check for select near the label
                            const selectNear = label.nextElementSibling?.querySelector('select');
                            if (selectNear) {
                                setSelectValue(selectNear, value);
                                return true;
                            }
                            
                            // Check in parent
                            const formGroup = label.closest('div[class*="form-group"]');
                            if (formGroup) {
                                const select = formGroup.querySelector('select');
                                if (select) {
                                    setSelectValue(select, value);
                                    return true;
                                }
                            }
                        }
                    }
                    
                    return false;
                }
                
                // Set input value with proper events
                function setInputValue(input, value) {
                    // Set value
                    input.value = value;
                    
                    // Trigger events for frameworks to detect changes
                    const inputEvent = new Event('input', { bubbles: true });
                    const changeEvent = new Event('change', { bubbles: true });
                    
                    input.dispatchEvent(inputEvent);
                    input.dispatchEvent(changeEvent);
                }
                
                // Set select value with proper events
                function setSelectValue(select, value) {
                    // Find matching option
                    let optionFound = false;
                    for (const option of select.options) {
                        if (option.value === value || option.text === value) {
                            option.selected = true;
                            optionFound = true;
                            break;
                        }
                    }
                    
                    // If no exact match, try case-insensitive
                    if (!optionFound) {
                        const lowerValue = String(value).toLowerCase();
                        for (const option of select.options) {
                            if (option.value.toLowerCase() === lowerValue || 
                                option.text.toLowerCase() === lowerValue) {
                                option.selected = true;
                                optionFound = true;
                                break;
                            }
                        }
                    }
                    
                    // If still no match, select first option
                    if (!optionFound && select.options.length > 0) {
                        select.options[0].selected = true;
                    }
                    
                    // Trigger events
                    const changeEvent = new Event('change', { bubbles: true });
                    select.dispatchEvent(changeEvent);
                }
            })();
        `;
        document.head.appendChild(script);
    }
    
    // Only execute our script if we're on the Homebridge UI
    if (isHomebridgeUI()) {
        // Give the page time to fully load
        setTimeout(loadTemplateHandler, 1000);
        
        console.log('SleepMe Simple Custom UI: Init complete, handler loading...');
   } else {
        console.log('SleepMe Simple Custom UI: Not on Homebridge UI, script not loaded');
    }
})();
