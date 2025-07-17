/**
 * Type definitions for SleepMe API probe testing
 */

export interface TestConfig {
  apiToken: string;
  deviceId?: string;
  baseUrl: string;
  testDurationMinutes: number;
  maxRequestsPerTest: number;
  verboseLogging: boolean;
  exportResults: boolean;
}

export interface RequestResult {
  timestamp: number;
  method: string;
  url: string;
  success: boolean;
  statusCode: number;
  responseTime: number;
  error?: string;
  headers?: Record<string, string>;
  rateLimitHeaders?: {
    limit?: string;
    remaining?: string;
    reset?: string;
    retryAfter?: string;
  };
}

export interface TestResult {
  testName: string;
  startTime: number;
  endTime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitErrors: number;
  averageResponseTime: number;
  requestResults: RequestResult[];
  analysis: {
    optimalInterval?: number;
    maxBurstSize?: number;
    rateLimitPattern?: string;
    recommendations?: string[];
  };
}

export interface RateLimitAnalysis {
  windowType: 'fixed' | 'sliding' | 'unknown';
  windowSize: number; // in milliseconds
  requestLimit: number;
  burstLimit: number;
  recoveryTime: number;
  confidence: number; // 0-1 scale
  recommendations: string[];
}

export enum TestType {
  BURST = 'burst',
  SUSTAINED = 'sustained',
  WINDOW = 'window',
  RECOVERY = 'recovery',
  ENDPOINT_COMPARISON = 'endpoint_comparison',
  CONCURRENT = 'concurrent',
  TIME_PATTERN = 'time_pattern'
}

export interface TestParameters {
  type: TestType;
  intervalMs?: number;
  burstSize?: number;
  duration?: number;
  endpoints?: string[];
  concurrency?: number;
}