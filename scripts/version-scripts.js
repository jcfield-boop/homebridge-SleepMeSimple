// scripts/version-scripts.js
const fs = require('fs');
const path = require('path');

// Get package version from package.json
const packageJson = require('../package.json');
const version = packageJson.version;

console.log(`Applying version ${version} to UI scripts for cache busting...`);

// Path to the index.html file in the dist directory
const indexHtmlPath = path.join(__dirname, '../dist/homebridge-ui/public/index.html');

// Read the file
if (fs.existsSync(indexHtmlPath)) {
  let htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
  
  // Replace all instances of {{version}} with the actual version
  htmlContent = htmlContent.replace(/\{\{version\}\}/g, version);
  
  // Write the updated content back
  fs.writeFileSync(indexHtmlPath, htmlContent);
  
  console.log(`Successfully updated script versions in ${indexHtmlPath}`);
} else {
  console.error(`Error: Could not find index.html at ${indexHtmlPath}`);
  process.exit(1);
}