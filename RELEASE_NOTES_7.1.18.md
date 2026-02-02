# Release Notes - v7.1.18

## 🔧 Fix: API Authentication Auto-Detection

This release fixes authentication issues caused by recent SleepMe API changes.

### What's Fixed

- **403 Forbidden Errors**: The plugin now automatically detects and adapts to SleepMe API authentication format changes
- **Smart Retry Logic**: On receiving 403 errors, the plugin automatically retries without the `Bearer` prefix and permanently switches if successful
- **Better Error Messages**: Clear guidance when authentication fails, directing users to regenerate their API token
- **No More Endless Retries**: Authentication failures are handled intelligently instead of wasting retry attempts

### For Users Experiencing Auth Issues

If you were seeing "403 Forbidden" errors or "No SleepMe devices found" messages:

1. **Update to 7.1.18** via the Homebridge web interface
2. **Restart Homebridge**
3. The plugin will automatically detect the correct auth format

If issues persist after updating:
- Try regenerating your API token at https://docs.developer.sleep.me/docs/setup
- Enter the new token in the plugin configuration

### Technical Details

The plugin now includes:
- Automatic detection of API authentication format changes
- Dynamic switching between `Bearer <token>` and direct token formats
- Improved 403 error handling with clear user guidance
- Persistent format selection after successful authentication

---

**Note**: Version 7.1.17 had a build issue affecting config.schema.json and has been deprecated. Please update directly to 7.1.18.
