// Simple test file that makes it obvious when it loads
(function() {
  // Log to console
  console.log('SleepMe UI Test: Script loaded at ' + new Date().toISOString());
  
  // Add a clearly visible element to the page
  const div = document.createElement('div');
  div.id = 'sleepme-test-indicator';
  div.textContent = 'SleepMe UI Test Loaded Successfully!';
  div.style.position = 'fixed';
  div.style.top = '10px';
  div.style.right = '10px';
  div.style.backgroundColor = 'red'; // Bright color to be obvious
  div.style.color = 'white';
  div.style.padding = '10px 20px';
  div.style.borderRadius = '5px';
  div.style.zIndex = '9999';
  div.style.fontSize = '16px';
  div.style.fontWeight = 'bold';
  document.body.appendChild(div);
  
  // Add a click handler to make it interactive
  div.addEventListener('click', function() {
    this.style.backgroundColor = 'green';
    this.textContent = 'Test Script Working!';
  });
})();
