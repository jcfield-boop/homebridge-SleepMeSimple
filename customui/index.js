// Simplified entry point for custom UI
(function() {
  console.log('SleepMe UI: index.js loaded');
  
  // Create a status indicator
  const statusDiv = document.createElement('div');
  statusDiv.id = 'sleepme-status-indicator';
  statusDiv.textContent = 'SleepMe Custom UI Active';
  statusDiv.style.position = 'fixed';
  statusDiv.style.bottom = '10px';
  statusDiv.style.left = '10px';
  statusDiv.style.backgroundColor = 'blue';
  statusDiv.style.color = 'white';
  statusDiv.style.padding = '8px 15px';
  statusDiv.style.borderRadius = '5px';
  statusDiv.style.zIndex = '9999';
  
  // Wait for document to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addStatusIndicator);
  } else {
    addStatusIndicator();
  }
  
  function addStatusIndicator() {
    document.body.appendChild(statusDiv);
    console.log('SleepMe UI: Status indicator added');
  }
})();
