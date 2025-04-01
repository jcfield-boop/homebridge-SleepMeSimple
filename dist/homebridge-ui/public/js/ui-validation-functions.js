/**
 * Validation functions for SleepMe Simple UI
 * Handles validation of user inputs
 */

/**
 * Convert Celsius to Fahrenheit
 * @param {number} celsius - Temperature in Celsius
 * @returns {number} Temperature in Fahrenheit
 */
function convertCtoF(celsius) {
  return (celsius * 9/5) + 32;
}

/**
 * Convert Fahrenheit to Celsius
 * @param {number} fahrenheit - Temperature in Fahrenheit
 * @returns {number} Temperature in Celsius
 */
function convertFtoC(fahrenheit) {
  return (fahrenheit - 32) * 5/9;
}

/**
 * Validate schedule time format (24h)
 * @returns {boolean} True if valid, false otherwise
 */
function validateScheduleTime() {
  if (!scheduleTimeInput) return false;
  
  const timeError = document.getElementById('timeError');
  if (!timeError) return false;
  
  const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  const value = scheduleTimeInput.value.trim();
  
  if (!value) {
    timeError.textContent = "Time is required";
    timeError.classList.add('visible');
    scheduleTimeInput.classList.add('invalid');
    return false;
  }
  
  const isValid = timePattern.test(value);
  
  // Show/hide error message
  timeError.textContent = isValid ? "" : "Please enter a valid 24-hour time (HH:MM)";
  timeError.classList.toggle('visible', !isValid);
  scheduleTimeInput.classList.toggle('invalid', !isValid);
  
  return isValid;
}

/**
 * Validate temperature
 * @returns {boolean} True if valid, false otherwise
 */
function validateTemperature() {
  if (!scheduleTemperatureInput || !unitSelect) return false;
  
  const tempError = document.getElementById('tempError');
  if (!tempError) return false;
  
  const value = scheduleTemperatureInput.value.trim();
  const temp = parseFloat(value);
  const unit = unitSelect.value;
  
  if (!value) {
    tempError.textContent = "Temperature is required";
    tempError.classList.add('visible');
    scheduleTemperatureInput.classList.add('invalid');
    return false;
  }
  
  let isValid = true;
  let errorMsg = '';
  
  if (isNaN(temp)) {
    isValid = false;
    errorMsg = 'Please enter a valid number';
  } else if (unit === 'C' && (temp < 13 || temp > 46)) {
    isValid = false;
    errorMsg = 'Temperature must be between 13-46°C';
  } else if (unit === 'F' && (temp < 55 || temp > 115)) {
    isValid = false;
    errorMsg = 'Temperature must be between 55-115°F';
  }
  
  // Show/hide error message
  tempError.textContent = errorMsg;
  tempError.classList.toggle('visible', !isValid);
  scheduleTemperatureInput.classList.toggle('invalid', !isValid);
  
  return isValid;
}

/**
 * Update temperature validation based on selected unit
 * Sets appropriate min/max values and default values
 */
function updateTemperatureValidation() {
  if (!scheduleTemperatureInput || !unitSelect) return;
  
  const unit = unitSelect.value;
  
  // Update min/max attributes based on unit
  if (unit === 'C') {
    scheduleTemperatureInput.setAttribute('min', '13');
    scheduleTemperatureInput.setAttribute('max', '46');
    // Only set default value if not in edit mode to avoid overwriting user input
    if (!isEditing) {
      scheduleTemperatureInput.value = '23';
    }
  } else {
    scheduleTemperatureInput.setAttribute('min', '55');
    scheduleTemperatureInput.setAttribute('max', '115');
    // Only set default value if not in edit mode to avoid overwriting user input
    if (!isEditing) {
      scheduleTemperatureInput.value = '73';
    }
  }
  
  // Validate with new unit settings
  validateTemperature();
}