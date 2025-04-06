// A simpler implementation for server.js
this.onRequest('/device/test', async (payload) => {
  console.log('[SleepMeUI] Testing device connection');
  
  const apiToken = payload?.apiToken;
  if (!apiToken) {
    return { success: false, error: 'API token is required' };
  }
  
  try {
    // Simple API test without requiring external libraries
    const https = require('https');
    
    // Return a promise for the API request
    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.developer.sleep.me',
        port: 443,
        path: '/v1/devices',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsedData = JSON.parse(data);
              resolve({
                success: true,
                statusCode: res.statusCode,
                data: parsedData
              });
            } catch (e) {
              resolve({
                success: false,
                statusCode: res.statusCode,
                error: 'Invalid response format'
              });
            }
          } else {
            resolve({
              success: false,
              statusCode: res.statusCode,
              error: `API returned status ${res.statusCode}`
            });
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
      
      req.end();
    });
    
    if (result.success) {
      const data = result.data;
      const devices = Array.isArray(data) ? data : 
                       (data.devices ? data.devices : []);
      
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
        error: `API error: ${result.statusCode}`,
        details: 'Failed to retrieve devices from the API.'
      };
    }
  } catch (error) {
    console.error('[SleepMeUI] API test error:', error.message);
    return {
      success: false,
      error: 'Connection failed',
      details: error.message
    };
  }
});