#!/usr/bin/env node

/**
 * Validation script to test the API analysis setup
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.join(__dirname, 'api-test-config.json');

console.log('🔍 Validating API Analysis Setup');
console.log('===============================\n');

// Check config file
if (!fs.existsSync(CONFIG_FILE)) {
  console.log('❌ Configuration file missing');
  console.log(`Expected: ${CONFIG_FILE}`);
  console.log('\n📋 To fix this:');
  console.log('1. Copy api-test-config.example.json to api-test-config.json');
  console.log('2. Edit the file with your SleepMe API token');
  console.log('3. Optionally add your device ID (or leave empty for auto-discovery)');
  process.exit(1);
}

// Validate config content
try {
  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  
  if (!config.apiToken || config.apiToken === 'your-sleep-me-api-token-here') {
    console.log('❌ API token not configured');
    console.log('Please edit api-test-config.json with your actual SleepMe API token');
    process.exit(1);
  }
  
  console.log('✅ Configuration file found and appears valid');
  console.log(`✅ API token configured (${config.apiToken.substring(0, 8)}...)`);
  
  if (config.deviceId && config.deviceId !== 'optional-device-id-will-auto-discover-if-omitted') {
    console.log(`✅ Device ID configured: ${config.deviceId}`);
  } else {
    console.log('ℹ️  Device ID will be auto-discovered');
  }
  
} catch (error) {
  console.log('❌ Configuration file is invalid JSON');
  console.log(`Error: ${error.message}`);
  process.exit(1);
}

// Check dependencies
try {
  await import('axios');
  console.log('✅ Dependencies installed correctly');
} catch (error) {
  console.log('❌ Dependencies missing');
  console.log('Run: npm install');
  process.exit(1);
}

console.log('\n🎉 Setup validation complete!');
console.log('\n🚀 Ready to run analysis:');
console.log('   npm run analyze');
console.log('\n💡 For help:');
console.log('   npm run help');
console.log('\n⚠️  Note: The analysis will make many API requests and may take 15-30 minutes to complete.');
console.log('   Ensure your SleepMe device is online and accessible.');