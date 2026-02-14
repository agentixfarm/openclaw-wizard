import type { SystemInfo } from '../types/SystemInfo';
import type { SystemRequirements } from '../types/SystemRequirements';
import type { OpenClawDetection } from '../types/OpenClawDetection';
import type { ApiKeyValidationRequest } from '../types/ApiKeyValidationRequest';
import type { ApiKeyValidationResponse } from '../types/ApiKeyValidationResponse';
import type { WizardConfig } from '../types/WizardConfig';
import type { InstallRequest } from '../types/InstallRequest';
import type { ChannelValidationRequest } from '../types/ChannelValidationRequest';
import type { ChannelValidationResponse } from '../types/ChannelValidationResponse';
import type { DaemonStatus } from '../types/DaemonStatus';
import type { HealthSnapshot } from '../types/HealthSnapshot';
import type { DaemonActionResponse } from '../types/DaemonActionResponse';
import type { SshConnectionResponse } from '../types/SshConnectionResponse';

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
 * Fetch wrapper for PUT API calls with JSON body
 */
async function putAPI<T, B = any>(endpoint: string, body: B): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const json = await response.json() as ApiResponse<T>;

  if (!json.success) {
    throw new Error(json.error || 'API request failed');
  }

  return json.data as T;
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

  /**
   * Start installation (acknowledgment only, progress via WebSocket)
   */
  async startInstall(request: InstallRequest): Promise<void> {
    await postAPI<void, InstallRequest>('/api/wizard/install', request);
  },

  /**
   * Validate a channel bot token
   */
  async validateChannelToken(
    request: ChannelValidationRequest
  ): Promise<ChannelValidationResponse> {
    return postAPI<ChannelValidationResponse, ChannelValidationRequest>(
      '/api/channels/validate',
      request
    );
  },

  // Dashboard API methods
  /**
   * Get daemon process status
   */
  async getDaemonStatus(): Promise<DaemonStatus> {
    return fetchAPI<DaemonStatus>('/api/dashboard/daemon/status');
  },

  /**
   * Start the OpenClaw daemon
   */
  async startDaemon(): Promise<DaemonActionResponse> {
    return postAPI<DaemonActionResponse>('/api/dashboard/daemon/start', {});
  },

  /**
   * Stop the OpenClaw daemon
   */
  async stopDaemon(): Promise<DaemonActionResponse> {
    return postAPI<DaemonActionResponse>('/api/dashboard/daemon/stop', {});
  },

  /**
   * Restart the OpenClaw daemon
   */
  async restartDaemon(): Promise<DaemonActionResponse> {
    return postAPI<DaemonActionResponse>('/api/dashboard/daemon/restart', {});
  },

  /**
   * Get gateway health snapshot
   */
  async getHealth(): Promise<HealthSnapshot> {
    return fetchAPI<HealthSnapshot>('/api/dashboard/health');
  },

  /**
   * Get current config (openclaw.json)
   */
  async getConfig(): Promise<any> {
    return fetchAPI<any>('/api/dashboard/config');
  },

  /**
   * Save dashboard config to openclaw.json
   */
  async saveDashboardConfig(config: any): Promise<void> {
    await putAPI<void>('/api/dashboard/config', config);
  },

  /**
   * Import config from uploaded JSON
   */
  async importConfig(config: any): Promise<void> {
    await postAPI<void>('/api/dashboard/config/import', config);
  },

  /**
   * Export current config as JSON
   */
  async exportConfig(): Promise<any> {
    return fetchAPI<any>('/api/dashboard/config/export');
  },

  /**
   * Test SSH connection to a remote VPS
   * Note: Response shape is SshConnectionResponse (not wrapped in ApiResponse)
   */
  async testSshConnection(credentials: {
    host: string;
    username: string;
    keyPath: string;
  }): Promise<SshConnectionResponse> {
    const response = await fetch('/api/remote/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: credentials.host,
        username: credentials.username,
        key_path: credentials.keyPath,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<SshConnectionResponse>;
  },
};
