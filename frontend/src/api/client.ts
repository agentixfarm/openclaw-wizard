import type { SystemInfo } from '../types/SystemInfo';

/**
 * Generic API response structure
 */
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/**
 * Fetch wrapper for API calls with type safety
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
};
