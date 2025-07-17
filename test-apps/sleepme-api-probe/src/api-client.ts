/**
 * Lightweight API client for testing SleepMe API rate limiting
 */
import axios, { AxiosError, AxiosResponse } from 'axios';
import { RequestResult } from './types.js';

export class SleepMeApiClient {
  private readonly baseUrl: string;
  private readonly apiToken: string;
  private requestCount = 0;

  constructor(baseUrl: string, apiToken: string) {
    this.baseUrl = baseUrl;
    this.apiToken = apiToken;
  }

  /**
   * Make a request and record detailed metrics
   */
  async makeRequest(method: string, endpoint: string): Promise<RequestResult> {
    const startTime = Date.now();
    const requestId = ++this.requestCount;
    const url = `${this.baseUrl}${endpoint}`;

    console.log(`[${requestId}] ${method} ${endpoint} - Starting at ${new Date(startTime).toISOString()}`);

    try {
      const response: AxiosResponse = await axios({
        method,
        url,
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000,
        validateStatus: () => true // Don't throw on any status code
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const result: RequestResult = {
        timestamp: startTime,
        method,
        url: endpoint,
        success: response.status < 300,
        statusCode: response.status,
        responseTime,
        headers: response.headers as Record<string, string>,
        rateLimitHeaders: this.extractRateLimitHeaders(response.headers)
      };

      console.log(`[${requestId}] ${method} ${endpoint} - ${response.status} (${responseTime}ms)`);
      
      if (response.status === 429) {
        console.log(`[${requestId}] RATE LIMITED! Headers:`, result.rateLimitHeaders);
      }

      return result;

    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const axiosError = error as AxiosError;

      const result: RequestResult = {
        timestamp: startTime,
        method,
        url: endpoint,
        success: false,
        statusCode: axiosError.response?.status || 0,
        responseTime,
        error: axiosError.message,
        headers: axiosError.response?.headers as Record<string, string>,
        rateLimitHeaders: axiosError.response?.headers ? 
          this.extractRateLimitHeaders(axiosError.response.headers) : undefined
      };

      console.log(`[${requestId}] ${method} ${endpoint} - ERROR: ${axiosError.message} (${responseTime}ms)`);
      
      return result;
    }
  }

  /**
   * Extract rate limit headers from response
   */
  private extractRateLimitHeaders(headers: any): RequestResult['rateLimitHeaders'] {
    const rateLimitHeaders: RequestResult['rateLimitHeaders'] = {};

    // Common rate limit header patterns
    const headerMappings = {
      'x-ratelimit-limit': 'limit',
      'x-ratelimit-remaining': 'remaining',
      'x-ratelimit-reset': 'reset',
      'x-rate-limit-limit': 'limit',
      'x-rate-limit-remaining': 'remaining',
      'x-rate-limit-reset': 'reset',
      'ratelimit-limit': 'limit',
      'ratelimit-remaining': 'remaining',
      'ratelimit-reset': 'reset',
      'retry-after': 'retryAfter'
    };

    for (const [headerName, property] of Object.entries(headerMappings)) {
      const value = headers[headerName] || headers[headerName.toLowerCase()];
      if (value) {
        (rateLimitHeaders as any)[property] = String(value);
      }
    }

    return Object.keys(rateLimitHeaders).length > 0 ? rateLimitHeaders : undefined;
  }

  /**
   * Get device list
   */
  async getDevices(): Promise<RequestResult> {
    return this.makeRequest('GET', '/devices');
  }

  /**
   * Get device status
   */
  async getDeviceStatus(deviceId: string): Promise<RequestResult> {
    return this.makeRequest('GET', `/devices/${deviceId}`);
  }

  /**
   * Update device settings
   */
  async updateDevice(deviceId: string, data: any): Promise<RequestResult> {
    return this.makeRequest('PATCH', `/devices/${deviceId}`);
  }

  /**
   * Wait for specified time
   */
  async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}