import type { SystemInfo } from '../types/SystemInfo';
import type { SystemRequirements } from '../types/SystemRequirements';
import type { OpenClawDetection } from '../types/OpenClawDetection';
import type { ApiKeyValidationRequest } from '../types/ApiKeyValidationRequest';
import type { ApiKeyValidationResponse } from '../types/ApiKeyValidationResponse';
import type { WizardConfig } from '../types/WizardConfig';

/**
 * Generic API response structure
 */
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/**
 * Fetch wrapper for GET API calls with type safety
 */
async function fetchAPI<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const json = await response.json() as ApiResponse<T>;

  if (!json.success || json.data === null) {
    throw new Error(json.error || 'API request failed');
  }

  return json.data;
}

/**
 * Fetch wrapper for POST API calls with JSON body
 */
async function postAPI<T, B = any>(endpoint: string, body: B): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const json = await response.json() as ApiResponse<T>;

  if (!json.success || json.data === null) {
    throw new Error(json.error || 'API request failed');
  }

  return json.data;
}

/**
 * API client with typed methods
 */
export const api = {
  /**
   * Get system information
   */
  async getSystemInfo(): Promise<SystemInfo> {
    return fetchAPI<SystemInfo>('/api/system/info');
  },

  /**
   * Health check
   */
  async checkHealth(): Promise<void> {
    const response = await fetch('/api/health');
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
  },

  /**
   * Get system requirements check results
   */
  async getSystemRequirements(): Promise<SystemRequirements> {
    return fetchAPI<SystemRequirements>('/api/system/requirements');
  },

  /**
   * Detect existing OpenClaw installation
   */
  async detectOpenClaw(): Promise<OpenClawDetection> {
    return fetchAPI<OpenClawDetection>('/api/system/detect-openclaw');
  },

  /**
   * Validate an API key
   */
  async validateApiKey(
    request: ApiKeyValidationRequest
  ): Promise<ApiKeyValidationResponse> {
    return postAPI<ApiKeyValidationResponse, ApiKeyValidationRequest>(
      '/api/wizard/validate-key',
      request
    );
  },

  /**
   * Save wizard configuration
   */
  async saveConfig(config: WizardConfig): Promise<void> {
    await postAPI<void, WizardConfig>('/api/wizard/save-config', config);
  },
};
