// Simple test file to verify custom UI loading
(function() {
  // Create a visible indicator that the script has loaded
  const div = document.createElement('div');
  div.textContent = 'SleepMe Custom UI Test Loaded!';
  div.style.position = 'fixed';
  div.style.top = '10px';
  div.style.right = '10px';
  div.style.backgroundColor = 'red';
  div.style.color = 'white';
  div.style.padding = '5px';
  div.style.zIndex = '9999';
  document.body.appendChild(div);
  
  console.log('SleepMe test.js loaded at:', new Date().toISOString());
})();
