// SleepMe Simple UI Client Script
document.addEventListener('DOMContentLoaded', () => {
    console.log('SleepMe UI: Initializing...');
    
    // Selected templates
    let selectedTemplates = {
        weekday: "optimal",
        weekend: "weekend-optimal"
    };
    
    // Function to format time (24h to 12h AM/PM)
    function formatTime(time24h) {
        if (!time24h) return "";
        const [hours, minutes] = time24h.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    
    // Function to show toast messages
    function showToast(message, duration = 3000) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }
    
    // Debounce function to limit how often a function is called
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
    
    // Function to fetch templates
    async function fetchTemplates() {
        try {
            const response = await fetch('/api/templates');
            const data = await response.json();
            
            if (data.templates) {
                initTemplates(data.templates);
                
                if (data.selected) {
                    selectedTemplates = data.selected;
                    selectTemplateCard(selectedTemplates.weekday, 'weekday');
                    selectTemplateCard(selectedTemplates.weekend, 'weekend');
                }
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
            showToast('Error loading templates');
        }
    }
    
    // Function to load config
    async function loadConfig() {
        try {
            const response = await fetch('/api/config');
            const data = await response.json();
            
            if (data.success && data.config) {
                populateFormFields(data.config);
                toggleScheduleOptions(!!data.config.enableSchedules);
                
                // Try to determine which templates are in use
                if (data.config.schedules && data.config.schedules.length > 0) {
                    setTemplatesBySchedules(data.config.schedules);
                }
            } else {
                console.error('Failed to load config:', data.error);
                showToast('Error loading configuration');
            }
        } catch (error) {
            console.error('Error loading config:', error);
            showToast('Error loading configuration');
        }
    }
    
    // Function to save config
    async function saveConfig() {
        try {
            // Get values from form fields
            const config = {
                platform: "SleepMeSimple",
                name: "SleepMe Simple",
                apiToken: document.getElementById('apiToken').value,
                unit: document.getElementById('tempUnit').value,
                pollingInterval: parseInt(document.getElementById('pollingInterval').value) || 90,
                logLevel: document.getElementById('logLevel').value,
                enableSchedules: document.getElementById('enableSchedules').checked,
                advanced: {
                    warmHugIncrement: parseFloat(document.getElementById('warmHugIncrement').value) || 2,
                    warmHugDuration: parseInt(document.getElementById('warmHugDuration').value) || 10
                }
            };
            
            // Add schedules if enabled
            if (config.enableSchedules) {
                config.schedules = generateSchedulesFromTemplates();
            }
            
            // Send to API
            const response = await fetch('/api/saveConfig', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Settings saved successfully');
            } else {
                showToast('Error saving settings: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error saving config:', error);
            showToast('Error saving settings');
        }
    }
    
    // Function to save templates
    async function saveTemplates() {
        try {
            // Enable schedules
            document.getElementById('enableSchedules').checked = true;
            
            // Send template selection to API
            const response = await fetch('/api/saveTemplates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(selectedTemplates)
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Schedules saved successfully');
            } else {
                showToast('Error saving schedules: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error saving templates:', error);
            showToast('Error saving schedules');
        }
    }
    
    // Function to populate form fields with config values
    function populateFormFields(config) {
        // Basic settings
        document.getElementById('apiToken').value = config.apiToken || '';
        document.getElementById('tempUnit').value = config.unit || 'C';
        document.getElementById('pollingInterval').value = config.pollingInterval || 90;
        document.getElementById('logLevel').value = config.logLevel || 'normal';
        document.getElementById('enableSchedules').checked = !!config.enableSchedules;
        
        // Advanced settings
        if (config.advanced) {
            document.getElementById('warmHugIncrement').value = config.advanced.warmHugIncrement || 2;
            document.getElementById('warmHugDuration').value = config.advanced.warmHugDuration || 10;
        }
    }
    
    // Function to try to match templates with existing schedules
    function setTemplatesBySchedules(schedules) {
        // Get templates first to compare
        fetch('/api/templates')
            .then(response => response.json())
            .then(data => {
                if (!data.templates) return;
                
                const templates = data.templates;
                
                // Separate weekday and weekend schedules
                const weekdaySchedules = schedules.filter(s => s.type === 'Weekdays');
                const weekendSchedules = schedules.filter(s => s.type === 'Weekend');
                
                // Try to match weekday templates
                if (weekdaySchedules.length > 0) {
                    for (const [id, template] of Object.entries(templates.weekday)) {
                        // Simple matching: check if times approximately match
                        const matches = weekdaySchedules.filter(schedule => {
                            return template.schedules.some(templateSchedule => 
                                templateSchedule.time === schedule.time &&
                                Math.abs(templateSchedule.temperature - schedule.temperature) <= 1
                            );
                        }).length;
                        
                        // If most schedules match, select this template
                        if (matches >= Math.ceil(template.schedules.length * 0.75)) {
                            selectedTemplates.weekday = id;
                            selectTemplateCard(id, 'weekday');
                            break;
                        }
                    }
                }
                
                // Try to match weekend templates
                if (weekendSchedules.length > 0) {
                    for (const [id, template] of Object.entries(templates.weekend)) {
                        // Simple matching: check if times approximately match
                        const matches = weekendSchedules.filter(schedule => {
                            return template.schedules.some(templateSchedule => 
                                templateSchedule.time === schedule.time &&
                                Math.abs(templateSchedule.temperature - schedule.temperature) <= 1
                            );
                        }).length;
                        
                        // If most schedules match, select this template
                        if (matches >= Math.ceil(template.schedules.length * 0.75)) {
                            selectedTemplates.weekend = id;
                            selectTemplateCard(id, 'weekend');
                            break;
                        }
                    }
                }
            })
            .catch(error => console.error('Error in template matching:', error));
    }
    
    // Function to initialize template cards
    function initTemplates(templates) {
        // Generate weekday template cards
        const weekdayContainer = document.getElementById('weekday-templates');
        weekdayContainer.innerHTML = ''; // Clear container
        
        for (const [id, template] of Object.entries(templates.weekday)) {
            const card = createTemplateCard(id, template, 'weekday');
            weekdayContainer.appendChild(card);
        }
        
        // Generate weekend template cards
        const weekendContainer = document.getElementById('weekend-templates');
        weekendContainer.innerHTML = ''; // Clear container
        
        for (const [id, template] of Object.entries(templates.weekend)) {
            const card = createTemplateCard(id, template, 'weekend');
            weekendContainer.appendChild(card);
        }
    }
    
    // Function to create a template card element
    function createTemplateCard(id, template, type) {
        const card = document.createElement('div');
        card.className = 'template-card';
        card.dataset.id = id;
        card.dataset.type = type;
        
        const title = document.createElement('div');
        title.className = 'template-title';
        title.textContent = template.name;
        card.appendChild(title);
        
        const description = document.createElement('div');
        description.className = 'template-description';
        description.textContent = template.description;
        card.appendChild(description);
        
        const preview = document.createElement('div');
        preview.className = 'schedule-preview';
        
        // Add schedule items to preview
        template.schedules.forEach(schedule => {
            const item = document.createElement('div');
            item.className = 'schedule-item';
            
            const time = document.createElement('span');
            time.className = 'time';
            time.textContent = formatTime(schedule.time);
            item.appendChild(time);
            
            const temp = document.createElement('span');
            temp.className = 'temp';
            temp.textContent = schedule.name === 'Warm Hug' ? 'Warm Hug' : `${schedule.temperature}°C`;
            item.appendChild(temp);
            
            preview.appendChild(item);
        });
        
        card.appendChild(preview);
        
        // Add click handler
        card.addEventListener('click', () => {
            selectTemplateCard(id, type);
        });
        
        return card;
    }
    
    // Function to select a template card
    function selectTemplateCard(id, type) {
        // Remove selection from all cards of this type
        document.querySelectorAll(`.template-card[data-type="${type}"]`).forEach(card => {
            card.classList.remove('selected');
        });
        
        // Add selection to the chosen card
        const card = document.querySelector(`.template-card[data-id="${id}"][data-type="${type}"]`);
        if (card) {
            card.classList.add('selected');
            selectedTemplates[type] = id;
        }
    }
    
    // Function to toggle schedule options visibility
    function toggleScheduleOptions(show) {
        const scheduleOptions = document.getElementById('schedule-options');
        if (show) {
            scheduleOptions.classList.remove('hidden');
        } else {
            scheduleOptions.classList.add('hidden');
        }
    }
    
    // Function to generate schedules from selected templates
    function generateSchedulesFromTemplates() {
        // This is just a placeholder - actual schedule generation is done server-side
        return [];
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;
                
                // Update active tab button
                document.querySelectorAll('.tab-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                button.classList.add('active');
                
                // Show selected tab content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(`${tabId}-tab`).classList.add('active');
            });
        });
        
        // Toggle schedule options visibility
        document.getElementById('enableSchedules').addEventListener('change', (e) => {
            toggleScheduleOptions(e.target.checked);
        });
        
        // Save schedules button
        document.getElementById('save-schedules').addEventListener('click', saveTemplates);
        
        // Cancel button
        document.getElementById('cancel-schedules').addEventListener('click', () => {
            document.getElementById('enableSchedules').checked = false;
            toggleScheduleOptions(false);
            saveConfig();
        });
        
        // Save all settings when any field changes
        const debouncedSave = debounce(saveConfig, 1000);
        document.querySelectorAll('input, select').forEach(input => {
            if (input.id !== 'enableSchedules') { // Exclude schedule checkbox
                input.addEventListener('change', debouncedSave);
                input.addEventListener('keyup', debouncedSave);
            }
        });
    }
    
    // Initialize the app
    async function init() {
        await loadConfig();
        await fetchTemplates();
        setupEventListeners();
        console.log('SleepMe UI: Initialization complete');
    }
    
    // Start the app
    init().catch(err => {
        console.error('Initialization error:', err);
        showToast('Error initializing UI');
    });
});