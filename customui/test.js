// Simple test file to verify custom UI loading
(function() {
  // Create a visible indicator that the script has loaded
  console.log('SleepMe UI Test: Script loaded at ' + new Date().toISOString());
  
  // Create a visual indicator on the page
  const div = document.createElement('div');
  div.id = 'sleepme-test-indicator';
  div.textContent = 'SleepMe UI Test Script Loaded';
  div.style.position = 'fixed';
  div.style.bottom = '10px';
  div.style.right = '10px';
  div.style.backgroundColor = '#4CAF50';
  div.style.color = 'white';
  div.style.padding = '5px 10px';
  div.style.borderRadius = '5px';
  div.style.zIndex = '9999';
  div.style.fontSize = '12px';
  document.body.appendChild(div);
  
  // Hide the indicator after 10 seconds
  setTimeout(() => {
    div.style.opacity = '0.5';
    setTimeout(() => {
      div.style.display = 'none';
    }, 2000);
  }, 10000);
})();
