// scripts/pre-publish-check.js
const fs = require('fs');
const path = require('path');

// Paths to check
const criticalPaths = [
  'dist/index.js',
  'dist/platform.js',
  'dist/accessory.js',
  'dist/homebridge-ui/public/index.html',
  'dist/homebridge-ui/public/js/ui-main-script.js',
  'dist/homebridge-ui/server.js'
];

// Check for UI files
let hasErrors = false;

console.log('Checking for critical files before publishing...');

// Check each critical path
criticalPaths.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ MISSING: ${filePath}`);
    hasErrors = true;
  } else {
    console.log(`✅ Found: ${filePath}`);
  }
});

// Check for JS files in the UI directory
const jsDir = path.join(process.cwd(), 'dist/homebridge-ui/public/js');
if (fs.existsSync(jsDir)) {
  const jsFiles = fs.readdirSync(jsDir).filter(file => file.endsWith('.js'));
  console.log(`Found ${jsFiles.length} JS files in UI directory`);
  
  if (jsFiles.length === 0) {
    console.error('❌ WARNING: No JS files found in UI directory!');
    hasErrors = true;
  } else {
    console.log('JS files found:', jsFiles.join(', '));
  }
} else {
  console.error('❌ MISSING: JS directory not found!');
  hasErrors = true;
}

// Exit with error if any issues found
if (hasErrors) {
  console.error('Pre-publish check failed! Fix the issues before publishing.');
  process.exit(1);
} else {
  console.log('Pre-publish check passed! All required files present.');
}