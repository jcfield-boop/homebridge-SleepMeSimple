// Template selector handler script for Homebridge UI
(function() {
    // Wait for DOM content to be loaded
    window.addEventListener('DOMContentLoaded', function() {
        // Check if we're on the homebridge config page for our plugin
        if (!isOnPluginConfigPage()) return;
        
        // Find the schedule container element in the Homebridge UI
        setTimeout(initializeCustomUI, 500); // Delay to ensure UI is fully loaded
    });
    
    // Check if we're on the plugin config page
    function isOnPluginConfigPage() {
        // Look for elements that would exist on our plugin's config page
        return document.querySelector('div[id="SleepMeSimple"]') !== null;
    }
    
    // Initialize our custom UI
    function initializeCustomUI() {
        // Find the schedules container in the Homebridge UI
        const scheduleSection = findScheduleSection();
        if (!scheduleSection) {
            console.log('Schedule section not found in Homebridge UI');
            return;
        }
        
        // Create our template selector UI
        insertTemplateSelectorUI(scheduleSection);
        
        // Set up message listener for the iframe
        window.addEventListener('message', handleIframeMessage);
    }
    
    // Find the schedule section in the Homebridge UI
    function findScheduleSection() {
        // Look for the schedulesSection container
        const schedulesSection = document.querySelector('div[formgroupname="schedulesSection"]');
        if (!schedulesSection) return null;
        
        // Find the schedules array form field
        return schedulesSection.querySelector('div[formarrayname="schedules"]');
    }
    
    // Insert the template selector UI before the schedule list
    function insertTemplateSelectorUI(scheduleSection) {
        // Create container
        const container = document.createElement('div');
        container.className = 'template-selector-container';
        container.style.marginBottom = '20px';
        
        // Create iframe for template selector
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
            const existingSchedules = getExistingSchedules();
            iframe.contentWindow.postMessage({
                action: 'init-template',
                schedules: existingSchedules
            }, '*');
        };
    }
    
    // Handle messages from the iframe
    function handleIframeMessage(event) {
        // Verify message source and structure
        if (!event.data || event.data.action !== 'save-template') return;
        
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
        
        // Clear existing schedules
        clearExistingSchedules(scheduleSection);
        
        // Add schedules from template
        schedules.forEach(schedule => {
            // Click the add button to create a new schedule item
            const addButton = scheduleSection.querySelector('button[type="button"]');
            if (addButton) {
                addButton.click();
                
                // Wait for DOM to update
                setTimeout(() => {
                    // Fill in the new schedule
                    fillScheduleItem(scheduleSection, schedule);
                }, 100);
            }
        });
    }
    
    // Clear all existing schedules
    function clearExistingSchedules(scheduleSection) {
        // Find all delete buttons
        const deleteButtons = scheduleSection.querySelectorAll('button.btn-danger');
        
        // Click each delete button
        deleteButtons.forEach(button => button.click());
    }
    
    // Fill in a schedule item with data
    function fillScheduleItem(scheduleSection, schedule) {
        // Get the last schedule item (the one we just added)
        const scheduleItems = scheduleSection.querySelectorAll('div[ng-reflect-form]');
        if (!scheduleItems.length) return;
        
        const lastItem = scheduleItems[scheduleItems.length - 1];
        
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
        
        return schedules;
    }
    
    // Helper to get select value
    function getSelectValue(container, controlName) {
        const select = container.querySelector(`select[formcontrolname="${controlName}"]`);
        return select ? select.value : null;
    }
    
    // Helper to get input value
    function getInputValue(container, controlName) {
        const input = container.querySelector(`input[formcontrolname="${controlName}"]`);
        return input ? input.value : null;
    }
})();
