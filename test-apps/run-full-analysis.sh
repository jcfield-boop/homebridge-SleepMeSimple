#!/bin/bash

# SleepMe API Rate Limit Analysis - Complete Workflow
# This script runs the complete analysis pipeline

echo "🚀 SleepMe API Rate Limit Analysis"
echo "=================================="
echo ""

# Check if configuration exists
if [ ! -f "api-test-config.json" ]; then
    echo "❌ Configuration file missing!"
    echo ""
    echo "📋 Setup steps:"
    echo "1. Copy the example config: cp api-test-config.example.json api-test-config.json"
    echo "2. Edit api-test-config.json with your SleepMe API token"
    echo "3. Run this script again"
    echo ""
    exit 1
fi

# Validate setup
echo "🔍 Step 1: Validating setup..."
npm run validate
if [ $? -ne 0 ]; then
    echo "❌ Setup validation failed. Please fix the issues above."
    exit 1
fi

echo ""
echo "⚠️  WARNING: This analysis will make many API requests over 15-30 minutes."
echo "   Make sure your SleepMe device is online and you won't need to use it."
echo ""
read -p "Continue with analysis? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Analysis cancelled."
    exit 0
fi

# Run the analysis
echo ""
echo "🧪 Step 2: Running comprehensive rate limit analysis..."
echo "This will take 15-30 minutes. You can safely interrupt with Ctrl+C."
echo ""

npm run analyze
if [ $? -ne 0 ]; then
    echo "❌ Analysis failed or was interrupted."
    echo "💡 Partial results may still be available. Try running: npm run report"
    exit 1
fi

# Generate report
echo ""
echo "📊 Step 3: Generating analysis report..."
npm run report

echo ""
echo "✅ Analysis complete!"
echo ""
echo "📁 Generated files:"
echo "   - rate-limit-analysis-results.json (raw data)"
echo "   - plugin-recommendations.json (actionable recommendations)"
echo ""
echo "💡 Next steps:"
echo "   1. Review the recommendations above"
echo "   2. Update your plugin configuration with the suggested values"
echo "   3. Test the plugin with the new settings"
echo "   4. Consider running this analysis periodically to detect API changes"
echo ""