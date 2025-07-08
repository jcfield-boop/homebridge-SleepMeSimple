# Release Process

This document describes the automated release process for the homebridge-sleepme-simple plugin.

## 🤖 Automated Release Workflows

### 1. Manual Version and Publish Workflow
**Trigger**: Manual dispatch from GitHub Actions tab  
**File**: `.github/workflows/version-and-publish.yml`

**What it does:**
- Builds and tests the project
- Bumps version (patch/minor/major)
- Publishes to npm
- Creates GitHub Release with changelog notes
- Pushes tags automatically

**Usage:**
1. Go to GitHub Actions tab
2. Select "Manual Version and Publish"
3. Click "Run workflow"
4. Choose version type (patch/minor/major)

### 2. Automatic Release Creation
**Trigger**: When you push a tag starting with 'v'  
**File**: `.github/workflows/auto-release.yml`

**What it does:**
- Automatically creates GitHub Release when a tag is pushed
- Extracts release notes from CHANGELOG.md
- Sets the release as latest

**Usage:**
```bash
# After making changes and updating CHANGELOG.md
npm version patch  # or minor/major
git push --tags
```

## 📝 Local Development Workflow

### Option 1: Using npm version (Recommended)
```bash
# 1. Update CHANGELOG.md with your changes
# You can use the helper script:
node scripts/update-changelog.js 7.0.2 patch

# 2. Edit CHANGELOG.md to add your specific changes

# 3. Commit your changes
git add .
git commit -m "Add feature X and fix bug Y"

# 4. Bump version and create tag
npm version patch  # creates tag and updates package.json

# 5. Push everything (triggers auto-release)
git push && git push --tags
```

### Option 2: Using GitHub Actions Manual Workflow
```bash
# 1. Update CHANGELOG.md with your changes
# 2. Commit and push to main
git add .
git commit -m "Add feature X and fix bug Y"
git push

# 3. Use GitHub Actions "Manual Version and Publish" workflow
# This will handle version bump, npm publish, and GitHub release
```

## 📋 Changelog Format

The automated release process expects this format in CHANGELOG.md:

```markdown
# Changelog

## 7.0.2 (2025-07-08)

### Fixed
- **Bug Fix**: Description of the fix
- **Issue**: Another fix description

### Improved
- **Enhancement**: Description of improvement

## 7.0.1 (2025-07-07)
...
```

## 🔧 Helper Scripts

### Update Changelog Script
```bash
# Create a new changelog entry template
node scripts/update-changelog.js 7.0.2 patch
node scripts/update-changelog.js 7.1.0 minor  
node scripts/update-changelog.js 8.0.0 major
```

## 🎯 What Gets Automated

✅ **Automatic:**
- GitHub Release creation
- Release notes extraction from CHANGELOG.md
- npm package publishing (manual workflow)
- Version bumping (manual workflow)
- Tag creation and pushing

✅ **Manual Steps:**
- Writing changelog entries
- Choosing when to release
- Choosing version type (patch/minor/major)

## 🚀 Release Checklist

Before releasing:
- [ ] Update CHANGELOG.md with new version entry
- [ ] Test changes locally
- [ ] Commit all changes
- [ ] Choose release method (npm version or GitHub Actions)
- [ ] Verify release appears in GitHub
- [ ] Test Homebridge UI shows release notes

## 🔍 Troubleshooting

### GitHub Release Not Created
- Check that the tag starts with 'v' (e.g., v7.0.2)
- Verify CHANGELOG.md has an entry for the version
- Check GitHub Actions logs for errors

### Release Notes Missing
- Ensure CHANGELOG.md follows the correct format
- Check that the version number matches exactly
- The workflow looks for: `## 7.0.2 (2025-07-08)`

### npm Publish Failed
- Verify NPM_TOKEN secret is set in repository settings
- Check if version already exists on npm
- Ensure all tests pass before publishing

## 📖 Additional Notes

- The `auto-release.yml` workflow only creates GitHub releases
- The `version-and-publish.yml` workflow handles complete publishing
- Release notes are automatically extracted from CHANGELOG.md
- All releases are marked as "latest" by default
- Homebridge UI will fetch release notes from GitHub Releases API