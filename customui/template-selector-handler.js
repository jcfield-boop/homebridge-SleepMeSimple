// Proper handler for template selector in Homebridge UI environment
(function() {
    // Wait for DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('SleepMe template handler initialized');
        
        // Set up listeners for template selection
        setupTemplateListeners();
        
        // Request config from parent window
        window.parent.postMessage({
            action: 'request-config'
        }, '*');
        
        // Listen for messages from parent window
        window.addEventListener('message', function(event) {
            if (event.data && event.data.action === 'init-template') {
                console.log('Received config from parent:', event.data);
                initializeFromConfig(event.data.schedules || []);
            }
        });
    });
    
    // Set up event listeners for the template cards and tabs
    function setupTemplateListeners() {
        // Template card selection
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
    
    // Select a template
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
        
        // Save selection
        saveTemplateSelections();
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
    
    // Save template selections to be sent to Homebridge
    function saveTemplateSelections() {
        const weekdayTemplate = document.getElementById('weekday-template').value;
        const weekendTemplate = document.getElementById('weekend-template').value;
        
        // Get templates data
        const templates = getTemplateDefinitions();
        
        // Create schedule array from selected templates
        const schedules = [
            ...(templates[weekdayTemplate]?.schedules || []),
            ...(templates[weekendTemplate]?.schedules || [])
        ];
        
        // Send to parent window (Homebridge UI)
        window.parent.postMessage({
            action: 'save-template',
            schedules: schedules
        }, '*');
    }
    
    // Initialize UI from config
    function initializeFromConfig(schedules) {
        // Process existing schedules and select the right templates
        const weekdaySchedules = schedules.filter(s => s.type === 'Weekdays');
        const weekendSchedules = schedules.filter(s => s.type === 'Weekend');
        
        let weekdayTemplateId = findMatchingTemplate(weekdaySchedules, 'weekday') || 'optimal';
        let weekendTemplateId = findMatchingTemplate(weekendSchedules, 'weekend') || 'weekend-optimal';
        
        // Select the templates in UI
        const weekdayCard = document.querySelector(`.weekday-templates [data-template-id="${weekdayTemplateId}"]`);
        if (weekdayCard) {
            selectTemplate(weekdayCard, 'weekday');
        }
        
        const weekendCard = document.querySelector(`.weekend-templates [data-template-id="${weekendTemplateId}"]`);
        if (weekendCard) {
            selectTemplate(weekendCard, 'weekend');
        }
    }
    
    // Find template that best matches schedules
    function findMatchingTemplate(schedules, templateType) {
        if (!schedules || schedules.length === 0) {
            return templateType === 'weekday' ? 'optimal' : 'weekend-optimal';
        }
        
        const templates = getTemplateDefinitions();
        const templateKeys = Object.keys(templates).filter(key => {
            return templateType === 'weekday' ? !key.startsWith('weekend-') : key.startsWith('weekend-');
        });
        
        // Find the best matching template
        for (const key of templateKeys) {
            const template = templates[key];
            if (schedules.length === template.schedules.length) {
                // Check times match approximately
                const matchCount = schedules.filter(userSchedule => {
                    return template.schedules.some(templateSchedule => 
                        Math.abs(timeToMinutes(userSchedule.time) - timeToMinutes(templateSchedule.time)) < 30
                    );
                }).length;
                
                if (matchCount >= Math.ceil(template.schedules.length * 0.75)) {
                    return key;
                }
            }
        }
        
        return templateType === 'weekday' ? 'optimal' : 'weekend-optimal';
    }
    
    // Helper: Convert time string to minutes
    function timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }
    
    // Template definitions
    function getTemplateDefinitions() {
        return {
            // Weekday templates
            "optimal": {
                name: "Optimal Sleep Cycle",
                schedules: [
                    { type: "Weekdays", time: "22:00", temperature: 21, name: "Cool Down" },
                    { type: "Weekdays", time: "23:00", temperature: 19, name: "Deep Sleep" },
                    { type: "Weekdays", time: "02:00", temperature: 23, name: "REM Support" },
                    { type: "Weekdays", time: "06:00", temperature: 24, name: "Warm Hug" }
                ]
            },
            // [other templates remain the same]
        };
    }
})();
