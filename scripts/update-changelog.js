#!/usr/bin/env node

/**
 * Script to update CHANGELOG.md with a new version entry
 * Usage: node scripts/update-changelog.js <version> [release-type]
 * Example: node scripts/update-changelog.js 7.0.1 patch
 */

const fs = require('fs');
const path = require('path');

function updateChangelog(version, releaseType = 'patch') {
    const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
    
    if (!fs.existsSync(changelogPath)) {
        console.error('❌ CHANGELOG.md not found');
        process.exit(1);
    }
    
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Generate template based on release type
    let template = '';
    
    switch (releaseType.toLowerCase()) {
        case 'major':
            template = `## ${version} (${currentDate})

### 🚀 Major Changes
- **Breaking Change**: [Describe breaking change]
- **New Feature**: [Describe major new feature]

### Fixed
- **Bug Fix**: [Describe important bug fix]

### Technical
- **Internal**: [Describe technical improvements]

### Breaking Changes
- **Important**: [Describe what users need to know about breaking changes]
`;
            break;
            
        case 'minor':
            template = `## ${version} (${currentDate})

### Added
- **New Feature**: [Describe new feature]
- **Enhancement**: [Describe enhancement]

### Fixed
- **Bug Fix**: [Describe bug fix]

### Improved
- **Performance**: [Describe performance improvement]
- **UI/UX**: [Describe user experience improvement]
`;
            break;
            
        case 'patch':
        default:
            template = `## ${version} (${currentDate})

### Fixed
- **Bug Fix**: [Describe the main bug fix]
- **Issue**: [Describe another fix]

### Improved
- **Enhancement**: [Describe improvement]
- **Performance**: [Describe performance improvement]
`;
            break;
    }
    
    // Read current changelog
    const changelog = fs.readFileSync(changelogPath, 'utf8');
    
    // Find the position to insert the new entry (after the # Changelog line)
    const lines = changelog.split('\n');
    const insertIndex = lines.findIndex(line => line.startsWith('# Changelog')) + 2;
    
    if (insertIndex === 1) {
        console.error('❌ Could not find changelog header');
        process.exit(1);
    }
    
    // Insert the new version template
    lines.splice(insertIndex, 0, template);
    
    // Write back to file
    fs.writeFileSync(changelogPath, lines.join('\n'));
    
    console.log(`✅ Added template for version ${version} to CHANGELOG.md`);
    console.log(`📝 Please edit the changelog to add your specific changes`);
    console.log(`📍 Entry added at line ${insertIndex + 1}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('❌ Usage: node scripts/update-changelog.js <version> [release-type]');
    console.error('   release-type: major, minor, patch (default: patch)');
    process.exit(1);
}

const version = args[0];
const releaseType = args[1] || 'patch';

updateChangelog(version, releaseType);