/**
 * Pre-publish verification script
 * Ensures the package is ready for publishing by validating:
 * - Package version
 * - NPM credentials
 * - Required files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Required directories and files
const REQUIRED_DIRS = ['dist', 'customui'];
const REQUIRED_FILES = ['config.schema.json', 'LICENSE', 'README.md'];

// Colors for console output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

console.log(`${COLORS.blue}Running pre-publish verification...${COLORS.reset}`);

// Check if we're on a clean git state
try {
  const gitStatus = execSync('git status --porcelain').toString().trim();
  if (gitStatus) {
    console.warn(`${COLORS.yellow}⚠️ Warning: Git working directory is not clean${COLORS.reset}`);
    console.warn(`${COLORS.yellow}You have uncommitted changes:${COLORS.reset}`);
    console.warn(gitStatus);
  } else {
    console.log(`${COLORS.green}✅ Git working directory is clean${COLORS.reset}`);
  }
} catch (error) {
  console.error(`${COLORS.red}❌ Failed to check git status: ${error.message}${COLORS.reset}`);
}

// Verify NPM token is configured
try {
  const npmrc = execSync('npm config get //registry.npmjs.org/:_authToken').toString().trim();
  if (!npmrc || npmrc === 'undefined') {
    console.error(`${COLORS.red}❌ NPM token not configured. Run:${COLORS.reset}`);
    console.error(`   npm login`);
    process.exit(1);
  } else {
    console.log(`${COLORS.green}✅ NPM token is configured${COLORS.reset}`);
  }
} catch (error) {
  console.error(`${COLORS.red}❌ Failed to verify NPM token: ${error.message}${COLORS.reset}`);
  console.error(`${COLORS.red}   Run: npm login${COLORS.reset}`);
  process.exit(1);
}

// Read package.json
let packageJson;
try {
  packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`${COLORS.blue}Package name: ${packageJson.name}${COLORS.reset}`);
  console.log(`${COLORS.blue}Current version: ${packageJson.version}${COLORS.reset}`);
} catch (error) {
  console.error(`${COLORS.red}❌ Failed to read package.json: ${error.message}${COLORS.reset}`);
  process.exit(1);
}

// Check if version already exists
try {
  const publishedVersions = execSync(`npm view ${packageJson.name} versions --json`).toString().trim();
  const versions = JSON.parse(publishedVersions);
  
  if (versions.includes(packageJson.version)) {
    console.error(`${COLORS.red}❌ Version ${packageJson.version} already published!${COLORS.reset}`);
    console.error(`${COLORS.red}   Bump version before publishing${COLORS.reset}`);
    process.exit(1);
  } else {
    console.log(`${COLORS.green}✅ Version ${packageJson.version} is available for publishing${COLORS.reset}`);
  }
} catch (error) {
  // If package doesn't exist yet, this is fine
  if (error.message.includes('npm ERR! code E404')) {
    console.log(`${COLORS.green}✅ First-time publishing of package${COLORS.reset}`);
  } else {
    console.error(`${COLORS.red}❌ Failed to check published versions: ${error.message}${COLORS.reset}`);
  }
}

// Check required directories
for (const dir of REQUIRED_DIRS) {
  if (!fs.existsSync(dir)) {
    console.error(`${COLORS.red}❌ Required directory missing: ${dir}${COLORS.reset}`);
    process.exit(1);
  } else {
    console.log(`${COLORS.green}✅ Required directory present: ${dir}${COLORS.reset}`);
  }
}

// Check required files
for (const file of REQUIRED_FILES) {
  if (!fs.existsSync(file)) {
    console.error(`${COLORS.red}❌ Required file missing: ${file}${COLORS.reset}`);
    process.exit(1);
  } else {
    console.log(`${COLORS.green}✅ Required file present: ${file}${COLORS.reset}`);
  }
}

console.log(`${COLORS.green}✅ Pre-publish verification passed!${COLORS.reset}`);
