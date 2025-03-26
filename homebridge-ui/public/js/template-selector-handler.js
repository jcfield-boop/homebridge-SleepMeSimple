// Template selector handler with proper homebridge-ui-utils integration
(function() {
    // Store global reference to initialized state
    window.templateUIInitialized = false;
    
    // Make initialization function available globally
    window.initializeTemplateUI = function(config) {
        if (window.templateUIInitialized) return;
        window.templateUIInitialized = true;
        
        console.log('Template UI: Initializing with config', config);
        
        // Status display for debugging
        const debugInfo = document.getElementById('debug-info');
        if (debugInfo) {
            debugInfo.textContent = 'Initializing with config';
        }
        
        // Get existing schedules from config
        const schedules = config.schedules || [];
        
        // Set up template cards
        setupTemplateCards();
        
        // Pre-select templates based on existing schedules
        selectDefaultTemplates(schedules);
        
        // Setup save button
        setupSaveButton();
    };
    
    // Set up template card selection
    function setupTemplateCards() {
        document.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', function() {
                const templateType = this.closest('.weekend-templates') ? 'weekend' : 'weekday';
                selectTemplate(this, templateType);
            });
        });
        
        // Tab switching
        document.querySelector('.weekday-btn')?.addEventListener('click', function() {
            toggleTemplateView('weekday');
        });
        
        document.querySelector('.weekend-btn')?.addEventListener('click', function() {
            toggleTemplateView('weekend');
        });
    }
    
    // Select a template card
    function selectTemplate(templateCard, templateType) {
        // Remove selection from all cards in this category
        document.querySelectorAll(`.${templateType}-templates .template-card`).forEach(card => {
            card.classList.remove('selected');
        });
        
        // Add selection to clicked card
        templateCard.classList.add('selected');
        
        // Store the selected template ID
        const templateId = templateCard.getAttribute('data-template-id');
        document.getElementById(`${templateType}-template`).value = templateId;
        
        // Show saved state is pending
        const saveButton = document.getElementById('save-button');
        if (saveButton) {
            saveButton.classList.add('pending');
            saveButton.textContent = 'Save Changes';
        }
    }
    
    // Toggle between weekday and weekend views
    function toggleTemplateView(viewType) {
        const weekdayBtn = document.querySelector('.weekday-btn');
        const weekendBtn = document.querySelector('.weekend-btn');
        const weekdayTemplates = document.querySelector('.weekday-templates');
        const weekendTemplates = document.querySelector('.weekend-templates');
        
        if (viewType === 'weekday') {
            weekdayBtn.classList.add('active');
            weekendBtn.classList.remove('active');
            weekdayTemplates.classList.remove('hidden');
            weekendTemplates.classList.add('hidden');
        } else {
            weekdayBtn.classList.remove('active');
            weekendBtn.classList.add('active');
            weekdayTemplates.classList.add('hidden');
            weekendTemplates.classList.remove('hidden');
        }
    }
    
    // Set up save button and functionality
    function setupSaveButton() {
        // Create save button if it doesn't exist
        if (!document.getElementById('save-button')) {
            const saveBtn = document.createElement('button');
            saveBtn.id = 'save-button';
            saveBtn.textContent = 'Save Templates';
            saveBtn.className = 'btn btn-primary';
            saveBtn.style.marginTop = '20px';
            document.querySelector('.sleepme-template-container').appendChild(saveBtn);
            
            saveBtn.addEventListener('click', saveSelectedTemplates);
        }
    }
    
    // Save the selected templates to Homebridge config
    function saveSelectedTemplates() {
        try {
            const weekdayTemplate = document.getElementById('weekday-template').value;
            const weekendTemplate = document.getElementById('weekend-template').value;
            
            // Get templates data
            const templates = getTemplateDefinitions();
            
            // Create schedule array from selected templates
            const schedules = [
                ...(templates[weekdayTemplate]?.schedules || []),
                ...(templates[weekendTemplate]?.schedules || [])
            ];
            
            // Save to Homebridge config
            homebridge.updatePluginConfig({
                enableSchedules: true,
                schedules: schedules
            });
            
            // Update save button
            const saveButton = document.getElementById('save-button');
            saveButton.classList.remove('pending');
            saveButton.textContent = 'Saved!';
            
            // Show toast notification
            homebridge.showToast('Templates saved successfully');
            
        } catch (e) {
            console.error('Error saving templates:', e);
            homebridge.showToast('Error saving templates: ' + e.message, 'error');
        }
    }
    
    // Pre-select templates based on existing schedules
    function selectDefaultTemplates(schedules) {
        if (!schedules || schedules.length === 0) {
            // Select defaults if no schedules exist
            const weekdayCard = document.querySelector('.weekday-templates [data-template-id="optimal"]');
            const weekendCard = document.querySelector('.weekend-templates [data-template-id="weekend-optimal"]');
            
            if (weekdayCard) selectTemplate(weekdayCard, 'weekday');
            if (weekendCard) selectTemplate(weekendCard, 'weekend');
            return;
        }
        
        // Try to match existing schedules to templates
        const weekdaySchedules = schedules.filter(s => s.type === 'Weekdays');
        const weekendSchedules = schedules.filter(s => s.type === 'Weekend');
        
        let weekdayTemplateId = findMatchingTemplate(weekdaySchedules, 'weekday') || 'optimal';
        let weekendTemplateId = findMatchingTemplate(weekendSchedules, 'weekend') || 'weekend-optimal';
        
        // Select the matching templates
        const weekdayCard = document.querySelector(`.weekday-templates [data-template-id="${weekdayTemplateId}"]`);
        const weekendCard = document.querySelector(`.weekend-templates [data-template-id="${weekendTemplateId}"]`);
        
        if (weekdayCard) selectTemplate(weekdayCard, 'weekday');
        if (weekendCard) selectTemplate(weekendCard, 'weekend');
    }
    
    // Find template that best matches schedules
    function findMatchingTemplate(schedules, templateType) {
        // Implementation of matching logic
        // Return template ID that best matches the schedules
        // Simplified version for brevity
        return templateType === 'weekday' ? 'optimal' : 'weekend-optimal';
    }
    
    // Template definitions - get from template-selector.html
    function getTemplateDefinitions() {
        // This should match your definitions in template-selector.html
        return {
            "optimal": {
                name: "Optimal Sleep Cycle",
                schedules: [
                    { type: "Weekdays", time: "22:00", temperature: 21, name: "Cool Down" },
                    { type: "Weekdays", time: "23:00", temperature: 19, name: "Deep Sleep" },
                    { type: "Weekdays", time: "02:00", temperature: 23, name: "REM Support" },
                    { type: "Weekdays", time: "06:00", temperature: 24, name: "Warm Hug" }
                ]
            },
            // Add other templates here
            "weekend-optimal": {
                name: "Weekend Recovery",
                schedules: [
                    { type: "Weekend", time: "23:00", temperature: 21, name: "Cool Down" },
                    { type: "Weekend", time: "00:00", temperature: 19, name: "Deep Sleep" },
                    { type: "Weekend", time: "03:00", temperature: 23, name: "REM Support" },
                    { type: "Weekend", time: "08:00", temperature: 24, name: "Warm Hug" }
                ]
            }
            // Add other weekend templates
        };
    }
})();