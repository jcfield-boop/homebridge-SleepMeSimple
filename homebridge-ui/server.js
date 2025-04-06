// Update the device/test handler in server.js
this.onRequest('/device/test', async (payload) => {
  console.log('[SleepMeUI] /device/test handler called with token:', payload?.apiToken ? 'Present' : 'Missing');
  
  const apiToken = payload?.apiToken;
  if (!apiToken) {
    return { success: false, error: 'API token is required' };
  }
  
  try {
    // Make a request to the SleepMe API to test the connection
    const axios = require('axios');
    
    // Create a test request to fetch devices from the SleepMe API
    const response = await axios({
      method: 'GET',
      url: 'https://api.developer.sleep.me/v1/devices',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });
    
    // Check if the request was successful and contains devices
    if (response.status === 200) {
      const devices = Array.isArray(response.data) ? response.data : 
                     (response.data.devices ? response.data.devices : []);
      
      return {
        success: true,
        devices: devices.length,
        deviceInfo: devices.map(device => ({
          id: device.id || 'unknown',
          name: device.name || `Device ${device.id}`
        }))
      };
    } else {
      return {
        success: false,
        error: `API returned status ${response.status}`,
        details: 'The API connection was successful, but no devices were returned.'
      };
    }
  } catch (error) {
    console.error('[SleepMeUI] API test error:', error.message);
    
    // Format a user-friendly error message based on the error
    let errorMessage = 'Connection to SleepMe API failed';
    let errorDetails = error.message;
    
    if (error.response) {
      // The request was made and the server responded with a status code outside of 2xx
      errorMessage = `API error: ${error.response.status}`;
      
      if (error.response.status === 401) {
        errorDetails = 'Authentication failed. The API token appears to be invalid.';
      } else if (error.response.status === 403) {
        errorDetails = 'Access forbidden. Your API token might not have the required permissions.';
      } else if (error.response.status === 429) {
        errorDetails = 'Rate limit exceeded. Please try again later.';
      }
      
      // Try to extract more details from the response if available
      if (error.response.data) {
        const data = error.response.data;
        if (typeof data === 'object' && data.message) {
          errorDetails += ` Server message: ${data.message}`;
        }
      }
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response from SleepMe API';
      errorDetails = 'The request was made but the server did not respond. Please check your network connection.';
    }
    
    return {
      success: false,
      error: errorMessage,
      details: errorDetails
    };
  }
});