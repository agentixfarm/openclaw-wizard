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
import type { DockerStatusResponse } from '../types/DockerStatusResponse';
import type { ContainerInfo } from '../types/ContainerInfo';
import type { DockerCreateRequest } from '../types/DockerCreateRequest';
import type { DockerCreateResponse } from '../types/DockerCreateResponse';
import type { ContainerLogsResponse } from '../types/ContainerLogsResponse';
import type { SkillMetadata } from '../types/SkillMetadata';
import type { SkillSearchResponse } from '../types/SkillSearchResponse';
import type { SkillInstallRequest } from '../types/SkillInstallRequest';
import type { SkillInstallResponse } from '../types/SkillInstallResponse';
import type { InstalledSkill } from '../types/InstalledSkill';
import type { ScanResult } from '../types/ScanResult';
import type { ScanRequest } from '../types/ScanRequest';

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
 * Fetch wrapper for DELETE API calls
 */
async function deleteAPI(endpoint: string): Promise<void> {
  const response = await fetch(endpoint, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
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

  // Docker API methods

  /**
   * Check Docker availability and get status
   * Note: Response shape is DockerStatusResponse directly (not wrapped in ApiResponse)
   */
  async getDockerStatus(): Promise<DockerStatusResponse> {
    const response = await fetch('/api/docker/status');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<DockerStatusResponse>;
  },

  /**
   * List managed Docker containers
   */
  async listContainers(): Promise<ContainerInfo[]> {
    return fetchAPI<ContainerInfo[]>('/api/docker/containers');
  },

  /**
   * Create a new Docker sandbox container
   * Note: Response shape is DockerCreateResponse directly (not wrapped in ApiResponse)
   */
  async createSandbox(request: DockerCreateRequest): Promise<DockerCreateResponse> {
    const response = await fetch('/api/docker/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<DockerCreateResponse>;
  },

  /**
   * Stop a running Docker container
   */
  async stopContainer(id: string): Promise<void> {
    await postAPI<void>(`/api/docker/${id}/stop`, {});
  },

  /**
   * Remove a Docker container
   */
  async removeContainer(id: string): Promise<void> {
    await deleteAPI(`/api/docker/${id}`);
  },

  /**
   * Get logs from a Docker container
   */
  async getContainerLogs(id: string, tail?: number): Promise<ContainerLogsResponse> {
    const params = tail ? `?tail=${tail}` : '';
    return fetchAPI<ContainerLogsResponse>(`/api/docker/${id}/logs${params}`);
  },

  // Skills API methods

  /**
   * Search ClawHub skills with optional query and category filter
   */
  async searchSkills(query?: string, category?: string): Promise<SkillSearchResponse> {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    const qs = params.toString();
    return fetchAPI<SkillSearchResponse>(`/api/skills/search${qs ? `?${qs}` : ''}`);
  },

  /**
   * Get detailed metadata for a specific skill
   */
  async getSkillDetails(name: string): Promise<SkillMetadata> {
    return fetchAPI<SkillMetadata>(`/api/skills/${encodeURIComponent(name)}`);
  },

  /**
   * Install a skill from ClawHub (runs VT scan if configured)
   */
  async installSkill(request: SkillInstallRequest): Promise<SkillInstallResponse> {
    const response = await fetch('/api/skills/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<SkillInstallResponse>;
  },

  /**
   * Uninstall a locally installed skill
   */
  async uninstallSkill(name: string): Promise<void> {
    await deleteAPI(`/api/skills/${encodeURIComponent(name)}`);
  },

  /**
   * List all locally installed skills
   */
  async listInstalledSkills(): Promise<InstalledSkill[]> {
    return fetchAPI<InstalledSkill[]>('/api/skills/installed');
  },

  /**
   * Scan a skill with VirusTotal before installation
   * Returns null if VT is not configured
   */
  async scanSkill(request: ScanRequest): Promise<ScanResult | null> {
    const response = await fetch('/api/skills/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    // If VT not configured, data will be null
    if (json.success && json.data === null) return null;
    if (!json.success) throw new Error(json.error || 'Scan request failed');
    return json.data as ScanResult;
  },
};
